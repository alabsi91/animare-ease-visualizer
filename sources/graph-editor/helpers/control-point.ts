import { arePointsCollinear, mirrorPoint } from "@graph-editor/helpers/geometry";

import type { GraphEditor } from "../graph-editor";
import type { Points } from "./points";
import type { PointAddress } from "./types";

export class ControlPoint {
  readonly ctrlAddress: PointAddress;
  readonly graphEditor: GraphEditor;
  readonly points: Points;
  readonly svgLine: SVGLineElement;
  readonly svgCircle: SVGCircleElement;

  readonly #gridPoints: number[] = new Array(11).fill(0).map((_, i) => i / 10);
  readonly #anchorsXCoordinates: number[] = [];
  readonly #anchorsYCoordinates: number[] = [];
  readonly #otherCtrlXCoordinates: number[] = [];
  readonly #otherCtrlYCoordinates: number[] = [];

  #startPointerPos = { x: 0, y: 0 };
  #lockedDirection: "x" | "y" | null = null;
  #isCtrlFree = false;
  #updateHistory = false;

  #isActive = false;
  get isActive() {
    return this.#isActive;
  }
  set isActive(value: boolean) {
    this.#isActive = value;
    this.svgCircle.classList.toggle("active-ctrl-circle", value);
    this.svgLine.classList.toggle("active-ctrl-line", value);
  }

  get x() {
    return this.points.getPointX(this.ctrlAddress);
  }
  set x(value: number) {
    this.points.setPointX(this.ctrlAddress, value);
  }

  get y() {
    return this.points.getPointY(this.ctrlAddress);
  }
  set y(value: number) {
    this.points.setPointY(this.ctrlAddress, value);
  }

  /** Whether this control point is the first one in the cubic bezier command */
  get isFirstCtrl() {
    return this.ctrlAddress[1] === 0;
  }

  /** Whether this control point is the second one in the cubic bezier command */
  get isSecondCtrl() {
    return this.ctrlAddress[1] === 2;
  }

  /** Get the anchor point command index that this control point is attached to */
  get anchorIdx() {
    // the first control point of a curve is attached to the previous command anchor
    // the second control point of a curve is attached to the current command anchor
    return this.isFirstCtrl ? this.ctrlAddress[0] - 1 : this.ctrlAddress[0];
  }

  #abortController = new AbortController();

