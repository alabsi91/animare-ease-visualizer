import type { GraphEditor } from "../graphEditorComponent";
import type { Points } from "./Points";
import type { PointAddress } from "./types";

export class AnchorPoint {
  readonly graphEditor: GraphEditor;
  readonly points: Points;
  readonly svgCircle: SVGCircleElement;
  cmdIdx: number;

  readonly #gridPoints: number[] = new Array(11).fill(0).map((_, i) => i / 10);
  readonly #otherAnchorXCoordinates: number[] = [];
  readonly #otherAnchorYCoordinates: number[] = [];
  readonly #otherCtrlXCoordinates: number[] = [];
  readonly #otherCtrlYCoordinates: number[] = [];

  #startPointerPos = { x: 0, y: 0 };
  #lockedDirection: "x" | "y" | null = null;
  #isChanged = false;

  #isActive = false;
  get isActive() {
    return this.#isActive;
  }
  set isActive(val: boolean) {
    this.#isActive = val;
    this.svgCircle.classList.toggle("active-anchor-circle", val);
  }

  get isFocused() {
    return this.svgCircle.matches(":focus");
  }

  get x() {
    const command = this.points.getCmd(this.cmdIdx);
    return command[command.length - 2];
  }
  set x(value: number) {
    const command = this.points.getCmd(this.cmdIdx);
    command[command.length - 2] = value;
  }

  get y() {
    const command = this.points.getCmd(this.cmdIdx);
    return command[command.length - 1];
  }
  set y(value: number) {
    const command = this.points.getCmd(this.cmdIdx);
    command[command.length - 1] = value;
  }

  #abortController = new AbortController();

  constructor(graphEditor: GraphEditor, cmdIdx: number) {
    this.graphEditor = graphEditor;
    this.points = graphEditor.points;
    this.cmdIdx = cmdIdx;

    const signal = this.#abortController.signal;

    const p = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    p.classList.add("anchor-circle");
    p.setAttribute("tabindex", "0");
    p.addEventListener("pointerdown", this.#onPointerDown, { signal });
    this.svgCircle = p;

    document.addEventListener("pointerup", this.#onPointerUp, { signal });
    document.addEventListener("pointermove", this.#onPointerMove, { signal });

    this.#updateAnchorPosition();
    this.points.events.onUpdate.add(this.#updateAnchorPosition, signal);
    this.points.events.onDelete.add(this.#onCmdDelete, signal);
    this.points.events.onAdd.add(this.#onCmdAdd, signal);
  }

  remove() {
    this.#abortController.abort();
    this.svgCircle.remove();
  }

  #onCmdAdd = (cmdIdx: number) => {
    if (cmdIdx <= this.cmdIdx) {
      this.cmdIdx += 1;
    }
  };

  #onCmdDelete = (removedCmdIdx: number) => {
    if (removedCmdIdx < this.cmdIdx) {
      this.cmdIdx -= 1;
    }
  };

  #updateAnchorPosition = () => {
    const [x, y] = this.points.getAnchorCoordinates(this.cmdIdx);
    this.svgCircle.setAttribute("cx", `${x * this.graphEditor.PATH_SVG_VIEW_BOX_SIZE}`);
    this.svgCircle.setAttribute("cy", `${y * this.graphEditor.PATH_SVG_VIEW_BOX_SIZE}`);
  };

  /** Each anchor point has one or two control points attached to it */
  #getAttachedCtrlAddress() {
    const currentCmdIdx = this.cmdIdx;
    const nextCmdIdx = currentCmdIdx + 1;
    const length = this.points.value.length;

    // M command does not have control points
    const sameCmdCtrl = currentCmdIdx === 0 ? null : ([currentCmdIdx, 2] as PointAddress);
    // last C command has only one control point
    const nextCmdCtrl = nextCmdIdx >= length ? null : ([nextCmdIdx, 0] as PointAddress);

    return [sameCmdCtrl, nextCmdCtrl] as const;
  }

  #toggleSmoothCorner() {
    const currentX = this.x;
    const currentY = this.y;
    const [ctrl1Address, ctrl2Address] = this.#getAttachedCtrlAddress();

    let ctrl1HasSmoothCornerOn = true;
    if (ctrl1Address) {
      const [cx1, cy1] = this.points.getPoint(ctrl1Address);
      ctrl1HasSmoothCornerOn = cx1 === currentX && cy1 === currentY;
    }

    let ctrl2HasSmoothCornerOn = true;
    if (ctrl2Address) {
      const [cx2, cy2] = this.points.getPoint(ctrl2Address);
      ctrl2HasSmoothCornerOn = cx2 === currentX && cy2 === currentY;
    }

    const isSmoothCornerOn = ctrl1HasSmoothCornerOn && ctrl2HasSmoothCornerOn;
    const offset = isSmoothCornerOn ? 0.1 : 0;
    if (ctrl1Address) this.points.setPoint(ctrl1Address, [currentX - offset, currentY + offset]);
    if (ctrl2Address) this.points.setPoint(ctrl2Address, [currentX + offset, currentY - offset]);
    this.points.events.onUpdate.fire();
  }

  /** Get all other anchor coordinates except current anchor and save them */
  #prepareOtherAnchorCoordinates() {
    this.#otherAnchorXCoordinates.length = 0;
    this.#otherAnchorYCoordinates.length = 0;

    for (let i = 0; i < this.points.length; i++) {
      if (i === this.cmdIdx) continue;
      const [x, y] = this.points.getAnchorCoordinates(i);
      this.#otherAnchorXCoordinates.push(x);
      this.#otherAnchorYCoordinates.push(y);
    }
  }

