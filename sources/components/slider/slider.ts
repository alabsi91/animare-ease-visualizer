import type * as WCP from "../wcp";

const CustomEvent = globalThis.CustomEvent as typeof WCP.CustomEventT;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type ExtendedAttributes = {};

type ComponentEvents = WCP.WEvent<{
  valueChange: CustomEvent;
}>;

type ComponentTypes = WCP.WComponent<typeof SliderComponent, ExtendedAttributes, ComponentEvents>;

const COMPONENT_NAME = "slider-component";

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
 */
class SliderComponent extends HTMLElement implements WCP.IWebComponent {
  addEventListener!: WCP.AddEventListener<ComponentEvents, this>;

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

  readonly #abortController = new AbortController();

  readonly #elements = {
    internals: null! as ElementInternals,
    input: null! as HTMLInputElement,
    bubble: null! as HTMLDivElement,
  };

  readonly #events: ComponentEvents = {
    /** Fired when the value is changed. */
    valueChange: new CustomEvent("valueChange"),
  };

  //#region Public Props
  /** Get the underlying `<input type="range" />` element */
  get input(): HTMLInputElement { return this.#elements.input; }

  /** The current value. (defaults: `50`). */
  get value(): number { return this.#elements.input.valueAsNumber; }
  set value(val: number) {
    this.#elements.input.valueAsNumber = val;
    this.#elements.internals.setFormValue(val.toString());
    this.#updateCustomSlider();
  }

  /** The minimum value. (defaults: `0`). */
  get min(): number { return Number(this.#elements.input.min); }
  set min(val: number) {
    this.#elements.input.min = val.toString();
    this.#updateCustomSlider();
  }

  /** The maximum value. (defaults: `100`). */
  get max(): number { return Number(this.#elements.input.max); }
  set max(val: number) {
    this.#elements.input.max = val.toString();
    this.#updateCustomSlider();
  }

  /** Step per value update. (defaults: `1`). */
  get step(): number { return Number(this.#elements.input.step); }
  set step(val: number) {
    this.#elements.input.step = val.toString();
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
  get form() { return this.#elements.internals.form; }
  get name() { return this.#elements.input.name; }
  get validity() { return this.#elements.input.validity; }
  get validationMessage() { return this.#elements.input.validationMessage; }
  checkValidity = () => this.#elements.input.checkValidity();
  reportValidity = () => this.#elements.input.reportValidity();
  //#endregion

  //#region HtmlElement Methods
  constructor() {
    super();

    this.#elements.internals = this.attachInternals();

    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [SliderComponent.stylesheet];
    shadow.appendChild(SliderComponent.htmlFragment.cloneNode(true));

    const inputEl = shadow.querySelector<HTMLInputElement>('input[type="range"]')!;
    if (!inputEl) console.error(`[${COMPONENT_NAME}]: Could not find element with the selector 'input[type="range"]'`);
    this.#elements.input = inputEl;

    const bubble = shadow.querySelector<HTMLDivElement>(".bubble");
    if (!bubble) console.error(`[${COMPONENT_NAME}]: Could not find element with the selector ".bubble"`);
    this.#elements.bubble = bubble!;

    const isRtl = getComputedStyle(this).direction === "rtl";
    if (isRtl) this.style.setProperty("--is-rtl", "1");
  }

  connectedCallback(): void {
    this.#updateCustomSlider(); // initial

    const signal = this.#abortController.signal;

    this.#elements.input.addEventListener(
      "input",
      () => {
        this.dispatchEvent(this.#events.valueChange);
        this.#updateCustomSlider();
      },
      { signal }
    );

    const shadowRoot = this.shadowRoot;
    if (!shadowRoot) {
      console.error("[slider-component]: Could not find shadow root");
      return;
    }

    const container = shadowRoot.querySelector(".container");
    if (!container) {
      console.error("[slider-component]: Could not find element with class `container`");
      return;
    }

    this.#elements.input.addEventListener(
      "pointerdown",
      () => {
        if (this.#elements.input.disabled) return;
        container.classList.add("active");
        this.#elements.internals.states.add("active");
      },
      { signal }
    );

    document.addEventListener(
      "pointerup",
      () => {
        container.classList.remove("active");
        this.#elements.internals.states.delete("active");
      },
      { signal }
    );

    document.addEventListener(
      "touchend",
      () => {
        container.classList.remove("active");
        this.#elements.internals.states.delete("active");
      },
      { signal }
    );

    const slot = shadowRoot.querySelector("slot");
    if (!slot) return;

    const slotContents = slot.assignedNodes().map(node => node.cloneNode(true));
    this.shadowRoot.append(...slotContents);
    slot.remove();
  }

  disconnectedCallback(): void {
    this.#abortController.abort();
  }

  /**
   * @attr label The label of the slider.
   * @attr aria-label Forwarded to the `<input>` element.
   * @attr list The id of the `<datalist>` element.
   */
  static get observedAttributes() {
    return ["label", "aria-label", "min", "max", "value", "step", "list", "disabled"] as const;
  }

  attributeChangedCallback(name: ComponentTypes["ObservedAttributes"], _oldValue: string | null, newValue: string | null) {
    if (name === "label") {
      if (!newValue) return;
      const shadow = this.shadowRoot;
      if (!shadow) return;

      const label = document.createElement("label");
      label.setAttribute("for", this.#elements.input.id);
      label.setAttribute("part", "label");
      label.textContent = newValue;

      shadow.insertBefore(label, shadow.firstElementChild);

      return;
    }

    if (name === "list") {
      const dataSet = window[newValue as keyof Window] as HTMLDataListElement | null;
      if (!dataSet) return;

      const ticksEl = this.shadowRoot?.querySelector(".ticks");
      if (!ticksEl) {
        console.error("[slider-component]: Could not find element with class `ticks`");
        return;
      }

      const inputEl = this.#elements.input;
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
      this.#elements.input.disabled = this.#disabled;

      const container = this.shadowRoot?.querySelector(".container");
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
        this.#elements.input.removeAttribute(name);
        return;
      }
      this.#elements.input.setAttribute(name, newValue);
      this.#updateCustomSlider();
      return;
    }

    if (name === "step") {
      this.step = newValue === null ? 1 : Number(newValue);
      return;
    }

    const _exhaustiveCheck: never = name;
    return _exhaustiveCheck;
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
    const inputEl = this.#elements.input;
    const min = parseInt(inputEl.min) || 0;
    const max = parseInt(inputEl.max) || 100;
    const percent = ((inputEl.valueAsNumber - min) / (max - min)) * 100;
    this.style.setProperty("--value", percent.toString());
    this.#elements.bubble.textContent = inputEl.value;
  };
}

customElements.define(COMPONENT_NAME, SliderComponent);

export type { SliderComponent };

declare global {
  type SliderComponent = ComponentTypes["Instance"];

  interface HTMLElementTagNameMap {
    [COMPONENT_NAME]: SliderComponent;
  }
}
