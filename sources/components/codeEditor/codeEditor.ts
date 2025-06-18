import type * as WCP from "../wcp";

const CustomEvent = globalThis.CustomEvent as typeof WCP.CustomEventT;

type ExtendedAttributes = {
  "copy-button"?: WCP.BooleanString;
  "wrap-button"?: WCP.BooleanString;
  "one-line"?: WCP.BooleanString;
};

type ComponentEvents = WCP.WEvent<{
  copyClick: CustomEvent;
  update: CustomEvent;
}>;

type ComponentTypes = WCP.WComponent<typeof CodeEditor, ExtendedAttributes, ComponentEvents>;

type Highlighter = (code: string) => string | Promise<string>;

const COMPONENT_NAME = "code-editor";

/**
 * A simple code editor component that can highlight code.
 *
 * @usage
 * ```html
 * <link
 *   rel="stylesheet"
 *   href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark-reasonable.min.css"
 *   class="code-highlight"
 * />
 *
 * <code-editor stylesheet=".code-highlight">
 *   <pre>console.log("Hello World!");</pre>
 * </code-editor>
 * ```
 * - Attach a highlighter function.
 *
 * ```js
 * const editor = document.querySelector("code-editor");
 * editor.highlighter = code => hljs.highlight(code, { language: "typescript" }).value;
 * ```
 */
class CodeEditor extends HTMLElement implements WCP.IWebComponent {
  addEventListener!: WCP.AddEventListener<ComponentEvents, this>;

  static readonly htmlFragment = (() => {
    const template = document.createElement("template");
    template.innerHTML = import_as_string("./codeEditor-template.inline.html", { minify: true });
    return template.content;
  })();

  static readonly stylesheet = (() => {
    const sheet = new CSSStyleSheet();
    sheet.replace(import_as_string("./codeEditor-style.inline.css", { minify: true }));
    return sheet;
  })();

  readonly #abortController = new AbortController();
  #resizeObserver: ResizeObserver | null = null;

