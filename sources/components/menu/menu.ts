import type { SelectOption } from "../select-option/select-option";
import type * as WCP from "../wcp";

const CustomEvent = globalThis.CustomEvent as typeof WCP.CustomEventT;

type ExtendedAttributes = {
  "prefer-upwards": WCP.BooleanString;
  "escape-close": WCP.BooleanString;
  "close-on-select": WCP.BooleanString;
  "match-trigger-width": WCP.BooleanString;
  "popover-role": string;
  "popover-label": string;
};

type ComponentEvents = WCP.WEvent<{
  valueChange: CustomEvent;
  menuOpen: CustomEvent;
  menuClose: CustomEvent;
}>;

type ComponentTypes = WCP.WComponent<typeof MenuComponent, ExtendedAttributes, ComponentEvents>;

const COMPONENT_NAME = "menu-component";

type MenuType = "menu" | "select" | "dialog";

/**
 * The menu web component is a versatile dropdown like that can be use in different ways.
 *
 * - **Form associated**
 * - Depends on `<anchor-component />`.
 * - Optionally depends on `<menu-trigger />`.
 * - The host of `<menu-component />` can't be styled directly.
 * - To offset the menu, use `margin` on the `::part(container)` element.
 *
 * @usage
 *
 * ```html
 * <menu-component values="0" match-trigger-width="true" type="select">
 *   <menu-trigger slot="trigger"></menu-trigger>
 *   <select-option value="0">Option 1</select-option>
 *   <select-option value="1">Option 2</select-option>
 * </menu-component>
 * ```
 */
class MenuComponent extends HTMLElement implements WCP.IWebComponent {
  addEventListener!: WCP.AddEventListener<ComponentEvents, this>;

  static readonly htmlFragment = (() => {
    const template = document.createElement("template");
    template.innerHTML = import_as_string("./menu-template.inline.html", { minify: true });
    return template.content;
  })();

  static readonly stylesheet = (() => {
    const sheet = new CSSStyleSheet();
    sheet.replace(import_as_string("./menu-style.inline.css", { minify: true }));
    return sheet;
  })();

  readonly #abortController = new AbortController();

