import type { IWebComponent } from "../wc";

type ObservedAttributes = (typeof SliderComponent.observedAttributes)[number];

/** A wrapper around `<input type="range" />` that allow custom styling. */
class SliderComponent extends HTMLElement implements IWebComponent {
  static formAssociated = true; // a form component

  #internals: ElementInternals;
  #inputEl: HTMLInputElement;
  #bubbleEl: HTMLDivElement;

  /** Fired when the value is changed. */
  #changeEvent = new CustomEvent("change");

  /** Get the underlying `<input type="range" />` element */
  get input(): HTMLInputElement {
    return this.#inputEl;
  }

  /** The current value. Defaults to `50`. */
  get value(): number {
    return this.#inputEl.valueAsNumber;
  }
  set value(val: number) {
    this.#inputEl.valueAsNumber = val;
    this.#updateCustomSlider();
  }

  /** The minimum value. Defaults to `0`. */
  get min(): number {
    return Number(this.#inputEl.min);
  }
  set min(val: number) {
    this.#inputEl.min = val.toString();
    this.#updateCustomSlider();
  }

  /** The maximum value. Defaults to `100`. */
  get max(): number {
    return Number(this.#inputEl.max);
  }
  set max(val: number) {
    this.#inputEl.max = val.toString();
    this.#updateCustomSlider();
  }

  /** Step per value update. Defaults to `1`. */
  get step(): number {
    return Number(this.#inputEl.step);
  }
  set step(val: number) {
    this.#inputEl.step = val.toString();
    this.#updateCustomSlider();
  }

  /** The current value as a percentage `(0-100)`. */
  get percentage() {
    return ((this.value - this.min) / (this.max - this.min)) * 100;
  }
  set percentage(value: number) {
    this.value = (value / 100) * (this.max - this.min) + this.min;
  }

  #disabled = false;
  /** Disabled. Defaults to `false`. */
  get disabled(): boolean {
    return this.#disabled;
  }
  set disabled(value: boolean) {
    this.setAttribute("disabled", value.toString());
  }

  // Form association
  get form() {
    return this.#internals.form;
  }
  get name() {
    return this.#inputEl.name;
  }
  checkValidity(): boolean {
    return this.#inputEl.checkValidity();
  }
  reportValidity() {
    return this.#inputEl.reportValidity();
  }
  get validity() {
    return this.#inputEl.validity;
  }
  get validationMessage() {
    return this.#inputEl.validationMessage;
  }

  constructor() {
    super();

    this.#internals = this.attachInternals();

    const style = import_as_string("@components/slider/slider-style.inline.css", { minify: true });
    const template = import_as_string("@components/slider/slider-template.inline.html", { minify: true });

    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = template;

    const styleTag = document.createElement("style");
    styleTag.textContent = style;

    shadow.appendChild(styleTag);

    const inputEl = shadow.querySelector<HTMLInputElement>('input[type="range"]');
    if (!inputEl) {
      console.error("[slider-component]: Could not find element with type `range`");
    }

    const bubble = shadow.querySelector<HTMLDivElement>(".bubble");
    if (!bubble) {
      console.error("[slider-component]: Could not find element with class `bubble`");
    }

    this.#inputEl = inputEl!;
    this.#bubbleEl = bubble!;

    const isRtl = getComputedStyle(this).direction === "rtl";
    if (isRtl) this.style.setProperty("--is-rtl", "1");
  }

  connectedCallback(): void {
    this.#updateCustomSlider(); // initial

    this.#inputEl.addEventListener("input", () => {
      this.dispatchEvent(this.#changeEvent);
      this.#updateCustomSlider();
    });

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

    this.#inputEl.addEventListener("pointerdown", () => {
      if (this.#inputEl.disabled) return;
      container.classList.add("active");
      this.#internals.states.add("active");
    });

    document.addEventListener("pointerup", () => {
      container.classList.remove("active");
      this.#internals.states.delete("active");
    });

    document.addEventListener("touchend", () => {
      container.classList.remove("active");
      this.#internals.states.delete("active");
    });

    const slot = shadowRoot.querySelector("slot");
    if (!slot) return;

    const slotContents = slot.assignedNodes().map(node => node.cloneNode(true));
    this.shadowRoot.append(...slotContents);
    slot.remove();
  }

  /**
   * @attr label The label of the slider.
   * @attr aria-label Forwarded to the `<input>` element.
   * @attr list The id of the `<datalist>` element.
   */
  static get observedAttributes() {
    return ["label", "aria-label", "min", "max", "value", "step", "list", "disabled"] as const;
  }

  attributeChangedCallback(name: ObservedAttributes, _oldValue: string | null, newValue: string | null) {
    if (name === "label") {
      if (!newValue) return;
      const shadow = this.shadowRoot;
      if (!shadow) return;

      const label = document.createElement("label");
      label.setAttribute("for", this.#inputEl.id);
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

      const container = this.shadowRoot?.querySelector(".container");
      if (!container) return;
      container.classList.toggle("disabled", this.#disabled);
      return;
    }

    if (name === "value") {
      const prevValue = this.value;
      const value = Number(newValue);
      this.value = value;
      if (prevValue !== value) this.dispatchEvent(this.#changeEvent);
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

    const _exhaustiveCheck: never = name;
    return _exhaustiveCheck;
  }

  getAttribute(qualifiedName: ObservedAttributes | (string & {})): string | null {
    if (qualifiedName === "value") return this.value.toString();
    if (qualifiedName === "min") return this.min.toString();
    if (qualifiedName === "max") return this.max.toString();
    if (qualifiedName === "step") return this.step.toString();
    return super.getAttribute(qualifiedName);
  }

  #updateCustomSlider = () => {
    const inputEl = this.#inputEl;
    const min = parseInt(inputEl.min) || 0;
    const max = parseInt(inputEl.max) || 100;
    const percent = ((inputEl.valueAsNumber - min) / (max - min)) * 100;
    this.style.setProperty("--value", percent.toString());
    this.#bubbleEl.textContent = inputEl.value;
  };
}

customElements.define("slider-component", SliderComponent);

export type { SliderComponent };

type SliderComponentLocal = SliderComponent;

declare global {
  type SliderComponent = SliderComponentLocal;

  interface HTMLElementTagNameMap {
    "slider-component": SliderComponent;
  }
}
