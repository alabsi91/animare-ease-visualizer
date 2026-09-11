import { Graph } from "./helpers/graph";
import { GraphPanel } from "./helpers/graph-panel";
import { GraphViewPort } from "./helpers/graph-viewport";
import { HistoryManager } from "./helpers/history-manager";
import { KeyboardShortcutManager } from "./helpers/keyboard-shortcut-manager";
import { Toolbar } from "./helpers/toolbar";
import { Points } from "./helpers/points";
import { Settings } from "./helpers/settings";

import type { SV } from "@staticview/ui";
import type { CubicCommand } from "./helpers/cubic-command";
import type { MoveCommand } from "./helpers/move-command";
import type { PathCommands } from "./helpers/types";

declare const CustomEvent: SV.CustomEventT;

const PATH_COMMANDS_RE = /^M(?:\s(?:-?\d+(?:\.\d+)?)){2}(?:\sC(?:\s(?:-?\d+(?:\.\d+)?)){6}){1,}/i;

/**
 * `graph-editor` edits a cubic bezier easing curve on a zoomable panel.
 *
 * @title Graph Editor
 * @markdown {./graph-editor.md}
 */
class GraphEditor extends HTMLElement implements SV.IWebComponent {
  static readonly _componentName = "graph-editor";

  static readonly _events = {
    /** Fired when the user finishes drawing. */
    _complete: () => new CustomEvent("complete"),
  };

  readonly #shadow = $shadow({ cssFile: "./graph-editor.css", mode: "open" });

