import type { IWebComponent, WComponent } from "../wc";

type ExtraAttributes = {
  "stack-style": StackStyle;
};

type ComponentTypes = WComponent<typeof AlertComponent, ExtraAttributes>;

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
 *   await customElements.whenDefined("alert-component");
 *
 *   const alertComponent = document.querySelector<AlertComponent>("alert-component");
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
class AlertComponent extends HTMLElement implements IWebComponent {
  static readonly htmlFragment = (() => {
    const template = document.createElement("template");
    template.innerHTML = import_as_string("@components/alert/alert-template.inline.html", { minify: true });
    return template.content;
  })();

  static readonly stylesheet = (() => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(import_as_string("@components/alert/alert-style.inline.css", { minify: true }));
    return sheet;
  })();

  static readonly alertHtmlFragment = AlertComponent.htmlFragment.querySelector<HTMLTemplateElement>("#item-template")!.content;

  readonly #containerEl: HTMLDivElement;
  readonly #popoverEl: HTMLDivElement;

  //#region Public Properties
  #duration = 5000;
  /** The time before dismissing the alert in milliseconds. use `-1` to disable auto dismiss. Default `5000`. */
  get duration(): number {
    return this.#duration;
  }
  set duration(value: number) {
    this.#duration = value;
  }

  #stackStyle: StackStyle = "3d";
  /** The style of stacking alerts: `list` or `3d`. Defaults to `3d`. */
  get stackStyle(): StackStyle {
    return this.#stackStyle;
  }
  set stackStyle(value: StackStyle) {
    this.#stackStyle = value;

    if (value === "list") {
      this.#containerEl.classList.remove("stacked-3d");
      return;
    }

    if (value === "3d") {
      this.#containerEl.classList.add("stacked-3d");
    }
  }
  //#endregion

  //#region HTMLElement Methods
  constructor() {
    super();

    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [AlertComponent.stylesheet];
    shadow.appendChild(AlertComponent.htmlFragment.cloneNode(true));

    const alertContainer = shadow.querySelector<HTMLDivElement>(".alert-container");
    if (!alertContainer) console.error("[alert-component]: Could not find element with class `alert-container`");

    const popover = shadow.querySelector<HTMLDivElement>(".popover");
    if (!popover) console.error("[alert-component]: Could not find element with class `popover`");

    this.#containerEl = alertContainer!;
    this.#popoverEl = popover!;
  }

  static get observedAttributes() {
    return ["duration", "stack-style"] as const;
  }

  attributeChangedCallback(name: ComponentTypes["ObservedAttributes"], _oldValue: string | null, newValue: string | null): void {
    if (name === "duration") {
      const num = Number(newValue);
      const isNumber = !isNaN(num) && isFinite(num);
      if (!isNumber) return;
      this.#duration = Number(newValue);
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

  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"] | (string & {})): string | null {
    if (qualifiedName === "duration") return this.#duration.toString();
    if (qualifiedName === "stack-style") return this.#stackStyle;
    return super.getAttribute(qualifiedName);
  }
  //#endregion

  //#region Private Methods
  #createAlertItem(type: AlertType, message: string, closeBtn: boolean): HTMLDivElement | null {
    const shadow = this.shadowRoot;
    if (!shadow) return null;

    const alertItemContent = AlertComponent.alertHtmlFragment.cloneNode(true) as DocumentFragment;

    const titleContainer = alertItemContent.querySelector(".item-title-container");
    if (!titleContainer) return null;

    const iconTemplate = shadow.querySelector<HTMLTemplateElement>(`#${type}-icon`);
    if (!iconTemplate) return null;

    const messageEl = alertItemContent.querySelector(".item-message");
    if (!messageEl) return null;

    titleContainer.replaceChildren(iconTemplate.content.cloneNode(true));

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

      const isStackEmpty = !this.#containerEl.children.length;
      if (isStackEmpty) this.#popoverEl.hidePopover();

      alertItem.onanimationend = null;
    };
  }
  //#endregion

  /** @function {alert(options: AlertOptions)} - Show An alert. */
  alert(options: AlertOptions): () => void {
    options.closeBtn = options.closeBtn ?? true;

    const alertItem = this.#createAlertItem(options.type, options.message, options.closeBtn);
    if (!alertItem) return () => {};

    this.#containerEl.insertAdjacentElement("beforeend", alertItem);

    this.#popoverEl.showPopover();

    const duration = options.duration ?? this.#duration;
    if (duration > 0) {
      setTimeout(() => this.#removeAlertItem(alertItem), options.duration ?? this.#duration);
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
}
