import type { BooleanString, IWebComponent, WComponent } from "../wc";
import type { SelectOption } from "../selectOption/selectOption";

type ExtraAttributes = {
  "prefer-upwards": BooleanString;
  "prefer-right": BooleanString;
  "match-trigger-width": BooleanString;
  "backdrop-close": BooleanString;
  "escape-close": BooleanString;
  "close-button": BooleanString;
  "close-on-select": BooleanString;
  "popover-role": string;
  "popover-label": string;
  onchange: (e: CustomEvent) => void;
  onopen: (e: CustomEvent) => void;
  onclose: (e: CustomEvent) => void;
};

type ComponentTypes = WComponent<typeof MenuComponent, ExtraAttributes>;

const COMPONENT_NAME = "menu-component";

type MenuType = "menu" | "select" | "dialog";

/**
 * The menu web component is a versatile dropdown like that can be use in different ways.
 *
 * - The host of `<menu-component />` can't be styled directly.
 * - To offset the menu, use `margin` on the `::part(container)` element.
 *
 * @usage
 *
 * ```html
 * <menu-component values="0" match-trigger-width="true" type="select">
 *   <select-option value="0">Option 1</select-option>
 *   <select-option value="1">Option 2</select-option>
 * </menu-component>
 * ```
 */
class MenuComponent extends HTMLElement implements IWebComponent {
  static readonly htmlFragment = (() => {
    const template = document.createElement("template");
    template.innerHTML = import_as_string("./menu-template.inline.html", { minify: true });
    return template.content;
  })();

