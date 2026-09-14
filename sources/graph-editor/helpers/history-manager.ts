import { Points } from "./points";

import type { GraphEditor } from "../graph-editor";
import type { PathCommands } from "./types";

export class HistoryManager {
  readonly graphEditor: GraphEditor;
  readonly points: Points;

  readonly #undoStack: PathCommands[] = [];
  readonly #redoStack: PathCommands[] = [];

  #snapshot: PathCommands | null = null;

  constructor(graphEditor: GraphEditor) {
    this.graphEditor = graphEditor;
    this.points = graphEditor.points;

    graphEditor.keyboardShortcutManager.addListener("Undo", this.undo);
    graphEditor.keyboardShortcutManager.addListener("Redo", this.redo);
  }

  /** `true` while there is a step left to undo */
  get canUndo(): boolean {
    return this.#undoStack.length > 0;
  }

  /** `true` while there is a step left to redo */
  get canRedo(): boolean {
    return this.#redoStack.length > 0;
  }

  undo = () => {
    if (!this.#undoStack.length) return;

    const undoPathCommands = this.#undoStack.pop();
    if (!undoPathCommands) return;

    this.#redoStack.push(this.points.valueCopy);

    this.graphEditor.setFromPoints(undoPathCommands);
    this.graphEditor.dispatchComplete();
  };

  redo = () => {
    if (!this.#redoStack.length) return;

    const redoPathCommands = this.#redoStack.pop();
    if (!redoPathCommands) return;

    this.#undoStack.push(this.points.valueCopy);

    this.graphEditor.setFromPoints(redoPathCommands);
    this.graphEditor.dispatchComplete();
  };

  takeSnapshot = () => {
    this.#snapshot = this.points.valueCopy;
  };

  removeSnapshot = () => {
    this.#snapshot = null;
  };

  addSnapshotToHistory = () => {
    if (!this.#snapshot) return;
    this.updateHistory(this.#snapshot);
    this.#snapshot = null;
  };

  updateHistory = (pathCommands: PathCommands = this.points.value) => {
    if (this.#undoStack.length >= this.graphEditor.settings.maxHistory) {
      this.#undoStack.shift();
    }
    this.#undoStack.push(pathCommands);
    this.#redoStack.length = 0;
  };
}
