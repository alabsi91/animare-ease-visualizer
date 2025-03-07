import type { IWebComponent } from "../wc";

type ObservedAttributes = (typeof DialogComponent.observedAttributes)[number];

/**
 * A dialog web component.
 *
 * - The host of `<dialog-component />` can't be styled directly.
 * - Use the `"dialog-toggle"` attribute and give it the id of the dialog on a button element to automatically attach an event
 *   listener to toggle the dialog.
 * - Use the `"dialog-open"` attribute and give it the id of the dialog on a button element to automatically attach an event
 *   listener to open the dialog.
 * - Use the `"dialog-close"` attribute and give it the id of the dialog on a button element to automatically attach an event
 *   listener to close the dialog.
 */
class DialogComponent extends HTMLElement implements IWebComponent {
  #dialogEl: HTMLDialogElement;
  #closeButtonEl: HTMLButtonElement;

  /** Fired when the dialog is opened */
  #openEvent = new CustomEvent("open");
  /** Fired when the dialog is closed */
  #closeEvent = new CustomEvent("close");

  /** Dismiss the dialog when clicking outside the dialog. Defaults to `true`. */
  backdropClose = true;

  /** Dismiss the dialog when pressing the escape key. Defaults to `true`. */
  escapeClose = true;

  #showCloseButton = true;
  /** Show a close button. Defaults to `true`. */
  get closeButton() {
    return this.#showCloseButton;
  }
  set closeButton(value: boolean) {
    this.#showCloseButton = value;
    this.#closeButtonEl.style.display = value ? "block" : "none";
  }

  /** True when the dialog is open. */
  get isOpen(): boolean {
    return this.#dialogEl.open;
  }

  /** The underlying dialog element. */
  get dialog(): HTMLDialogElement {
    return this.#dialogEl;
  }

  constructor() {
    super();

    const style = import_as_string("@components/dialog/dialog-style.inline.css", { minify: true });
    const template = import_as_string("@components/dialog/dialog-template.inline.html", { minify: true });

    const styleTag = document.createElement("style");
    styleTag.textContent = style;

    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = template;
    shadow.appendChild(styleTag);

    this.#dialogEl = shadow.querySelector("dialog")!;

    const closeButton = shadow.querySelector<HTMLButtonElement>(".close-button");
    if (!closeButton) {
      console.error("[menu-component]: Could not find element with class `close-button`");
    }

    this.#closeButtonEl = closeButton!;
  }

  connectedCallback() {
    // forward aria attributes to dialog
    const attributes = this.attributes;
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i];
      if (!attr.name.startsWith("aria-")) continue;
      this.#dialogEl.setAttribute(attr.name, attr.value);
    }

    // to force our close animation
    this.#dialogEl.addEventListener("cancel", e => {
      e.preventDefault();
      if (this.escapeClose) this.close();
    });

    this.#closeButtonEl.addEventListener("click", this.close);

    // triggers
    const id = this.getAttribute("id");
    if (id) {
      const openTriggers = document.querySelectorAll(`button[dialog-open="${id}"]`);
      openTriggers.forEach(trigger => {
        trigger.setAttribute("aria-haspopup", "dialog");
        if (this.id) trigger.setAttribute("aria-controls", this.id);
        return trigger.addEventListener("click", this.open);
      });

      const closeTriggers = document.querySelectorAll(`button[dialog-close="${id}"]`);
      closeTriggers.forEach(trigger => {
        trigger.setAttribute("aria-haspopup", "dialog");
        if (this.id) trigger.setAttribute("aria-controls", this.id);
        return trigger.addEventListener("click", this.close);
      });

      const toggleTriggers = document.querySelectorAll(`button[dialog-toggle="${id}"]`);
      toggleTriggers.forEach(trigger => {
        trigger.setAttribute("aria-haspopup", "dialog");
        if (this.id) trigger.setAttribute("aria-controls", this.id);
        return trigger.addEventListener("click", this.toggle);
      });
    }
  }

  static get observedAttributes() {
    return ["backdrop-close", "escape-close", "close-button"] as const;
  }

  attributeChangedCallback(name: ObservedAttributes, _oldValue: string | null, newValue: string | null) {
    if (name === "backdrop-close") {
      this.backdropClose = newValue === "true" || newValue === "";
      return;
    }

    if (name === "escape-close") {
      this.escapeClose = newValue === "true" || newValue === "";
      return;
    }

    if (name === "close-button") {
      this.closeButton = newValue === "true" || newValue === "";
      return;
    }

    const _exhaustiveCheck: never = name;
    return _exhaustiveCheck;
  }

  getAttribute(qualifiedName: ObservedAttributes | (string & {})): string | null {
    if (qualifiedName === "backdrop-close") return this.backdropClose.toString();
    if (qualifiedName === "close-button") return this.#showCloseButton.toString();
    if (qualifiedName === "escape-close") return this.escapeClose.toString();
    return super.getAttribute(qualifiedName);
  }

  #clickOutside(e: MouseEvent) {
    const content = this.#dialogEl.querySelector(".content");
    if (!content) {
      console.error("[dialog-component]: Could not find element with class `content`");
      return;
    }

    const rect = content.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      this.close();
    }
  }

  /** Open the dialog */
  open = () => {
    this.dispatchEvent(this.#openEvent);
    this.#dialogEl.showModal();
    if (this.backdropClose) {
      this.#dialogEl.addEventListener("click", this.#clickOutside.bind(this));
    }
  };

  /** Close the dialog */
  close = () => {
    this.#dialogEl.removeEventListener("click", this.#clickOutside.bind(this));

    // animate then close
    this.#dialogEl.classList.add("hide");
    this.#dialogEl.onanimationend = () => {
      this.#dialogEl.classList.remove("hide");
      this.#dialogEl.close();
      this.#dialogEl.onanimationend = null;
      this.dispatchEvent(this.#closeEvent);
    };
  };

  /** Toggle the dialog between open and closed */
  toggle = () => {
    if (this.#dialogEl.open) {
      this.close();
      return;
    }

    this.open();
  };
}

customElements.define("dialog-component", DialogComponent);

export type { DialogComponent };

type DialogComponentLocal = DialogComponent;

declare global {
  type DialogComponent = DialogComponentLocal;

  interface HTMLElementTagNameMap {
    "dialog-component": DialogComponent;
  }
}
