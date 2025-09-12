import type * as WCP from "../wcp";

declare const CustomEvent: WCP.CustomEventT;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type ExtendedAttributes = {};

type ComponentEvents = WCP.WEvent<{
  valueChange: CustomEvent;
}>;

type CssState = "active";

type ComponentTypes = WCP.WComponent<typeof SliderComponent, ExtendedAttributes, ComponentEvents>;

/**
 * A wrapper around `<input type="range" />` that allow custom styling.
 *
 * @usage
 * ```html
 *   <slider-component label="Slider Label:" list="values" step="1">
 *     <datalist id="values">
 *      <option value="0" label="0"></option>
 *      <option value="25" label="25"></option>
 *      <option value="50" label="50"></option>
 *      <option value="75" label="75"></option>
 *      <option value="100" label="100"></option>
 *     </datalist>
 *   </slider-component>
 * ```
 *
 * @attr label The label of the slider.
 * @attr aria-label Forwarded to the `<input>` element.
 * @attr list The id of the `<datalist>` element.
 */
class SliderComponent extends HTMLElement implements WCP.IWebComponent {
  addEventListener!: WCP.AddEventListener<ComponentEvents, this>;

  #propsToUpgrade = Object.entries(this) as [keyof this, this[keyof this]][] | undefined;

  static readonly componentName = "slider-component";

  static readonly htmlFragment = (() => {
    const template = document.createElement("template");
    template.innerHTML = import_as_string("./slider-template.inline.html", { minify: true });
    return template.content;
  })();

  static readonly stylesheet = (() => {
    const sheet = new CSSStyleSheet();
    sheet.replace(import_as_string("./slider-style.inline.css", { minify: true }));
    return sheet;
  })();

