import type * as WCP from "../wcp";

declare const CustomEvent: WCP.CustomEventT;

type ExtendedAttributes = {
  "preferred-sequence": PreferDirection;
  "reveal-delay": WCP.NumberString;
  offset: WCP.NumberString;
};

type ComponentEvents = WCP.WEvent<{
  reveal: CustomEvent<HTMLElement | null>;
  dismiss: CustomEvent<HTMLElement | null>;
  stateChange: CustomEvent<HTMLElement | null>;
}>;

type CssState = "open";

type ComponentTypes = WCP.WComponent<typeof TooltipComponent, ExtendedAttributes, ComponentEvents>;

type PreferDirection = "top" | "bottom" | "left" | "right";

/**
 * A tooltip component that displays a message when hovered over.
 *
 * - Depends on `<anchor-component />`.
 * - Works only for fine input devices by design.
 * - Not selectable and hidden from screen readers.
 * - Pointer events are disabled.
 *
 * @usage
 *
 * ```html
 * <button id="tooltip-button">Show Alert</button>
 *
 * <tooltip-component for="tooltip-button" preferred-sequence="right left bottom top">
 *   <p>A button to show alert</p>
 * </tooltip-component>
 * ```
 */
class TooltipComponent extends HTMLElement implements WCP.IWebComponent {
  addEventListener!: WCP.AddEventListener<ComponentEvents, this>;

  #propsToUpgrade = Object.entries(this) as [keyof this, this[keyof this]][] | undefined;

  static readonly componentName = "tooltip-component";

  static readonly htmlFragment = (() => {
    const template = document.createElement("template");
    template.innerHTML = import_as_string("./tooltip-template.inline.html", { minify: true });
    return template.content;
  })();

  static readonly stylesheet = (() => {
    const sheet = new CSSStyleSheet();
    sheet.replace(import_as_string("./tooltip-style.inline.css", { minify: true }));
    return sheet;
  })();

