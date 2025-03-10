import { AnchorPoint } from "./AnchorPoint";
import { ControlPoint } from "./ControlPoint";

import type { GraphEditor } from "../graphEditorComponent";
import type { Points } from "./Points";

export class CubicCommand {
  readonly graphEditor: GraphEditor;
  readonly points: Points;
  readonly anchorPoint: AnchorPoint;
  readonly controlPoint1: ControlPoint;
  readonly controlPoint2: ControlPoint;

  constructor(graphEditor: GraphEditor, cmdIdx: number) {
    this.graphEditor = graphEditor;
    this.points = graphEditor.points;
    this.anchorPoint = new AnchorPoint(graphEditor, cmdIdx);
    this.controlPoint1 = new ControlPoint(graphEditor, [cmdIdx, 0]);
    this.controlPoint2 = new ControlPoint(graphEditor, [cmdIdx, 2]);

    this.graphEditor.commandsRef.push(this);
    this.graphEditor.keyboardShortcutManager.addListener("DeleteAnchor", this.#deleteHandler);
  }

  /** @param mutatePoints - Also mutate `PathCommands` data, or just safely remove elements and listeners */
  remove(mutatePoints = true) {
    this.graphEditor.commandsRef = this.graphEditor.commandsRef.filter(p => p !== this);
    this.graphEditor.keyboardShortcutManager.removeListener("DeleteAnchor", this.#deleteHandler);
    this.anchorPoint.remove();
    this.controlPoint1.remove();
    this.controlPoint2.remove();

    if (!mutatePoints) return;
    this.points.removeCmd(this.anchorPoint.cmdIdx);
    this.points.events.onUpdate.fire();
  }

  #deleteHandler = () => {
    if (!this.anchorPoint.isFocused) return;
    if (this.anchorPoint.cmdIdx === this.points.length - 1) {
      console.warn("Cannot delete the last command");
      return;
    }

    this.graphEditor.historyManager.takeSnapshot();
    this.remove();
    this.graphEditor.historyManager.addSnapshotToHistory();
    this.graphEditor.dispatchEvent(this.graphEditor.events.onComplete);
  };
}