  /** Get all other control point coordinates and save them */
  #prepareOtherCtrlCoordinates() {
    const [ctrl1Address, ctrl2Address] = this.#getAttachedCtrlAddress();

    this.#otherCtrlXCoordinates.length = 0;
    this.#otherCtrlYCoordinates.length = 0;
    for (let i = 1; i < this.points.length; i++) {
      const address1Match =
        (ctrl1Address && ctrl1Address[0] === i && ctrl1Address[1] === 0) ||
        (ctrl2Address && ctrl2Address[0] === i && ctrl2Address[1] === 0);

      const address2Match =
        (ctrl1Address && ctrl1Address[0] === i && ctrl1Address[1] === 2) ||
        (ctrl2Address && ctrl2Address[0] === i && ctrl2Address[1] === 2);

      if (!address1Match) {
        const [x, y] = this.points.getPoint([i, 0]);
        this.#otherCtrlXCoordinates.push(x);
        this.#otherCtrlYCoordinates.push(y);
      }

      if (!address2Match) {
        const [x, y] = this.points.getPoint([i, 2]);
        this.#otherCtrlXCoordinates.push(x);
        this.#otherCtrlYCoordinates.push(y);
      }
    }
  }

  #onPointerDown = (e: PointerEvent) => {
    this.isActive = true;
    this.#startPointerPos = { x: e.clientX, y: e.clientY };
    this.graphEditor.historyManager.takeSnapshot();

    // smooth corner
    if (this.graphEditor.keyboardShortcutManager.isSmoothCornerModifiersPressed) {
      this.#toggleSmoothCorner();
      this.#isChanged = true;
    }

    if (this.graphEditor.settings.anchorSnapEnabled) {
      if (this.graphEditor.settings.anchorSnapToOtherAnchors) {
        this.#prepareOtherAnchorCoordinates();
      }

      if (this.graphEditor.settings.anchorSnapToOtherCtrl) {
        this.#prepareOtherCtrlCoordinates();
      }
    }
  };

  #onPointerUp = () => {
    this.isActive = false;
    this.#lockedDirection = null;

    if (!this.#isChanged) return;
    this.#isChanged = false;
    this.graphEditor.historyManager.addSnapshotToHistory();
    this.graphEditor.dispatchEvent(this.graphEditor.events.onComplete);
  };

  #onPointerMove = (e: PointerEvent) => {
    if (!this.isActive) return;

    const isAnchorLockMovementPressed = this.graphEditor.keyboardShortcutManager.isAnchorLockMovementModifiersPressed;
    if (this.#lockedDirection === null && isAnchorLockMovementPressed) {
      const dirX = Math.abs(e.clientX - this.#startPointerPos.x);
      const dirY = Math.abs(e.clientY - this.#startPointerPos.y);
      this.#lockedDirection = dirX > dirY ? "x" : "y";
    } else if (this.#lockedDirection !== null && !isAnchorLockMovementPressed) {
      this.#lockedDirection = null;
    }

    const graphPanel = this.graphEditor.graphPanel;

    const dx = e.clientX - (this.graphEditor.offsetLeft + graphPanel.x);
    const dy = e.clientY - (this.graphEditor.offsetTop + graphPanel.y);

    const currentX = this.x;
    const currentY = this.y;

    let x = this.#lockedDirection === "y" ? currentX : (1 / graphPanel.size) * dx;
    let y = this.#lockedDirection === "x" ? currentY : (1 / graphPanel.size) * dy;

    // First or last point should not change its x coordinates (only y)
    const isEdgePoint = this.cmdIdx === 0 || this.cmdIdx === this.points.value.length - 1;
    if (isEdgePoint) {
      x = currentX;
    }

    if (this.graphEditor.settings.anchorSnapEnabled) {
      const snapThreshold = this.graphEditor.settings.anchorSnapDistance;

      // snap to grid
      if (this.graphEditor.settings.anchorSnapToGrid) {
        x = this.#gridPoints.find(p => x + snapThreshold > p && x - snapThreshold < p) ?? x;
        y = this.#gridPoints.find(p => y + snapThreshold > p && y - snapThreshold < p) ?? y;
      }

      // snap to other anchor points
      if (this.graphEditor.settings.anchorSnapToOtherAnchors) {
        x = this.#otherAnchorXCoordinates.find(p => x + snapThreshold > p && x - snapThreshold < p) ?? x;
        y = this.#otherAnchorYCoordinates.find(p => y + snapThreshold > p && y - snapThreshold < p) ?? y;
      }

      // snap to other control points
      if (this.graphEditor.settings.anchorSnapToOtherCtrl) {
        x = this.#otherCtrlXCoordinates.find(p => x + snapThreshold > p && x - snapThreshold < p) ?? x;
        y = this.#otherCtrlYCoordinates.find(p => y + snapThreshold > p && y - snapThreshold < p) ?? y;
      }
    }

    // move control points along with the anchor
    const [ctrl1Address, ctrl2Address] = this.#getAttachedCtrlAddress();
    if (ctrl1Address) {
      const [cx1, cy1] = this.points.getPoint(ctrl1Address);
      const distanceX = cx1 - currentX;
      const distanceY = cy1 - currentY;
      this.points.setPoint(ctrl1Address, [distanceX + x, distanceY + y]);
    }

    if (ctrl2Address) {
      const [cx1, cy1] = this.points.getPoint(ctrl2Address);
      const distanceX = cx1 - currentX;
      const distanceY = cy1 - currentY;
      this.points.setPoint(ctrl2Address, [distanceX + x, distanceY + y]);
    }

    this.x = x;
    this.y = y;

    this.points.events.onUpdate.fire();
    this.#isChanged = true;
  };
}
