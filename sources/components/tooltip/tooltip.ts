import type { IWebComponent, NumberString, WComponent } from "../wc";

type ExtraAttributes = {
  "prefer-direction": PreferDirection;
  "reveal-delay": NumberString;
  onchange: (e: CustomEvent) => void;
};

type ComponentTypes = WComponent<typeof TooltipComponent, ExtraAttributes>;

const COMPONENT_NAME = "tooltip-component";

type PreferDirection = "top" | "bottom" | "left" | "right";

/**
 * A tooltip component that displays a message when hovered over.
 *
 * - Works only for fine input devices by design.
 * - Not selectable and hidden from screen readers.
 * - Pointer events are disabled.
 * - To offset the tooltip, use `margin` on the `::part(container)` element.
 *
 * @usage
 *
 * ```html
 * <button id="tooltip-button">Show Alert</button>
 *
 * <tooltip-component for="tooltip-button" prefer-direction="right">
 *   <p>A button to show alert</p>
 * </tooltip-component>
 * ```
 */
class TooltipComponent extends HTMLElement implements IWebComponent {
  static readonly htmlFragment = (() => {
    const template = document.createElement("template");
    template.innerHTML = import_as_string("./tooltip-template.inline.html", { minify: true });
    return template.content;
  })();

  static readonly stylesheet = (() => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(import_as_string("./tooltip-style.inline.css", { minify: true }));
    return sheet;
  })();

  readonly #internals: ElementInternals;
  readonly #popoverEl: HTMLDivElement;
  readonly #abortController = new AbortController();
  #revealDelayTimeoutId: number | null = null;
  #currentHoveredElement: HTMLElement | null = null;

  /** Emitted when the tooltip is opened. */
  readonly #openEvent = new CustomEvent("open");
  /** Emitted when the tooltip is closed. */
  readonly #closeEvent = new CustomEvent("close");

  //#region Public Props
  #attachTo: HTMLElement[] = [];
  /** The element to attach the tooltip to. */
  get for() {
    return this.#attachTo;
  }
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

      if (!this.#attachTo) return;
      const signal = this.#abortController.signal;
      this.#attachTo.forEach(el => el.addEventListener("pointerenter", this.#hoverEnterHandler, { signal }));
      this.#attachTo.forEach(el => el.addEventListener("pointerleave", this.#hoverLeaveHandler, { signal }));
    }, 0);
  }

  #preferDirection: PreferDirection = "top";
  /** Open the tooltip in the preferred direction if possible. Defaults to `top`. */
  get preferDirection(): PreferDirection {
    return this.#preferDirection;
  }
  set preferDirection(value: PreferDirection) {
    this.#preferDirection = value;
  }

  #revealDelay: number = 500;
  /** The delay before the tooltip is revealed. */
  get revealDelay(): number {
    return this.#revealDelay;
  }
  set revealDelay(value: number) {
    this.#revealDelay = value;
  }

  /** Returns `true` if the tooltip is open. */
  get isOpen(): boolean {
    return this.#internals.states.has("open");
  }
  //#endregion

  //#region HtmlElement Methods
  constructor() {
    super();

    this.#internals = this.attachInternals();

    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [TooltipComponent.stylesheet];
    shadow.appendChild(TooltipComponent.htmlFragment.cloneNode(true));

    const popoverEl = shadow.querySelector<HTMLDivElement>(".popover");
    if (!popoverEl) {
      console.error("[tooltip-component]: Could not find element with class `popover`");
    }

    this.#popoverEl = popoverEl!;
  }

  disconnectedCallback(): void {
    this.#abortController.abort();
  }

  static get observedAttributes() {
    return ["for", "prefer-direction", "reveal-delay"] as const;
  }

  attributeChangedCallback(name: ComponentTypes["ObservedAttributes"], _oldValue: string | null, newValue: string | null): void {
    if (name === "for") {
      this.for = newValue;
      return;
    }

    if (name === "prefer-direction") {
      if (newValue === null) {
        this.preferDirection = "top";
        return;
      }

      if (newValue === "top" || newValue === "bottom" || newValue === "left" || newValue === "right") {
        this.preferDirection = newValue;
        return;
      }

      console.error(
        `[tooltip-component]: Invalid value for attribute "prefer-direction": ${newValue}. Valid values are "top", "bottom", "left" and "right".`
      );

      return;
    }

    if (name === "reveal-delay") {
      const num = Number(newValue);
      const isNumber = !isNaN(num) && isFinite(num);
      if (!isNumber) return;
      this.revealDelay = num;
      return;
    }

    const _exhaustiveCheck: never = name;
    return _exhaustiveCheck;
  }

  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"] | (string & {})): string | null {
    if (qualifiedName === "prefer-direction") return this.#preferDirection;
    return super.getAttribute(qualifiedName);
  }
  //#endregion

  //#region Private Methods
  #string2Number = (str: string, defaultValue: number = 0) => {
    const num = parseFloat(str);
    if (isNaN(num) || !isFinite(num)) return defaultValue;
    return num;
  };

  #calcTooltipPos = () => {
    const tooltipEl = this.#popoverEl;

    const hoveredEl = this.#currentHoveredElement;
    if (!hoveredEl) return { top: 0, left: 0 };

    const tooltipStyle = window.getComputedStyle(tooltipEl);

    const tooltipWidth = this.#string2Number(tooltipStyle.width);
    const tooltipHeight = this.#string2Number(tooltipStyle.height);
    if (!tooltipWidth || !tooltipHeight) return { top: 0, left: 0 };

    const tooltipOffset = {
      top: this.#string2Number(tooltipStyle.marginTop),
      bottom: this.#string2Number(tooltipStyle.marginBottom),
      left: this.#string2Number(tooltipStyle.marginLeft),
      right: this.#string2Number(tooltipStyle.marginRight),
    };

    const hoveredElRect = hoveredEl.getBoundingClientRect();

    const upwardSpace = hoveredElRect.top;
    const hasEnoughSpaceUp = upwardSpace > tooltipHeight + tooltipOffset.top + tooltipOffset.bottom;

    const downwardSpace = document.documentElement.clientHeight - hoveredElRect.bottom;
    const hasEnoughSpaceDown = downwardSpace > tooltipHeight + tooltipOffset.top + tooltipOffset.bottom;

    const onLeftSpace = hoveredElRect.left;
    const hasEnoughSpaceLeft = onLeftSpace >= tooltipWidth + tooltipOffset.left + tooltipOffset.right;

    const onRightSpace = document.documentElement.clientWidth - hoveredElRect.right;
    const hasEnoughSpaceRight = onRightSpace >= tooltipWidth + tooltipOffset.left + tooltipOffset.right;

    const getPosForDirection = (dir: PreferDirection) => {
      tooltipEl.classList.remove("top", "bottom", "left", "right");
      tooltipEl.classList.add(dir);

      if (dir === "top")
        return {
          top: hoveredElRect.top - tooltipOffset.top * 2 - tooltipHeight,
          left: hoveredElRect.left + hoveredElRect.width / 2 - tooltipWidth / 2 - tooltipOffset.left,
        };

      if (dir === "bottom")
        return {
          top: hoveredElRect.bottom,
          left: hoveredElRect.left + hoveredElRect.width / 2 - tooltipWidth / 2 - tooltipOffset.left,
        };

      if (dir === "left")
        return {
          top: hoveredElRect.top + hoveredElRect.height / 2 - tooltipHeight / 2 - tooltipOffset.top,
          left: hoveredElRect.left - (tooltipWidth + tooltipOffset.left + tooltipOffset.right),
        };

      if (dir === "right")
        return {
          top: hoveredElRect.top + hoveredElRect.height / 2 - tooltipHeight / 2 - tooltipOffset.top,
          left: hoveredElRect.right,
        };

      return { top: 0, left: 0 };
    };

    if (this.#preferDirection === "top") {
      if (hasEnoughSpaceUp) return getPosForDirection("top");
      if (hasEnoughSpaceDown) return getPosForDirection("bottom");
      if (hasEnoughSpaceLeft) return getPosForDirection("left");
      if (hasEnoughSpaceRight) return getPosForDirection("right");
      return getPosForDirection("top");
    }

    if (this.#preferDirection === "bottom") {
      if (hasEnoughSpaceDown) return getPosForDirection("bottom");
      if (hasEnoughSpaceUp) return getPosForDirection("top");
      if (hasEnoughSpaceLeft) return getPosForDirection("left");
      if (hasEnoughSpaceRight) return getPosForDirection("right");
      return getPosForDirection("bottom");
    }

    if (this.#preferDirection === "left") {
      if (hasEnoughSpaceLeft) return getPosForDirection("left");
      if (hasEnoughSpaceRight) return getPosForDirection("right");
      if (hasEnoughSpaceUp) return getPosForDirection("top");
      if (hasEnoughSpaceDown) return getPosForDirection("bottom");
      return getPosForDirection("left");
    }

    if (this.#preferDirection === "right") {
      if (hasEnoughSpaceRight) return getPosForDirection("right");
      if (hasEnoughSpaceLeft) return getPosForDirection("left");
      if (hasEnoughSpaceUp) return getPosForDirection("top");
      if (hasEnoughSpaceDown) return getPosForDirection("bottom");
      return getPosForDirection("right");
    }

    return { top: 0, left: 0 };
  };

  #setTooltipPos = () => {
    const tooltipEl = this.#popoverEl;

    // clean style for re-calculation
    tooltipEl.style.removeProperty("left");
    tooltipEl.style.removeProperty("top");

    const { top, left } = this.#calcTooltipPos();

    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.top = `${top}px`;
  };

  #hoverEnterHandler = (e: PointerEvent) => {
    const isFineInput = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!isFineInput) return;

    if (this.isOpen) return;
    this.#currentHoveredElement = e.target as HTMLElement;
    if (this.#revealDelayTimeoutId) clearTimeout(this.#revealDelayTimeoutId);
    this.#revealDelayTimeoutId = setTimeout(() => this.open(), this.#revealDelay);
  };

  #hoverLeaveHandler = () => {
    if (this.#revealDelayTimeoutId) clearTimeout(this.#revealDelayTimeoutId);
    this.#currentHoveredElement = null;
    this.close();
  };
  //#endregion

  //#region Public Methods
  /** Open the tooltip. */
  open = () => {
    this.dispatchEvent(this.#openEvent);
    this.#internals.states.add("open");
    this.#popoverEl.showPopover();

    const signal = this.#abortController.signal;
    window.addEventListener("scroll", this.#setTooltipPos, { signal });
    window.addEventListener("resize", this.#setTooltipPos, { signal });

    this.#setTooltipPos();
    const computedStyle = getComputedStyle(this);
    const durationStr = computedStyle.getPropertyValue("--dur-anim") ?? "0.3s";
    const duration = parseFloat(durationStr) * (durationStr.endsWith("ms") ? 1 : 1000);
    const easing = computedStyle.getPropertyValue("--ease-anim") ?? "ease-out";

    this.#popoverEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing });
  };

  /** Close the tooltip. */
  close = () => {
    this.#internals.states.delete("open");

    window.removeEventListener("scroll", this.#setTooltipPos);
    window.removeEventListener("resize", this.#setTooltipPos);

    const computedStyle = getComputedStyle(this);
    const durationStr = computedStyle.getPropertyValue("--dur-anim") ?? "0.3s";
    const duration = parseFloat(durationStr) * (durationStr.endsWith("ms") ? 1 : 1000);
    const easing = computedStyle.getPropertyValue("--ease-anim") ?? "ease-out";

    const animation = this.#popoverEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing, fill: "backwards" });
    animation.onfinish = () => {
      this.#popoverEl.hidePopover();
      this.dispatchEvent(this.#closeEvent);
    };
  };

  /** Toggle the tooltip between open and closed. */
  toggle = () => {
    if (this.isOpen) {
      this.close();
      return;
    }
    this.open();
  };
  //#endregion
}

customElements.define(COMPONENT_NAME, TooltipComponent);

export type { TooltipComponent };

declare global {
  type TooltipComponent = ComponentTypes["Instance"];

  interface HTMLElementTagNameMap {
    [COMPONENT_NAME]: TooltipComponent;
  }
}