  static readonly #wrappers = [
    { open: "'", close: "'" },
    { open: '"', close: '"' },
    { open: "`", close: "`" },
    { open: "(", close: ")" },
    { open: "{", close: "}" },
    { open: "[", close: "]" },
  ];

  readonly #elements = {
    internals: null! as ElementInternals,
    wrapper: null! as HTMLDivElement,
    editor: null! as HTMLTextAreaElement,
    highlighted: null! as HTMLDivElement,
    linesContainer: null! as HTMLDivElement,
    copyButton: null! as HTMLButtonElement,
    wrapButton: null! as HTMLButtonElement,
  };

  readonly #events: ComponentEvents = {
    /** Emitted when the copy button is clicked. */
    copyClick: new CustomEvent("copyClick"),
    /** Emitted when the value changes. */
    update: new CustomEvent("update"),
  };

  //#region Public Props
  /** The code string. */
  get value(): string {
    return this.#elements.editor.value;
  }
  set value(val: string) {
    this.#elements.editor.value = val;
    this.#update();
  }

  /** - The highlighter function, takes the current code string and returns the highlighted code as html string. */
  get highlighter() {
    return this.#highlighter;
  }
  set highlighter(fn: Highlighter) {
    if (typeof fn !== "function") return;
    this.#highlighter = fn;
    this.#update();
  }
  #highlighter: Highlighter = (code: string) => code;

  /** The empty space counted as one tab. */
  tabsize = 2;

  /** Disable user input. */
  get readonly(): boolean {
    return this.#readonly;
  }
  set readonly(val: boolean) {
    this.#readonly = val;
    this.#elements.editor.readOnly = val;
  }
  #readonly = false;

  /** Show line numbers. */
  get linenumbers(): boolean {
    return this.#linenumbers;
  }
  set linenumbers(val: boolean) {
    this.#linenumbers = val;
    this.#elements.wrapper.classList.toggle("linenumbers", val);
    this.#update();
  }
  #linenumbers = false;

  /** Expand the text area to fit the content, only for newlines wont work for warping text. */
  expand: boolean = true;

  /** Wrap the text area to fit the content. */
  get wrap(): boolean {
    return this.#wrap;
  }
  set wrap(val: boolean) {
    this.#wrap = val;
    this.#elements.editor.classList.toggle("wrap", val);
    this.#elements.highlighted.classList.toggle("wrap", val);
    this.#update();
    this.#elements.linesContainer.style.width = `calc(${this.#elements.editor.scrollWidth}px - var(--sz-padding))`;
  }
  #wrap: boolean = false;

  /** Show copy button. */
  get copyButton(): boolean {
    return this.#copyButton;
  }
  set copyButton(val: boolean) {
    this.#copyButton = val;
    this.#elements.copyButton.style.display = val ? "grid" : "none";
  }
  #copyButton = false;

  /** Show wrap button. */
  get wrapButton(): boolean {
    return this.#wrapButton;
  }
  set wrapButton(val: boolean) {
    this.#wrapButton = val;
    this.#elements.wrapButton.style.display = val ? "grid" : "none";
  }
  #wrapButton = false;

  /** The CSS style sheet selector for code styling, it can be a `link[rel="stylesheet"]` or a `style` element. */
  get stylesheet(): string | null {
    return this.#stylesheet;
  }
  set stylesheet(selector: string | null) {
    this.#stylesheet = selector;

    const shadow = this.shadowRoot;
    if (!shadow) return;

    const currentStyleTag = shadow.querySelector<HTMLStyleElement>(".code-style");
    if (!currentStyleTag) {
      console.error("[code-editor]: Could not find element with class `code-style`");
      return;
    }

    const styleLinkTags = shadow.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]');

    if (!selector) {
      currentStyleTag.textContent = "";
      styleLinkTags.forEach(link => link.remove());
      return;
    }

    const newStyleEl = document.querySelector<HTMLStyleElement | HTMLLinkElement>(selector);
    if (!newStyleEl) {
      console.error(`[code-editor]: Could not find style with selector ${selector}`);
      return;
    }

    if (newStyleEl instanceof HTMLStyleElement) {
      currentStyleTag.textContent = newStyleEl.textContent;
      styleLinkTags.forEach(link => link.remove());
      return;
    }

    if (newStyleEl instanceof HTMLLinkElement) {
      shadow.appendChild(newStyleEl.cloneNode(true));
      currentStyleTag.textContent = "";
      styleLinkTags.forEach(link => link.remove());
      return;
    }
  }
  #stylesheet: string | null = null;

  /** Mimic regular input element by forcing one line. */
  get oneLine(): boolean {
    return this.#oneLine;
  }
  set oneLine(val: boolean) {
    this.#oneLine = val;
    this.#elements.editor.classList.toggle("hidden-scrollbar", val);
    this.#update();
  }
  #oneLine = false;
  //#endregion

  //#region HTMLElement Methods
  constructor() {
    super();

    this.#elements.internals = this.attachInternals();

    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [CodeEditor.stylesheet];
    shadow.appendChild(CodeEditor.htmlFragment.cloneNode(true));

    const codeStyleTag = document.createElement("style");
    codeStyleTag.classList.add("code-style");
    shadow.appendChild(codeStyleTag);

    const editorEl = shadow.querySelector<HTMLTextAreaElement>(".textarea")!;
    if (!editorEl) console.error(`[${COMPONENT_NAME}]: Could not find element with class "textarea"`);
    this.#elements.editor = editorEl;

    const highlightedEl = shadow.querySelector<HTMLDivElement>(".highlight")!;
    if (!highlightedEl) console.error(`[${COMPONENT_NAME}]: Could not find element with class "highlight"`);
    this.#elements.highlighted = highlightedEl;

    const wrapperEl = shadow.querySelector<HTMLDivElement>(".wrapper")!;
    if (!wrapperEl) console.error(`[${COMPONENT_NAME}]: Could not find element with class "wrapper"`);
    this.#elements.wrapper = wrapperEl;

    const linesContainer = shadow.querySelector<HTMLDivElement>(".lines")!;
    if (!linesContainer) console.error(`[${COMPONENT_NAME}]: Could not find element with class "lines"`);
    this.#elements.linesContainer = linesContainer;

    const copyButton = shadow.querySelector<HTMLButtonElement>(".copy-btn")!;
    if (!copyButton) console.error(`[${COMPONENT_NAME}]: Could not find element with class "copy-btn"`);
    this.#elements.copyButton = copyButton;

    const wrapButton = shadow.querySelector<HTMLButtonElement>(".wrap-btn")!;
    if (!wrapButton) console.error(`[${COMPONENT_NAME}]: Could not find element with class "wrap-btn"`);
    this.#elements.wrapButton = wrapButton;
  }

  connectedCallback(): void {
    const signal = this.#abortController.signal;
    const editor = this.#elements.editor;

    editor.addEventListener("input", this.#inputHandler, { signal });
    editor.addEventListener("beforeinput", this.#beforeInputHandler, { signal });
    editor.addEventListener("keydown", this.#keyboardHandler, { signal });
    editor.addEventListener("dblclick", this.#doubleClickHandler, { signal });
    editor.addEventListener("click", this.#clickHandler, { signal });
    editor.addEventListener("scroll", this.#onScrollHandler, { signal });
    editor.addEventListener("focus", this.#onFocus, { signal });
    editor.addEventListener("blur", this.#onBlur, { signal });
    this.#elements.copyButton.addEventListener("click", this.#copyHandler, { signal });
    this.#elements.wrapButton.addEventListener("click", () => (this.wrap = !this.#wrap), { signal });

    this.#resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      const entry = entries[0];
      if (!entry) return;

      this.#elements.highlighted.style.width = this.#linenumbers
        ? `calc(${entry.contentRect.width}px + var(--sz-line-numbers-width))`
        : `${entry.contentRect.width}px`;
      this.#elements.highlighted.style.height = `${entry.contentRect.height}px`;

      this.#elements.highlighted.style.top = `${editor.offsetTop}px`;
      this.#elements.linesContainer.style.width = `calc(${editor.scrollWidth}px - var(--sz-padding))`;
    });

    this.#resizeObserver.observe(editor);

    const defaultSlot = this.shadowRoot?.querySelector<HTMLSlotElement>("slot:not([name])");
    if (defaultSlot) defaultSlot.addEventListener("slotchange", this.#onSlotChange, { signal });
  }

  disconnectedCallback(): void {
    this.#abortController.abort();
    if (this.#resizeObserver) this.#resizeObserver.disconnect();
  }

  static get observedAttributes() {
    return [
      "value",
      "readonly",
      "tabsize",
      "stylesheet",
      "expand",
      "wrap",
      "linenumbers",
      "copy-button",
      "wrap-button",
      "one-line",
    ] as const;
  }

  attributeChangedCallback(name: ComponentTypes["ObservedAttributes"], _oldValue: string | null, newValue: string | null) {
    if (name === "value") {
      this.value = newValue ?? "";
      this.dispatchEvent(this.#events.update);
      return;
    }

    if (name === "readonly") {
      this.readonly = newValue === "true" || newValue === "";
      return;
    }

    if (name === "tabsize") {
      if (newValue === null) {
        this.tabsize = 2;
        return;
      }

      const num = parseInt(newValue ?? "2");
      const isNum = !isNaN(num) && isFinite(num);
      if (!isNum) return;

      this.tabsize = num;
      return;
    }

    if (name === "stylesheet") {
      this.stylesheet = newValue;
      return;
    }

    if (name === "expand") {
      this.expand = newValue === "true" || newValue === "";
      return;
    }

    if (name === "wrap") {
      this.wrap = newValue === "true" || newValue === "";
      return;
    }

    if (name === "linenumbers") {
      this.linenumbers = newValue === "true" || newValue === "";
      return;
    }

    if (name === "copy-button") {
      this.copyButton = newValue === "true" || newValue === "";
      return;
    }

    if (name === "wrap-button") {
      this.wrapButton = newValue === "true" || newValue === "";
      return;
    }

    if (name === "one-line") {
      this.oneLine = newValue === "true" || newValue === "";
      return;
    }

    const _exhaustiveCheck: never = name;
    return _exhaustiveCheck;
  }

  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"] | (string & {})): string | null;
  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"]): string | null {
    if (qualifiedName === "value") return this.value;
    if (qualifiedName === "readonly") return this.readonly.toString();
    if (qualifiedName === "tabsize") return this.tabsize.toString();
    if (qualifiedName === "stylesheet") return this.stylesheet;
    if (qualifiedName === "expand") return this.expand.toString();
    if (qualifiedName === "wrap") return this.wrap.toString();
    if (qualifiedName === "linenumbers") return this.linenumbers.toString();
    if (qualifiedName === "copy-button") return this.copyButton.toString();
    if (qualifiedName === "one-line") return this.oneLine.toString();
    return super.getAttribute(qualifiedName);
  }
  //#endregion

  //#region Private Methods
  /** Get the default slot text content and set it to the textarea. */
  #onSlotChange = (e: Event) => {
    const defaultSlot = e.target as HTMLSlotElement;
    const slotNodes = defaultSlot.assignedElements();
    const slotText = slotNodes.map(node => node.textContent).join("");
    if (slotText) this.value = slotText;
  };

  /** Match the scroll position of the editor, the highlighted code and the line numbers. */
  #onScrollHandler = () => {
    this.#elements.highlighted.scrollTop = this.#elements.editor.scrollTop;
    this.#elements.highlighted.scrollLeft = this.#elements.editor.scrollLeft;
  };

  /** Select a word without the trailing spaces when double clicked */
  #doubleClickHandler = () => {
    if (this.#readonly) return;

    const txt = this.#elements.editor.value;
    const start = this.#elements.editor.selectionStart;
    const end = this.#elements.editor.selectionEnd;

    const selected = txt.slice(start, end);
    if (selected.trim() === "") return; // empty spaces
    const trailingSpaces = selected.match(/\s*$/g)!;

    this.#elements.editor.setSelectionRange(start, end - trailingSpaces[0].length);
  };

  /** Set the active line number */
  #clickHandler = () => {
    setTimeout(() => this.#activeLineNumber(), 0);
  };

  #activeLineNumber = () => {
    if (this.#readonly) return;

    const crateStart = this.#elements.editor.selectionStart;
    const crateEnd = this.#elements.editor.selectionEnd;

    const newLnStartMatch = this.value.substring(0, crateStart).match(/\n/g);
    const newLnEndMatch = this.value.substring(0, crateEnd).match(/\n/g);
    const activeLineNumberEnd = newLnEndMatch ? newLnEndMatch.length : 0;
    const activeLineNumberStart = newLnStartMatch ? newLnStartMatch.length : 0;

    const lines = this.#elements.highlighted.querySelectorAll(".line");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i <= activeLineNumberEnd && i >= activeLineNumberStart) {
        line.classList.add("active");
        continue;
      }
      if (line.classList.contains("active")) {
        line.classList.remove("active");
      }
    }
  };

  /** On keydown event handler. */
  #keyboardHandler = (e: KeyboardEvent) => {
    const txt = this.#elements.editor.value;
    const start = this.#elements.editor.selectionStart;
    const end = this.#elements.editor.selectionEnd;

    if (e.key === "Tab") {
      e.preventDefault();
      const space = " ".repeat(this.tabsize);
      this.#elements.editor.value = txt.substring(0, start) + space + txt.substring(end, txt.length);
      this.#elements.editor.setSelectionRange(start + this.tabsize, end + this.tabsize);
      this.#update();
      return;
    }

    // Preserve the indent when adding a new line
    if (e.key === "Enter") {
      const currentLn = txt.substring(0, start).match(/\n.*/g)?.at(-1);
      if (!currentLn) return;
      const leadingSpaces = currentLn.match(/^\s*/g)?.[0];
      if (!leadingSpaces) return;
      e.preventDefault();
      this.#elements.editor.value = txt.substring(0, start) + leadingSpaces + txt.substring(end, txt.length);
      this.#elements.editor.setSelectionRange(start + leadingSpaces.length, end + leadingSpaces.length);
      this.#update();
      return;
    }

    if (this.#oneLine && e.key === "Enter") {
      e.preventDefault();
      return;
    }
  };

  /** Intercept beforeinput event to add the wrapper around the selected text. */
  #beforeInputHandler = (e: InputEvent) => {
    const key = e.data ?? "";

    const wrapper = CodeEditor.#wrappers.find(wrapper => wrapper.open === key);
    if (!wrapper) return;

    const el = this.#elements.editor;
    const start = el.selectionStart;
    const end = el.selectionEnd;

    // if (start === end) return;

    e.preventDefault();

    const txt = el.value;
    const selected = txt.slice(start, end);
    el.value = txt.substring(0, start) + `${wrapper.open}${selected}${wrapper.close}` + txt.substring(end, txt.length);
    el.setSelectionRange(start + 1, end + 1);
    this.#update();
  };

  /** Copy button click event handler */
  #copyHandler = () => {
    const txt = this.#elements.editor.value;
    navigator.clipboard.writeText(txt);
    this.dispatchEvent(this.#events.copyClick);
  };

  /** Textarea input event handler. */
  #inputHandler = () => {
    this.#update();
    this.dispatchEvent(this.#events.update);
  };

  /** Update the highlighted code and line numbers from the textarea value. */
  #update = async () => {
    const el = this.#elements.editor;

    // one liner
    if (this.#oneLine && el.value.match(/\n/g)) {
      const crateStart = el.selectionStart;
      const crateEnd = el.selectionEnd;
      el.value = el.value.replace(/\n/g, "");
      el.setSelectionRange(crateStart, crateEnd);
    }

    const rowsCount = el.value.split(/\n/g).length;
    // this.#editorEl.rows = rowsCount;
    this.#elements.editor.setAttribute("rows", this.expand ? rowsCount.toString() : "auto");

    const highlighted = await this.#highlighter(el.value);
    const trailingSpaces = el.value.match(/\s*$/g)!;

    const withLineNumbers = highlighted
      .split(/\n/g)
      .map((line, i) => `<span class="line"><span class="ln-num">${this.#linenumbers ? i + 1 : ""}</span>${line}</span>`)
      .join("\n");

    this.#elements.linesContainer.innerHTML = withLineNumbers + trailingSpaces[0];
    this.#activeLineNumber();
  };

  /** Textarea focus event handler. */
  #onFocus = () => {
    if (this.#readonly) return;
    this.#elements.internals.states.add("focus");
  };

  /** Textarea blur event handler. */
  #onBlur = () => {
    this.#elements.internals.states.delete("focus");
    this.#elements.highlighted.querySelector("li.active")?.classList.remove("active");
  };
  //#endregion
}

customElements.define(COMPONENT_NAME, CodeEditor);

export type { CodeEditor };

declare global {
  type CodeEditor = ComponentTypes["Instance"];

  interface HTMLElementTagNameMap {
    [COMPONENT_NAME]: CodeEditor;
  }
}
