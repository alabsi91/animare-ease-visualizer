import type { BooleanString, IWebComponent, WComponent } from "../wc";

type ExtraAttributes = {
  "copy-button"?: BooleanString;
  "one-line"?: BooleanString;
  onchange?: (e: CustomEvent) => void;
  oncopy?: (e: CustomEvent) => void;
};

type ComponentTypes = WComponent<typeof CodeEditor, ExtraAttributes>;

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
class CodeEditor extends HTMLElement implements IWebComponent {
  static readonly htmlFragment = (() => {
    const template = document.createElement("template");
    template.innerHTML = import_as_string("./codeEditor-template.inline.html", { minify: true });
    return template.content;
  })();

  static readonly stylesheet = (() => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(import_as_string("./codeEditor-style.inline.css", { minify: true }));
    return sheet;
  })();

  static readonly #wrappers = [
    { open: "'", close: "'" },
    { open: '"', close: '"' },
    { open: "`", close: "`" },
    { open: "(", close: ")" },
    { open: "{", close: "}" },
    { open: "[", close: "]" },
  ];

  readonly #internals: ElementInternals;
  readonly #editorEl: HTMLTextAreaElement;
  readonly #highlightedEl: HTMLDivElement;
  readonly #lineNumbersPlaceholderEl: HTMLDivElement;
  readonly #copyButtonEl: HTMLButtonElement;
  readonly #abortController = new AbortController();
  #resizeObserver: ResizeObserver | null = null;

  /** Emitted when the value changes. */
  readonly #change = new CustomEvent("change");
  /** Emitted when the copy button is clicked. */
  readonly #copy = new CustomEvent("copy");

  //#region Public Props
  /** The code string. */
  get value(): string {
    return this.#editorEl.value;
  }
  set value(val: string) {
    this.#editorEl.value = val;
    this.#update();
  }

  #highlighter: Highlighter = (code: string) => code;
  /** - The highlighter function, takes the current code string and returns the highlighted code as html string. */
  get highlighter() {
    return this.#highlighter;
  }
  set highlighter(fn: Highlighter) {
    if (typeof fn !== "function") return;
    this.#highlighter = fn;
    this.#update();
  }

  #tabsize = 2;
  /** The empty space counted as one tab. */
  get tabsize(): number {
    return this.#tabsize;
  }
  set tabsize(val: number) {
    this.#tabsize = val;
  }

  #readonly = false;
  /** Disable user input. */
  get readonly(): boolean {
    return this.#readonly;
  }
  set readonly(val: boolean) {
    this.#readonly = val;
    this.#editorEl.readOnly = val;
  }

  #linenumbers = false;
  /** Show line numbers. */
  get linenumbers(): boolean {
    return this.#linenumbers;
  }
  set linenumbers(val: boolean) {
    this.#linenumbers = val;
    this.#lineNumbersPlaceholderEl.style.display = val ? "block" : "none";
    this.#update();
  }

  #expand: boolean = true;
  /** Expand the text area to fit the content, only for newlines wont work for warping text. */
  get expand(): boolean {
    return this.#expand;
  }
  set expand(val: boolean) {
    this.#expand = val;
  }

  #wrap: boolean = false;
  /** Wrap the text area to fit the content. */
  get wrap(): boolean {
    return this.#wrap;
  }
  set wrap(val: boolean) {
    this.#wrap = val;
    this.#editorEl.classList.toggle("wrap", val);
    this.#highlightedEl.classList.toggle("wrap", val);
    this.#update();
  }

  #copyButton = false;
  /** Show copy button. */
  get copyButton(): boolean {
    return this.#copyButton;
  }
  set copyButton(val: boolean) {
    this.#copyButton = val;
    this.#copyButtonEl.style.display = val ? "grid" : "none";
  }

  #stylesheet: string | null = null;
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
      return;
    }
  }

  #oneLine = false;
  /** Mimic regular input element by forcing one line. */
  get oneLine(): boolean {
    return this.#oneLine;
  }
  set oneLine(val: boolean) {
    this.#oneLine = val;
    this.#editorEl.classList.toggle("hidden-scrollbar", val);
    this.#update();
  }
  //#endregion

  //#region HTMLElement Methods
  constructor() {
    super();

    this.#internals = this.attachInternals();

    const shadow = this.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [CodeEditor.stylesheet];
    shadow.appendChild(CodeEditor.htmlFragment.cloneNode(true));

    const codeStyleTag = document.createElement("style");
    codeStyleTag.classList.add("code-style");
    shadow.appendChild(codeStyleTag);

    const editorEl = shadow.querySelector<HTMLTextAreaElement>(".textarea");
    if (!editorEl) console.error("[code-editor]: Could not find element with class `textarea`");

    const highlightedEl = shadow.querySelector<HTMLDivElement>(".highlight");
    if (!highlightedEl) console.error("[code-editor]: Could not find element with class `highlight`");

    const lineNumbersPlaceholderEl = shadow.querySelector<HTMLDivElement>(".line-numbers-placeholder");
    if (!lineNumbersPlaceholderEl) console.error("[code-editor]: Could not find element with class `line-numbers`");

    const copyButton = shadow.querySelector<HTMLButtonElement>(".copy-btn");
    if (!copyButton) console.error("[code-editor]: Could not find element with class `copy-btn`");

    this.#editorEl = editorEl!;
    this.#highlightedEl = highlightedEl!;
    this.#lineNumbersPlaceholderEl = lineNumbersPlaceholderEl!;
    this.#copyButtonEl = copyButton!;
  }

  connectedCallback(): void {
    const signal = this.#abortController.signal;

    this.#editorEl.addEventListener("input", this.#inputHandler, { signal });
    this.#editorEl.addEventListener("beforeinput", this.#beforeInputHandler, { signal });
    this.#editorEl.addEventListener("keydown", this.#keyboardHandler, { signal });
    this.#editorEl.addEventListener("dblclick", this.#doubleClickHandler, { signal });
    this.#editorEl.addEventListener("click", this.#clickHandler, { signal });
    this.#editorEl.addEventListener("scroll", this.#onScrollHandler, { signal });
    this.#editorEl.addEventListener("focus", this.#onFocus, { signal });
    this.#editorEl.addEventListener("blur", this.#onBlur, { signal });
    this.#copyButtonEl.addEventListener("click", this.#copyHandler, { signal });

    this.#resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      const entry = entries[0];
      if (!entry) return;

      this.#highlightedEl.style.width = this.#linenumbers
        ? `calc(${entry.contentRect.width}px + var(--sz-line-numbers-width))`
        : `${entry.contentRect.width}px`;
      this.#highlightedEl.style.height = `${entry.contentRect.height}px`;

      this.#highlightedEl.style.top = `${this.#editorEl.offsetTop}px`;

      this.#lineNumbersPlaceholderEl.style.height = `${entry.contentRect.height}px`;
    });

    this.#resizeObserver.observe(this.#editorEl);

    const defaultSlot = this.shadowRoot?.querySelector<HTMLSlotElement>("slot:not([name])");
    if (defaultSlot) defaultSlot.addEventListener("slotchange", this.#onSlotChange, { signal });
  }

  disconnectedCallback(): void {
    this.#abortController.abort();
    if (this.#resizeObserver) this.#resizeObserver.disconnect();
  }

  static get observedAttributes() {
    return ["value", "readonly", "tabsize", "stylesheet", "expand", "wrap", "linenumbers", "copy-button", "one-line"] as const;
  }

  attributeChangedCallback(name: ComponentTypes["ObservedAttributes"], _oldValue: string | null, newValue: string | null) {
    if (name === "value") {
      this.value = newValue ?? "";
      this.dispatchEvent(this.#change);
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

    if (name === "one-line") {
      this.oneLine = newValue === "true" || newValue === "";
      return;
    }

    const _exhaustiveCheck: never = name;
    return _exhaustiveCheck;
  }

  getAttribute(qualifiedName: ComponentTypes["ObservedAttributes"] | (string & {})): string | null {
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
    this.#lineNumbersPlaceholderEl.scrollTop = this.#editorEl.scrollTop;
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
    setTimeout(() => {
      this.#activeLineNumber();
    }, 0);
  };

  #activeLineNumber = () => {
    if (!this.#linenumbers || this.#readonly) return;

    const crateEnd = this.#editorEl.selectionEnd;

    const matchNewlineBeforeCrate = this.value.substring(0, crateEnd).match(/\n/g);
    const activeLineNumber = matchNewlineBeforeCrate ? matchNewlineBeforeCrate.length : 0;

    this.#highlightedEl.querySelector("li.active")?.classList.remove("active");
    this.#highlightedEl.querySelector(`li:nth-child(${activeLineNumber + 1})`)?.classList.add("active");
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

    if (start === end) return;

    e.preventDefault();

    const txt = el.value;
    const selected = txt.slice(start, end);
    el.value = txt.substring(0, start) + `${wrapper.open}${selected}${wrapper.close}` + txt.substring(end, txt.length);
    el.setSelectionRange(start + 1, end + 1);
    this.#update();
  };

  /** Copy button click event handler */
  #copyHandler = async () => {
    const txt = this.#editorEl.value;
    await navigator.clipboard.writeText(txt);
    this.dispatchEvent(this.#copy);
  };

  /** Textarea input event handler. */
  #inputHandler = () => {
    this.#update();
    this.dispatchEvent(this.#change);
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
    this.#editorEl.rows = rowsCount;

    const highlighted = await this.#highlighter(el.value);
    const trailingSpaces = el.value.match(/\s*$/g)!;

    if (this.#linenumbers) {
      const withLineNumbers = highlighted
        .split(/\n/g)
        .map(line => `<li>${line}</li>`)
        .join("\n");

      this.#highlightedEl.innerHTML = `<ul>${withLineNumbers}</ul>` + trailingSpaces[0];
      this.#activeLineNumber();
      return;
    }

    this.#highlightedEl.innerHTML = highlighted + trailingSpaces[0];
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

customElements.define(COMPONENT_NAME, CodeEditor);

export type { CodeEditor };

declare global {
  type CodeEditor = ComponentTypes["Instance"];

  interface HTMLElementTagNameMap {
    [COMPONENT_NAME]: CodeEditor;
  }
}
