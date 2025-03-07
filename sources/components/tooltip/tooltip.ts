import type { IWebComponent } from "../wc";

type ObservedAttributes = (typeof TooltipComponent.observedAttributes)[number];
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
  #internals: ElementInternals;
  #popoverEl: HTMLDivElement;

  /** Emitted when the tooltip is opened. */
  #openEvent = new CustomEvent("open");
  /** Emitted when the tooltip is closed. */
  #closeEvent = new CustomEvent("close");

  #activeElement: HTMLElement | null = null;

  #attachTo: HTMLElement[] = [];
  /** The element to attach the tooltip to. */
  get for() {
    return this.#attachTo;
  }
  set for(value: HTMLElement | HTMLElement[] | string | null) {
    setTimeout(() => {
      if (this.#attachTo) {
        this.#attachTo.forEach(e => e.removeEventListener("pointerenter", this.#hoverEnterHandler));
        this.#attachTo.forEach(e => e.removeEventListener("pointerleave", this.#hoverLeaveHandler));
      }

      if (value === null) {
        this.#attachTo = [];
      } else if (typeof value === "string") {
        const elements = document.querySelectorAll<HTMLElement>(value);
        this.#attachTo = Array.from(elements);
      } else if (value instanceof HTMLElement) {
        this.#attachTo = [value];
      } else if (Array.isArray(value)) {
        this.#attachTo = value;
      }

      if (!this.#attachTo) return;
      this.#attachTo.forEach(e => e.addEventListener("pointerenter", this.#hoverEnterHandler));
      this.#attachTo.forEach(e => e.addEventListener("pointerleave", this.#hoverLeaveHandler));
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

  #isOpen = false;
  /** Returns `true` if the tooltip is open. */
  get isOpen(): boolean {
    return this.#isOpen;
  }

  constructor() {
    super();

    this.#internals = this.attachInternals();

    const style = import_as_string("@components/tooltip/tooltip-style.inline.css", { minify: true });
    const template = import_as_string("@components/tooltip/tooltip-template.inline.html", { minify: true });

    const styleTag = document.createElement("style");
    styleTag.textContent = style;

    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = template;
    shadow.appendChild(styleTag);

    const popoverEl = shadow.querySelector<HTMLDivElement>(".popover");
    if (!popoverEl) {
      console.error("[tooltip-component]: Could not find element with class `popover`");
    }

    this.#popoverEl = popoverEl!;
  }

  static get observedAttributes() {
    return ["for", "prefer-direction"] as const;
  }

  attributeChangedCallback(name: ObservedAttributes, _oldValue: string | null, newValue: string | null): void {
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

    const _exhaustiveCheck: never = name;
    return _exhaustiveCheck;
  }

  getAttribute(qualifiedName: ObservedAttributes | (string & {})): string | null {
    if (qualifiedName === "prefer-direction") return this.#preferDirection;
    return super.getAttribute(qualifiedName);
  }

  #calcMenuBounding = () => {
    const tooltipEl = this.#popoverEl;
    const attachToEl = this.#activeElement;

    if (!attachToEl) return { top: 0, left: 0 };

    const computedStyle = window.getComputedStyle(tooltipEl);

    const string2Number = (str: string, defaultValue: number = 0) => {
      const num = parseFloat(str);
      if (isNaN(num) || !isFinite(num)) return defaultValue;
      return num;
    };

    const offset = {
      top: string2Number(computedStyle.marginTop),
      bottom: string2Number(computedStyle.marginBottom),
      left: string2Number(computedStyle.marginLeft),
      right: string2Number(computedStyle.marginRight),
    };

    const rect = attachToEl.getBoundingClientRect();
    const menuWidth = string2Number(computedStyle.width);
    const menuHeight = string2Number(computedStyle.height);

    if (!menuWidth || !menuHeight) return { top: 0, left: 0 };

    const upwardSpace = rect.top;
    const hasEnoughSpaceUp = upwardSpace > menuHeight + offset.top + offset.bottom;

    const downwardSpace = document.documentElement.clientHeight - rect.bottom;
    const hasEnoughSpaceDown = downwardSpace > menuHeight + offset.top + offset.bottom;

    const onLeftSpace = rect.left;
    const hasEnoughSpaceLeft = onLeftSpace >= menuWidth + offset.left + offset.right;

    const onRightSpace = document.documentElement.clientWidth - rect.right;
    const hasEnoughSpaceRight = onRightSpace >= menuWidth + offset.left + offset.right;

    const getPosForDirection = (dir: PreferDirection) => {
      this.#popoverEl.classList.remove("top", "bottom", "left", "right");
      this.#popoverEl.classList.add(dir);

      if (dir === "top")
        return {
          top: rect.top - offset.top * 2 - menuHeight,
          left: rect.left + rect.width / 2 - menuWidth / 2 - offset.left,
        };

      if (dir === "bottom")
        return {
          top: rect.bottom,
          left: rect.left + rect.width / 2 - menuWidth / 2 - offset.left,
        };

      if (dir === "left")
        return {
          top: rect.top + rect.height / 2 - menuHeight / 2 - offset.top,
          left: rect.left - (menuWidth + offset.left + offset.right),
        };

      if (dir === "right")
        return {
          top: rect.top + rect.height / 2 - menuHeight / 2 - offset.top,
          left: rect.right,
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

  #setMenuPos = () => {
    const popoverEl = this.#popoverEl;

    // clean style for re-calculation
    popoverEl.style.removeProperty("left");
    popoverEl.style.removeProperty("top");

    const { top, left } = this.#calcMenuBounding();

    popoverEl.style.left = `${left}px`;
    popoverEl.style.top = `${top}px`;
  };

  #hoverEnterHandler = (e: PointerEvent) => {
    const isFineInput = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!isFineInput) return;

    if (this.#isOpen) return;

    this.#activeElement = e.target as HTMLElement;
    this.open();
  };

  #hoverLeaveHandler = () => {
    if (this.#isOpen) this.close();
  };

  /** Open the tooltip. */
  #timerRef: number | null = null;
  open = () => {
    this.#isOpen = true;

    if (this.#timerRef !== null) clearTimeout(this.#timerRef);

    this.#timerRef = setTimeout(() => {
      this.dispatchEvent(this.#openEvent);
      this.#internals.states.add("open");
      this.#popoverEl.showPopover();

      window.addEventListener("scroll", this.#setMenuPos);
      window.addEventListener("resize", this.#setMenuPos);

      this.#setMenuPos();
      const durationStr = getComputedStyle(this).getPropertyValue("--animation-duration") ?? "0.3s";
      const duration = parseFloat(durationStr) * (durationStr.endsWith("ms") ? 1 : 1000);
      const easing = getComputedStyle(this).getPropertyValue("--animation-easing") ?? "ease-out";

      this.#popoverEl.animate([{ opacity: 0.1 }, { opacity: 1 }], { duration, easing });
    }, 500);
  };

  /** Close the tooltip. */
  close = () => {
    this.#isOpen = false;
    this.#activeElement = null;

    if (this.#timerRef !== null) {
      clearTimeout(this.#timerRef);
      this.#timerRef = null;
    }

    this.#internals.states.delete("open");

    window.removeEventListener("scroll", this.#setMenuPos);
    window.removeEventListener("resize", this.#setMenuPos);

    const durationStr = getComputedStyle(this).getPropertyValue("--animation-duration") ?? "0.3s";
    const duration = parseFloat(durationStr) * (durationStr.endsWith("ms") ? 1 : 1000);
    const easing = getComputedStyle(this).getPropertyValue("--animation-easing") ?? "ease-out";

    const animation = this.#popoverEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing, fill: "backwards" });
    animation.onfinish = () => {
      this.#popoverEl.hidePopover();
      this.dispatchEvent(this.#closeEvent);
    };
  };

  /** Toggle the tooltip between open and closed. */
  toggle = () => {
    if (this.#isOpen) {
      this.close();
      return;
    }
    this.open();
  };
}

customElements.define("tooltip-component", TooltipComponent);

export type { TooltipComponent };

type TooltipComponentLocal = TooltipComponent;

declare global {
  type TooltipComponent = TooltipComponentLocal;

  interface HTMLElementTagNameMap {
    "tooltip-component": TooltipComponent;
  }
}
