import { AnchorPoint } from "./anchor-point";
import type { GraphEditor } from "../graph-editor";
import type { Points } from "./points";

export class MoveCommand {
  readonly graphEditor: GraphEditor;
  readonly points: Points;
  readonly anchorPoint: AnchorPoint;

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
