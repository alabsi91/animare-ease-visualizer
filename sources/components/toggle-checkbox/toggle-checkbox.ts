import * as WCP from "../wcp";

const CustomEvent = globalThis.CustomEvent as typeof WCP.CustomEventT;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type ExtendedAttributes = {};

type ComponentEvents = WCP.WEvent<{
  stateChange: CustomEvent;
}>;

type ComponentTypes = WCP.WComponent<typeof ToggleCheckbox, ExtendedAttributes, ComponentEvents>;

const COMPONENT_NAME = "toggle-checkbox";

/**
 * Checkboxes provide users with a graphical representation of a binary choice (yes or no, on or off). They are most commonly
 * presented in a series, giving the user multiple choices to make.
 *
 * - **Form associated**
 *
 * @usage
 *
 * ```html
 * <toggle-checkbox label="Label"></toggle-checkbox>
 * ```
 */
class ToggleCheckbox extends HTMLElement implements WCP.IWebComponent {
  addEventListener!: WCP.AddEventListener<ComponentEvents, this>;

  static readonly htmlFragment = (() => {
    const template = document.createElement("template");
    template.innerHTML = import_as_string("./toggle-checkbox-template.inline.html", { minify: true });
    return template.content;
  })();

  static readonly stylesheet = (() => {
    const sheet = new CSSStyleSheet();
    sheet.replace(import_as_string("./toggle-checkbox-style.inline.css", { minify: true }));
    return sheet;
  })();

  readonly #internals: ElementInternals;
  readonly #checkboxEl: HTMLButtonElement;

  readonly #events: ComponentEvents = {
    /** Emitted when the checked value has changed. */
    stateChange: new CustomEvent("stateChange"),
  };

  //#region Public Props
  /** Whether the checkbox is checked. */
  get checked(): boolean { return this.#checked; }
  set checked(value: boolean) {
    this.#internals.setFormValue(value.toString());
    this.#updateValue(value);
  }
  #checked: boolean = false;

  /** Whether the checkbox is disabled. */
  get disabled(): boolean { return this.#disabled; }
  set disabled(value: boolean) {
    this.#disabled = value;
    this.#checkboxEl.setAttribute("aria-disabled", this.#disabled.toString());
    if (value) this.#internals.states.add("disabled");
    if (!value) this.#internals.states.delete("disabled");
  }
  #disabled: boolean = false;

  /** Add a label to the toggle switch. */
  get label(): string | null { return this.#label; }
  set label(value: string | null) {
    if (value === null) {
      this.removeAttribute("label");
      return;
    }
    this.setAttribute("label", value);
  }
  #label: string | null = null;
  //#endregion

  //#region Form association methods
  static formAssociated = true;
  /** @ignore value */
  get value(): string { return this.#checked.toString(); }
  get type() { return "checkbox"; }
  set value(value: "true" | "false") { this.checked = value === "true"; }
  get form() { return this.#internals.form; }
  get name() { return this.getAttribute("name") || ""; }
  get validity() { return this.#internals.validity; }
  get validationMessage() { return this.#internals.validationMessage; }
  checkValidity = () => this.#internals.checkValidity();
  reportValidity = () => this.#internals.reportValidity();
  //#endregion

  //#region HtmlElement Methods
  constructor() {
    super();

    this.#internals = this.attachInternals();

    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [ToggleCheckbox.stylesheet];
    shadow.appendChild(ToggleCheckbox.htmlFragment.cloneNode(true));

    const checkboxEl = shadow.querySelector<HTMLButtonElement>(".checkbox")!;
    if (!checkboxEl) console.error(`[${COMPONENT_NAME}]: Could not find element with the selector ".checkbox"`);
    this.#checkboxEl = checkboxEl;
  }

  connectedCallback(): void {
    this.#checkboxEl.addEventListener("click", this.#clickHandler);
    this.#internals.setFormValue(this.#checked.toString());

    // link external label tag
    const labelEl = document.querySelector(`label[for="${this.id}"]`);
    if (!labelEl) return;

    labelEl.addEventListener("click", () => {
      this.checked = !this.checked;
    });
  }

  disconnectedCallback(): void {
    this.#checkboxEl.removeEventListener("click", this.#clickHandler);
  }

  /** @attr aria-label Forwarded to the `<button>` element. */
  static get observedAttributes() {
    return ["checked", "disabled", "label", "aria-label"] as const;
  }

  attributeChangedCallback(name: ComponentTypes["ObservedAttributes"], _oldValue: string | null, newValue: string | null) {
    if (name === "checked") {
      const value = newValue === "true" || newValue === "";
      this.#updateValue(value);
      this.dispatchEvent(this.#events.stateChange);
      return;
    }

    if (name === "disabled") {
      this.disabled = newValue === "true" || newValue === "";
      return;
    }

    if (name === "label") {
      const shadow = this.shadowRoot;
      if (!shadow) return;

      this.#label = newValue;

      const currentLabel = shadow.querySelector<HTMLLabelElement>("label");

      if (newValue === null) {
        if (currentLabel) currentLabel.remove();

        // default aria-label
        if (!this.#checkboxEl.hasAttribute("aria-label") && !this.hasAttribute("aria-label")) {
          this.#checkboxEl.setAttribute("aria-label", "Toggle checkbox");
        }
        return;
      }

      if (currentLabel) {
        currentLabel.textContent = newValue;
        return;
      }

      this.#checkboxEl.removeAttribute("aria-label");
      const label = document.createElement("label");
      label.setAttribute("for", this.#checkboxEl.id);
      label.setAttribute("part", "label");
      label.textContent = newValue;
      shadow.insertBefore(label, shadow.firstElementChild);
      return;
    }

    if (name === "aria-label") {
      this.#checkboxEl.setAttribute("aria-label", newValue ?? "Toggle checkbox");
      return;
    }

    const _exhaustiveCheck: never = name;
    return _exhaustiveCheck;
  }

  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"] | (string & {})): string | null;
  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"]): string | null {
    if (qualifiedName === "checked") return this.#checked.toString();
    if (qualifiedName === "disabled") return this.#disabled.toString();
    return super.getAttribute(qualifiedName);
  }
  //#endregion

  //#region Private methods
  #clickHandler = () => {
    if (this.#disabled) return;
    this.checked = !this.#checked;
    this.dispatchEvent(this.#events.stateChange);
  };

  #updateValue(value: boolean) {
    if (value === this.#checked) return;
    this.#checked = value;
    this.#checkboxEl.setAttribute("aria-checked", this.#checked.toString());
    if (this.#checked) this.#internals.states.add("checked");
    if (!this.#checked) this.#internals.states.delete("checked");
  }
  //#endregion

  /** Toggle the checked state. */
  toggle() {
    this.checked = !this.checked;
  }
}

customElements.define(COMPONENT_NAME, ToggleCheckbox);

export type { ToggleCheckbox };

declare global {
  type ToggleCheckbox = ComponentTypes["Instance"];

  interface HTMLElementTagNameMap {
    [COMPONENT_NAME]: ToggleCheckbox;
  }
}
