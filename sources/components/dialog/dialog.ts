import type { BooleanString, IWebComponent, WComponent } from "../wc";

type ExtraAttributes = {
  "backdrop-close": BooleanString;
  "escape-close": BooleanString;
  "close-button": BooleanString;
  onopen: (e: CustomEvent) => void;
  onclose: (e: CustomEvent) => void;
};

type ComponentTypes = WComponent<typeof DialogComponent, ExtraAttributes>;

const COMPONENT_NAME = "dialog-component";

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
  static readonly htmlFragment = (() => {
    const template = document.createElement("template");
    template.innerHTML = import_as_string("./dialog-template.inline.html", { minify: true });
    return template.content;
  })();

  static readonly stylesheet = (() => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(import_as_string("./dialog-style.inline.css", { minify: true }));
    return sheet;
  })();

  readonly #dialogEl: HTMLDialogElement;
  readonly #closeButtonEl: HTMLButtonElement;
  readonly #abortController = new AbortController();

  /** Event fired when the dialog is opened. */
  readonly #openEvent = new CustomEvent("open");
  /** Event fired when the dialog is closed. */
  readonly #closeEvent = new CustomEvent("close");

  //#region Public Props
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
  //#endregion

  //#region HTMLElement Methods
  constructor() {
    super();

    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [DialogComponent.stylesheet];
    shadow.appendChild(DialogComponent.htmlFragment.cloneNode(true));

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

    const signal = this.#abortController.signal;

    // to force our close animation
    this.#dialogEl.addEventListener(
      "cancel",
      e => {
        e.preventDefault();
        if (this.escapeClose) this.close();
      },
      { signal }
    );

    this.#closeButtonEl.addEventListener("click", this.close, { signal });

    // triggers
    const id = this.getAttribute("id");
    if (id) {
      const openTriggers = document.querySelectorAll(`button[dialog-open="${id}"]`);
      openTriggers.forEach(trigger => {
        trigger.setAttribute("aria-haspopup", "dialog");
        if (this.id) trigger.setAttribute("aria-controls", this.id);
        trigger.addEventListener("click", this.open, { signal });
      });

      const closeTriggers = document.querySelectorAll(`button[dialog-close="${id}"]`);
      closeTriggers.forEach(trigger => {
        trigger.setAttribute("aria-haspopup", "dialog");
        if (this.id) trigger.setAttribute("aria-controls", this.id);
        trigger.addEventListener("click", this.close, { signal });
      });

      const toggleTriggers = document.querySelectorAll(`button[dialog-toggle="${id}"]`);
      toggleTriggers.forEach(trigger => {
        trigger.setAttribute("aria-haspopup", "dialog");
        if (this.id) trigger.setAttribute("aria-controls", this.id);
        trigger.addEventListener("click", this.toggle, { signal });
      });
    }
  }

  disconnectedCallback(): void {
    this.#abortController.abort();
  }

  static get observedAttributes() {
    return ["backdrop-close", "escape-close", "close-button"] as const;
  }

  attributeChangedCallback(name: ComponentTypes["ObservedAttributes"], _oldValue: string | null, newValue: string | null) {
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

  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"] | (string & {})): string | null {
    if (qualifiedName === "backdrop-close") return this.backdropClose.toString();
    if (qualifiedName === "close-button") return this.#showCloseButton.toString();
    if (qualifiedName === "escape-close") return this.escapeClose.toString();
    return super.getAttribute(qualifiedName);
  }
  //#endregion

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

  //#region Public Methods
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
      this.dispatchEvent(this.#closeEvent);
      this.#dialogEl.classList.remove("hide");
      this.#dialogEl.close();
      this.#dialogEl.onanimationend = null;
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
  //#endregion
}

customElements.define(COMPONENT_NAME, DialogComponent);

export type { DialogComponent };

declare global {
  type DialogComponent = ComponentTypes["Instance"];

  interface HTMLElementTagNameMap {
    [COMPONENT_NAME]: DialogComponent;
  }
}
