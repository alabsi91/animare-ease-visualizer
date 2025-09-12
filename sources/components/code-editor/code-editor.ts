import type * as WCP from "../wcp";

declare const CustomEvent: WCP.CustomEventT;

type ExtendedAttributes = {
  "copy-button"?: WCP.BooleanString;
  "wrap-button"?: WCP.BooleanString;
  "one-line"?: WCP.BooleanString;
};

type ComponentEvents = WCP.WEvent<{
  copyClick: CustomEvent;
  update: CustomEvent;
}>;

type CssState = "focus";

type ComponentTypes = WCP.WComponent<typeof CodeEditor, ExtendedAttributes, ComponentEvents>;

type Highlighter = (code: string) => string | Promise<string>;

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

  #propsToUpgrade = Object.entries(this) as [keyof this, this[keyof this]][] | undefined;

  static readonly componentName = "code-editor";

  static readonly htmlFragment = (() => {
    const template = document.createElement("template");
    template.innerHTML = import_as_string("./code-editor-template.inline.html", { minify: true });
    return template.content;
  })();

  static readonly stylesheet = (() => {
    const sheet = new CSSStyleSheet();
    sheet.replace(import_as_string("./code-editor-style.inline.css", { minify: true }));
    return sheet;
  })();

  readonly #shadow = (() => {
    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [CodeEditor.stylesheet];
    shadow.appendChild(CodeEditor.htmlFragment.cloneNode(true));
    return shadow;
  })();

  readonly #events: ComponentEvents = {
    /** Emitted when the copy button is clicked. */
    copyClick: new CustomEvent("copyClick"),
    /** Emitted when the value changes. */
    update: new CustomEvent("update"),
  };

  readonly #abortController = new AbortController();
  readonly #internals = this.attachInternals<CssState>();
  readonly #wrapperEl: HTMLDivElement = this.#shadow.querySelector(".wrapper")!;
  readonly #editorEl: HTMLTextAreaElement = this.#shadow.querySelector(".textarea")!;
  readonly #highlightedEl: HTMLDivElement = this.#shadow.querySelector(".highlight")!;
  readonly #linesContainerEl: HTMLDivElement = this.#shadow.querySelector(".lines")!;
  readonly #copyButtonEl: HTMLButtonElement = this.#shadow.querySelector(".copy-btn")!;
  readonly #wrapButtonEl: HTMLButtonElement = this.#shadow.querySelector(".wrap-btn")!;
  #resizeObserver: ResizeObserver | null = null;

  static readonly #wrappers = [
    { open: "'", close: "'" },
    { open: '"', close: '"' },
    { open: "`", close: "`" },
    { open: "(", close: ")" },
    { open: "{", close: "}" },
    { open: "[", close: "]" },
  ];

  //#region Public Props
  /** The code string. */
  get value(): string { return this.#editorEl.value; }
  set value(val: string) {
    this.#editorEl.value = val;
    this.#update();
  }

  /** The highlighter function, takes the current code string and returns the highlighted code as html string. */
  get highlighter() { return this.#highlighter; }
  set highlighter(fn: Highlighter) {
    if (typeof fn !== "function") return;
    this.#highlighter = fn;
    this.#update();
  }
  #highlighter: Highlighter = (code: string) => code;

  /** The empty space counted as one tab. */
  tabsize = 2;

  /** Disable user input. */
  get readonly(): boolean { return this.#readonly; }
  set readonly(val: boolean) {
    this.#readonly = val;
    this.#editorEl.readOnly = val;
  }
  #readonly = false;

  /** Show line numbers. */
  get linenumbers(): boolean { return this.#linenumbers; }
  set linenumbers(val: boolean) {
    this.#linenumbers = val;
    this.#wrapperEl.classList.toggle("linenumbers", val);
    this.#update();
  }
  #linenumbers = false;

  /** Expand the text area to fit the content, only for newlines wont work for warping text. */
  expand: boolean = true;

  /** Wrap the text area to fit the content. */
  get wrap(): boolean { return this.#wrap; }
  set wrap(val: boolean) {
    this.#wrap = val;
    this.#editorEl.classList.toggle("wrap", val);
    this.#highlightedEl.classList.toggle("wrap", val);
    this.#update();
    this.#linesContainerEl.style.width = `calc(${this.#editorEl.scrollWidth}px - var(--sz-padding))`;
  }
  #wrap: boolean = false;

  /** Show copy button. */
  get copyButton(): boolean { return this.#copyButton; }
  set copyButton(val: boolean) {
    this.#copyButton = val;
    this.#copyButtonEl.style.display = val ? "grid" : "none";
  }
  #copyButton = false;

  /** Show wrap button. */
  get wrapButton(): boolean { return this.#wrapButton; }
  set wrapButton(val: boolean) {
    this.#wrapButton = val;
    this.#wrapButtonEl.style.display = val ? "grid" : "none";
  }
  #wrapButton = false;

  /** The CSS style sheet selector for code styling, it can be a `link[rel="stylesheet"]` or a `style` element. */
  get stylesheet(): string | null { return this.#stylesheet; }
  set stylesheet(selector: string | null) {
    this.#stylesheet = selector;

    const currentStyleTag = this.#shadow.querySelector<HTMLStyleElement>(".code-style");
    if (!currentStyleTag) {
      console.error(`[${this.localName}]: Could not find element with class 'code-style'`);
      return;
    }

    const styleLinkTags = this.#shadow.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]');

    if (!selector) {
      currentStyleTag.textContent = "";
      styleLinkTags.forEach(link => link.remove());
      return;
    }

    const newStyleEl = document.querySelector<HTMLStyleElement | HTMLLinkElement>(selector);
    if (!newStyleEl) {
      console.error(`[${this.localName}]: Could not find style with selector ${selector}`);
      return;
    }

    if (newStyleEl instanceof HTMLStyleElement) {
      currentStyleTag.textContent = newStyleEl.textContent;
      styleLinkTags.forEach(link => link.remove());
      return;
    }

    if (newStyleEl instanceof HTMLLinkElement) {
      this.#shadow.appendChild(newStyleEl.cloneNode(true));
      currentStyleTag.textContent = "";
      styleLinkTags.forEach(link => link.remove());
      return;
    }
  }
  #stylesheet: string | null = null;

  /** Mimic regular input element by forcing one line. */
  get oneLine(): boolean { return this.#oneLine; }
  set oneLine(val: boolean) {
    this.#oneLine = val;
    this.#editorEl.classList.toggle("hidden-scrollbar", val);
    this.#update();
  }
  #oneLine = false;
  //#endregion

  //#region HTMLElement Methods
  constructor() {
    super();

    const codeStyleTag = document.createElement("style");
    codeStyleTag.classList.add("code-style");
    this.#shadow.appendChild(codeStyleTag);
  }

  connectedCallback(): void {
    const signal = this.#abortController.signal;
    const editor = this.#editorEl;

    editor.addEventListener("input", this.#inputHandler, { signal });
    editor.addEventListener("beforeinput", this.#beforeInputHandler, { signal });
    editor.addEventListener("keydown", this.#keyboardHandler, { signal });
    editor.addEventListener("dblclick", this.#doubleClickHandler, { signal });
    editor.addEventListener("click", this.#clickHandler, { signal });
    editor.addEventListener("scroll", this.#onScrollHandler, { signal });
    editor.addEventListener("focus", this.#onFocus, { signal });
    editor.addEventListener("blur", this.#onBlur, { signal });
    this.#copyButtonEl.addEventListener("click", this.#copyHandler, { signal });
    this.#wrapButtonEl.addEventListener("click", () => (this.wrap = !this.#wrap), { signal });

    this.#resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      const entry = entries[0];
      if (!entry) return;

      this.#highlightedEl.style.width = this.#linenumbers
        ? `calc(${entry.contentRect.width}px + var(--sz-line-numbers-width))`
        : `${entry.contentRect.width}px`;
      this.#highlightedEl.style.height = `${entry.contentRect.height}px`;

      this.#highlightedEl.style.top = `${editor.offsetTop}px`;
      this.#linesContainerEl.style.width = `calc(${editor.scrollWidth}px - var(--sz-padding))`;
    });

    this.#resizeObserver.observe(editor);

    const defaultSlot = this.#shadow.querySelector<HTMLSlotElement>("slot:not([name])");
    if (defaultSlot) defaultSlot.addEventListener("slotchange", this.#onSlotChange, { signal });

    if (this.#propsToUpgrade) {
      for (const [prop, value] of this.#propsToUpgrade) {
        delete this[prop];
        this[prop] = value;
      }
      this.#propsToUpgrade = undefined;
    }
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

    return name;
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
    this.#highlightedEl.scrollTop = this.#editorEl.scrollTop;
    this.#highlightedEl.scrollLeft = this.#editorEl.scrollLeft;
  };

  /** Select a word without the trailing spaces when double clicked */
  #doubleClickHandler = () => {
    if (this.#readonly) return;

    const txt = this.#editorEl.value;
    const start = this.#editorEl.selectionStart;
    const end = this.#editorEl.selectionEnd;

    const selected = txt.slice(start, end);
    if (selected.trim() === "") return; // empty spaces
    const trailingSpaces = selected.match(/\s*$/g)!;

    this.#editorEl.setSelectionRange(start, end - trailingSpaces[0].length);
  };

  /** Set the active line number */
  #clickHandler = () => {
    setTimeout(() => this.#activeLineNumber(), 0);
  };

  #activeLineNumber = () => {
    if (this.#readonly) return;

    const crateStart = this.#editorEl.selectionStart;
    const crateEnd = this.#editorEl.selectionEnd;

    const newLnStartMatch = this.value.substring(0, crateStart).match(/\n/g);
    const newLnEndMatch = this.value.substring(0, crateEnd).match(/\n/g);
    const activeLineNumberEnd = newLnEndMatch ? newLnEndMatch.length : 0;
    const activeLineNumberStart = newLnStartMatch ? newLnStartMatch.length : 0;

    const lines = this.#highlightedEl.querySelectorAll(".line");
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
    const txt = this.#editorEl.value;
    const start = this.#editorEl.selectionStart;
    const end = this.#editorEl.selectionEnd;

    if (e.key === "Tab") {
      e.preventDefault();
      const space = " ".repeat(this.tabsize);
      this.#editorEl.value = txt.substring(0, start) + space + txt.substring(end, txt.length);
      this.#editorEl.setSelectionRange(start + this.tabsize, end + this.tabsize);
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
      this.#editorEl.value = txt.substring(0, start) + leadingSpaces + txt.substring(end, txt.length);
      this.#editorEl.setSelectionRange(start + leadingSpaces.length, end + leadingSpaces.length);
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

    const el = this.#editorEl;
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
    const txt = this.#editorEl.value;
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
    const el = this.#editorEl;

    // one liner
    if (this.#oneLine && el.value.match(/\n/g)) {
      const crateStart = el.selectionStart;
      const crateEnd = el.selectionEnd;
      el.value = el.value.replace(/\n/g, "");
      el.setSelectionRange(crateStart, crateEnd);
    }

    const rowsCount = el.value.split(/\n/g).length;
    // this.#editorEl.rows = rowsCount;
    this.#editorEl.setAttribute("rows", this.expand ? rowsCount.toString() : "auto");

    const highlighted = await this.#highlighter(el.value);
    const trailingSpaces = el.value.match(/\s*$/g)!;

    const withLineNumbers = highlighted
      .split(/\n/g)
      .map((line, i) => `<span class="line"><span class="ln-num">${this.#linenumbers ? i + 1 : ""}</span>${line}</span>`)
      .join("\n");

    this.#linesContainerEl.innerHTML = withLineNumbers + trailingSpaces[0];
    this.#activeLineNumber();
  };

  /** Textarea focus event handler. */
  #onFocus = () => {
    if (this.#readonly) return;
    this.#internals.states.add("focus");
  };

  /** Textarea blur event handler. */
  #onBlur = () => {
    this.#internals.states.delete("focus");
    this.#highlightedEl.querySelector("li.active")?.classList.remove("active");
  };
  //#endregion
}

customElements.define(CodeEditor.componentName, CodeEditor);

declare global {
  type CodeEditor = ComponentTypes["Instance"];

  interface HTMLElementTagNameMap {
    [CodeEditor.componentName]: CodeEditor;
  }

  namespace React.JSX {
    interface IntrinsicElements {
      /** @markdown {./README.md} */
      [CodeEditor.componentName]: WCP.ReactWComponent<ComponentTypes["JsxProps"], CodeEditor>;
    }
  }
}
