import * as WCP from "../wcp";

type ComponentTypes = WCP.WComponent<typeof MenuTrigger>;

const COMPONENT_NAME = "menu-trigger";

/**
 * A trigger for `<menu-component />`.
 *
 * @usage
 * ```html
 * <menu-trigger></menu-trigger>
 * ```
 */
class MenuTrigger extends HTMLElement implements WCP.IWebComponent {
  static readonly htmlFragment = (() => {
    const template = document.createElement("template");
    template.innerHTML = import_as_string("./menu-trigger-template.inline.html", { minify: true });
    return template.content;
  })();

  static readonly stylesheet = (() => {
    const sheet = new CSSStyleSheet();
    sheet.replace(import_as_string("./menu-trigger-style.inline.css", { minify: true }));
    return sheet;
  })();

  //#region Public Props
  /** The trigger button element */
  trigger: HTMLButtonElement = null!;

  /** Disable the menu trigger button. */
  get disabled(): boolean { return this.trigger.disabled; }
  set disabled(val: boolean) { this.trigger.disabled = val; }
  //#endregion

  //#region HTMLElement Methods
  constructor() {
    super();

    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [MenuTrigger.stylesheet];
    shadow.appendChild(MenuTrigger.htmlFragment.cloneNode(true));

    const triggerEl = shadow.querySelector<HTMLButtonElement>(".trigger")!;
    if (!triggerEl) console.error(`[${COMPONENT_NAME}]: Could not find element with the selector ".trigger"`);
    this.trigger = triggerEl;
  }

  static get observedAttributes() {
    return ["trigger-label", "disabled"] as const;
  }

  attributeChangedCallback(name: ComponentTypes["ObservedAttributes"], _oldValue: string | null, newValue: string | null) {
    if (name === "trigger-label") {
      if (newValue === null) return this.trigger.removeAttribute("aria-label");
      this.trigger.setAttribute("aria-label", newValue);
      return;
    }

    if (name === "disabled") {
      this.trigger.disabled = newValue === "true" || newValue === "";
      return;
    }

    const _exhaustiveCheck: never = name;
    return _exhaustiveCheck;
  }

  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"] | (string & {})): string | null;
  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"]): string | null {
    return super.getAttribute(qualifiedName);
  }
  //#endregion

  //#region Private Methods
  //#endregion

  //#region Public Methods
  /** Sets the trigger text content only for a child with the id "trigger-label" . (Managed by the menu component) */
  setTriggerLabel(label: string | null) {
    const triggerLabel = this.querySelector("#trigger-label") || this.trigger.querySelector("#trigger-label");
    if (!triggerLabel) return;
    triggerLabel.textContent = label || "...";
    if (label && !this.hasAttribute("trigger-label")) this.trigger.setAttribute("aria-label", label);
  }

  /**
   * Sets the menu role. Managed by the menu component.
   *
   * @function {setRole(role: "dialog" | "select" | "menu", controls: string)}
   */
  setRole(role: "dialog" | "select" | "menu", controls: string) {
    if (role === "dialog") {
      this.trigger.setAttribute("aria-haspopup", "dialog");
      this.trigger.setAttribute("aria-controls", controls);
      return;
    }
    if (role === "select") {
      this.trigger.setAttribute("aria-haspopup", "listbox");
      this.trigger.setAttribute("role", "combobox");
      this.trigger.setAttribute("aria-controls", controls);
      return;
    }
    if (role === "menu") {
      this.trigger.setAttribute("aria-haspopup", "menu");
      this.trigger.setAttribute("aria-controls", controls);
      return;
    }
  }
  //#endregion
}

customElements.define(COMPONENT_NAME, MenuTrigger);

export type { MenuTrigger };

declare global {
  type MenuTrigger = ComponentTypes["Instance"];

  interface HTMLElementTagNameMap {
    [COMPONENT_NAME]: MenuTrigger;
  }
}
