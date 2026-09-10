import { CubicCommand } from "./cubic-command";

import type { GraphEditor } from "../graph-editor";
import type { MoveCommand } from "./move-command";

const SMOOTH_CORNER_ICON = /*html*/ `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path class="point-action-curve" d="M3 19C10 19 14 5 21 5" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
`;

const UNDO_ICON = /*html*/ `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path class="point-action-curve" d="M4 10h9a5 5 0 0 1 0 10h-3" />
    <path class="point-action-curve" d="M8 6 4 10l4 4" />
  </svg>
`;

const REDO_ICON = /*html*/ `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path class="point-action-curve" d="M20 10h-9a5 5 0 0 0 0 10h3" />
    <path class="point-action-curve" d="M16 6l4 4-4 4" />
  </svg>
`;

const FREE_CTRL_ICON = /*html*/ `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path class="point-action-curve" d="M4 18 12 12 20 14" />
    <circle cx="12" cy="12" r="2.4" />
    <circle cx="4" cy="18" r="1.8" />
    <circle cx="20" cy="14" r="1.8" />
  </svg>
`;

const AXIS_LOCK_ICON = /*html*/ `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path class="point-action-curve" d="M12 3v18M3 12h18" />
    <circle cx="12" cy="12" r="2.4" />
  </svg>
`;

const DELETE_ICON = /*html*/ `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z" />
  </svg>
`;

export class PointActions {
  readonly graphEditor: GraphEditor;
  readonly element: HTMLDivElement;

  readonly #undoButton: HTMLButtonElement;
  readonly #redoButton: HTMLButtonElement;
  readonly #axisLockButton: HTMLButtonElement;
  readonly #freeCtrlButton: HTMLButtonElement;
  readonly #smoothCornerButton: HTMLButtonElement;
  readonly #deleteButton: HTMLButtonElement;
  readonly #tooltips: { tooltip: HTMLElementTagNameMap["sv-tooltip"]; button: HTMLButtonElement }[] = [];

  #focusedAnchorCircle: Element | null = null;

  constructor(graphEditor: GraphEditor) {
    this.graphEditor = graphEditor;

    this.element = document.createElement("div");
    this.element.classList.add("point-actions");

    this.#undoButton = this.#addButton("Undo", UNDO_ICON, graphEditor.historyManager.undo);
    this.#redoButton = this.#addButton("Redo", REDO_ICON, graphEditor.historyManager.redo);
    this.#axisLockButton = this.#addButton("Hold a drag to one axis", AXIS_LOCK_ICON, this.#onAxisLockClick);
    this.#freeCtrlButton = this.#addButton("Move control points on their own", FREE_CTRL_ICON, this.#onFreeCtrlClick);
    this.#smoothCornerButton = this.#addButton("Toggle smooth corner", SMOOTH_CORNER_ICON, this.#onSmoothCornerClick);
    this.#deleteButton = this.#addButton("Delete anchor point", DELETE_ICON, this.#onDeleteClick);

    this.#syncToFocusedAnchor();

    const signal = graphEditor.abortController.signal;
    graphEditor.addEventListener("complete", this.#syncToFocusedAnchor, { signal });

    const shadow = graphEditor.shadowRoot;
    if (!shadow) return;

    shadow.addEventListener("focusin", this.#syncToFocusedAnchor, { signal });
    shadow.addEventListener("focusout", this.#syncToFocusedAnchorLater, { signal });
  }

  #addButton(label: string, icon: string, onClick: () => void) {
    const button = document.createElement("button");
    button.type = "button";
    button.classList.add("point-action-btn");
    button.setAttribute("aria-label", label);
    button.innerHTML = icon;

    // tapping a button must not pull the focus off the anchor point it acts on
    button.addEventListener("pointerdown", e => e.preventDefault());
    button.addEventListener("click", onClick);

    const tooltip = document.createElement("sv-tooltip");
    tooltip.textContent = label;
    tooltip.side = "block-end";
    this.#tooltips.push({ tooltip, button });

    this.element.append(button, tooltip);
    return button;
  }

  #attachTooltips() {
    for (const { tooltip, button } of this.#tooltips) {
      if (tooltip.targets.length === 0) tooltip.targets = [button];
    }
  }

  #getCommandOfAnchor(anchorCircle: Element | null) {
    if (!anchorCircle) return null;

    const command = this.graphEditor.commandsRef.find(c => c.anchorPoint.svgCircle === anchorCircle);
    return command ?? null;
  }

  #isDeletable(command: CubicCommand | MoveCommand | null): command is CubicCommand {
    if (!(command instanceof CubicCommand)) return false;
    return command.anchorPoint.cmdIdx !== this.graphEditor.points.length - 1;
  }

  #syncToFocusedAnchor = () => {
    this.#attachTooltips();

    const focusedElement = this.graphEditor.shadowRoot?.activeElement ?? null;
    if (!this.element.contains(focusedElement)) {
      this.#focusedAnchorCircle = focusedElement;
    }

    const command = this.#getCommandOfAnchor(this.#focusedAnchorCircle);

    const anchorPoint = command?.anchorPoint ?? null;

    this.#axisLockButton.setAttribute("aria-pressed", String(this.graphEditor.settings.axisLockEnabled));
    this.#freeCtrlButton.disabled = !anchorPoint?.hasTwoCtrls;
    this.#freeCtrlButton.setAttribute("aria-pressed", String(anchorPoint !== null && !anchorPoint.isCtrlAligned));
    this.#undoButton.disabled = !this.graphEditor.historyManager.canUndo;
    this.#redoButton.disabled = !this.graphEditor.historyManager.canRedo;
    this.#smoothCornerButton.disabled = command === null;
    this.#deleteButton.disabled = !this.#isDeletable(command);
  };

  #syncToFocusedAnchorLater = () => {
    setTimeout(this.#syncToFocusedAnchor);
  };

  #onAxisLockClick = () => {
    this.graphEditor.settings.axisLockEnabled = !this.graphEditor.settings.axisLockEnabled;
    this.#syncToFocusedAnchor();
  };

  #onFreeCtrlClick = () => {
    const command = this.#getCommandOfAnchor(this.#focusedAnchorCircle);
    if (!command) return;

    this.graphEditor.historyManager.takeSnapshot();
    command.anchorPoint.toggleFreeCtrl();
    this.graphEditor.historyManager.addSnapshotToHistory();
    this.graphEditor.dispatchComplete();
  };

  #onSmoothCornerClick = () => {
    const command = this.#getCommandOfAnchor(this.#focusedAnchorCircle);
    if (!command) return;

    this.graphEditor.historyManager.takeSnapshot();
    command.anchorPoint.toggleSmoothCorner();
    this.graphEditor.historyManager.addSnapshotToHistory();
    this.graphEditor.dispatchComplete();
  };

  #onDeleteClick = () => {
    const command = this.#getCommandOfAnchor(this.#focusedAnchorCircle);
    if (!this.#isDeletable(command)) return;

    command.deleteAnchor();
    this.#syncToFocusedAnchor();
  };
}