  readonly #elements = {
    internals: null! as ElementInternals,
    popover: null! as HTMLDivElement,
    trigger: null as MenuTrigger | null,
    anchorCP: null! as Anchor,
    defaultSlot: null! as HTMLSlotElement,
  };

  readonly #events: ComponentEvents = {
    /** Emitted when the value changes. */
    valueChange: new CustomEvent("valueChange"),
    /** Emitted when the menu is opened. */
    menuOpen: new CustomEvent("menuOpen"),
    /** Emitted when the menu is closed. */
    menuClose: new CustomEvent("menuClose"),
  };

  //#region Public Props
  /** When used with forms. */
  required = false;

  /** Dismiss the menu when pressing the escape key. */
  escapeClose = true;

  /** Close the menu when an option is selected. */
  closeOnSelect = true;

  /** Menu always matches the trigger width. */
  matchTriggerWidth = false;

  /** An easy way to setup the accessibility `"select" | "menu" | "dialog"`. */
  get type(): MenuType { return this.#type; }
  set type(value: MenuType) {
    this.#type = value;
    this.#setupMenuType(value);
  }
  #type: MenuType = "menu";

  /** Enable multiselect. */
  get multiselect(): boolean { return this.#multiselect; }
  set multiselect(enabled: boolean) {
    this.#multiselect = enabled;
    this.#elements.popover.setAttribute("aria-multiselectable", enabled.toString());
    this.#updateValue(enabled ? this.#values : this.#value);
  }
  #multiselect = false;

  /** The selected value. */
  get value(): string { return this.#value; }
  set value(value: string) { this.#updateValue(value); }
  #value = "";

  /**
   * The selected values. when `multiselect` is `true`.
   *
   * @attr - The selected values separated by `;`. when `multiselect` is `true`
   */
  get values(): ReadonlySet<string> { return this.#values; }
  set values(val: string[] | Set<string>) {
    this.#updateValue(Array.isArray(val) ? new Set(val) : val);
    const valuesStr = Array.from(this.#values).join(";");
    this.#elements.internals.setFormValue(valuesStr);
  }
  #values: Set<string> = new Set();

  /** Whether the menu is open */
  get isOpen(): boolean { return this.#elements.internals.states.has("open"); }

  /** Get the trigger button element */
  get trigger(): HTMLButtonElement | undefined { return this.#elements.trigger?.trigger; }
  //#endregion

  //#region Form association
  static formAssociated = true;
  get form() { return this.#elements.internals.form; }
  get name() { return this.getAttribute("name") || ""; }
  get validity() { return this.#elements.internals.validity; }
  get validationMessage() { return this.#elements.internals.validationMessage; }
  checkValidity = () => this.#elements.internals.checkValidity();
  reportValidity = () => this.#elements.internals.reportValidity();
  //#endregion

  //#region HTMLElement Methods
  constructor() {
    super();

    this.#elements.internals = this.attachInternals();

    const shadow = this.attachShadow({ mode: "open", delegatesFocus: true });
    shadow.adoptedStyleSheets = [MenuComponent.stylesheet];
    shadow.appendChild(MenuComponent.htmlFragment.cloneNode(true));

    const popoverEl = shadow.querySelector<HTMLDivElement>("[popover]")!;
    if (!popoverEl) console.error(`[${COMPONENT_NAME}]: Could not find the popover element`);
    this.#elements.popover = popoverEl;

    const triggerEl = this.querySelector("menu-trigger");
    if (triggerEl && !customElements.get("menu-trigger"))
      console.error(`[${COMPONENT_NAME}]: Please import "menu-trigger" first`);
    this.#elements.trigger = triggerEl;

    const anchorCP = shadow.querySelector("anchor-component")!;
    if (!anchorCP) console.error(`[${COMPONENT_NAME}]: Could not find element with selector ".anchor"`);
    if (!customElements.get("anchor-component")) console.error(`[${COMPONENT_NAME}]: Please import "anchor-component" first`);
    this.#elements.anchorCP = anchorCP;
    anchorCP.preferredPositionOrder = [
      ["bottom", "start", "start"],
      ["top", "start", "start"],
      ["right", "start", "start"],
      ["left", "start", "start"],
    ];
    if (triggerEl) {
      anchorCP.anchorElement = triggerEl.trigger;
      anchorCP.onUpdate = () => this.matchTriggerWidth && void (popoverEl.style.width = `${triggerEl.trigger.offsetWidth}px`);
    }

    const defaultSlotEl = shadow.querySelector<HTMLSlotElement>("slot:not([name])")!;
    if (!defaultSlotEl) console.error(`[${COMPONENT_NAME}]: Could not find element with the selector "slot:not([name])"`);
    this.#elements.defaultSlot = defaultSlotEl;
  }

  connectedCallback() {
    this.#setupMenuType(this.#type);
    const signal = this.#abortController.signal;
    document.addEventListener("keydown", this.#keyDownHandler, { signal });
    this.#elements.defaultSlot.addEventListener("slotchange", this.#onDefaultSlotChange, { signal });
    if (this.trigger) this.trigger.addEventListener("click", () => !this.trigger?.disabled && this.toggle(), { signal });
    this.#setFormValidation();
  }

  disconnectedCallback() {
    this.#abortController.abort();
  }

  static get observedAttributes() {
    return [
      "required",
      "escape-close",
      "popover-role",
      "popover-label",
      "close-on-select",
      "match-trigger-width",
      "multiselect",
      "value",
      "values",
      "type",
    ] as const;
  }

  attributeChangedCallback(name: ComponentTypes["ObservedAttributes"], oldValue: string | null, newValue: string | null) {
    if (name === "type") {
      if (newValue === null) {
        this.type = "menu";
        return;
      }
      const options = new Set<MenuType>(["menu", "select", "dialog"]);
      if (!options.has(newValue as MenuType)) return;
      this.type = newValue as MenuType;
      return;
    }

    if (name === "multiselect") {
      this.multiselect = newValue === null ? false : newValue === "true" || newValue === "";
      return;
    }

    if (name === "value") {
      if (!newValue) return;
      this.value = newValue;
      if (newValue !== oldValue) this.dispatchEvent(this.#events.valueChange);
      return;
    }

    if (name === "values") {
      if (!newValue) return;
      this.values = newValue.split(";");
      if (newValue !== oldValue) this.dispatchEvent(this.#events.valueChange);
      return;
    }

    if (name === "required") {
      this.required = newValue === "true" || newValue === "";
      return;
    }

    if (name === "escape-close") {
      this.escapeClose = newValue === null ? true : newValue === "true" || newValue === "";
      return;
    }

    if (name === "match-trigger-width") {
      this.matchTriggerWidth = newValue === "true" || newValue === "";
      return;
    }

    if (name === "close-on-select") {
      this.closeOnSelect = newValue === null ? true : newValue === "true" || newValue === "";
      return;
    }

    if (name === "popover-role") {
      if (newValue === null) {
        this.#elements.popover.removeAttribute("role");
        return;
      }
      this.#elements.popover.setAttribute("role", newValue);
      return;
    }

    if (name === "popover-label") {
      if (newValue === null) {
        this.#elements.popover.removeAttribute("aria-label");
        return;
      }
      this.#elements.popover.setAttribute("aria-label", newValue);
      return;
    }

    const _exhaustiveCheck: never = name;
    return _exhaustiveCheck;
  }

  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"] | (string & {})): string | null;
  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"]): string | null {
    if (qualifiedName === "value") return this.#value;
    if (qualifiedName === "values") return Array.from(this.#values).join(";");
    if (qualifiedName === "type") return this.#type;
    if (qualifiedName === "multiselect") return this.#multiselect.toString();
    if (qualifiedName === "required") return this.required.toString();
    if (qualifiedName === "escape-close") return this.escapeClose.toString();
    if (qualifiedName === "close-on-select") return this.closeOnSelect.toString();
    if (qualifiedName === "match-trigger-width") return this.matchTriggerWidth.toString();
    return super.getAttribute(qualifiedName);
  }
  //#endregion

  //#region Private Methods
  #updateValue(newValue: string | Set<string>) {
    const options = this.#getOptionElements();
    if (options.length && customElements.get("select-option") === undefined) {
      console.error(`[${COMPONENT_NAME}]: <select-option> is not defined. Please import it first.`);
      return;
    }

    const isMultipleSelect = newValue instanceof Set;
    const values = new Set<string>();
    const labels = [];

    for (const selectOption of options) {
      // single select
      if (!isMultipleSelect && newValue === selectOption.value) {
        this.#value = selectOption.value;
        if (!selectOption.selected) selectOption.selected = true;
        this.#elements.trigger?.setTriggerLabel(selectOption.label);
        continue;
      }

      // multiple select
      if (isMultipleSelect && selectOption.value && newValue.has(selectOption.value)) {
        values.add(selectOption.value);
        labels.push(selectOption.label);
        if (!selectOption.selected) selectOption.selected = true;
        continue;
      }

      // unselect
      selectOption.selected = false;
    }

    if (isMultipleSelect) {
      this.#values = values;
      this.#elements.trigger?.setTriggerLabel(labels.join(", "));
    }

    this.#setFormValidation();
  }

  #getOptionElements = () => {
    const slotElements = this.#elements.defaultSlot.assignedElements();
    return slotElements.flatMap(el =>
      el.localName === "select-option" ? el : Array.from(el.querySelectorAll("select-option"))) as SelectOption[];
  };

  #onDefaultSlotChange = () => {
    const options = this.#getOptionElements();
    if (options.length && customElements.get("select-option") === undefined) {
      console.error(`[${COMPONENT_NAME}]: <select-option> is not defined. Please import it first.`);
      return;
    }

    const onClick = (selectOption: SelectOption, closeCondition = true) => {
      if (selectOption.disabled) return;

      if (this.#multiselect) {
        selectOption.toggleSelected();
        this.#values[selectOption.selected ? "add" : "delete"](selectOption.value);
        this.values = this.#values; // Force update
        this.dispatchEvent(this.#events.valueChange);
        if (this.closeOnSelect && closeCondition) this.close();
        return;
      }

      // single select
      if (selectOption.selected) return;
      this.value = selectOption.value;
      this.dispatchEvent(this.#events.valueChange);
      if (this.closeOnSelect && closeCondition) this.close();
    };

    for (const selectOption of options) {
      selectOption.onclick = () => {
        onClick(selectOption);
      };

      selectOption.onkeydown = e => {
        if (e.code === "Enter" || e.code === "Space") onClick(selectOption, e.code === "Enter");
      };
    }
  };

  #setupMenuType(role: MenuType) {
    if (role === "dialog") {
      this.#elements.popover.setAttribute("role", "dialog");
      if (this.#elements.trigger) this.#elements.trigger.setRole(role, this.#elements.popover.id);
      return;
    }
    if (role === "select") {
      this.#elements.popover.setAttribute("role", "listbox");
      if (this.#elements.trigger) this.#elements.trigger.setRole(role, this.#elements.popover.id);
      return;
    }
    if (role === "menu") {
      this.#elements.popover.setAttribute("role", "menu");
      if (this.#elements.trigger) this.#elements.trigger.setRole(role, this.#elements.popover.id);
      return;
    }
  }

  #focusIndex = 0;
  #keyDownHandler = (e: KeyboardEvent) => {
    if (!this.isOpen) return;

    if (e.key === "Escape" && this.escapeClose) {
      this.close();
      return;
    }

    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const children = this.#getFocusableElements();

      this.#focusIndex =
        e.key === "ArrowUp"
          ? (this.#focusIndex - 1 + children.length) % children.length
          : (this.#focusIndex + 1) % children.length;

      children[this.#focusIndex].focus();
      return;
    }

    // close the menu when tabbing out
    if (e.key === "Tab") {
      setTimeout(() => {
        if (!this.contains(document.activeElement)) this.close();
      }, 0);
    }
  };

  #clickOutside = (e: MouseEvent) => {
    const rect = this.#elements.popover.getBoundingClientRect();
    const [x, y] = [e.clientX, e.clientY];
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      const target = e.target as HTMLElement;
      if (target === this || target.closest(this.localName) === this) return;
      this.close();
    }
  };

  #getFocusableElements = () => {
    const isFocusable = (el: Element): el is HTMLElement => el instanceof HTMLElement && el.tabIndex >= 0;
    const slotElements = this.#elements.defaultSlot.assignedElements();
    const directChildren = [];
    for (const el of slotElements) {
      if (isFocusable(el)) directChildren.push(el);
      directChildren.push(...Array.from(el.querySelectorAll("*")).filter(isFocusable));
    }
    return directChildren;
  };

  #setFormValidation() {
    const hasValue = this.#multiselect ? this.#values.size > 0 : Boolean(this.#value);
    this.#elements.internals.setValidity({ valueMissing: this.required && !hasValue }, "required", this.trigger);
  }
  //#endregion

  //#region Public Methods
  /** Force a refresh of the menu after adding/removing `select-option` elements. */
  refresh = this.#onDefaultSlotChange;

  /**
   * Open and expand the menu, optionally at a specific position.
   *
   * @function {open(pos?: [number, number], animateUpwards?: boolean)}
   */
  open = (pos?: [number, number], animateUpwards?: boolean) => {
    const isOpen = this.#elements.internals.states.has("open");
    if (isOpen) return;

    const isAnimating = this.#elements.popover.classList.contains("show") || this.#elements.popover.classList.contains("hide");
    if (isAnimating) return;

    const menu = this.#elements.popover;
    const anchorCP = this.#elements.anchorCP;

    this.dispatchEvent(this.#events.menuOpen);
    this.#elements.internals.states.add("open");
    this.trigger?.setAttribute("aria-expanded", "true");
    menu.showPopover();

    const focusableElements = this.#getFocusableElements();
    if (focusableElements.length > 0) focusableElements[0].focus();

    if (pos) {
      anchorCP.anchorToRect = { left: pos[0], top: pos[1] };
      anchorCP.updatePosition();
    } else if (this.#elements.trigger) {
      anchorCP.anchorToRect = null;
      anchorCP.updatePosition();
    }

    const blockSize = getComputedStyle(menu).blockSize;
    const openUpwards = animateUpwards ?? anchorCP?.getAnchorPosition() === "top";
    menu.style.setProperty("--anim-to-block-size", blockSize);
    menu.style.setProperty("--anim-from-translate-y", openUpwards ? blockSize : "0px");
    menu.classList.add("show");

    // scroll to the selected element
    if (!this.#multiselect && this.#value) {
      const selectedOption = Array.from(this.querySelectorAll("select-option")).find(el => el.value === this.#value);
      if (selectedOption) requestAnimationFrame(() => selectedOption.scrollIntoView({ block: "nearest" }));
    }

    menu.onanimationend = menu.onanimationcancel = () => {
      menu.onanimationend = menu.onanimationcancel = null;
      if (!pos && this.trigger) anchorCP.startAutoUpdate();
      menu.classList.remove("show");
      document.addEventListener("pointerdown", this.#clickOutside, { signal: this.#abortController.signal });
    };
  };

  /** Close and collapse the menu */
  close = () => {
    this.#elements.internals.states.delete("open");
    this.trigger?.setAttribute("aria-expanded", "false");
    this.#elements.anchorCP.stopAutoUpdate();
    document.removeEventListener("pointerdown", this.#clickOutside);

    const menu = this.#elements.popover;
    menu.classList.remove("show");
    menu.classList.add("hide");

    menu.onanimationend = menu.onanimationcancel = () => {
      menu.onanimationend = menu.onanimationcancel = null;
      menu.classList.remove("hide");
      this.#elements.popover.hidePopover();
      this.dispatchEvent(this.#events.menuClose);
    };
  };

  /**
   * Toggle the menu between open and closed
   *
   * @function {toggle(pos?: [number, number], animateUpwards?: boolean)}
   */
  toggle = (pos?: [number, number], animateUpwards?: boolean) => {
    const isAnimating = this.#elements.popover.classList.contains("show") || this.#elements.popover.classList.contains("hide");
    if (isAnimating) return;

    const isOpen = this.#elements.internals.states.has("open");
    if (isOpen) return this.close();
    this.open(pos, animateUpwards);
  };
  //#endregion
}

customElements.define(COMPONENT_NAME, MenuComponent);

export type { MenuComponent };

declare global {
  type MenuComponent = ComponentTypes["Instance"];

  interface HTMLElementTagNameMap {
    [COMPONENT_NAME]: MenuComponent;
  }
}