  #resizeObserver: ResizeObserver | null = null;
  #isPointerDown = false;
  get #isPanning() {
    return this.#isPointerDown && this.keyboardShortcutManager.isPanModifiersPressed;
  }

  #dragOffset = { x: 0, y: 0 };

  #activeTouchPoints = new Map<number, { x: number; y: number }>();
  #pinchDistance = 0;
  #pinchCenter = { x: 0, y: 0 };

  /**
   * - The svg viewBox size (width/height) that contain the graph path, anchor points, and control points
   * - You should change the value in the css side too.
   */
  readonly PATH_SVG_VIEW_BOX_SIZE: number = 100;

  /** The outer svg that the panel is drawn into. It tracks the element's size. */
  readonly viewport: GraphViewPort;

  /** The square panel holding the graph. It handles zoom, panning, and the grid. */
  readonly graphPanel: GraphPanel;

  /** The drawn curve, its anchor points, and its control points. */
  readonly graph: Graph;

  /** The curve commands. Read `value` for the numbers and `valueStr` for the path string. */
  readonly points: Points;

  /** Snapping, zoom limits, and the keyboard shortcut assignments. */
  readonly settings: Settings;

  /** Undo and redo stack for point edits. */
  readonly historyManager: HistoryManager;

  /** Tracks which keys and modifiers are held down. */
  readonly keyboardShortcutManager: KeyboardShortcutManager;

  /** The buttons sitting over the graph. */
  readonly toolbar: Toolbar;

  /** Aborts every listener the component added. Fires on disconnect. */
  readonly abortController: AbortController = new AbortController();

  /** `true` while two fingers are down on the editor, zooming and panning the graph panel. */
  get isPinching(): boolean {
    return this.#activeTouchPoints.size === 2;
  }

  /** The commands the graph is currently built from. */
  commandsRef: (CubicCommand | MoveCommand)[] = [];

  constructor() {
    super();

    // Settings
    this.settings = new Settings(this);

    // Keyboard shortcut manager
    this.keyboardShortcutManager = new KeyboardShortcutManager(this);
    this.keyboardShortcutManager.addListener("Pan", this.#onPanKeyPress);
    this.keyboardShortcutManager.addListener("keyUp", this.#onKeyUpHandler);

    // Points
    this.points = new Points();

    // Viewport
    this.viewport = new GraphViewPort(this);
    this.viewport.element.classList.add("main-svg");
    this.#shadow.appendChild(this.viewport.element);

    // Panel
    this.graphPanel = new GraphPanel(this);
    this.graphPanel.center();
    this.viewport.element.appendChild(this.graphPanel.element);

    // Graph
    this.graph = new Graph(this);
    this.graphPanel.element.appendChild(this.graph.element);
    this.graph.drawAnchorPoints();

    // History manager
    this.historyManager = new HistoryManager(this);

    // Point actions
    this.toolbar = new Toolbar(this);
    this.#shadow.appendChild(this.toolbar.element);
  }

  connectedCallback() {
    $upgrade();

    const { signal } = this.abortController;

    this.ownerDocument.addEventListener("wheel", this.#onWheelHandler, { signal });
    this.ownerDocument.addEventListener("pointerup", this.#onPointerUpHandler, { signal });
    this.viewport.element.addEventListener("pointermove", this.#onPointerMoveHandler, { signal });
    this.graphPanel.element.addEventListener("pointerdown", this.#onPanelPointerDownHandler, { signal });
    this.graphPanel.element.addEventListener("dblclick", this.#onDoubleClickHandler, { signal });
    this.addEventListener("pointerdown", this.#onTouchPointerDownHandler, { signal });
    this.ownerDocument.addEventListener("pointermove", this.#onTouchPointerMoveHandler, { signal });
    this.ownerDocument.addEventListener("pointerup", this.#onTouchPointerUpHandler, { signal });
    this.ownerDocument.addEventListener("pointercancel", this.#onTouchPointerUpHandler, { signal });
    window.addEventListener("resize", this.#onResizeHandler, { signal });

    this.#resizeObserver = new ResizeObserver(this.#onResizeHandler);
    this.#resizeObserver.observe(this);
    this.#onResizeHandler();
  }

  disconnectedCallback() {
    this.abortController.abort();
    if (this.#resizeObserver) this.#resizeObserver.disconnect();

    this.graph.clear();
  }

  /** Fires the `complete` event. The helpers call it once an edit settles. */
  dispatchComplete = () => {
    this.dispatchEvent(GraphEditor._events._complete());
  };

  /** Returns `true` on success and `false` otherwise */
  setFromPathStr = (pathStr: string) => {
    if (!PATH_COMMANDS_RE.test(pathStr)) {
      console.error("Invalid path string: It should follow the format: `M x y C cx1 cy1 cx2 cy2 x y`");
      return false;
    }
    this.graph.clear(false);
    this.points.setFromStr(pathStr);
    this.graph.rerender();
    this.points.events.onUpdate.fire();
    return true;
  };

  /** Replaces the graph with the given commands. */
  setFromPoints = (points: PathCommands) => {
    this.graph.clear(false);
    this.points.set(points);
    this.graph.rerender();
    this.graph.path.updatePath();
  };

  /** Zooms by one step. `1` zooms in, `-1` zooms out. Does nothing outside the zoom limits. */
  zoom = (d: 1 | -1, zoomStep = this.settings.zoomStep) => {
    const newSize = this.graphPanel.size + d * zoomStep;
    if (newSize < this.settings.zoomMin || newSize > this.settings.zoomMax) return;

    this.graphPanel.size = newSize;
    this.graphPanel.x -= (zoomStep / 2) * d;
    this.graphPanel.y -= (zoomStep / 2) * d;
  };

  /** Zooms in by one step. Defaults to `settings.zoomStep`. */
  zoomIn = (step = this.settings.zoomStep) => {
    this.zoom(1, step);
  };

  /** Zooms out by one step. Defaults to `settings.zoomStep`. */
  zoomOut = (step = this.settings.zoomStep) => {
    this.zoom(-1, step);
  };

  /**
   * Zooms and pans so the whole curve is in view. The curve ends up centered, the grid does not.
   *
   * @param padding - Space left between the curve and the editor edges, in pixels. Defaults to a tenth of the shortest side
   */
  fitToPath = (padding = Math.min(this.viewport.width, this.viewport.height) * 0.1) => {
    const pathBounds = this.graph.path.element.getBBox();
    if (!pathBounds.width || !pathBounds.height) return;

    const viewBoxSize = this.PATH_SVG_VIEW_BOX_SIZE;

    // the grid is always in view. A curve that stays inside it fits the grid instead
    const left = Math.min(pathBounds.x, 0);
    const top = Math.min(pathBounds.y, 0);
    const right = Math.max(pathBounds.x + pathBounds.width, viewBoxSize);
    const bottom = Math.max(pathBounds.y + pathBounds.height, viewBoxSize);

    const sizeToFitWidth = (this.viewport.width - padding * 2) / ((right - left) / viewBoxSize);
    const sizeToFitHeight = (this.viewport.height - padding * 2) / ((bottom - top) / viewBoxSize);

    const sizeToFitBoth = Math.min(sizeToFitWidth, sizeToFitHeight);
    const size = Math.min(Math.max(sizeToFitBoth, this.settings.zoomMin), this.settings.zoomMax);

    const centerX = (left + right) / 2 / viewBoxSize;
    const centerY = (top + bottom) / 2 / viewBoxSize;

    this.graphPanel.size = size;
    this.graphPanel.x = this.viewport.width / 2 - centerX * size;
    this.graphPanel.y = this.viewport.height / 2 - centerY * size;
  };

  #onDoubleClickHandler = () => {
    this.fitToPath();
  };

  #onResizeHandler = () => {
    const width = this.clientWidth;
    const height = this.clientHeight;

    // the element has no layout yet, a zero viewport would throw the panel off screen
    if (!width || !height) return;

    const isCenteredX = this.graphPanel.x === this.viewport.width / 2 - this.graphPanel.size / 2;
    const isCenteredY = this.graphPanel.y === this.viewport.height / 2 - this.graphPanel.size / 2;
    const isCentered = isCenteredX && isCenteredY;

    this.viewport.width = width;
    this.viewport.height = height;

    // keep the panel centered
    if (!isCentered) return;
    this.graphPanel.center();
  };

  #onWheelHandler = (e: WheelEvent) => {
    if (!this.settings.zoomEnabled) return;

    // check if the pointer position is over this
    const elementsUnderPointer = this.ownerDocument.elementsFromPoint(e.clientX, e.clientY);
    if (elementsUnderPointer[0] !== this) return;

    const d = e.deltaY > 0 ? -1 : 1;
    this.zoom(d);
  };

  #onPanKeyPress = () => {
    if (!this.settings.panEnabled) return;
    this.style.cursor = "grab";
  };

  #onKeyUpHandler = () => {
    this.style.cursor = "default";
  };

  #onPointerUpHandler = () => {
    this.#isPointerDown = false;
    this.style.cursor = this.keyboardShortcutManager.isPanModifiersPressed ? "grab" : "default";
  };

  #onPanelPointerDownHandler = (e: PointerEvent) => {
    this.#isPointerDown = true;
    if (!this.#isPanning) return;

    this.style.cursor = "grabbing";
    const { left, top } = this.getBoundingClientRect();
    this.#dragOffset = {
      x: e.clientX - (left + this.graphPanel.x),
      y: e.clientY - (top + this.graphPanel.y),
    };
  };

  #onTouchPointerDownHandler = (e: PointerEvent) => {
    if (e.pointerType !== "touch") return;

    this.#activeTouchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.#activeTouchPoints.size !== 2) return;

    this.#pinchDistance = this.#getTouchDistance();
    this.#pinchCenter = this.#getTouchCenter();
  };

  #onTouchPointerMoveHandler = (e: PointerEvent) => {
    if (!this.#activeTouchPoints.has(e.pointerId)) return;

    this.#activeTouchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.#activeTouchPoints.size !== 2) return;

    const center = this.#getTouchCenter();
    const distance = this.#getTouchDistance();
    const sizeDelta = distance - this.#pinchDistance;

    if (this.settings.panEnabled) {
      this.graphPanel.x += center.x - this.#pinchCenter.x;
      this.graphPanel.y += center.y - this.#pinchCenter.y;
    }

    if (this.settings.zoomEnabled && sizeDelta !== 0) {
      this.zoom(sizeDelta > 0 ? 1 : -1, Math.abs(sizeDelta));
    }

    this.#pinchCenter = center;
    this.#pinchDistance = distance;
  };

  #onTouchPointerUpHandler = (e: PointerEvent) => {
    this.#activeTouchPoints.delete(e.pointerId);
    if (this.#activeTouchPoints.size !== 2) return;

    this.#pinchDistance = this.#getTouchDistance();
    this.#pinchCenter = this.#getTouchCenter();
  };

  #getTouchDistance() {
    const [first, second] = this.#activeTouchPoints.values();
    return Math.hypot(second.x - first.x, second.y - first.y);
  }

  #getTouchCenter() {
    const [first, second] = this.#activeTouchPoints.values();
    return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
  }

  #onPointerMoveHandler = (e: PointerEvent) => {
    if (this.#isPanning) {
      const panel = this.graphPanel;

      const { left, top } = this.getBoundingClientRect();
      const deltaX = e.clientX - left;
      const deltaY = e.clientY - top;

      panel.x = deltaX - this.#dragOffset.x;
      panel.y = deltaY - this.#dragOffset.y;
    }
  };
}

$defineElement(GraphEditor);

export type GraphEditorTypes = SV.WComponent<typeof GraphEditor>;

export type { GraphEditor };