  readonly #shadow = (() => {
    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [SliderComponent.stylesheet];
    shadow.appendChild(SliderComponent.htmlFragment.cloneNode(true));
    return shadow;
  })();

  readonly #events: ComponentEvents = {
    /** Fired when the value is changed. */
    valueChange: new CustomEvent("valueChange"),
  };

  readonly #abortController = new AbortController();
  readonly #internals = this.attachInternals<CssState>();
  readonly #bubbleEl: HTMLDivElement = this.#shadow.querySelector(".bubble")!;
  readonly #inputEl: HTMLInputElement = this.#shadow.querySelector('input[type="range"]')!;

  //#region Public Props
  /** Get the underlying `<input type="range" />` element */
  get input(): HTMLInputElement { return this.#inputEl; }

  /**
   * The current value.
   *
   * @default 50
   */
  get value(): number { return this.#inputEl.valueAsNumber; }
  set value(val: number) {
    this.#inputEl.valueAsNumber = val;
    this.#internals.setFormValue(val.toString());
    this.#updateCustomSlider();
  }

  /**
   * The minimum value.
   *
   * @default 0
   */
  get min(): number { return Number(this.#inputEl.min); }
  set min(val: number) {
    this.#inputEl.min = val.toString();
    this.#updateCustomSlider();
  }

  /**
   * The maximum value.
   *
   * @default 100
   */
  get max(): number { return Number(this.#inputEl.max); }
  set max(val: number) {
    this.#inputEl.max = val.toString();
    this.#updateCustomSlider();
  }

  /**
   * Step per value update.
   *
   * @default 1
   */
  get step(): number { return Number(this.#inputEl.step); }
  set step(val: number) {
    this.#inputEl.step = val.toString();
    this.#updateCustomSlider();
  }

  /** The current value as a percentage `(0-100)`. */
  get percentage() { return ((this.value - this.min) / (this.max - this.min)) * 100; }
  set percentage(value: number) { this.value = (value / 100) * (this.max - this.min) + this.min; }

  /** Whether the slider is disabled. */
  get disabled(): boolean { return this.#disabled; }
  set disabled(value: boolean) { this.setAttribute("disabled", value.toString()); }
  #disabled = false;
  //#endregion

  //#region Form association
  static formAssociated = true;
  get form() { return this.#internals.form; }
  get name() { return this.#inputEl.name; }
  get validity() { return this.#inputEl.validity; }
  get validationMessage() { return this.#inputEl.validationMessage; }
  checkValidity = () => this.#inputEl.checkValidity();
  reportValidity = () => this.#inputEl.reportValidity();
  //#endregion

  //#region HtmlElement Methods
  connectedCallback(): void {
    const isRtl = getComputedStyle(this).direction === "rtl";
    if (isRtl) this.style.setProperty("--is-rtl", "1");

    this.#updateCustomSlider(); // initial

    const signal = this.#abortController.signal;

    this.#inputEl.addEventListener(
      "input",
      () => {
        this.dispatchEvent(this.#events.valueChange);
        this.#updateCustomSlider();
      },
      { signal }
    );

    const container = this.#shadow.querySelector(".container");
    if (!container) {
      console.error(`[${this.localName}]: Could not find element with class 'container'`);
      return;
    }

    this.#inputEl.addEventListener(
      "pointerdown",
      () => {
        if (this.#inputEl.disabled) return;
        container.classList.add("active");
        this.#internals.states.add("active");
      },
      { signal }
    );

    document.addEventListener(
      "pointerup",
      () => {
        container.classList.remove("active");
        this.#internals.states.delete("active");
      },
      { signal }
    );

    document.addEventListener(
      "touchend",
      () => {
        container.classList.remove("active");
        this.#internals.states.delete("active");
      },
      { signal }
    );

    const slot = this.#shadow.querySelector("slot");
    if (!slot) return;

    const slotContents = slot.assignedNodes().map(node => node.cloneNode(true));
    this.#shadow.append(...slotContents);
    slot.remove();

    if (this.#propsToUpgrade) {
      for (const [prop, value] of this.#propsToUpgrade) {
        delete this[prop];
        this[prop] = value;
      }
      this.#propsToUpgrade = undefined;
    }
  }

  disconnectedCallback(): void {
    this.#abortController.abort();
  }

  static get observedAttributes() {
    return ["label", "aria-label", "min", "max", "value", "step", "list", "disabled"] as const;
  }

  attributeChangedCallback(name: ComponentTypes["ObservedAttributes"], _oldValue: string | null, newValue: string | null) {
    if (name === "label") {
      if (!newValue) return;

      const label = document.createElement("label");
      label.setAttribute("for", this.#inputEl.id);
      label.setAttribute("part", "label");
      label.textContent = newValue;

      this.#shadow.insertBefore(label, this.#shadow.firstElementChild);

      return;
    }

    if (name === "list") {
      const dataSet = window[newValue as keyof Window] as HTMLDataListElement | null;
      if (!dataSet) return;

      const ticksEl = this.#shadow.querySelector(".ticks");
      if (!ticksEl) {
        console.error(`[${this.localName}]: Could not find element with class 'ticks'`);
        return;
      }

      const inputEl = this.#inputEl;
      const min = parseInt(inputEl.min) || 0;
      const max = parseInt(inputEl.max) || 100;
      for (let i = 0; i < dataSet.options.length; i++) {
        const value = parseFloat(dataSet.options[i].value) || 0;
        const percent = ((value - min) / (max - min)) * 100;

        const tickEl = document.createElement("div");
        tickEl.setAttribute("part", "tick");
        tickEl.style.left = percent + "%";
        ticksEl.appendChild(tickEl);
      }
      return;
    }

    if (name === "disabled") {
      this.#disabled = newValue === "true" || newValue === "";
      this.#inputEl.disabled = this.#disabled;

      const container = this.#shadow.querySelector(".container");
      if (!container) return;
      container.classList.toggle("disabled", this.#disabled);
      return;
    }

    if (name === "value") {
      const prevValue = this.value;
      const value = Number(newValue);
      this.value = value;
      if (prevValue !== value) this.dispatchEvent(this.#events.valueChange);
      return;
    }

    if (name === "min") {
      this.min = newValue === null ? 0 : Number(newValue);
      return;
    }

    if (name === "max") {
      this.max = newValue === null ? 100 : Number(newValue);
      return;
    }

    if (name === "aria-label") {
      if (newValue === null) {
        this.#inputEl.removeAttribute(name);
        return;
      }
      this.#inputEl.setAttribute(name, newValue);
      this.#updateCustomSlider();
      return;
    }

    if (name === "step") {
      this.step = newValue === null ? 1 : Number(newValue);
      return;
    }

    return name;
  }

  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"] | (string & {})): string | null;
  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"]): string | null {
    if (qualifiedName === "value") return this.value.toString();
    if (qualifiedName === "min") return this.min.toString();
    if (qualifiedName === "max") return this.max.toString();
    if (qualifiedName === "step") return this.step.toString();
    return super.getAttribute(qualifiedName);
  }
  //#endregion

  #updateCustomSlider = () => {
    const inputEl = this.#inputEl;
    const min = parseInt(inputEl.min) || 0;
    const max = parseInt(inputEl.max) || 100;
    const percent = ((inputEl.valueAsNumber - min) / (max - min)) * 100;
    this.style.setProperty("--value", percent.toString());
    this.#bubbleEl.textContent = inputEl.value;
  };
}

customElements.define(SliderComponent.componentName, SliderComponent);

declare global {
  type SliderComponent = ComponentTypes["Instance"];

  interface HTMLElementTagNameMap {
    [SliderComponent.componentName]: SliderComponent;
  }

  namespace React.JSX {
    interface IntrinsicElements {
      /** @markdown {./README.md} */
      [SliderComponent.componentName]: WCP.ReactWComponent<ComponentTypes["JsxProps"], SliderComponent>;
    }
  }
}
