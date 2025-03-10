import type { IWebComponent, WComponent } from "../wc";

type ExtraAttributes = {
  "value-type": ValueTypes;
  onchange: (e: CustomEvent) => void;
  onclick: (e: CustomEvent) => void;
  onkeydown: (e: CustomEvent) => void;
};

type ComponentTypes = WComponent<typeof SelectOption, ExtraAttributes>;

const COMPONENT_NAME = "select-option";

type SelectOptionData = {
  value: unknown | undefined;
  valueType: ValueTypes;
  label: string | null;
  selected: boolean;
  disabled: boolean;
};

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
 */
class SelectOption extends HTMLElement implements IWebComponent {
  static readonly stylesheet = (() => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(import_as_string("./selectOption-style.inline.css", { minify: true }));
    return sheet;
  })();

  readonly #internals: ElementInternals;
  readonly #optionsEl: HTMLDivElement;

  /** Fired when `value` or `selected` is changed. */
  readonly #changeEvent = new CustomEvent("change");

  //#region Public Props
  #type: OptionType = "option";
  /** The type for accessibility. Defaults to `option`. */
  get type(): OptionType {
    return this.#type;
  }
  set type(val: OptionType) {
    this.#type = val;
    this.#setupType();
  }

  #value: string | null = null;
  /** The value of the option. */
  get value(): string | null {
    return this.#value;
  }
  set value(val: string | null) {
    this.#value = val;
    this.#updateValue(val);
  }

  #valueAsType: unknown | undefined;
  /** The parsed value from the `value` attribute string. */
  get valueAsType() {
    return this.#valueAsType;
  }
  set valueAsType(val: unknown | undefined) {
    if (val === undefined) {
      this.removeAttribute("value");
      return;
    }
    this.setAttribute("value", JSON.stringify(val));
  }

  #valueType: ValueTypes = "string";
  /** The type of the value. Defaults to `string`. */
  get valueType(): ValueTypes {
    return this.#valueType;
  }
  set valueType(val: ValueTypes) {
    this.#valueType = val;
    this.#updateValue(this.#value);
    this.#updateSelected(this.#selected);
  }

  #selected: boolean = false;
  /** Selected. Defaults to `false`. */
  get selected(): boolean {
    return this.#selected;
  }
  set selected(val: boolean) {
    this.#selected = val;
    this.#updateSelected(val);
  }

  /** Toggle the option selected state. */
  toggleSelected = () => {
    this.selected = !this.selected;
    this.dispatchEvent(this.#changeEvent);
  };

  #disabled: boolean = false;
  /** Disabled. Defaults to `false`. */
  get disabled(): boolean {
    return this.#disabled;
  }
  set disabled(val: boolean) {
    this.setAttribute("disabled", val.toString());
  }

  #label: string | null = null;
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

  #onClick: (e: MouseEvent) => void;
  /** Set the click event handler. */
  set onclick(fn: (e: MouseEvent) => void) {
    this.#onClick = fn;
  }

  #onKeyDown: (e: KeyboardEvent) => void;
  /** Set the keydown event handler. */
  set onkeydown(fn: (e: KeyboardEvent) => void) {
    this.#onKeyDown = fn;
  }

  /** The data of the option. */
  get data(): SelectOptionData {
    return {
      value: this.#valueAsType,
      valueType: this.#valueType,
      label: this.#label,
      selected: this.#selected,
      disabled: this.#disabled,
    };
  }
  set data(val: Partial<SelectOptionData>) {
    for (const k in val) {
      const key = k as keyof typeof val;

      switch (key) {
        case "value":
          this.valueAsType = val[key];
          continue;
        case "valueType":
          if (val[key]) this.valueType = val[key];
          continue;
        case "label":
          this.label = val[key];
          continue;
        case "selected":
          if (typeof val[key] === "boolean") this.selected = val[key];
          continue;
        case "disabled":
          if (typeof val[key] === "boolean") this.disabled = val[key];
      }
    }
  }
  //#endregion

  //#region HTMLElement Methods
  constructor() {
    super();

    this.#internals = this.attachInternals();

    const template = `<div class="option" part="option" tabindex="-1" aria-disabled="false"><slot></slot></div>`;

    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [SelectOption.stylesheet];
    shadow.innerHTML = template;

    const optionEl = shadow.querySelector<HTMLDivElement>(".option");
    if (!optionEl) {
      console.error("[select-option]: Couldn't find the options element.");
    }

    this.#optionsEl = optionEl!;
    this.#onClick = undefined!;
    this.#onKeyDown = undefined!;

    // accessibility type
    const typeAttr = this.getAttribute("type");
    this.#type = typeAttr === null ? "option" : (typeAttr as OptionType);
    this.#setupType();
  }

  connectedCallback() {
    this.#optionsEl.addEventListener("click", this.#onClickHandler);
    this.#optionsEl.addEventListener("keydown", this.#keyDownHandler);
  }

  disconnectedCallback() {
    this.#optionsEl.removeEventListener("click", this.#onClickHandler);
    this.#optionsEl.removeEventListener("keydown", this.#keyDownHandler);
  }

  static get observedAttributes() {
    return ["value", "value-type", "label", "selected", "disabled", "type"] as const;
  }

  attributeChangedCallback(name: ComponentTypes["ObservedAttributes"], _oldValue: string | null, newValue: string | null) {
    if (name === "value") {
      const prevValue = this.#valueAsType;
      this.value = newValue;
      if (prevValue !== this.#valueAsType) this.dispatchEvent(this.#changeEvent);
      return;
    }

    if (name === "disabled") {
      const isDisabled = newValue === "true" || newValue === "";
      this.#disabled = isDisabled;
      this.#optionsEl.setAttribute("aria-disabled", isDisabled.toString());
      if (isDisabled) {
        this.#internals.states.add("disabled");
        return;
      }
      this.#internals.states.delete("disabled");
      return;
    }

    if (name === "selected") {
      const isSelected = newValue === "true" || newValue === "";
      const prevSelected = this.#selected;
      this.#updateSelected(isSelected);
      if (prevSelected !== isSelected) this.dispatchEvent(this.#changeEvent);
      return;
    }

    if (name === "value-type") {
      this.valueType = newValue === null ? "string" : (newValue as ValueTypes);
      return;
    }

    if (name === "label") {
      this.#label = newValue;
      if (newValue === null) {
        this.#optionsEl.removeAttribute("aria-label");
        return;
      }
      this.#optionsEl.setAttribute("aria-label", newValue);
      return;
    }

    if (name === "type") {
      this.type = newValue === null ? "option" : (newValue as OptionType);
      return;
    }

    const _exhaustiveCheck: never = name;
    return _exhaustiveCheck;
  }

  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"] | (string & {})): string | null {
    if (qualifiedName === "value") return this.#value;
    if (qualifiedName === "type") return this.#type;
    if (qualifiedName === "value-type") return this.#valueType;
    if (qualifiedName === "selected") return this.#selected.toString();
    return super.getAttribute(qualifiedName);
  }
  //#endregion

  //#region Private Methods
  #updateValue(newValue: string | null) {
    if (newValue === null) {
      this.#valueAsType = undefined;
      return;
    }

    if (this.#valueType === "string") {
      this.#valueAsType = newValue;
      return;
    }

    try {
      const parsedValue = JSON.parse(newValue);
      this.#valueAsType = parsedValue;
    } catch (err) {
      console.error("[select-option]: Error while parsing the value:", newValue);
      console.error(err);
    }
  }

  #updateSelected(selected: boolean) {
    this.#optionsEl.setAttribute(this.#type === "option" ? "aria-selected" : "aria-checked", selected.toString());

    // css state
    if (selected) {
      this.#internals.states.add("selected");
      this.#internals.states.add("checked");
      return;
    }

    this.#internals.states.delete("selected");
    this.#internals.states.delete("checked");
  }

  #setupType() {
    if (this.#type === "option") {
      this.#optionsEl.setAttribute("role", "option");
      this.#optionsEl.setAttribute("tabindex", "-1");
      this.#optionsEl.setAttribute("aria-selected", this.#selected.toString());
      return;
    }

    if (this.#type === "checkbox") {
      this.#optionsEl.setAttribute("role", "menuitemcheckbox");
      this.#optionsEl.setAttribute("aria-checked", this.#selected.toString());
      return;
    }

    if (this.#type === "radio") {
      this.#optionsEl.setAttribute("role", "menuitemradio");
      this.#optionsEl.setAttribute("aria-checked", this.#selected.toString());
      return;
    }
  }

  #keyDownHandler = (e: KeyboardEvent) => {
    const keyDownHandler = this.#onKeyDown as ((e: KeyboardEvent) => void) | undefined;
    if (keyDownHandler) {
      keyDownHandler(e);
      return;
    }

    if (this.#disabled) return;

    if (e.code === "Enter" || e.code === "Space") {
      this.toggleSelected();
    }
  };

  #onClickHandler = (e: MouseEvent) => {
    const clickHandler = this.#onClick as ((e: MouseEvent) => void) | undefined;
    if (clickHandler) {
      clickHandler(e);
      return;
    }

    if (this.#disabled) return;
    this.toggleSelected();
  };
  //#endregion

  //#region Public Methods
  /**
   * Focus the option element.
   *
   * @function {focus(options?: FocusOptions)}
   */
  focus = (options?: FocusOptions) => {
    this.#optionsEl.focus(options);
  };

  /** Fire the option click event manually. */
  click = () => {
    this.#optionsEl.click();
  };
  //#endregion
}

customElements.define(COMPONENT_NAME, SelectOption);

export type { SelectOption, SelectOptionData, ValueTypes };

declare global {
  type SelectOption = ComponentTypes["Instance"];

  interface HTMLElementTagNameMap {
    [COMPONENT_NAME]: SelectOption;
  }
}
