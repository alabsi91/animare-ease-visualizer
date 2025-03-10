import type { IWebComponent, WComponent } from "../wc";

type ExtraAttributes = {
  onchange: (e: CustomEvent) => void;
};

type ComponentTypes = WComponent<typeof ToggleCheckbox, ExtraAttributes>;

const COMPONENT_NAME = "toggle-checkbox";

/**
 * Checkboxes provide users with a graphical representation of a binary choice (yes or no, on or off). They are most commonly
 * presented in a series, giving the user multiple choices to make.
 *
 * @usage
 *
 * ```html
 * <toggle-checkbox label="Label"></toggle-checkbox>
 * ```
 */
class ToggleCheckbox extends HTMLElement implements IWebComponent {
  static readonly htmlFragment = (() => {
    const template = document.createElement("template");
    template.innerHTML = import_as_string("./toggleCheckbox-template.inline.html", { minify: true });
    return template.content;
  })();

  static readonly stylesheet = (() => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(import_as_string("./toggleCheckbox-style.inline.css", { minify: true }));
    return sheet;
  })();

  static formAssociated = true;

  readonly #internals: ElementInternals;
  readonly #checkboxEl: HTMLButtonElement;

  /** Emitted when the checked value has changed. */
  readonly #changeEvent = new CustomEvent("change");

  //#region Public Props
  #checked: boolean = false;
  /** Checked. Defaults to `false`. */
  get checked(): boolean {
    return this.#checked;
  }
  set checked(value: boolean) {
    this.#updateValue(value);
  }

  #disabled: boolean = false;
  /** Disabled. Defaults to `false`. */
  get disabled(): boolean {
    return this.#disabled;
  }
  set disabled(value: boolean) {
    this.#disabled = value;
    this.#checkboxEl.setAttribute("aria-disabled", this.#disabled.toString());
    if (value) this.#internals.states.add("disabled");
    if (!value) this.#internals.states.delete("disabled");
  }

  #label: string | null = null;
  /** Add a label to the toggle switch. */
  get label(): string | null {
    return this.#label;
  }
  set label(value: string | null) {
    if (value === null) {
      this.removeAttribute("label");
      return;
    }
    this.setAttribute("label", value);
  }
  //#endregion

  //#region Form association methods
  get type() {
    return "checkbox";
  }
  get value(): string {
    return this.#checked.toString();
  }
  set value(value: "true" | "false") {
    this.checked = value === "true";
  }
  get form() {
    return this.#internals.form;
  }
  get name() {
    return this.getAttribute("name") || "";
  }
  checkValidity(): boolean {
    return this.#internals.checkValidity();
  }
  reportValidity() {
    return this.#internals.reportValidity();
  }
  get validity() {
    return this.#internals.validity;
  }
  get validationMessage() {
    return this.#internals.validationMessage;
  }
  //#endregion

  //#region HtmlElement Methods
  constructor() {
    super();

    this.#internals = this.attachInternals();

    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [ToggleCheckbox.stylesheet];
    shadow.appendChild(ToggleCheckbox.htmlFragment.cloneNode(true));

    const checkboxEl = shadow.querySelector<HTMLButtonElement>(".checkbox");
    if (!checkboxEl) {
      console.error("[toggle-checkbox]: Could not find element with class `checkbox`");
    }

    this.#checkboxEl = checkboxEl!;
  }

  connectedCallback(): void {
    this.#checkboxEl.addEventListener("click", this.#clickHandler);
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
      this.dispatchEvent(this.#changeEvent);
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

  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"] | (string & {})): string | null {
    if (qualifiedName === "checked") return this.#checked.toString();
    if (qualifiedName === "disabled") return this.#disabled.toString();
    return super.getAttribute(qualifiedName);
  }
  //#endregion

  //#region Private methods
  #clickHandler = () => {
    if (this.#disabled) return;
    this.checked = !this.#checked;
    this.dispatchEvent(this.#changeEvent);
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
