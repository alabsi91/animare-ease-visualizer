import { Points } from "./Points";

import type { Graph } from "./Graph";
import type { GraphEditor } from "../graphEditorComponent";
import type { PathCommands } from "./types";

export class HistoryManager {
  readonly graphEditor: GraphEditor;
  readonly points: Points;
  readonly graph: Graph;

  readonly #undoStack: PathCommands[] = [];
  readonly #redoStack: PathCommands[] = [];

  #snapshot: PathCommands | null = null;

  constructor(graphEditor: GraphEditor) {
    this.graphEditor = graphEditor;
    this.points = graphEditor.points;
    this.graph = graphEditor.graph;

    graphEditor.keyboardShortcutManager.addListener("Undo", this.undo);
    graphEditor.keyboardShortcutManager.addListener("Redo", this.redo);
  }

  undo = () => {
    if (!this.#undoStack.length) return;

    const undoPathCommands = this.#undoStack.pop();
    if (!undoPathCommands) return;

    this.#redoStack.push(this.points.valueCopy);
    this.points.set(undoPathCommands);

    this.graph.rerender();
    this.graphEditor.graph.path.updatePath();
    this.graphEditor.dispatchEvent(this.graphEditor.events.onComplete);
  };

  redo = () => {
    if (!this.#redoStack.length) return;

    const redoPathCommands = this.#redoStack.pop();
    if (!redoPathCommands) return;

    this.#undoStack.push(this.points.valueCopy);
    this.points.set(redoPathCommands);

    this.graph.rerender();
    this.graphEditor.graph.path.updatePath();
    this.graphEditor.dispatchEvent(this.graphEditor.events.onComplete);
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
