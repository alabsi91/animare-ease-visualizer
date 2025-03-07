import type { GraphEditor } from "../graphEditorComponent";
import type { KeyModifiers } from "./types";

class KeyboardAssignment {
  keys: Set<string>;
  modifiers: Set<KeyModifiers>;

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

  #panelSize = 500;
  /** Graph panel size */
  get panelSize() {
    return this.#panelSize;
  }
  set panelSize(value: number) {
    this.#panelSize = value;
    this.graphEditor.graphPanel.size = value;
  }

  /** Keyboard shortcuts */
  anchorDeleteKeys = new KeyboardAssignment({ keys: ["Delete"] });
  anchorSmoothCornerModifiers = new KeyboardAssignment({ modifiers: ["Control"] });
  anchorLockMovementModifiers = new KeyboardAssignment({ modifiers: ["Shift"] });
  ctrlLockMovementModifiers = new KeyboardAssignment({ modifiers: ["Shift"] });
  addAnchorModifiers = new KeyboardAssignment({ modifiers: ["Alt"] });
  freeCtrlModifiers = new KeyboardAssignment({ modifiers: ["Control"] });
  panKeys = new KeyboardAssignment({ keys: [" "] });
  undoKeys = new KeyboardAssignment({ modifiers: ["Control"], keys: ["z"] });
  redoKeys = new KeyboardAssignment({ modifiers: ["Control"], keys: ["y"] });

  panEnabled: boolean = true;

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
