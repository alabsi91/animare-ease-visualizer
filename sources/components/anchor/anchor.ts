import * as WCP from "../wcp";

type ExtendedAttributes = {
  "set-max-size": WCP.BooleanString;
};

type ComponentTypes = WCP.WComponent<typeof Anchor, ExtendedAttributes>;

/** The position relative to the anchor element. */
type AnchorPosition = "top" | "bottom" | "left" | "right";
/** The alignment relative to the anchor element. */
type AnchorAlignment = "center" | "start" | "end";
/** The alignment relative to the anchored element. */
type AnchoredAlignment = "center" | "start" | "end";
type PositionArea = [AnchorPosition, AnchorAlignment, AnchoredAlignment];
type DOMRectLike = { bottom: number; height: number; left: number; right: number; top: number; width: number };
type AnchoredRect = {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
  offsetTop: number;
  offsetBottom: number;
  offsetLeft: number;
  offsetRight: number;
};

const COMPONENT_NAME = "anchor-component";

/**
 * Anchors an element to another element.
 *
 * - Use margins alongside CSS states on the anchored element to offset it from the anchor element.
 *
 * @usage
 * ```html
 * <div class="anchored-element"></div>
 *
 * <anchor-component anchor-element=".anchor-element" preferred-position-order="top start start, right" autoupdate>
 *  <div class="anchored-element"></div>
 * </anchor-component>
 *
 * <style>
 *  anchor-component:state(top) .anchored-element {
 *    margin-block-end: 2em;
 *    background-color: #ff5733;
 *  }
 *
 *  anchor-component:state(bottom) .anchored-element {
 *    margin-block-start: 2em;
 *    background-color: #33ff57;
 *  }
 *
 *  anchor-component:state(left) .anchored-element {
 *    margin-inline-end: 2em;
 *    background-color: #3357ff;
 *  }
 *
 *  anchor-component:state(right) .anchored-element {
 *    margin-inline-start: 2em;
 *    background-color: #ff33a8;
 *  }
 *
 *  anchor-component:state(misaligned) .anchored-element {
 *    display: none;
 *  }
 * </style>
 * ```
 *
 * @cssState top - When the anchored element is above the anchor element.
 * @cssState bottom - When the anchored element is below the anchor element.
 * @cssState left - When the anchored element is to the left of the anchor element.
 * @cssState right - When the anchored element is to the right of the anchor element.
 * @cssState misaligned - If the anchored element anchors incorrectly due to lack of space or invalid measurements.
 */
class Anchor extends HTMLElement implements WCP.IWebComponent {
  static readonly #validPositions = new Set<AnchorPosition>(["top", "bottom", "left", "right"]);
  static readonly #validAlignments = new Set<AnchorAlignment>(["center", "start", "end"]);
  static readonly #everyPositionArea: PositionArea[] = [];

  readonly #abortController = new AbortController();
  readonly #defaultSlot = null! as HTMLSlotElement;
  readonly #internals: ElementInternals = this.attachInternals();

