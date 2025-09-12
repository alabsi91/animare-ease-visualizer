import type * as WCP from "../wcp";

declare const CustomEvent: WCP.CustomEventT;

type ExtendedAttributes = {
  "value-type": ValueTypes;
};

type ComponentEvents = WCP.WEvent<{
  valueChange: CustomEvent;
}>;

type ComponentTypes = WCP.WComponent<typeof SelectOption, ExtendedAttributes, ComponentEvents>;

type ValueTypes = "string" | "object";

type OptionType = "option" | "radio" | "checkbox";

/**
 * The select option component is made to be used with `menu-component` but also it can be used stand alone.
 *
 * - The host of `<select-option />` can't be styled directly.
 *
 * @usage
 *
 * ```html
 * <menu-component values="0" match-trigger-width="true" type="select">
 *   <select-option value="0">Option 1</select-option>
 *   <select-option value="1">Option 2</select-option>
 * </menu-component>
 * ```
 *
 * @slot Default the option contents.
 * @cssPart option The option element.
 * @cssState selected The option is selected.
 * @cssState checked The option is checked.
 * @cssState disabled The option is disabled.
 */
class SelectOption extends HTMLElement implements WCP.IWebComponent {
  addEventListener!: WCP.AddEventListener<ComponentEvents, this>;

  #propsToUpgrade = Object.entries(this) as [keyof this, this[keyof this]][] | undefined;

  static readonly componentName = "select-option";

  static readonly stylesheet = (() => {
    const sheet = new CSSStyleSheet();
    sheet.replace(import_as_string("./select-option-style.inline.css", { minify: true }));
    return sheet;
  })();