  static readonly stylesheet = (() => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(import_as_string("./menu-style.inline.css", { minify: true }));
    return sheet;
  })();

  static formAssociated = true;

  readonly #internals: ElementInternals;
  readonly #popoverEl: HTMLDivElement;
  readonly #triggerEl: HTMLButtonElement;
  readonly #defaultSlotEl: HTMLSlotElement;
  readonly #closeButtonEl: HTMLButtonElement;
  readonly #abortController = new AbortController();
  #openUpwards = false; // for animation

  /** Emitted when the menu is opened. */
  readonly #openEvent = new CustomEvent("open");
  /** Emitted when the menu is closed. */
  readonly #closeEvent = new CustomEvent("close");
  /** Emitted when the value changes. */
  readonly #changeEvent = new CustomEvent("change");

  readonly #pullAndUpdatePos = {
    interval: 1000 / 60, // 60fps
    cb: () => this.#updateMenuPos(),
    lastTime: 0,
    rafId: null as number | null,
    signal: this.#abortController.signal,
    handler(time: number) {
      if (this.signal.aborted) {
        this.stop();
        return;
      }
      if (time - this.lastTime >= this.interval) {
        this.lastTime = time;
        this.cb();
      }
      this.rafId = requestAnimationFrame(this.handler.bind(this));
    },
    start() {
      this.rafId = requestAnimationFrame(this.handler.bind(this));
    },
    stop() {
      if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    },
  };

  //#region Public Props
  #type: MenuType = "menu";
  /** An easy way to setup the accessibility. Defaults to `menu`. */
  get type(): MenuType {
    return this.#type;
  }
  set type(value: MenuType) {
    this.#type = value;
    this.#setupMenuType(value);
  }

  #preferUpwards = false;
  /** Prefer to open the menu above the trigger button when possible. Defaults to `false`. */
  get preferUpwards(): boolean {
    return this.#preferUpwards;
  }
  set preferUpwards(value: boolean) {
    this.setAttribute("prefer-upwards", value.toString());
  }

  #preferRight = false;
  /** Prefer to open the menu to the right of the trigger button when possible. Defaults to `false`. */
  get preferRight(): boolean {
    return this.#preferRight;
  }
  set preferRight(value: boolean) {
    this.setAttribute("prefer-right", value.toString());
  }

  #matchTriggerWidth = false;
  /** Match the width of the trigger button. Defaults to `false`. */
  get matchTriggerWidth(): boolean {
    return this.#matchTriggerWidth;
  }
  set matchTriggerWidth(value: boolean) {
    this.setAttribute("match-trigger-width", value.toString());
  }

  #disabled = false;
  /** Disable the menu trigger button. Defaults to `false`. */
  get disabled(): boolean {
    return this.#disabled;
  }
  set disabled(value: boolean) {
    this.setAttribute("disabled", value.toString());
  }

  #required = false;
  /** When used with forms. */
  get required(): boolean {
    return this.#required;
  }
  set required(val: boolean) {
    this.setAttribute("required", val.toString());
  }

  #backdropClose = true;
  /** Dismiss the menu when clicking outside the menu. Defaults to `true`. */
  get backdropClose(): boolean {
    return this.#backdropClose;
  }
  set backdropClose(value: boolean) {
    this.setAttribute("backdrop-close", value.toString());
  }

  #escapeClose = true;
  /** Dismiss the menu when pressing the escape key. Defaults to `true`. */
  get escapeClose(): boolean {
    return this.#escapeClose;
  }
  set escapeClose(value: boolean) {
    this.setAttribute("escape-close", value.toString());
  }

  #showCloseButton = false;
  /** Show a close button. Defaults to `false`. */
  get closeButton(): boolean {
    return this.#showCloseButton;
  }
  set closeButton(value: boolean) {
    this.setAttribute("close-button", value.toString());
  }

  #multiselect = false;
  /** Enable multiselect. Defaults to `false`. */
  get multiselect(): boolean {
    return this.#multiselect;
  }
  set multiselect(value: boolean) {
    this.#multiselect = value;
    this.#popoverEl.setAttribute("aria-multiselectable", value.toString());

    if (value) {
      this.#updateValues(this.#values);
      return;
    }

    this.#updateValue(this.#value);
  }

  #value = "";
  /** The selected value. */
  get value(): string {
    return this.#value;
  }
  set value(value: string) {
    this.#updateValue(value);
  }

  #values: Set<string> = new Set();
  /**
   * The selected values. when `multiselect` is `true`.
   *
   * @attr - The selected values separated by `;`. when `multiselect` is `true`
   */
  get values(): ReadonlySet<string> {
    return this.#values;
  }
  set values(val: string[] | Set<string>) {
    this.#updateValues(val);
  }

  #valueAsType: unknown;
  /** The parsed value from the `value` attribute string. */
  get valueAsType(): unknown {
    return this.#valueAsType;
  }

  #valuesAsTypes: unknown[] = [];
  /** The parsed values from the `values` attribute string. */
  get valuesAsTypes(): unknown[] {
    return this.#valuesAsTypes;
  }

  #closeOnSelect = true;
  /** Close the menu when an option is selected. Defaults to `false`. */
  get closeOnSelect(): boolean {
    return this.#closeOnSelect;
  }
  set closeOnSelect(value: boolean) {
    this.setAttribute("close-on-select", value.toString());
  }

  /** Whether the menu is open */
  get isOpen(): boolean {
    return this.#internals.states.has("open");
  }

  /** Get the trigger button element */
  get trigger(): HTMLButtonElement {
    return this.#triggerEl;
  }
  //#endregion

  //#region Form association
  get form() {
    return this.#internals.form;
  }
  get name() {
    return this.getAttribute("name") || "";
  }
  checkValidity(): boolean {
    return this.#internals.checkValidity();
  }
  reportValidity() {
    return this.#internals.reportValidity();
  }
  get validity() {
    return this.#internals.validity;
  }
  get validationMessage() {
    return this.#internals.validationMessage;
  }
  //#endregion

  //#region HTMLElement Methods
  constructor() {
    super();

    this.#internals = this.attachInternals();

    const shadow = this.attachShadow({ mode: "open", delegatesFocus: true });
    shadow.adoptedStyleSheets = [MenuComponent.stylesheet];
    shadow.appendChild(MenuComponent.htmlFragment.cloneNode(true));

    const popoverEl = shadow.querySelector<HTMLDivElement>("[popover]");
    if (!popoverEl) {
      console.error("[menu-component]: Could not find the popover element");
    }

    const triggerEl = shadow.querySelector<HTMLButtonElement>(".trigger");
    if (!triggerEl) {
      console.error("[menu-component]: Could not find element with class `trigger`");
    }

    const closeButton = shadow.querySelector<HTMLButtonElement>(".close-button");
    if (!closeButton) {
      console.error("[menu-component]: Could not find element with class `close-button`");
    }

    const defaultSlotEl = shadow.querySelector<HTMLSlotElement>("slot:not([name])");
    if (!defaultSlotEl) {
      console.error("[menu-component]: Could not find element with class `default-slot`");
    }

    const triggerSlotEl = shadow.querySelector<HTMLSlotElement>("slot[name=trigger]");
    if (!triggerSlotEl) {
      console.error("[menu-component]: Could not find element with class `trigger-slot`");
    }

    this.#defaultSlotEl = defaultSlotEl ?? document.createElement("slot");
    this.#popoverEl = popoverEl!;
    this.#triggerEl = triggerEl!;
    this.#closeButtonEl = closeButton!;

    // this.#pullAndUpdatePos = new MenuComponent.Pull(this.#updateMenuPos, this.#abortController.signal);
  }

  connectedCallback() {
    this.#setupMenuType(this.#type);

    const signal = this.#abortController.signal;

    document.addEventListener("keydown", this.#keyDownHandler, { signal });
    this.#triggerEl.addEventListener("click", this.toggle, { signal });
    this.#closeButtonEl.addEventListener("click", this.close, { signal });
    this.#defaultSlotEl.addEventListener("slotchange", this.#onDefaultSlotChange, { signal });

    this.#setFormValidation();
  }

  disconnectedCallback() {
    this.#abortController.abort();
  }

  static get observedAttributes() {
    return [
      "prefer-upwards",
      "prefer-right",
      "match-trigger-width",
      "disabled",
      "required",
      "backdrop-close",
      "escape-close",
      "close-button",
      "popover-role",
      "popover-label",
      "trigger-label",
      "close-on-select",
      "style",
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
      const options: MenuType[] = ["menu", "select", "dialog"];
      const isMenuType = options.includes(newValue as MenuType);
      if (!isMenuType) return;
      this.type = newValue as MenuType;
      return;
    }

    if (name === "multiselect") {
      this.multiselect = newValue === "true" || newValue === "";
      return;
    }

    if (name === "value") {
      if (!newValue) return;
      this.value = newValue;
      if (newValue !== oldValue) this.dispatchEvent(this.#changeEvent);
      return;
    }

    if (name === "values") {
      if (!newValue) return;
      this.values = newValue.split(";");
      if (newValue !== oldValue) this.dispatchEvent(this.#changeEvent);
      return;
    }

    if (name === "prefer-upwards") {
      this.#preferUpwards = newValue === "true" || newValue === "";
      return;
    }

    if (name === "match-trigger-width") {
      this.#matchTriggerWidth = newValue === "true" || newValue === "";
      return;
    }

    if (name === "disabled") {
      this.#disabled = newValue === "true" || newValue === "";
      this.#triggerEl.disabled = this.#disabled;
      return;
    }

    if (name === "required") {
      this.#required = newValue === "true" || newValue === "";
      return;
    }

    if (name === "backdrop-close") {
      this.#backdropClose = newValue === "true" || newValue === "";
      return;
    }

    if (name === "escape-close") {
      this.#escapeClose = newValue === "true" || newValue === "";
      return;
    }

    if (name === "close-button") {
      this.#showCloseButton = newValue === "true" || newValue === "";
      if (this.#showCloseButton) {
        this.#closeButtonEl.style.removeProperty("display");
        return;
      }

      this.#closeButtonEl.style.display = "none";
      return;
    }

    if (name === "prefer-right") {
      this.#preferRight = newValue === "true" || newValue === "";
      return;
    }

    if (name === "popover-role") {
      if (newValue === null) {
        this.#popoverEl.removeAttribute("role");
        return;
      }
      this.#popoverEl.setAttribute("role", newValue);
      return;
    }

    if (name === "popover-label") {
      if (newValue === null) {
        this.#popoverEl.removeAttribute("aria-label");
        return;
      }
      this.#popoverEl.setAttribute("aria-label", newValue);
      return;
    }

    if (name === "trigger-label") {
      if (newValue === null) {
        this.#triggerEl.removeAttribute("aria-label");
        return;
      }
      this.#triggerEl.setAttribute("aria-label", newValue);
      return;
    }

    if (name === "close-on-select") {
      if (newValue === null) {
        this.#closeOnSelect = true;
        return;
      }

      this.#closeOnSelect = newValue === "true" || newValue === "";
      return;
    }

    if (name === "style") {
      if (newValue === null) {
        this.#popoverEl.removeAttribute("style");
        return;
      }
      this.#popoverEl.setAttribute("style", newValue);
      return;
    }

    const _exhaustiveCheck: never = name;
    return _exhaustiveCheck;
  }

  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"] | (string & {})): string | null {
    if (qualifiedName === "value") return this.#value;
    if (qualifiedName === "values") return Array.from(this.#values).join(";");
    if (qualifiedName === "type") return this.#type;
    return super.getAttribute(qualifiedName);
  }
  //#endregion

  //#region Private Methods
  #updateValue(newValue: string) {
    const slotElements = this.#defaultSlotEl.assignedElements();
    const options = slotElements.flatMap(el => {
      if (el.localName === "select-option") return el;
      return Array.from(el.querySelectorAll("select-option"));
    });

    if (options.length && customElements.get("select-option") === undefined) {
      console.error(
        "[menu-component]: <select-option> is not defined. Please import it before using the <menu-component> component."
      );
      return;
    }

    for (const child of options) {
      const selectOption = child as SelectOption;

      if (newValue === selectOption.value) {
        this.#value = selectOption.value;
        this.#valueAsType = selectOption.valueAsType;
        if (!selectOption.selected) selectOption.selected = true;

        // trigger label
        const triggerLabel = this.querySelector("#trigger-label") || this.#triggerEl.querySelector("#trigger-label");
        if (triggerLabel) {
          triggerLabel.textContent = selectOption.label;
          if (selectOption.label && !this.hasAttribute("trigger-label")) {
            this.#triggerEl.setAttribute("aria-label", selectOption.label);
          }
        }
        continue;
      }

      selectOption.selected = false;
    }

    this.#setFormValidation();
  }

  #updateValues(newValues: string[] | Set<string>) {
    const slotElements = this.#defaultSlotEl.assignedElements();
    const options = slotElements.flatMap(el => {
      if (el.localName === "select-option") return el;
      return Array.from(el.querySelectorAll("select-option"));
    });

    if (options.length && customElements.get("select-option") === undefined) {
      console.error(
        "[menu-component]: <select-option> is not defined. Please import it before using the <menu-component> component."
      );
      return;
    }

    const valuesSet = newValues instanceof Set ? newValues : new Set(newValues);
    const values = new Set<string>();
    const valuesAsTypes = [];
    const labels = [];

    for (const child of options) {
      const selectOption = child as SelectOption;

      if (selectOption.value && valuesSet.has(selectOption.value)) {
        values.add(selectOption.value);
        valuesAsTypes.push(selectOption.valueAsType);
        labels.push(selectOption.label);
        if (!selectOption.selected) selectOption.selected = true;
        continue;
      }

      selectOption.selected = false;
    }

    this.#values = values;
    this.#valuesAsTypes = valuesAsTypes;

    // trigger label
    const triggerLabel = this.querySelector("#trigger-label") || this.#triggerEl.querySelector("#trigger-label");
    if (triggerLabel) {
      const label = labels.join(", ");
      triggerLabel.textContent = label || "...";
      if (label && !this.hasAttribute("trigger-label")) {
        this.#triggerEl.setAttribute("aria-label", label);
      }
    }

    this.#setFormValidation();
  }

  #onDefaultSlotChange = () => {
    const slotElements = this.#defaultSlotEl.assignedElements();
    const options = slotElements.flatMap(el => {
      if (el.localName === "select-option") return el;
      return Array.from(el.querySelectorAll("select-option"));
    });

    if (options.length && customElements.get("select-option") === undefined) {
      console.error(
        "[menu-component]: <select-option> is not defined. Please import it before using the <menu-component> component."
      );
      return;
    }

    for (const child of options) {
      const selectOption = child as SelectOption;

      selectOption.onclick = () => {
        if (selectOption.disabled) return;

        if (selectOption.value === null) {
          console.warn("[menu-component]: Select option value is null");
          return;
        }

        if (this.#multiselect) {
          selectOption.toggleSelected();
          const valuesSet = new Set(this.#values);
          if (selectOption.selected) valuesSet.add(selectOption.value);
          else valuesSet.delete(selectOption.value);
          this.values = [...valuesSet];
          this.dispatchEvent(this.#changeEvent);
          return;
        }

        // single select
        if (selectOption.selected) return;
        this.value = selectOption.value ?? "";
        this.dispatchEvent(this.#changeEvent);
        if (this.#closeOnSelect) this.close();
      };

      selectOption.onkeydown = e => {
        if (e.code === "Enter" || e.code === "Space") {
          if (selectOption.disabled) return;

          if (selectOption.value === null) {
            console.warn("[menu-component]: Select option value is null");
            return;
          }

          if (this.#multiselect) {
            selectOption.toggleSelected();
            const valuesSet = new Set(this.#values);
            if (selectOption.selected) valuesSet.add(selectOption.value);
            else valuesSet.delete(selectOption.value);
            this.values = [...valuesSet];
            this.dispatchEvent(this.#changeEvent);
            if (this.#closeOnSelect && e.code === "Enter") this.close();
            return;
          }

          // single select
          if (selectOption.selected) return;
          this.value = selectOption.value ?? "";
          this.dispatchEvent(this.#changeEvent);
          if (this.#closeOnSelect && e.code === "Enter") this.close();
        }
      };
    }
  };

  #setupMenuType(role: MenuType) {
    if (role === "dialog") {
      this.#popoverEl.setAttribute("role", "dialog");
      this.#triggerEl.setAttribute("aria-haspopup", "dialog");
      this.#triggerEl.setAttribute("aria-controls", this.#popoverEl.id);
      return;
    }

    if (role === "select") {
      this.#popoverEl.setAttribute("role", "listbox");
      this.#triggerEl.setAttribute("aria-haspopup", "listbox");
      this.#triggerEl.setAttribute("role", "combobox");
      this.#triggerEl.setAttribute("aria-controls", this.#popoverEl.id);
      return;
    }

    if (role === "menu") {
      this.#popoverEl.setAttribute("role", "menu");
      this.#triggerEl.setAttribute("aria-haspopup", "menu");
      this.#triggerEl.setAttribute("aria-controls", this.#popoverEl.id);
      return;
    }
  }

  #focusIndex = 0;
  #keyDownHandler = (e: KeyboardEvent) => {
    if (!this.isOpen) return;

    if (e.key === "Escape" && this.#escapeClose) {
      this.close();
      return;
    }

    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const children = this.#defaultSlotEl.assignedElements().filter(e => e instanceof HTMLElement);

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
    if (!this.#backdropClose) return;
    const rect = this.#popoverEl.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      const target = e.target as HTMLElement;
      if (target === this || target.closest(this.localName) === this) return;
      this.close();
    }
  };

  #calcMenuBounding = () => {
    const menuEl = this.#popoverEl;

    const computedStyle = window.getComputedStyle(menuEl);

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

    const rect = this.#triggerEl.getBoundingClientRect();

    const menuWidth = this.#matchTriggerWidth ? rect.width : parseFloat(computedStyle.width);
    const menuHeight = parseFloat(computedStyle.height);
    const menuMaxHeight = string2Number(computedStyle.maxHeight, window.innerHeight);

    const upwardSpace = rect.top;
    const hasEnoughSpaceUp = upwardSpace >= menuHeight + offset.top + offset.bottom;

    const downwardSpace = document.documentElement.clientHeight - rect.bottom;
    const hasEnoughSpaceDown = downwardSpace >= menuHeight + offset.top + offset.bottom;

    let openDownwards = true;
    if (this.preferUpwards) {
      openDownwards = hasEnoughSpaceDown && !hasEnoughSpaceUp;
    } else {
      openDownwards = hasEnoughSpaceDown || (!hasEnoughSpaceDown && !hasEnoughSpaceUp);
    }

    const leftToRightSpace = document.documentElement.clientHeight - rect.left; // from the left of the trigger to the right edge of the screen
    const rightToLeftSpace = rect.right; // from the right of the trigger to the left edge of the screen
    const hasEnoughSpaceLeft = leftToRightSpace >= menuWidth + offset.top + offset.bottom;
    const hasEnoughSpaceRight = rightToLeftSpace >= menuWidth + offset.top + offset.bottom;

    let openFromLeft = true;
    if (this.preferRight) {
      openFromLeft = hasEnoughSpaceLeft && !hasEnoughSpaceRight;
    } else {
      openFromLeft = hasEnoughSpaceLeft || (!hasEnoughSpaceLeft && !hasEnoughSpaceRight);
    }

    const maxHeight = Math.min(
      openDownwards ? downwardSpace - offset.top - offset.bottom : upwardSpace - offset.top - offset.bottom,
      menuMaxHeight
    );
    const height = Math.min(Math.max(menuHeight, 0), maxHeight);
    const top = openDownwards ? rect.bottom : rect.top - height - offset.bottom - offset.top;

    const width = this.#matchTriggerWidth ? rect.width : 0;
    const left = openFromLeft ? rect.left : rect.right - menuWidth - offset.right - offset.left;

    this.#openUpwards = !openDownwards;

    return { height, width, maxHeight, top, left };
  };

  #setMenuPos = () => {
    const popoverEl = this.#popoverEl;

    // clean style for re-calculation
    popoverEl.style.removeProperty("left");
    popoverEl.style.removeProperty("top");
    popoverEl.style.removeProperty("width");
    popoverEl.style.removeProperty("max-height");

    const { height, width, maxHeight, top, left } = this.#calcMenuBounding();

    if (width) popoverEl.style.width = `${width}px`;
    popoverEl.style.left = `${left}px`;
    popoverEl.style.top = `${top}px`;
    popoverEl.style.maxHeight = `${maxHeight}px`;

    const hasScrollbar = popoverEl.scrollHeight > popoverEl.clientHeight;

    return { height: `${height}px`, hasScrollbar };
  };

  #prevPos = { maxHeight: 0, width: 0, left: 0, top: 0 };
  #updateMenuPos = () => {
    const popoverEl = this.#popoverEl;

    const { width, maxHeight, top, left } = this.#calcMenuBounding();
    const prev = this.#prevPos;

    if (width && prev.width !== width) {
      popoverEl.style.width = `${width}px`;
      prev.width = width;
    }

    if (prev.left !== left) {
      popoverEl.style.left = `${left}px`;
      prev.left = left;
    }

    if (prev.top !== top) {
      popoverEl.style.top = `${top}px`;
      prev.top = top;
    }

    if (prev.maxHeight !== maxHeight) {
      popoverEl.style.maxHeight = `${maxHeight}px`;
      prev.maxHeight = maxHeight;
    }
  };

  #focusFirstChild = () => {
    const children = this.#defaultSlotEl.assignedElements();

    const selectedIndex = children.findIndex(el => el instanceof HTMLElement && "selected" in el && el.selected);
    if (selectedIndex !== -1) {
      const selected = children[selectedIndex] as HTMLElement;
      selected.focus();
      this.#focusIndex = selectedIndex;
      return;
    }

    const checkedIndex = children.findIndex(el => el instanceof HTMLElement && "checked" in el && el.checked);
    if (checkedIndex !== -1) {
      const checked = children[checkedIndex] as HTMLElement;
      checked.focus();
      this.#focusIndex = checkedIndex;
      return;
    }

    if (this.#showCloseButton) {
      this.#closeButtonEl.focus();
      this.#focusIndex = -1;
      return;
    }

    const firstFocusableIndex = children.findIndex(el => el instanceof HTMLElement && "tabIndex" in el && el.tabIndex >= 0);
    if (firstFocusableIndex !== -1) {
      const first = children[firstFocusableIndex] as HTMLElement;
      first.focus();
      this.#focusIndex = firstFocusableIndex;
    }
  };

  #setFormValidation() {
    const hasValue = this.#multiselect ? this.#values.size > 0 : Boolean(this.#value);
    this.#internals.setValidity({ valueMissing: this.#required && !hasValue }, "required", this.#triggerEl);
  }
  //#endregion

  //#region Public Methods
  /** Force a refresh of the menu after adding/removing `select-option` elements. */
  refresh = this.#onDefaultSlotChange;

  /** Open and expand the menu */
  open = () => {
    if (this.#disabled) return;

    this.dispatchEvent(this.#openEvent);
    this.#internals.states.add("open");
    this.#popoverEl.showPopover();
    this.#triggerEl.setAttribute("aria-expanded", "true");

    this.#focusFirstChild();

    const { height, hasScrollbar } = this.#setMenuPos();
    const computedStyle = getComputedStyle(this);
    const durationStr = computedStyle.getPropertyValue("--dur-anim") ?? "0.3s";
    const duration = parseFloat(durationStr) * (durationStr.endsWith("ms") ? 1 : 1000);
    const easing = computedStyle.getPropertyValue("--ease-anim") ?? "ease-out";
    const overflow = hasScrollbar ? "hidden auto" : "hidden";

    // scroll to selected option
    if (hasScrollbar) {
      const selected = this.querySelector<SelectOption>("select-option:state(selected)");
      if (selected) selected.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
    }

    const from = {
      height: "0px",
      paddingBlock: "0px",
      opacity: 0.5,
      transform: this.#openUpwards ? `translateY(${height})` : "translateY(0)",
      overflow,
    };
    const to = { height, opacity: 1, transform: "translateY(0)", overflow };
    const animation = this.#popoverEl.animate([from, to], { duration, easing });
    animation.onfinish = () => {
      document.addEventListener("pointerdown", this.#clickOutside, { signal: this.#abortController.signal });
      this.#pullAndUpdatePos.start();
    };
  };

  /** Close and collapse the menu */
  close = () => {
    this.#internals.states.delete("open");

    this.#triggerEl.setAttribute("aria-expanded", "false");

    this.#pullAndUpdatePos.stop();
    document.removeEventListener("pointerdown", this.#clickOutside);

    const height = this.#popoverEl.clientHeight;
    const hasScrollbar = this.#popoverEl.scrollHeight > height;
    const computedStyle = getComputedStyle(this);
    const durationStr = computedStyle.getPropertyValue("--dur-anim") ?? "0.3s";
    const duration = parseFloat(durationStr) * (durationStr.endsWith("ms") ? 1 : 1000);
    const easing = computedStyle.getPropertyValue("--ease-anim") ?? "ease-out";
    const overflow = hasScrollbar ? "hidden auto" : "hidden";

    const from = { height: `${height}px`, opacity: 1, transform: "translateY(0)", overflow };
    const to = {
      height: "0px",
      paddingBlock: "0px",
      opacity: 0,
      transform: this.#openUpwards ? `translateY(${height}px)` : "translateY(0)",
      overflow,
    };
    const animation = this.#popoverEl.animate([from, to], { duration, easing, fill: "backwards" });
    animation.onfinish = () => {
      this.#popoverEl.hidePopover();
      this.dispatchEvent(this.#closeEvent);
    };
  };

  /** Toggle the menu between open and closed */
  toggle = () => {
    const isOpen = this.#triggerEl.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      this.close();
      return;
    }
    this.open();
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