  readonly #shadow = (() => {
    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [TooltipComponent.stylesheet];
    shadow.appendChild(TooltipComponent.htmlFragment.cloneNode(true));
    return shadow;
  })();

  readonly #events: WCP.WithDispatch<ComponentEvents> = {
    /** Emitted when the tooltip is opened. `detail` is the hovered element. */
    reveal: new CustomEvent("reveal", { detail: null }),
    /** Emitted when the tooltip is closed. `detail` is the hovered element. */
    dismiss: new CustomEvent("dismiss", { detail: null }),
    /** Emitted when the tooltip is opened or closed. `detail` is the hovered element. */
    stateChange: new CustomEvent("stateChange", { detail: null }),
    dispatch: (type, val) => this.dispatchEvent(new CustomEvent(type, { detail: val })),
  };

  readonly #abortController = new AbortController();
  readonly #internals = this.attachInternals<CssState>();
  readonly #popoverEl: HTMLDivElement = this.#shadow.querySelector(".popover")!;
  readonly #anchorCP: Anchor = this.#shadow.querySelector("anchor-component")!;

  #revealDelayTimeoutId: number | null = null;
  #currentHoveredElement: HTMLElement | null = null;

  //#region Public Props
  /** The element to attach the tooltip to, can be a string selector, a single or an array of elements. */
  get for() { return this.#attachTo; }
  set for(value: HTMLElement | HTMLElement[] | string | null) {
    setTimeout(() => {
      if (this.#attachTo) {
        this.#attachTo.forEach(el => el.removeEventListener("pointerenter", this.#hoverEnterHandler));
        this.#attachTo.forEach(el => el.removeEventListener("pointerleave", this.#hoverLeaveHandler));
      }

      if (value === null) {
        this.#attachTo = [];
      } else if (typeof value === "string") {
        const elements = document.querySelectorAll<HTMLElement>(value);
        this.#attachTo = Array.from(elements);
      } else if (Array.isArray(value)) {
        this.#attachTo = value;
      } else if (value instanceof HTMLElement) {
        this.#attachTo = [value];
      }

      const signal = this.#abortController.signal;
      this.#attachTo.forEach(el => el.addEventListener("pointerenter", this.#hoverEnterHandler, { signal }));
      this.#attachTo.forEach(el => el.addEventListener("pointerleave", this.#hoverLeaveHandler, { signal }));
    }, 0);
  }
  #attachTo: HTMLElement[] = [];

  /**
   * The preferred directions to open the tooltip.
   *
   * @attr preferred-sequence The preferred directions to open the tooltip. Pass `"top" | "bottom" | "left" | "right"` of space-separated directions.
   */
  get preferredSequence() { return this.#anchorCP.preferredPositionOrder.map(val => val[0]); }
  set preferredSequence(value: PreferDirection[]) {
    this.#anchorCP.preferredPositionOrder = value.map(val => [val, "center", "center"]);
  }

  /** The delay before the tooltip is revealed. */
  revealDelay: number = 500;

  /** The tooltip offset, use `margin` like values. Ex: `1em 2em` */
  get offset(): string { return this.#offset; }
  set offset(value: string) {
    this.#offset = value;
    this.#popoverEl.style.margin = value;
  }
  #offset: string = "1em";

  /** Returns `true` if the tooltip is open. */
  get isOpen(): boolean { return this.#internals.states.has("open"); }
  //#endregion

  //#region HtmlElement Methods
  connectedCallback() {
    if (!customElements.get("anchor-component")) {
      console.error(`[${this.localName}]: Please import "anchor-component" first`);
    }

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
    return ["for", "preferred-sequence", "reveal-delay", "offset"] as const;
  }

  attributeChangedCallback(name: ComponentTypes["ObservedAttributes"], _oldValue: string | null, newValue: string | null) {
    if (name === "for") {
      this.for = newValue;
      return;
    }

    if (name === "preferred-sequence") {
      if (newValue === null) {
        this.preferredSequence = ["top", "bottom", "left", "right"];
        return;
      }

      const arr = newValue.trim().split(" ").filter(Boolean);
      this.preferredSequence = arr as PreferDirection[];
      return;
    }

    if (name === "reveal-delay") {
      const num = Number(newValue);
      const isNumber = !isNaN(num) && isFinite(num);
      if (!isNumber) return;
      this.revealDelay = num;
      return;
    }

    if (name === "offset") {
      this.offset = newValue || "1em";
      return;
    }

    return name;
  }

  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"] | (string & {})): string | null;
  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"]): string | null {
    if (qualifiedName === "preferred-sequence") return this.preferredSequence.join(" ");
    if (qualifiedName === "reveal-delay") return this.revealDelay.toString();
    if (qualifiedName === "offset") return this.#offset;
    return super.getAttribute(qualifiedName);
  }
  //#endregion

  //#region Private Methods
  #hoverEnterHandler = (e: PointerEvent) => {
    const isFineInput = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!isFineInput) return;

    if (this.isOpen) return;
    this.#currentHoveredElement = e.target as HTMLElement;
    if (this.#revealDelayTimeoutId) clearTimeout(this.#revealDelayTimeoutId);
    this.#revealDelayTimeoutId = setTimeout(() => this.open(), this.revealDelay);
  };

  #hoverLeaveHandler = () => {
    if (this.#revealDelayTimeoutId) clearTimeout(this.#revealDelayTimeoutId);
    this.close();
    this.#events.dispatch("dismiss", this.#currentHoveredElement);
    this.#events.dispatch("stateChange", this.#currentHoveredElement);
    this.#currentHoveredElement = null;
  };
  //#endregion

  //#region Public Methods
  /** Open the tooltip. */
  open = () => {
    this.#events.dispatch("reveal", this.#currentHoveredElement);
    this.#events.dispatch("stateChange", this.#currentHoveredElement);

    this.#internals.states.add("open");
    this.#popoverEl.showPopover();

    this.#popoverEl.classList.remove("hide");
    this.#popoverEl.classList.add("show");

    this.#anchorCP.anchorElement = this.#currentHoveredElement!;
    this.#anchorCP.startAutoUpdate();

    const animation = this.#popoverEl.getAnimations()[0];
    if (!animation) return;

    animation.onfinish = animation.oncancel = () => {
      animation.onfinish = animation.oncancel = null;
      this.#popoverEl.classList.remove("show");
    };
  };

  /** Close the tooltip. */
  close = () => {
    this.#internals.states.delete("open");

    this.#popoverEl.classList.remove("show");
    this.#popoverEl.classList.add("hide");

    const animation = this.#popoverEl.getAnimations()[0];
    if (!animation) return this.#anchorCP.stopAutoUpdate();

    animation.onfinish = animation.oncancel = () => {
      animation.onfinish = animation.oncancel = null;
      this.#anchorCP.stopAutoUpdate();
      this.#popoverEl.hidePopover();
      this.#popoverEl.classList.remove("hide");
    };
  };

  /** Toggle the tooltip between open and closed. */
  toggle = () => {
    const isAnimating = this.#popoverEl.classList.contains("show") || this.#popoverEl.classList.contains("hide");
    if (isAnimating) return;
    if (this.isOpen) return this.close();
    this.open();
  };
  //#endregion
}

customElements.define(TooltipComponent.componentName, TooltipComponent);

declare global {
  type TooltipComponent = ComponentTypes["Instance"];

  interface HTMLElementTagNameMap {
    [TooltipComponent.componentName]: TooltipComponent;
  }

  namespace React.JSX {
    interface IntrinsicElements {
      /** @markdown {./README.md} */
      [TooltipComponent.componentName]: WCP.ReactWComponent<ComponentTypes["JsxProps"], TooltipComponent>;
    }
  }
}
