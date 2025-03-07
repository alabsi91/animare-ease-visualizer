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
- `tabsize` (Get/Set) The empty space counted as one tab.
- `readonly` (Get/Set) Disable user input.
- `linenumbers` (Get/Set) Show line numbers.
- `expand` (Get/Set) Expand the text area to fit the content, only for newlines wont work for warping text.
- `wrap` (Get/Set) Wrap the text area to fit the content.
- `copyButton` (Get/Set) Show copy button.
- `stylesheet` (Get/Set) The CSS style sheet selector for code styling, it can be a `link[rel="stylesheet"]` or a `style` element.
- `oneLine` (Get/Set) Mimic regular input element by forcing one line.

**Events**

- `change` Emitted when the value changes.
- `copy` Emitted when the copy button is clicked.

**Slots**

- `Default` The text content of the this slot children will be extracted and used as the initial code.
- `header` Element to render in the header.
- `footer` Element to render in the footer.

**Attributes**

- `"value"` The code string.
- `"readonly"` Disable user input.
- `"tabsize"` The empty space counted as one tab.
- `"stylesheet"` The CSS style sheet selector for code styling, it can be a `link[rel="stylesheet"]` or a `style` element.
- `"expand"` Expand the text area to fit the content, only for newlines wont work for warping text.
- `"wrap"` Wrap the text area to fit the content.
- `"linenumbers"` Show line numbers.
- `"copy-button"` Show copy button.
- `"one-line"` Mimic regular input element by forcing one line.

**CSS Properties**

- `--font-family` The default font family of the code editor.
- `--font-weight` The default font size of the code editor.
- `--font-size` The default font size of the code editor.
- `--line-height` The default line height of the code editor.
- `--background-color` The default background color of the code editor.
- `--selection-color` The background color of the selected text.
- `--scrollbar-color` The color of the scrollbar.
- `--line-numbers-width` The width of the line numbers column.

**CSS Parts**

- `::part(wrapper)` The element that wrap [Header | Editor | Footer].
- `::part(container)` The element that container [LineNumbers | Textarea/Highlight | CopyButton].
- `::part(box)` The code editor box element (textarea and highlight elements).
- `::part(textarea)` The code editor textarea element.
- `::part(highlight)` The code editor highlight container element.
- `::part(copy-button)` The copy button.

**CSS States**

- `:state(focus)`
