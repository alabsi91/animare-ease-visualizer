# code-editor

A simple code editor component that can highlight code.

**Usage**

```html
<link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark-reasonable.min.css"
  class="code-highlight"
/>

<code-editor stylesheet=".code-highlight">
  <pre>console.log("Hello World!");</pre>
</code-editor>
```

- Attach a highlighter function.

```js
const editor = document.querySelector("code-editor");
editor.highlighter = code => hljs.highlight(code, { language: "typescript" }).value;
```

**Props**

- `value` (Get/Set) The code string.
- `highlighter` (Get/Set) - The highlighter function, takes the current code string and returns the highlighted code as html string.
- `tabsize` (Get/Set) The empty space counted as one tab. (default: `2`)
- `readonly` (Get/Set) Disable user input. (default: `false`)
- `linenumbers` (Get/Set) Show line numbers. (default: `false`)
- `expand` (Get/Set) Expand the text area to fit the content, only for newlines wont work for warping text. (default: `true`)
- `wrap` (Get/Set) Wrap the text area to fit the content. (default: `false`)
- `copyButton` (Get/Set) Show copy button. (default: `false`)
- `wrapButton` (Get/Set) Show wrap button. (default: `false`)
- `stylesheet` (Get/Set) The CSS style sheet selector for code styling, it can be a `link[rel="stylesheet"]` or a `style` element.
- `oneLine` (Get/Set) Mimic regular input element by forcing one line. (default: `false`)

**Events**

- `copyClick` Emitted when the copy button is clicked.
- `update` Emitted when the value changes.

**Slots**

- `Default` The text content of the this slot children will be extracted and used as the initial code.
- `header` Element to render in the header.
- `footer` Element to render in the footer.

**Attributes**

- `"value"` The code string.
- `"readonly"` Disable user input. (default: `false`)
- `"tabsize"` The empty space counted as one tab. (default: `2`)
- `"stylesheet"` The CSS style sheet selector for code styling, it can be a `link[rel="stylesheet"]` or a `style` element.
- `"expand"` Expand the text area to fit the content, only for newlines wont work for warping text. (default: `true`)
- `"wrap"` Wrap the text area to fit the content. (default: `false`)
- `"linenumbers"` Show line numbers. (default: `false`)
- `"copy-button"` Show copy button. (default: `false`)
- `"wrap-button"` Show wrap button. (default: `false`)
- `"one-line"` Mimic regular input element by forcing one line. (default: `false`)

**CSS Properties**

- `--font-family` The default font family of the code editor.
- `--font-weight` The default font size of the code editor.
- `--sz-font` The default font size of the code editor.
- `--line-height` The default line height of the code editor.
- `--wcp-clr-background` The default background color of the code editor.
- `--wcp-clr-accent` The background color of the selected text.
- `--clr-scrollbar` The color of the scrollbar.
- `--wcp-clr-border` The color of the border.
- `--sz-line-numbers-width` The width of the line numbers column.
- `--clr-line-numbers-background` The background color of the line numbers.
- `--clr-line-numbers-txt` The text color of the line numbers.
- `--clr-line-numbers-active-txt` The background color of the active line number.
- `--sz-padding` The padding of the code editor.
- `--wcp-rad-border` The border radius of the code editor.
- `--wcp-sz-border` The border width of the code editor.
- `--wcp-shadow` The shadow of the code editor.

**CSS Parts**

- `::part(wrapper)` The element that wrap [Header | Editor | Footer].
- `::part(container)` The element that container [LineNumbers | Textarea/Highlight | CopyButton].
- `::part(box)` The code editor box element (textarea and highlight elements).
- `::part(textarea)` The code editor textarea element.
- `::part(highlight)` The code editor highlight container element.
- `::part(wrap-button)` The wrap button.
- `::part(copy-button)` The copy button.

**CSS States**

- `:state(focus)`
