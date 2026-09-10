import type { GraphEditor } from "../graph-editor";
import type { KeyModifiers } from "./types";

/** Apple keyboards put the shortcut modifier on Command, every other one puts it on Control */
const PRIMARY_MODIFIER: KeyModifiers = /Mac|iPhone|iPod|iPad/.test(navigator.platform) ? "Meta" : "Control";

class KeyboardAssignment {
  readonly keys: Set<string>;
  readonly modifiers: Set<KeyModifiers>;

  constructor({ modifiers = [], keys = [] }: { modifiers?: KeyModifiers[]; keys?: string[] }) {
    this.keys = new Set(keys.map(k => k.toLowerCase()));
    this.modifiers = new Set(modifiers);

    if (!modifiers.length && !keys.length) {
      console.error("KeyboardAssignment must have at least one key or modifier");
    }
  }

  isActive = (keysPressed: Set<string>, modifiersPressed: Set<KeyModifiers>) => {
    const modifiersMatch = this.modifiers.intersection(modifiersPressed).size === this.modifiers.size;
    const keysMatch = this.keys.size === 0 || this.keys.intersection(keysPressed).size > 0;
    return modifiersMatch && keysMatch;
  };
}

export class Settings {
  graphEditor: GraphEditor;

  /** Graph panel size */
  get panelSize() {
    return this.#panelSize;
  }
  set panelSize(value: number) {
    this.#panelSize = value;
    this.graphEditor.graphPanel.size = value;
  }
  #panelSize = 500;

  /** Keyboard shortcuts */
  anchorDeleteKeys = new KeyboardAssignment({ keys: ["Delete"] });
  anchorSmoothCornerModifiers = new KeyboardAssignment({ modifiers: ["Shift"] });
  anchorLockMovementModifiers = new KeyboardAssignment({ modifiers: ["Shift"] });
  ctrlLockMovementModifiers = new KeyboardAssignment({ modifiers: ["Shift"] });
  addAnchorModifiers = new KeyboardAssignment({ modifiers: ["Alt"] });
  freeCtrlModifiers = new KeyboardAssignment({ modifiers: ["Alt"] });
  panKeys = new KeyboardAssignment({ keys: [" "] });
  undoKeys = new KeyboardAssignment({ modifiers: [PRIMARY_MODIFIER], keys: ["z"] });
  redoKeys = new KeyboardAssignment({ modifiers: [PRIMARY_MODIFIER], keys: ["y"] });

  panEnabled: boolean = true;

  /** How long a touch has to rest on the path before it adds an anchor point, in milliseconds */
  addAnchorLongPressDuration: number = 500;

  /** How far a touch has to travel before it starts dragging a point, in pixels */
  touchDragStartDistance: number = 8;

  /** Holds a dragged point to one axis, the same as holding the lock movement modifier */
  axisLockEnabled: boolean = false;

  zoomEnabled: boolean = true;
  /** In pixels */
  zoomStep: number = 20;
  /** Minimum panel size in pixels */
  zoomMin: number = 200;
  /** Maximum panel size in pixels */
  zoomMax: number = 2000;

  /** Anchor snap */
  anchorSnapEnabled: boolean = true;
  /** Weather anchor snap to grid */
  anchorSnapToGrid: boolean = true;
  /** Weather anchor snap to other anchors */
  anchorSnapToOtherAnchors: boolean = true;
  /** Weather anchor snap to other control points */
  anchorSnapToOtherCtrl: boolean = true;
  /** Anchor snap distance (in viewBox of size 1) */
  anchorSnapDistance: number = 0.005;

  /** Control point snap */
  ctrlSnapEnabled: boolean = true;
  /** Weather control point snap to grid */
  ctrlSnapToGrid: boolean = true;
  /** Weather control point snap to other anchors */
  ctrlSnapToOtherAnchors: boolean = true;
  /** Weather control point snap to other control points */
  ctrlSnapToOtherCtrl: boolean = true;
  /** Control point snap distance (in viewBox of size 1) */
  ctrlSnapDistance: number = 0.005;

  #autoHidePoints: boolean = false;
  /** Auto hide anchor points and control points when the graph path is not focused */
  get autoHidePoints() {
    return this.#autoHidePoints;
  }
  set autoHidePoints(value: boolean) {
    this.#autoHidePoints = value;
    this.graphEditor.graph.autoHidePoints = value;
  }

  /** Maximum history size for undo/redo */
  maxHistory: number = 100;

  constructor(graphEditor: GraphEditor) {
    this.graphEditor = graphEditor;
  }
}
