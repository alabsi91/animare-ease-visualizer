import type * as WCP from "../wcp";

type ComponentTypes = WCP.WComponent<typeof MenuTrigger>;

/**
 * A trigger for `<menu-component />`.
 *
 * @usage
 * ```html
 * <menu-trigger></menu-trigger>
 * ```
 */
class MenuTrigger extends HTMLElement implements WCP.IWebComponent {
  static readonly componentName = "menu-trigger";

  #propsToUpgrade = Object.entries(this) as [keyof this, this[keyof this]][] | undefined;

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

  readonly #shadow = (() => {
    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [MenuTrigger.stylesheet];
    shadow.appendChild(MenuTrigger.htmlFragment.cloneNode(true));
    return shadow;
  })();

  /** The trigger button element */
  trigger: HTMLButtonElement = this.#shadow.querySelector(".trigger")!;

  /** The trigger text content when no value is set. */
  noValueLabel: string = "...";

  /** Disable the menu trigger button. */
  get disabled(): boolean { return this.trigger.disabled; }
  set disabled(val: boolean) { this.trigger.disabled = val; }

  //#region HTMLElement Methods
  connectedCallback() {
    if (this.#propsToUpgrade) {
      for (const [prop, value] of this.#propsToUpgrade) {
        delete this[prop];
        this[prop] = value;
      }
      this.#propsToUpgrade = undefined;
    }
  }

  static get observedAttributes() {
    return ["trigger-label", "disabled", "no-value-label"] as const;
  }

  attributeChangedCallback(name: ComponentTypes["ObservedAttributes"], _oldValue: string | null, newValue: string | null) {
    if (name === "trigger-label") {
      void (newValue === null ? this.trigger.removeAttribute("aria-label") : this.trigger.setAttribute("aria-label", newValue));
      return;
    }

    if (name === "disabled") {
      this.trigger.disabled = newValue === "true" || newValue === "";
      return;
    }

    if (name === "no-value-label") {
      this.noValueLabel = newValue ?? "...";
      return;
    }

    return name;
  }

  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"] | (string & {})): string | null;
  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"]): string | null {
    if (qualifiedName === "trigger-label") return this.trigger.getAttribute("aria-label");
    if (qualifiedName === "disabled") return this.trigger.disabled.toString();
    if (qualifiedName === "no-value-label") return this.noValueLabel;
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
    triggerLabel.textContent = label || this.noValueLabel;
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

customElements.define(MenuTrigger.componentName, MenuTrigger);

declare global {
  type MenuTrigger = ComponentTypes["Instance"];

  interface HTMLElementTagNameMap {
    [MenuTrigger.componentName]: MenuTrigger;
  }

  namespace React.JSX {
    interface IntrinsicElements {
      /** @markdown {./README.md} */
      [MenuTrigger.componentName]: WCP.ReactWComponent<ComponentTypes["JsxProps"], MenuTrigger>;
    }
  }
}
