import * as WCP from "../wcp";

const CustomEvent = globalThis.CustomEvent as typeof WCP.CustomEventT;

type ExtendedAttributes = {
  "backdrop-close": WCP.BooleanString;
  "escape-close": WCP.BooleanString;
  "close-button": WCP.BooleanString;
};

type ComponentEvents = WCP.WEvent<{
  opened: CustomEvent;
  dismissed: CustomEvent;
  stateChanged: CustomEvent;
}>;

type ComponentTypes = WCP.WComponent<typeof DialogComponent, ExtendedAttributes, ComponentEvents>;

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
 *
 * @usage
 * ```html
 *   <button class="button" dialog-toggle="dialog">Open Dialog</button>
 *
 *   <dialog-component id="dialog" aria-label="Example Dialog">
 *     <p class="dialog-title">Dialog Title</p>
 *     <p class="dialog-content">Dialog Content</p>
 *   </dialog-component>
 * ```
 */
class DialogComponent extends HTMLElement implements WCP.IWebComponent {
  addEventListener!: WCP.AddEventListener<ComponentEvents, this>;

  static readonly htmlFragment = (() => {
    const template = document.createElement("template");
    template.innerHTML = import_as_string("./dialog-template.inline.html", { minify: true });
    return template.content;
  })();

  static readonly stylesheet = (() => {
    const sheet = new CSSStyleSheet();
    sheet.replace(import_as_string("./dialog-style.inline.css", { minify: true }));
    return sheet;
  })();

  readonly #dialogEl: HTMLDialogElement;
  readonly #closeButtonEl: HTMLButtonElement;
  readonly #abortController = new AbortController();

  readonly #events: ComponentEvents = {
    /** Event fired when the dialog is opened. */
    opened: new CustomEvent("opened"),
    /** Event fired when the dialog is closed. */
    dismissed: new CustomEvent("dismissed"),
    /** Event fired when the dialog is opened or closed. */
    stateChanged: new CustomEvent("stateChanged"),
  };

  //#region Public Props
  /** Dismiss the dialog when clicking outside the dialog. */
  backdropClose = false;

  /** Dismiss the dialog when pressing the escape key. */
  escapeClose = true;

  /** Show a close button. */
  get closeButton() { return this.#showCloseButton; }
  set closeButton(value: boolean) {
    this.#showCloseButton = value;
    this.#closeButtonEl.style.display = value ? "block" : "none";
  }
  #showCloseButton = true;

  /** True when the dialog is open. */
  get isOpen(): boolean { return this.#dialogEl.open; }

  /** The underlying dialog element. */
  get dialog(): HTMLDialogElement { return this.#dialogEl; }
  //#endregion

  //#region HTMLElement Methods
  constructor() {
    super();

    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [DialogComponent.stylesheet];
    shadow.appendChild(DialogComponent.htmlFragment.cloneNode(true));

    this.#dialogEl = shadow.querySelector("dialog")!;

    const closeButton = shadow.querySelector<HTMLButtonElement>(".close-button")!;
    if (!closeButton) console.error(`[${COMPONENT_NAME}]: Could not find element with the selector 'close-button'`);
    this.#closeButtonEl = closeButton;
  }

  connectedCallback() {
    // forward aria attributes to dialog
    const attributes = this.attributes;
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i];
      if (!attr.name.startsWith("aria-")) continue;
      this.removeAttribute(attr.name);
      this.#dialogEl.setAttribute(attr.name, attr.value);
    }

    const signal = this.#abortController.signal;

    // to force our close animation
    const oncancel = (e: Event) => {
      e.preventDefault();
      if (this.escapeClose) this.close();
    };
    this.#dialogEl.addEventListener("cancel", oncancel, { signal });
    this.#closeButtonEl.addEventListener("click", this.close, { signal });

    // triggers
    const id = this.getAttribute("id");
    if (!id) return;

    const openTriggers = document.querySelectorAll(`button[dialog-open="${id}"]`);
    for (const trigger of openTriggers) {
      trigger.setAttribute("aria-haspopup", "dialog");
      if (this.id) trigger.setAttribute("aria-controls", this.id);
      trigger.addEventListener("click", this.open, { signal });
    }

    const closeTriggers = document.querySelectorAll(`button[dialog-close="${id}"]`);
    for (const trigger of closeTriggers) {
      trigger.setAttribute("aria-haspopup", "dialog");
      if (this.id) trigger.setAttribute("aria-controls", this.id);
      trigger.addEventListener("click", this.close, { signal });
    }

    const toggleTriggers = document.querySelectorAll(`button[dialog-toggle="${id}"]`);
    for (const trigger of toggleTriggers) {
      trigger.setAttribute("aria-haspopup", "dialog");
      if (this.id) trigger.setAttribute("aria-controls", this.id);
      trigger.addEventListener("click", this.toggle, { signal });
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

  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"] | (string & {})): string | null;
  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"]): string | null {
    if (qualifiedName === "backdrop-close") return this.backdropClose.toString();
    if (qualifiedName === "close-button") return this.#showCloseButton.toString();
    if (qualifiedName === "escape-close") return this.escapeClose.toString();
    return super.getAttribute(qualifiedName);
  }
  //#endregion

  #clickOutside = (e: MouseEvent) => {
    const content = this.#dialogEl.querySelector(".content");
    if (!content) {
      console.error(`[${COMPONENT_NAME}]: Could not find element with the selector ".content"`);
      return;
    }

    const rect = content.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      this.close();
    }
  };

  //#region Public Methods
  /** Open the dialog */
  open = () => {
    this.dispatchEvent(this.#events.opened);
    this.dispatchEvent(this.#events.stateChanged);
    this.#dialogEl.showModal();
    if (this.backdropClose) {
      this.#dialogEl.addEventListener("click", this.#clickOutside);
    }
  };

  /** Close the dialog */
  close = () => {
    this.#dialogEl.removeEventListener("click", this.#clickOutside);

    // animate then close
    this.#dialogEl.classList.add("hide");
    this.#dialogEl.onanimationend = () => {
      this.dispatchEvent(this.#events.dismissed);
      this.dispatchEvent(this.#events.stateChanged);
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