  //#region Public Props
  /** Uses `requestAnimationFrame` to always update the position. */
  get autoupdate(): boolean { return this.#autoupdate; }
  set autoupdate(value: boolean) {
    this.#autoupdate = value;
    this.#pullAndUpdatePos[value ? "start" : "stop"]();
  }
  #autoupdate = false;

  /** Sets the max height and max width of the anchored element to fit inside between the anchor element and the viewport. */
  setMaxSize: boolean = true;

  /** The anchor element (reference element), can be a string selector or an element. */
  get anchorElement(): HTMLElement | null { return this.#anchorElement; }
  set anchorElement(elOrSelector: HTMLElement | string) {
    const element = typeof elOrSelector === "string" ? document.querySelector(elOrSelector) : elOrSelector;
    if (element === this.#anchorElement) return;
    if (!element) {
      console.error(`[${COMPONENT_NAME}]: Invalid anchor element "${elOrSelector}"`);
      return;
    }
    this.#anchorElement = element as HTMLElement;
  }

  #anchorElement: HTMLElement | null = null;

  /**
   * The anchored element (positioned element), can be a string selector or an element. Or the direct children of
   * `anchor-component`.
   */
  get anchoredElement(): HTMLElement | null { return this.#anchoredElement; }
  set anchoredElement(elOrSelector: HTMLElement | string) {
    const element = typeof elOrSelector === "string" ? document.querySelector(elOrSelector) : elOrSelector;
    if (element === this.#anchoredElement) return;
    if (!element) {
      console.error(`[${COMPONENT_NAME}]: Invalid anchored element "${elOrSelector}"`);
      return;
    }
    this.#anchoredElement = element as HTMLElement;
    this.#anchoredElement.style.position = "fixed";
    this.#anchoredElement.style.boxSizing = "border-box";
  }
  #anchoredElement: HTMLElement | null = null;

  set anchorToRect(rect: Partial<DOMRectLike> | null) {
    if (!rect) {
      this.#anchorToRect = null;
      return;
    }
    const left = rect.left ?? rect.right ?? 0,
      top = rect.top ?? rect.bottom ?? 0,
      width = rect.width ?? rect.right ?? 0,
      height = rect.height ?? rect.bottom ?? 0,
      bottom = rect.bottom ?? top + height,
      right = rect.right ?? (width || left);
    this.#anchorToRect = { left, top, width, height, bottom, right };
  }
  get anchorElementRect(): DOMRectLike | null {
    if (this.#anchorToRect) return this.#anchorToRect;
    if (this.#anchorElement) return this.#anchorElement.getBoundingClientRect();
    return null;
  }
  #anchorToRect: DOMRectLike | null = null;
  /** The preferred position area sequence. In which order to try to position the anchored element. */
  get preferredPositionOrder(): PositionArea[] { return this.#preferredPositionOrder; }
  set preferredPositionOrder(val: PositionArea[]) {
    const res: PositionArea[] = [];
    for (const positionArea of val) {
      if (!Anchor.#validPositions.has(positionArea[0])) continue;
      if (!Anchor.#validAlignments.has(positionArea[1])) positionArea[1] = "center";
      if (!Anchor.#validAlignments.has(positionArea[2])) positionArea[2] = "center";
      res.push(positionArea);
    }
    this.#preferredPositionOrder = res.concat(Anchor.#everyPositionArea);
  }
  #preferredPositionOrder: PositionArea[] = Anchor.#everyPositionArea;
  //#endregion

  //#region HTMLElement Methods
  constructor() {
    super();
    this.#defaultSlot = document.createElement("slot");
    const shadow = this.attachShadow({ mode: "open" });
    shadow.appendChild(this.#defaultSlot);
    this.style.display = "contents";

    // every possible position area (36)
    if (Anchor.#everyPositionArea.length) return;
    for (const anchorPosition of Anchor.#validPositions) {
      for (const anchorAlignment of Anchor.#validAlignments) {
        for (const anchoredAlignment of Anchor.#validAlignments) {
          Anchor.#everyPositionArea.push([anchorPosition, anchorAlignment, anchoredAlignment]);
        }
      }
    }
    this.#preferredPositionOrder = Anchor.#everyPositionArea;
  }

  connectedCallback(): void {
    this.#defaultSlot.addEventListener("slotchange", this.#onSlotChange);
  }

  disconnectedCallback(): void {
    this.#abortController.abort();
  }

  static get observedAttributes() {
    return ["anchor-element", "anchored-element", "preferred-position-order", "autoupdate", "set-max-size"] as const;
  }

  attributeChangedCallback(name: ComponentTypes["ObservedAttributes"], _oldValue: string | null, newValue: string | null) {
    if (name === "anchor-element") {
      if (!newValue) return;
      this.anchorElement = newValue;
      if (this.#anchoredElement) this.updatePosition();
      return;
    }

    if (name === "anchored-element") {
      if (!newValue) return;
      this.anchoredElement = newValue;
      if (this.#anchorElement) this.updatePosition();
      return;
    }

    if (name === "preferred-position-order") {
      if (!newValue) {
        this.preferredPositionOrder = [];
        return;
      }
      const arr = newValue.trim().split(",").filter(Boolean);
      const res = [];
      for (let i = 0; i < arr.length; i++) {
        const positionAreaStr = arr[i];
        const [anchorPosition, anchorAlignment, anchoredAlignment] = positionAreaStr.trim().split(" ").filter(Boolean);
        res.push([anchorPosition, anchorAlignment, anchoredAlignment] as PositionArea);
      }
      this.preferredPositionOrder = res;
      return;
    }

    if (name === "autoupdate") {
      this.autoupdate = newValue === null ? false : newValue === "true" || newValue === "";
      return;
    }

    if (name === "set-max-size") {
      this.setMaxSize = newValue === null ? true : newValue === "true" || newValue === "";
      return;
    }

    const _exhaustiveCheck: never = name;
    return _exhaustiveCheck;
  }

  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"] | (string & {})): string | null;
  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"]): string | null {
    if (qualifiedName === "preferred-position-order") {
      return this.#preferredPositionOrder.map(p => p.join(" ")).join(", ");
    }
    if (qualifiedName === "autoupdate") return this.autoupdate.toString();
    return super.getAttribute(qualifiedName);
  }
  //#endregion

  //#region Private Methods
  readonly #pullAndUpdatePos = {
    cb: () => this.updatePosition(),
    rafId: null as number | null,
    signal: this.#abortController.signal,
    handler() {
      if (this.signal.aborted) return this.stop();
      this.cb();
      this.rafId = requestAnimationFrame(this.handler.bind(this));
    },
    start() {
      if (this.rafId !== null) return;
      this.rafId = requestAnimationFrame(this.handler.bind(this));
    },
    stop() {
      if (this.rafId === null) return;
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    },
  };

  /** Gets the anchored element from the default slot. */
  #onSlotChange = () => {
    const slotElements = this.#defaultSlot.assignedElements();
    if (!slotElements.length) return;

    const firstElement = slotElements[0];
    if (this.anchoredElement === firstElement) return;
    if (!(firstElement instanceof HTMLElement)) {
      console.error(`[${COMPONENT_NAME}]: The first element in the default slot should be an HTMLElement`);
      return;
    }
    this.anchoredElement = firstElement;
  };

  #calcAnchoredRect = ([anchorPosition, anchorAlignment, anchoredAlignment]: PositionArea): AnchoredRect => {
    const anchoredRect = {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      width: 0,
      height: 0,
      offsetTop: 0,
      offsetBottom: 0,
      offsetLeft: 0,
      offsetRight: 0,
    };

    const anchorRect = this.anchorElementRect!;

    const anchoredEl = this.#anchoredElement!;
    const anchoredStyle = getComputedStyle(anchoredEl);
    anchoredRect.offsetTop = str2Num(anchoredStyle.marginBlockStart);
    anchoredRect.offsetBottom = str2Num(anchoredStyle.marginBlockEnd);
    anchoredRect.offsetLeft = str2Num(anchoredStyle.marginInlineStart);
    anchoredRect.offsetRight = str2Num(anchoredStyle.marginInlineEnd);

    const maxBlockSpace = Math.max(anchorRect.top, window.innerHeight - anchorRect.bottom);
    const maxInlineSpace = Math.max(anchorRect.left, window.innerWidth - anchorRect.right);
    anchoredEl.style.maxBlockSize = `${maxBlockSpace - anchoredRect.offsetTop - anchoredRect.offsetBottom}px`;
    anchoredEl.style.maxInlineSize = `${maxInlineSpace - anchoredRect.offsetLeft - anchoredRect.offsetRight}px`;

    anchoredRect.width = str2Num(anchoredStyle.inlineSize);
    anchoredRect.height = str2Num(anchoredStyle.blockSize);
    const anchoredTotalW = anchoredRect.width + anchoredRect.offsetLeft + anchoredRect.offsetRight;
    const anchoredTotalH = anchoredRect.height + anchoredRect.offsetTop + anchoredRect.offsetBottom;

    if (!anchoredRect.width || !anchoredRect.height) {
      console.warn(`[${COMPONENT_NAME}]: Cannot get width or height of the anchored element`);
    }

    // inline anchor pos
    if (anchorPosition === "left" || anchorPosition === "right") {
      anchoredRect.left = anchorPosition === "left" ? anchorRect.left - anchoredTotalW : anchorRect.right;
      anchoredRect.right = anchoredRect.left + anchoredTotalW;

      const blockShift = { start: 0, center: anchoredTotalH / 2, end: anchoredTotalH };
      const anchorBlockMap = { start: anchorRect.top, center: anchorRect.top + anchorRect.height / 2, end: anchorRect.bottom };
      anchoredRect.top = anchorBlockMap[anchorAlignment] - blockShift[anchoredAlignment];
      anchoredRect.bottom = anchoredRect.top + anchoredTotalH;

      return anchoredRect;
    }

    // block anchor pos
    anchoredRect.top = anchorPosition === "top" ? anchorRect.top - anchoredTotalH : anchorRect.bottom;
    anchoredRect.bottom = anchoredRect.top + anchoredTotalH;

    const inlineShift = { start: 0, center: anchoredTotalW / 2, end: anchoredTotalW };
    const anchorInlineMap = { start: anchorRect.left, center: anchorRect.left + anchorRect.width / 2, end: anchorRect.right };
    anchoredRect.left = anchorInlineMap[anchorAlignment] - inlineShift[anchoredAlignment];
    anchoredRect.right = anchoredRect.left + anchoredTotalW;

    return anchoredRect;
  };

  #calcAnchoredPos = () => {
    if (!this.#anchoredElement || this.anchorElementRect === null) {
      console.error(`[${COMPONENT_NAME}]: Invalid anchored element, anchor element or anchor element rect`);
      return;
    }

    const { innerWidth: viewportW, innerHeight: viewportH } = window;

    for (const posArea of this.#preferredPositionOrder) {
      // css state first to take account of any new style changes that can affect measurements
      if (!this.#internals.states.has(posArea[0])) {
        this.#internals.states.clear();
        this.#internals.states.add(posArea[0]);
      }
      const anchoredRect = this.#calcAnchoredRect(posArea);
      if (!this.#canRectFit(anchoredRect, viewportW, viewportH)) continue;
      return anchoredRect;
    }

    if (!this.#internals.states.has("misaligned")) {
      this.#internals.states.clear();
      this.#internals.states.add("misaligned");
    }
  };

  #canRectFit = (anchoredRect: AnchoredRect, viewportW: number, viewportH: number) => {
    if (anchoredRect.top + anchoredRect.offsetTop < 0) return false;
    if (anchoredRect.bottom - anchoredRect.offsetBottom > viewportH) return false;
    if (anchoredRect.left + anchoredRect.offsetLeft < 0) return false;
    if (anchoredRect.right - anchoredRect.offsetRight > viewportW) return false;
    return true;
  };

  //#endregion

  //#region Public Methods
  /** Calculates the bounding rect of the anchored element using the preferred position order. */
  getAnchoredRect = this.#calcAnchoredPos;

  /** Updates the anchored element position. */
  updatePosition = () => {
    const anchoredRect = this.#calcAnchoredPos();
    if (!anchoredRect) return;
    this.#anchoredElement!.style.inset = `${anchoredRect.top}px auto auto ${anchoredRect.left}px`;
    if (typeof this.onUpdate === "function") this.onUpdate(anchoredRect);
  };
  /** Starts the automatic update of the anchored element position. */
  startAutoUpdate = () => {
    this.#pullAndUpdatePos.start();
  };

  /** Stops the automatic update of the anchored element position. */
  stopAutoUpdate = () => {
    this.#pullAndUpdatePos.stop();
  };

  /** Gets the current anchor position: "top", "bottom", "left", "right", "misaligned" or undefined. */
  getAnchorPosition() {
    return Array.from(this.#internals.states.keys())[0] as AnchorPosition | "misaligned" | undefined;
  }

  /** Invoked when the component is updated */
  onUpdate: (anchoredRect: Exclude<ReturnType<Anchor["getAnchoredRect"]>, undefined>) => void = () => {};
  //#endregion
}

customElements.define(COMPONENT_NAME, Anchor);

export type { Anchor };

declare global {
  type Anchor = ComponentTypes["Instance"];

  interface HTMLElementTagNameMap {
    [COMPONENT_NAME]: Anchor;
  }
}

function str2Num(str: string, defaultValue: number = 0) {
  const num = parseFloat(str);
  if (isNaN(num) || !isFinite(num)) return defaultValue;
  return num;
}
