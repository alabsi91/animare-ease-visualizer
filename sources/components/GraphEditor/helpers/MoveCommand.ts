import { AnchorPoint } from "./AnchorPoint";
import type { GraphEditor } from "../graphEditorComponent";
import type { Points } from "./Points";

export class MoveCommand {
  graphEditor: GraphEditor;
  points: Points;
  anchorPoint: AnchorPoint;

  constructor(graphEditor: GraphEditor, cmdIdx: number) {
    this.graphEditor = graphEditor;
    this.points = graphEditor.points;
    this.anchorPoint = new AnchorPoint(graphEditor, cmdIdx);

    this.graphEditor.commandsRef.push(this);
  }

  /** @param mutatePoints - Also mutate `PathCommands` data, or just safely remove elements and listeners */
  remove(mutatePoints = true) {
    this.graphEditor.commandsRef = this.graphEditor.commandsRef.filter(p => p !== this);
    this.anchorPoint.remove();

    if (!mutatePoints) return;
    this.points.removeCmd(this.anchorPoint.cmdIdx);
    this.points.events.onUpdate.fire();
  }
}
