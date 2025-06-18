import * as WCP from "../wcp";

type ExtendedAttributes = {
  "stack-style": StackStyle;
};

type ComponentTypes = WCP.WComponent<typeof AlertComponent, ExtendedAttributes>;

type AlertType = "error" | "info" | "success" | "warning";
type StackStyle = "list" | "3d";

type AlertOptions = {
  /** - Effect the color, icon and title */
  type: AlertType;
  /** - The message to show */
  message: string;
  /**
   * - The amount of time to show the alert before it is removed, in milliseconds.
   * - Tip: use `-1` to show the alert indefinitely
   * - Default: `5000`
   */
  duration?: number;
  /**
   * - Whether to show the close button.
   * - Default: `true`
   */
  closeBtn?: boolean;
};

const COMPONENT_NAME = "alert-component";

/**
 * Show a stackable alert on the top layer of the page.
 *
 * - The host of `<alert-component />` can't be styled directly.
 *
 * @example
 *   const alertComponent = document.querySelector("alert-component");
 *   if (!alertComponent) return;
 *
 *   const closeFn = alertComponent.alert({
 *     type: "info", // "error" | "info" | "success" | "warning"
 *     message: "Hello world!",
 *     duration: 5000, // use -1 to disable auto dismissing
 *     closeBtn: true, // show close button
 *   });
 *
 * @usage
 * ```html
 *   <alert-component stack-style="3d"></alert-component>
 * ```
 */
class AlertComponent extends HTMLElement implements WCP.IWebComponent {
  static readonly htmlFragment = (() => {
    const template = document.createElement("template");
    template.innerHTML = import_as_string("@components/alert/alert-template.inline.html", { minify: true });
    return template.content;
  })();

  static readonly stylesheet = (() => {
    const sheet = new CSSStyleSheet();
    sheet.replace(import_as_string("@components/alert/alert-style.inline.css", { minify: true }));
    return sheet;
  })();

  static readonly alertHtmlFragment = AlertComponent.htmlFragment.querySelector<HTMLTemplateElement>("#item-template")!.content;

  readonly #elements = {
    container: null! as HTMLDivElement,
    popover: null! as HTMLDivElement,
  };

  /** The time before dismissing the alert in milliseconds. use `-1` to disable auto dismiss. */
  duration = 5000;

  /**
   * The style of stacking alerts: `"list"` or `"3d"`.
   *
   * @attr stack-style
   */
  get stackStyle(): StackStyle { return this.#stackStyle; }
  set stackStyle(value: StackStyle) {
    this.#stackStyle = value;
    this.#elements.container.classList.toggle("stacked-3d", value === "3d");
  }
  #stackStyle: StackStyle = "3d";

  constructor() {
    super();

    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [AlertComponent.stylesheet];
    shadow.appendChild(AlertComponent.htmlFragment.cloneNode(true));

    const alertContainer = shadow.querySelector<HTMLDivElement>(".alert-container")!;
    if (!alertContainer) console.error(`[${COMPONENT_NAME}]: Could not find element with the selector ".alert-container"`);
    this.#elements.container = alertContainer;

    const popover = shadow.querySelector<HTMLDivElement>(".popover")!;
    if (!popover) console.error(`[${COMPONENT_NAME}]: Could not find element with the selector ".popover"`);
    this.#elements.popover = popover;
  }

  static get observedAttributes() {
    return ["duration", "stack-style"] as const;
  }

  attributeChangedCallback(name: ComponentTypes["ObservedAttributes"], _oldValue: string | null, newValue: string | null): void {
    if (name === "duration") {
      const num = Number(newValue);
      const isNumber = !isNaN(num) && isFinite(num);
      if (isNumber) this.duration = Number(newValue);
      return;
    }

    if (name === "stack-style") {
      if (newValue === "list" || newValue === "3d") {
        this.stackStyle = newValue;
      }
      return;
    }

    const _exhaustiveCheck: never = name;
    return _exhaustiveCheck;
  }

  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"] | (string & {})): string | null;
  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"]): string | null {
    if (qualifiedName === "duration") return this.duration.toString();
    if (qualifiedName === "stack-style") return this.#stackStyle;
    return super.getAttribute(qualifiedName);
  }

  #createAlertItem(type: AlertType, message: string, closeBtn: boolean): HTMLDivElement | null {
    const shadow = this.shadowRoot;
    if (!shadow) return null;

    const alertItemContent = AlertComponent.alertHtmlFragment.cloneNode(true) as DocumentFragment;

    const titleContainer = alertItemContent.querySelector(".item-title-container");
    if (!titleContainer) return null;

    const iconTemplate = shadow.querySelector<HTMLSlotElement>(`slot[name="${type}-icon"]`);
    if (!iconTemplate) return null;

    const messageEl = alertItemContent.querySelector(".item-message");
    if (!messageEl) return null;

    let iconEls = iconTemplate.assignedNodes();
    if (!iconEls.length) iconEls = [...iconTemplate.children];

    titleContainer.replaceChildren(...iconEls.map(e => e.cloneNode(true)));

    messageEl.textContent = message;

    const item = alertItemContent.querySelector<HTMLDivElement>(".alert-item");
    if (!item) return null;

    const closeBtnEl = item.querySelector<HTMLButtonElement>(".close-btn");
    if (!closeBtnEl) return null;

    if (closeBtn) {
      closeBtnEl.addEventListener("click", () => this.#removeAlertItem(item), { once: true });
    } else {
      closeBtnEl.remove();
    }

    item.classList.add(type);
    item.setAttribute("aria-label", `${type}: ${message}`);
    if (type === "error") item.setAttribute("aria-live", "assertive");

    return item;
  }

  #removeAlertItem(alertItem: HTMLDivElement) {
    alertItem.style.height = window.getComputedStyle(alertItem).getPropertyValue("height");
    alertItem.classList.add("hide");

    alertItem.onanimationend = () => {
      alertItem.remove();

      const isStackEmpty = !this.#elements.container.children.length;
      if (isStackEmpty) this.#elements.popover.hidePopover();

      alertItem.onanimationend = null;
    };
  }

  /** @function {alert(options: AlertOptions)} - Show An alert. */
  alert(options: AlertOptions): () => void {
    options.closeBtn = options.closeBtn ?? true;

    const alertItem = this.#createAlertItem(options.type, options.message, options.closeBtn);
    if (!alertItem) return () => {};

    this.#elements.container.insertAdjacentElement("beforeend", alertItem);

    this.#elements.popover.showPopover();

    const duration = options.duration ?? this.duration;
    if (duration > 0) {
      setTimeout(() => this.#removeAlertItem(alertItem), options.duration ?? this.duration);
    }

    return () => {
      this.#removeAlertItem(alertItem);
    };
  }
}

customElements.define(COMPONENT_NAME, AlertComponent);

export type { AlertComponent, AlertOptions, AlertType };

declare global {
  type AlertComponent = ComponentTypes["Instance"];

  interface HTMLElementTagNameMap {
    [COMPONENT_NAME]: AlertComponent;
  }

  namespace React.JSX {
    interface IntrinsicElements {
      /** @markdown {./README.md} */
      [COMPONENT_NAME]: WCP.ReactWComponent<ComponentTypes["JsxProps"], AlertComponent>;
    }
  }
}