  readonly #events: ComponentEvents = {
    /** Fired when `value` or `selected` is changed. */
    valueChange: new CustomEvent("valueChange"),
  };

  readonly #internals = this.attachInternals();
  readonly #optionEl: HTMLDivElement;

  //#region Public Props
  /** The type for accessibility `"option" | "radio" | "checkbox"`. */
  get type(): OptionType { return this.#type; }
  set type(val: OptionType) {
    this.#type = val;
    this.#setupType();
  }
  #type: OptionType = "option";

  /** The value of the option. */
  value: string = "";

  /** Whether the option is selected or not. */
  get selected(): boolean { return this.#selected; }
  set selected(val: boolean) {
    this.#selected = val;
    this.#updateSelected(val);
  }
  #selected: boolean = false;

  /** Whether the option is disabled or not. */
  get disabled(): boolean { return this.#disabled; }
  set disabled(val: boolean) { this.setAttribute("disabled", val.toString()); }
  #disabled: boolean = false;

  /** @ignore */
  get tabIndex(): number { return 0; }

  /** The label of the option. */
  get label(): string | null {
    if (typeof this.#label === "string") return this.#label;
    const textContent = this.textContent;
    if (typeof textContent === "string") return textContent.trim();
    return null;
  }
  set label(val: string | null | undefined) {
    if (typeof val === "string") {
      this.setAttribute("label", val);
      return;
    }
    this.removeAttribute("label");
  }
  #label: string | null = null;

  /** Set the click event handler. */
  set onclick(fn: (e: MouseEvent) => void) { this.#onClick = fn; }
  #onClick: (e: MouseEvent) => void;

  /** Set the keydown event handler. */
  set onkeydown(fn: (e: KeyboardEvent) => void) { this.#onKeyDown = fn; }
  #onKeyDown: (e: KeyboardEvent) => void;
  //#endregion

  //#region HTMLElement Methods
  constructor() {
    super();

    const template = `<div class="option" part="option" tabindex="-1" aria-disabled="false"><slot></slot></div>`;

    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [SelectOption.stylesheet];
    shadow.innerHTML = template;

    this.#optionEl = shadow.querySelector(".option")!;

    this.#onClick = undefined!;
    this.#onKeyDown = undefined!;

    // accessibility type
    const typeAttr = this.getAttribute("type");
    this.#type = typeAttr === null ? "option" : (typeAttr as OptionType);
    this.#setupType();
  }

  connectedCallback() {
    this.#optionEl.addEventListener("click", this.#onClickHandler);
    this.#optionEl.addEventListener("keydown", this.#keyDownHandler);

    if (this.#propsToUpgrade) {
      for (const [prop, value] of this.#propsToUpgrade) {
        delete this[prop];
        this[prop] = value;
      }
      this.#propsToUpgrade = undefined;
    }
  }

  disconnectedCallback() {
    this.#optionEl.removeEventListener("click", this.#onClickHandler);
    this.#optionEl.removeEventListener("keydown", this.#keyDownHandler);
  }

  static get observedAttributes() {
    return ["value", "label", "selected", "disabled", "type"] as const;
  }

  attributeChangedCallback(name: ComponentTypes["ObservedAttributes"], _oldValue: string | null, newValue: string | null) {
    if (name === "value") {
      const prevValue = this.value;
      this.value = newValue ?? "";
      if (prevValue !== this.value) this.dispatchEvent(this.#events.valueChange);
      return;
    }

    if (name === "disabled") {
      const isDisabled = newValue === "true" || newValue === "";
      this.#disabled = isDisabled;
      this.#optionEl.setAttribute("aria-disabled", isDisabled.toString());
      this.#internals.states[isDisabled ? "add" : "delete"]("disabled");
      return;
    }

    if (name === "selected") {
      const isSelected = newValue === "true" || newValue === "";
      const prevSelected = this.#selected;
      this.#updateSelected(isSelected);
      if (prevSelected !== isSelected) this.dispatchEvent(this.#events.valueChange);
      return;
    }

    if (name === "label") {
      this.#label = newValue;
      if (newValue === null) {
        this.#optionEl.removeAttribute("aria-label");
        return;
      }
      this.#optionEl.setAttribute("aria-label", newValue);
      return;
    }

    if (name === "type") {
      this.type = newValue === null ? "option" : (newValue as OptionType);
      return;
    }

    return name;
  }

  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"] | (string & {})): string | null;
  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"]): string | null {
    if (qualifiedName === "value") return this.value;
    if (qualifiedName === "type") return this.#type;
    if (qualifiedName === "selected") return this.#selected.toString();
    return super.getAttribute(qualifiedName);
  }
  //#endregion

  //#region Private Methods
  #updateSelected(selected: boolean) {
    const attr = this.#type === "option" ? "aria-selected" : "aria-checked";
    this.#optionEl.setAttribute(attr, selected.toString());

    const addOrDelete = selected ? "add" : "delete";
    this.#internals.states[addOrDelete]("selected");
    this.#internals.states[addOrDelete]("checked");
  }

  #setupType() {
    if (this.#type === "option") {
      this.#optionEl.setAttribute("role", "option");
      this.#optionEl.setAttribute("tabindex", "-1");
      this.#optionEl.setAttribute("aria-selected", this.#selected.toString());
      return;
    }

    if (this.#type === "checkbox") {
      this.#optionEl.setAttribute("role", "menuitemcheckbox");
      this.#optionEl.setAttribute("aria-checked", this.#selected.toString());
      return;
    }

    if (this.#type === "radio") {
      this.#optionEl.setAttribute("role", "menuitemradio");
      this.#optionEl.setAttribute("aria-checked", this.#selected.toString());
      return;
    }
  }

  #keyDownHandler = (e: KeyboardEvent) => {
    const keyDownHandler = this.#onKeyDown;
    if (keyDownHandler) return keyDownHandler(e);
    if (this.#disabled) return;
    if (e.code === "Enter" || e.code === "Space") this.toggleSelected();
  };

  #onClickHandler = (e: MouseEvent) => {
    const clickHandler = this.#onClick;
    if (clickHandler) return clickHandler(e);
    if (this.#disabled) return;
    this.toggleSelected();
  };
  //#endregion

  //#region Public Methods
  /** Toggle the option selected state. */
  toggleSelected = () => {
    this.selected = !this.selected;
    this.dispatchEvent(this.#events.valueChange);
  };

  /**
   * Focus the option element.
   *
   * @function {focus(options?: FocusOptions)}
   */
  focus = (options?: FocusOptions) => {
    this.#optionEl.focus(options);
  };

  /** Fire the option click event manually. */
  click = () => {
    this.#optionEl.click();
  };
  //#endregion
}

customElements.define(SelectOption.componentName, SelectOption);

declare global {
  type SelectOption = ComponentTypes["Instance"];

  interface HTMLElementTagNameMap {
    [SelectOption.componentName]: SelectOption;
  }

  namespace React.JSX {
    interface IntrinsicElements {
      /** @markdown {./README.md} */
      [SelectOption.componentName]: WCP.ReactWComponent<ComponentTypes["JsxProps"], SelectOption>;
    }
  }
}
