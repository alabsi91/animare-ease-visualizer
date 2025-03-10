import type { GraphEditor } from "../graphEditorComponent";
import type { Settings } from "./Settings";
import type { KeyModifiers } from "./types";

type ShortcutEvent = {
  name: "keyUp" | "Pan" | "Undo" | "Redo" | "DeleteAnchor";
  cb: () => void;
};

export class KeyboardShortcutManager {
  readonly #modifierKeys = new Set(["Control", "Alt", "Shift"]);

  readonly graphEditor: GraphEditor;
  readonly settings: Settings;
  readonly keysPressed: Set<string> = new Set();
  readonly modifiersPressed: Set<KeyModifiers> = new Set();

  #events: ShortcutEvent[] = [];

  constructor(graphEditor: GraphEditor) {
    this.graphEditor = graphEditor;
    this.settings = graphEditor.settings;

    const signal = graphEditor.abortController.signal;
    document.addEventListener("keydown", this.#onKeyDownHandler, { signal });
    document.addEventListener("keyup", this.#onKeyUpHandler, { signal });
  }

  isModifierPressed = (keys: Set<string>) => {
    for (const key of keys) if (this.keysPressed.has(key)) return true;
    return false;
  };

  get isSmoothCornerModifiersPressed() {
    return this.settings.anchorSmoothCornerModifiers.isActive(this.keysPressed, this.modifiersPressed);
  }

  get isFreeCtrlModifiersPressed() {
    return this.settings.freeCtrlModifiers.isActive(this.keysPressed, this.modifiersPressed);
  }

  get isAddAnchorModifiersPressed() {
    return this.settings.addAnchorModifiers.isActive(this.keysPressed, this.modifiersPressed);
  }

  get isAnchorLockMovementModifiersPressed() {
    return this.settings.anchorLockMovementModifiers.isActive(this.keysPressed, this.modifiersPressed);
  }

  get isCtrlLockMovementModifiersPressed() {
    return this.settings.ctrlLockMovementModifiers.isActive(this.keysPressed, this.modifiersPressed);
  }

  get isPanModifiersPressed() {
    return this.settings.panKeys.isActive(this.keysPressed, this.modifiersPressed);
  }

  addListener(event: ShortcutEvent["name"], callback: ShortcutEvent["cb"]) {
    this.#events.push({ name: event, cb: callback });
  }

  removeListener(event: ShortcutEvent["name"], callback: ShortcutEvent["cb"]) {
    this.#events = this.#events.filter(e => !(e.name === event && e.cb === callback));
  }

  #undoShortcut = () => {
    const isActive = this.settings.undoKeys.isActive(this.keysPressed, this.modifiersPressed);
    if (isActive) this.#events.forEach(e => e.name === "Undo" && e.cb());
  };

  #redoShortcut = () => {
    const isActive = this.settings.redoKeys.isActive(this.keysPressed, this.modifiersPressed);
    if (isActive) this.#events.forEach(e => e.name === "Redo" && e.cb());
  };

  #panShortcut = () => {
    if (!this.isPanModifiersPressed) return;
    this.#events.forEach(e => e.name === "Pan" && e.cb());
  };

  #deleteAnchorShortcut = () => {
    const isActive = this.settings.anchorDeleteKeys.isActive(this.keysPressed, this.modifiersPressed);
    if (isActive) this.#events.forEach(e => e.name === "DeleteAnchor" && e.cb());
  };

  #onKeyDownHandler = (e: KeyboardEvent) => {
    if (e.key === undefined) return;

    if (!this.#modifierKeys.has(e.key)) {
      this.keysPressed.add(e.key.toLowerCase());
    }

    if (e.ctrlKey) {
      this.modifiersPressed.add("Control");
      this.modifiersPressed.add(e.location === 2 ? "ControlRight" : "ControlLeft");
    }
    if (e.altKey) {
      this.modifiersPressed.add("Alt");
      this.modifiersPressed.add(e.location === 2 ? "AltRight" : "AltLeft");
    }
    if (e.shiftKey) {
      this.modifiersPressed.add("Shift");
      this.modifiersPressed.add(e.location === 2 ? "ShiftRight" : "ShiftLeft");
    }

    this.#undoShortcut();
    this.#redoShortcut();
    this.#panShortcut();
    this.#deleteAnchorShortcut();
  };

  #onKeyUpHandler = (e: KeyboardEvent) => {
    if (e.key === undefined) return;

    if (!this.#modifierKeys.has(e.key)) {
      this.keysPressed.delete(e.key.toLowerCase());
    }

    if (!e.ctrlKey) {
      this.modifiersPressed.delete("Control");
      this.modifiersPressed.delete(e.location === 2 ? "ControlRight" : "ControlLeft");
    }
    if (!e.altKey) {
      this.modifiersPressed.delete("Alt");
      this.modifiersPressed.delete(e.location === 2 ? "AltRight" : "AltLeft");
    }
    if (!e.shiftKey) {
      this.modifiersPressed.delete("Shift");
      this.modifiersPressed.delete(e.location === 2 ? "ShiftRight" : "ShiftLeft");
    }

    this.#events.forEach(e => e.name === "keyUp" && e.cb());
  };
}