  constructor(graphEditor: GraphEditor, ctrlAddress: PointAddress) {
    this.graphEditor = graphEditor;
    this.points = graphEditor.points;
    this.ctrlAddress = ctrlAddress;

    const signal = this.#abortController.signal;

    // control handle
    const cl = document.createElementNS("http://www.w3.org/2000/svg", "line");
    cl.classList.add("ctrl-line");
    cl.setAttribute("vector-effect", "non-scaling-stroke");
    this.svgLine = cl;

    // control point
    const cp = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    cp.classList.add("ctrl-circle");
    cp.addEventListener("pointerdown", this.#onPointerDown, { signal });
    cp.setAttribute("tabindex", "0");
    this.svgCircle = cp;

    this.#updateCtrl();

    document.addEventListener("pointerup", this.#onPointerUp, { signal });
    document.addEventListener("pointermove", this.#onPointerMove, { signal });
    this.points.events.onUpdate.add(this.#updateCtrl, signal);
    this.points.events.onDelete.add(this.#onCmdDelete, signal);
    this.points.events.onAdd.add(this.#onCmdAdd, signal);
  }

  remove = () => {
    this.#abortController.abort();
    this.svgLine.remove();
    this.svgCircle.remove();
  };

  #onCmdAdd = (addedCmdIdx: number) => {
    if (addedCmdIdx <= this.ctrlAddress[0]) {
      this.ctrlAddress[0]++;
    }
  };

  #onCmdDelete = (removedCmdIdx: number) => {
    const currentCmdIdx = this.ctrlAddress[0];
    if (removedCmdIdx < currentCmdIdx) {
      this.ctrlAddress[0] = currentCmdIdx - 1;
    }

    // this cmd is taking the place of the deleted cmd
    if (removedCmdIdx === this.ctrlAddress[0] && this.isFirstCtrl) {
      const removedCtrlCoords = this.points.getPoint(this.ctrlAddress);
      this.points.setPoint([currentCmdIdx, 0], removedCtrlCoords);
    }
  };

  /** Update the position of the control point and handle */
  #updateCtrl = () => {
    const [x, y] = this.points.getAnchorCoordinates(this.anchorIdx);
    const [cx, cy] = this.points.getPoint(this.ctrlAddress);

    const PATH_SVG_VIEW_BOX_SIZE = this.graphEditor.PATH_SVG_VIEW_BOX_SIZE;
    this.svgCircle.setAttribute("cx", `${cx * PATH_SVG_VIEW_BOX_SIZE}`);
    this.svgCircle.setAttribute("cy", `${cy * PATH_SVG_VIEW_BOX_SIZE}`);
    this.svgLine.setAttribute("x1", `${x * PATH_SVG_VIEW_BOX_SIZE}`);
    this.svgLine.setAttribute("y1", `${y * PATH_SVG_VIEW_BOX_SIZE}`);
    this.svgLine.setAttribute("x2", `${cx * PATH_SVG_VIEW_BOX_SIZE}`);
    this.svgLine.setAttribute("y2", `${cy * PATH_SVG_VIEW_BOX_SIZE}`);
  };

  /** Every anchor point has one or more control points, in case of 2 ctrls get the address of the other one */
  #getSiblingCtrlAddress(): PointAddress | null {
    const [currentCmdIdx, cxIdx] = this.ctrlAddress;
    const prevCmdIdx = currentCmdIdx - 1;
    const nextCmdIdx = currentCmdIdx + 1;

    const isFirstCtrl = cxIdx === 0;

    // look in the previous command
    if (isFirstCtrl) {
      if (prevCmdIdx <= 0) return null;
      return [prevCmdIdx, 2];
    }

    // look in the next command
    if (nextCmdIdx >= this.points.length) return null;
    return [nextCmdIdx, 0];
  }

  /** Get all anchor points coordinates and save them */
  #prepareOtherAnchorCoordinates() {
    this.#anchorsXCoordinates.length = 0;
    this.#anchorsYCoordinates.length = 0;

    for (let i = 0; i < this.points.length; i++) {
      const [x, y] = this.points.getAnchorCoordinates(i);
      this.#anchorsXCoordinates.push(x);
      this.#anchorsYCoordinates.push(y);
    }
  }

  /** Get all other control point coordinates and save them */
  #prepareOtherCtrlCoordinates() {
    const ctrlAddress = this.ctrlAddress;
    this.#otherCtrlXCoordinates.length = 0;
    this.#otherCtrlYCoordinates.length = 0;

    for (let i = 1; i < this.points.length; i++) {
      const address1Match = ctrlAddress[0] === i && ctrlAddress[1] === 0;
      if (!address1Match) {
        const [x1, y1] = this.points.getPoint([i, 0]);
        this.#otherCtrlXCoordinates.push(x1);
        this.#otherCtrlYCoordinates.push(y1);
      }

      const address2Match = ctrlAddress[0] === i && ctrlAddress[1] === 2;
      if (!address2Match) {
        const [x2, y2] = this.points.getPoint([i, 2]);
        this.#otherCtrlXCoordinates.push(x2);
        this.#otherCtrlYCoordinates.push(y2);
      }
    }
  }

  #onPointerDown = (e: PointerEvent) => {
    this.isActive = true;
    this.#startPointerPos = { x: e.clientX, y: e.clientY };
    this.graphEditor.historyManager.takeSnapshot();

    if (this.graphEditor.settings.ctrlSnapEnabled) {
      if (this.graphEditor.settings.ctrlSnapToOtherAnchors) {
        this.#prepareOtherAnchorCoordinates();
      }

      if (this.graphEditor.settings.ctrlSnapToOtherCtrl) {
        this.#prepareOtherCtrlCoordinates();
      }
    }

