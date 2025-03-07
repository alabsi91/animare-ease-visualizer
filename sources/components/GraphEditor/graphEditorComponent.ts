import { Graph } from "./helpers/Graph";
import { GraphPanel } from "./helpers/GraphPanel";
import { GraphViewPort } from "./helpers/GraphViewPort";
import { HistoryManager } from "./helpers/HistoryManager";
import { KeyboardShortcutManager } from "./helpers/KeyboardShortcutManager";
import { Points } from "./helpers/Points";
import { Settings } from "./helpers/Settings";

import type { CubicCommand } from "./helpers/CubicCommand";
import type { MoveCommand } from "./helpers/MoveCommand";
import type { PathCommands } from "./helpers/types";

const PATH_COMMANDS_RE = /^M(?:\s(?:-?\d+(?:\.\d+)?)){2}(?:\sC(?:\s(?:-?\d+(?:\.\d+)?)){6}){1,}/i;

export class GraphEditor extends HTMLElement {
  /**
   * - The svg viewBox size (width/height) that contain the graph path, anchor points, and control points
   * - You should change the value in the css side too.
   */
  readonly PATH_SVG_VIEW_BOX_SIZE = 100;

  viewport: GraphViewPort;
  graphPanel: GraphPanel;
  graph: Graph;
  points: Points;
  settings: Settings;
  historyManager: HistoryManager;
  keyboardShortcutManager: KeyboardShortcutManager;

  abortController = new AbortController();
  commandsRef: (CubicCommand | MoveCommand)[] = [];
  readonly events = {
    /** Fired when the use finish drawing */
    onComplete: new CustomEvent("complete"),
  };

  #resizeObserver: ResizeObserver | null = null;
  #isPointerDown = false;
  get #isPanning() {
    return this.#isPointerDown && this.keyboardShortcutManager.isPanModifiersPressed;
  }

  constructor() {
    super();

    const style = import_as_string("./graphEditor.inline.css", { minify: true });

    const shadow = this.attachShadow({ mode: "open" });

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
    shadow.appendChild(this.viewport.element);

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

    const styleTag = document.createElement("style");
    styleTag.textContent = style;
    shadow.appendChild(styleTag);
  }

  connectedCallback() {
    const { signal } = this.abortController;

    document.addEventListener("wheel", this.#onWheelHandler, { signal });
    document.addEventListener("pointerup", this.#onPointerUpHandler, { signal });
    this.viewport.element.addEventListener("pointermove", this.#onPointerMoveHandler, { signal });
    this.graphPanel.element.addEventListener("pointerdown", this.#onPanelPointerDownHandler, { signal });
    this.graphPanel.element.addEventListener("dblclick", this.graphPanel.center, { signal });
    window.addEventListener("resize", this.#onResizeHandler, { signal });

    this.#resizeObserver = new ResizeObserver(this.#onResizeHandler);
    this.#resizeObserver.observe(this);
  }

  disconnectedCallback() {
    this.abortController.abort();
    if (this.#resizeObserver) this.#resizeObserver.disconnect();

    this.graph.clear();
  }

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

  setFromPoints = (points: PathCommands) => {
    this.graph.clear(false);
    this.points.set(points);
    this.graph.rerender();
    this.graph.path.updatePath();
  };

  zoom = (d: 1 | -1, zoomStep = this.settings.zoomStep) => {
    const newSize = this.graphPanel.size + d * zoomStep;
    if (newSize < this.settings.zoomMin || newSize > this.settings.zoomMax) return;

    this.graphPanel.size = newSize;
    this.graphPanel.x -= (zoomStep / 2) * d;
    this.graphPanel.y -= (zoomStep / 2) * d;
  };

  zoomIn = (step = this.settings.zoomStep) => {
    this.zoom(1, step);
  };

  zoomOut = (step = this.settings.zoomStep) => {
    this.zoom(-1, step);
  };

  #onResizeHandler = () => {
    const width = this.clientWidth;
    const height = this.clientHeight;

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
    const elementsUnderPointer = document.elementsFromPoint(e.clientX, e.clientY);
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

  #dragOffset = { x: 0, y: 0 };

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

customElements.define("graph-editor", GraphEditor);

type GraphEditorLocal = GraphEditor;

declare global {
  type GraphEditor = GraphEditorLocal;

  interface HTMLElementTagNameMap {
    "graph-editor": GraphEditor;
  }
}
