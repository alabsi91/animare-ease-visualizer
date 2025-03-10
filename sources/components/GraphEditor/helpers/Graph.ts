import { CubicCommand } from "./CubicCommand.js";
import { MoveCommand } from "./MoveCommand.js";
import { Path } from "./Path.js";

import type { GraphEditor } from "../graphEditorComponent.js";
import type { Points } from "./Points.js";

export class Graph {
  readonly graphEditor: GraphEditor;
  readonly element: SVGSVGElement;
  readonly path: Path;
  readonly anchorsGroup: SVGGElement;
  readonly ctrlGroup: SVGGElement;
  readonly points: Points;

  /** Auto hide anchor points and control points when the graph path is not focused */
  set autoHidePoints(value: boolean) {
    this.element.classList.toggle("auto-hide-points", value);
  }

  /** Force anchor points and control points to be hidden */
  set hidePoints(value: boolean) {
    this.element.classList.toggle("hide-points", value);
  }

  constructor(graphEditor: GraphEditor) {
    this.graphEditor = graphEditor;
    this.points = graphEditor.points;

    // svg
    this.element = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.element.classList.add("graph-svg");
    this.element.style.overflow = "visible";
    this.element.setAttribute("width", "100%");
    this.element.setAttribute("height", "100%");
    this.element.setAttribute("viewBox", `0 0 ${graphEditor.PATH_SVG_VIEW_BOX_SIZE} ${graphEditor.PATH_SVG_VIEW_BOX_SIZE}`);

    // path
    this.path = new Path(graphEditor);
    this.element.insertAdjacentElement("afterbegin", this.path.maskGroup);
    this.element.insertAdjacentElement("afterbegin", this.path.element);

    // controls group
    this.ctrlGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.ctrlGroup.classList.add("ctrl-group");
    this.element.appendChild(this.ctrlGroup);

    // anchors group
    this.anchorsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.anchorsGroup.classList.add("anchors-group");
    this.element.appendChild(this.anchorsGroup);

    // auto hide
    this.autoHidePoints = graphEditor.settings.autoHidePoints;
  }

  drawAnchorPoints() {
    for (let i = 0; i < this.points.value.length; i++) {
      this.addAnchorPoint(i);
    }
  }

  addAnchorPoint(cmdIdx: number) {
    if (cmdIdx === 0) {
      const m = new MoveCommand(this.graphEditor, cmdIdx);
      this.anchorsGroup.insertAdjacentElement("afterbegin", m.anchorPoint.svgCircle);
      return;
    }

    const c = new CubicCommand(this.graphEditor, cmdIdx);
    const ctrl1 = c.controlPoint1;
    const ctrl2 = c.controlPoint2;

    this.ctrlGroup.appendChild(ctrl1.svgLine);
    this.ctrlGroup.appendChild(ctrl2.svgLine);
    this.ctrlGroup.appendChild(ctrl1.svgCircle);
    this.ctrlGroup.appendChild(ctrl2.svgCircle);

    const referenceNode = this.anchorsGroup.children[cmdIdx];
    this.anchorsGroup.insertBefore(c.anchorPoint.svgCircle, referenceNode);
  }

  /** @param mutatePoints - Also mutate `PathCommands` data, or just safely remove elements and listeners */
  clear(mutatePoints = true) {
    const commandsRefCopy = Array.from(this.graphEditor.commandsRef);
    for (let i = 0; i < commandsRefCopy.length; i++) {
      commandsRefCopy[i].remove(mutatePoints);
    }
  }

  rerender() {
    this.clear(false);
    this.drawAnchorPoints();
  }
}
