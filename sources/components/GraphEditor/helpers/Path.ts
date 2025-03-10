import { solveTFromPositionX, splitCurveAtT } from "~/sources/components/GraphEditor/helpers/geometry";
import { Points } from "./Points";

import type { GraphEditor } from "../graphEditorComponent";
import type { C_CMD, M_CMD } from "./types";

export class Path {
  readonly element: SVGPathElement;
  readonly graphEditor: GraphEditor;
  readonly points: Points;
  readonly maskGroup: SVGGElement;
  readonly maskRect: SVGRectElement;

  get d() {
    return this.element.getAttribute("d")!;
  }
  set d(val: string) {
    this.element.setAttribute("d", val);
  }

  set animFilledPath(value: number) {
    this.maskRect.setAttribute("width", `${value}%`);
  }

  constructor(graphEditor: GraphEditor) {
    this.graphEditor = graphEditor;
    this.points = graphEditor.points;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.id = "graph-path";
    path.classList.add("graph-path");
    path.setAttribute("d", "M 0 1 1 0");
    path.setAttribute("fill", "none");
    path.setAttribute("vector-effect", "non-scaling-stroke");
    path.setAttribute("tabindex", "0");
    this.element = path;

    // mask group (fill animation)
    const maskGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    maskGroup.classList.add("graph-path-fill");
    this.maskGroup = maskGroup;

    const mask = document.createElementNS("http://www.w3.org/2000/svg", "mask");
    mask.id = "path-mask";
    maskGroup.appendChild(mask);

    const maskRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    maskRect.setAttribute("x", "0");
    maskRect.setAttribute("y", "-200%");
    maskRect.setAttribute("width", "0");
    maskRect.setAttribute("height", "500%");
    maskRect.setAttribute("fill", "white");
    mask.appendChild(maskRect);
    this.maskRect = maskRect;

    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.classList.add("graph-path-use");
    use.setAttribute("href", "#graph-path");
    use.setAttribute("mask", "url(#path-mask)");
    maskGroup.appendChild(use);

    this.updatePath();

    const signal = graphEditor.abortController.signal;
    path.addEventListener("pointerdown", this.#onPointerDown, { signal });
    this.points.events.onUpdate.add(this.updatePath, signal);
  }

  updatePath = () => {
    const normalizeValues = this.points.scale(this.graphEditor.PATH_SVG_VIEW_BOX_SIZE);
    this.d = Points.constructPathStr(normalizeValues);
  };

  #onPointerDown = (e: PointerEvent) => {
    if (!this.graphEditor.keyboardShortcutManager.isAddAnchorModifiersPressed) return;

    const shadow = this.graphEditor.shadowRoot;
    if (!shadow) return;

    const PATH_SVG_VIEW_BOX_SIZE = this.graphEditor.PATH_SVG_VIEW_BOX_SIZE;

    // not a performant solution but reliable
    let clickedCurveIdx = 0;
    for (let i = 1; i < this.points.length; i++) {
      const prevAnchor = this.points.getAnchorCoordinates(i - 1) as M_CMD;
      const cmd = this.points.getCmd(i) as C_CMD;
      const pathCmds = Points.scale([prevAnchor, cmd], PATH_SVG_VIEW_BOX_SIZE);
      this.d = Points.constructPathStr(pathCmds);

      const clickHit = shadow.elementsFromPoint(e.clientX, e.clientY).includes(this.element);
      if (!clickHit) continue;

      this.updatePath(); // revert
      clickedCurveIdx = i;
      break;
    }

    // failed
    if (clickedCurveIdx === 0) {
      this.updatePath(); // revert
      return;
    }

    const { left: editorX, top: editorY } = this.graphEditor.getBoundingClientRect();
    let clickX = e.clientX - (editorX + this.graphEditor.graphPanel.x); // relative to panel
    clickX = clickX * (PATH_SVG_VIEW_BOX_SIZE / this.graphEditor.graphPanel.size); // scale
    clickX /= PATH_SVG_VIEW_BOX_SIZE; // normalize

    const p0 = this.points.getAnchorCoordinates(clickedCurveIdx - 1);
    const c0 = this.points.getPoint([clickedCurveIdx, 0]);
    const c1 = this.points.getPoint([clickedCurveIdx, 2]);
    const p1 = this.points.getAnchorCoordinates(clickedCurveIdx);

    const t = solveTFromPositionX(p0, c0, c1, p1, clickX);

    if (t !== null) {
      // adding a new curve without changing the path shape by using Casteljau's algorithm
      const { left: leftCurve, right: rightCurve } = splitCurveAtT(p0, c0, c1, p1, t);
      this.points.setCmd(clickedCurveIdx, [rightCurve[0], rightCurve[1], rightCurve[2], rightCurve[3], p1[0], p1[1]]);
      this.points.addCmd(clickedCurveIdx, leftCurve);
    } else {
      // For curves that are not "valid" (a curve going backwards against the time)
      // we add a new curve that will change the path shape
      let clickY = e.clientY - (editorY + this.graphEditor.graphPanel.y); // relative to panel
      clickY = clickY * (PATH_SVG_VIEW_BOX_SIZE / this.graphEditor.graphPanel.size); // scale
      clickY /= PATH_SVG_VIEW_BOX_SIZE; // normalize

      const prevCmdIdx = clickedCurveIdx - 1;
      const prevCtrl2 = prevCmdIdx <= 0 ? p0 : this.points.getPoint([prevCmdIdx, 2]);
      const ctrlOffset = 0.05;

      this.points.setPoint([clickedCurveIdx, 0], [clickX - ctrlOffset, clickY + ctrlOffset]);
      this.points.addCmd(clickedCurveIdx, [prevCtrl2[0], prevCtrl2[1], clickX + ctrlOffset, clickY - ctrlOffset, clickX, clickY]);
    }

    this.graphEditor.graph.addAnchorPoint(clickedCurveIdx);
    this.points.events.onUpdate.fire();
    this.graphEditor.dispatchEvent(this.graphEditor.events.onComplete);
  };
}