    if (this.graphEditor.keyboardShortcutManager.isFreeCtrlModifiersPressed) {
      this.#isCtrlFree = true;
      return;
    }

    const siblingCtrlAddress = this.#getSiblingCtrlAddress();
    if (!siblingCtrlAddress) {
      this.#isCtrlFree = true;
      return;
    }

    const p1 = this.points.getPoint(this.ctrlAddress);
    const p2 = this.points.getAnchorCoordinates(this.anchorIdx);
    const p3 = this.points.getPoint(siblingCtrlAddress);
    this.#isCtrlFree = !arePointsCollinear(p1, p2, p3);
  };

  #onPointerUp = () => {
    this.isActive = false;
    this.#lockedDirection = null;

    if (!this.#updateHistory) return;
    this.#updateHistory = false;
    this.graphEditor.historyManager.addSnapshotToHistory();
    this.graphEditor.dispatchComplete();
  };

  #onPointerMove = (e: PointerEvent) => {
    if (!this.isActive || this.graphEditor.isPinching) return;

    const isCtrlLockMovementPressed = this.graphEditor.keyboardShortcutManager.isCtrlLockMovementModifiersPressed;
    if (this.#lockedDirection === null && isCtrlLockMovementPressed) {
      const dirX = Math.abs(e.clientX - this.#startPointerPos.x);
      const dirY = Math.abs(e.clientY - this.#startPointerPos.y);
      this.#lockedDirection = dirX > dirY ? "x" : "y";
    } else if (this.#lockedDirection !== null && !isCtrlLockMovementPressed) {
      this.#lockedDirection = null;
    }

    const panel = this.graphEditor.graphPanel;

    const dx = e.clientX - (this.graphEditor.offsetLeft + panel.x);
    const dy = e.clientY - (this.graphEditor.offsetTop + panel.y);

    const currentX = this.x;
    const currentY = this.y;

    let x = this.#lockedDirection === "y" ? currentX : (1 / panel.size) * dx;
    let y = this.#lockedDirection === "x" ? currentY : (1 / panel.size) * dy;

    if (this.graphEditor.settings.ctrlSnapEnabled) {
      const snapThreshold = this.graphEditor.settings.ctrlSnapDistance;

      // snap to grid
      if (this.graphEditor.settings.ctrlSnapToGrid) {
        x = this.#gridPoints.find(p => x + snapThreshold > p && x - snapThreshold < p) ?? x;
        y = this.#gridPoints.find(p => y + snapThreshold > p && y - snapThreshold < p) ?? y;
      }

      // snap to other anchor points
      if (this.graphEditor.settings.ctrlSnapToOtherAnchors) {
        x = this.#anchorsXCoordinates.find(p => x + snapThreshold > p && x - snapThreshold < p) ?? x;
        y = this.#anchorsYCoordinates.find(p => y + snapThreshold > p && y - snapThreshold < p) ?? y;
      }

      // snap to other control points
      if (this.graphEditor.settings.ctrlSnapToOtherCtrl) {
        x = this.#otherCtrlXCoordinates.find(p => x + snapThreshold > p && x - snapThreshold < p) ?? x;
        y = this.#otherCtrlYCoordinates.find(p => y + snapThreshold > p && y - snapThreshold < p) ?? y;
      }
    }

    // mirror the opposite control point
    if (!this.#isCtrlFree) {
      const siblingCtrlAddress = this.#getSiblingCtrlAddress();
      if (siblingCtrlAddress) {
        const anchorCoords = this.points.getAnchorCoordinates(this.anchorIdx);
        const siblingCtrlCoords = this.points.getPoint(siblingCtrlAddress);
        const newSiblingCtrlCoords = mirrorPoint([x, y], siblingCtrlCoords, anchorCoords);
        this.points.setPoint(siblingCtrlAddress, newSiblingCtrlCoords);
      }
    }

    this.x = x;
    this.y = y;

    this.points.events.onUpdate.fire();
    this.#updateHistory = true;
  };
}
