# code-editor

A simple code editor component that can highlight code.

## Usage

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

## Properties

### `value`

The code string.

**Accessors:** `Get`, `Set`  
**Type:** `string`

### `highlighter`

The highlighter function, takes the current code string and returns the highlighted code as html string.

**Accessors:** `Get`, `Set`  
**Type:** `(code: string) => string | Promise<string>`

### `tabsize`

The empty space counted as one tab.

**Accessors:** `Get`, `Set`  
**Type:** `number`  
**Default:** `2`

### `readonly`

Disable user input.

**Accessors:** `Get`, `Set`  
**Type:** `boolean`  
**Default:** `false`

### `linenumbers`

Show line numbers.

**Accessors:** `Get`, `Set`  
**Type:** `boolean`  
**Default:** `false`

### `expand`

Expand the text area to fit the content, only for newlines wont work for warping text.

**Accessors:** `Get`, `Set`  
**Type:** `boolean`  
**Default:** `true`

### `wrap`

Wrap the text area to fit the content.

**Accessors:** `Get`, `Set`  
**Type:** `boolean`  
**Default:** `false`

### `copyButton`

Show copy button.

**Accessors:** `Get`, `Set`  
**Type:** `boolean`  
**Default:** `false`

### `wrapButton`

Show wrap button.

**Accessors:** `Get`, `Set`  
**Type:** `boolean`  
**Default:** `false`

### `stylesheet`

The CSS style sheet selector for code styling, it can be a `link[rel="stylesheet"]` or a `style` element.

**Accessors:** `Get`, `Set`  
**Type:** `string | null`  
**Default:** `null`

### `oneLine`

Mimic regular input element by forcing one line.

**Accessors:** `Get`, `Set`  
**Type:** `boolean`  
**Default:** `false`

## Events

### `copyClick`

Emitted when the copy button is clicked.

### `update`

Emitted when the value changes.

## Attributes

### `"value"`

The code string.

### `"readonly"`

Disable user input.

**Values:** `"true"`, `"false"`  
**Default:** `false`

### `"tabsize"`

The empty space counted as one tab.

**Default:** `2`

### `"stylesheet"`

The CSS style sheet selector for code styling, it can be a `link[rel="stylesheet"]` or a `style` element.

### `"expand"`

Expand the text area to fit the content, only for newlines wont work for warping text.

**Values:** `"true"`, `"false"`  
**Default:** `true`

### `"wrap"`

Wrap the text area to fit the content.

**Values:** `"true"`, `"false"`  
**Default:** `false`

### `"linenumbers"`

Show line numbers.

**Values:** `"true"`, `"false"`  
**Default:** `false`

### `"copy-button"`

Show copy button.

**Values:** `"true"`, `"false"`  
**Default:** `false`

### `"wrap-button"`

Show wrap button.

**Values:** `"true"`, `"false"`  
**Default:** `false`

### `"one-line"`

Mimic regular input element by forcing one line.

**Values:** `"true"`, `"false"`  
**Default:** `false`

## Slots

- `Default` The text content of the this slot children will be extracted and used as the initial code.
- `header` Element to render in the header.
- `footer` Element to render in the footer.

## CSS Properties

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

## CSS Parts

- `::part(wrapper)` The element that wrap [Header | Editor | Footer].
- `::part(container)` The element that container [LineNumbers | Textarea/Highlight | CopyButton].
- `::part(box)` The code editor box element (textarea and highlight elements).
- `::part(textarea)` The code editor textarea element.
- `::part(highlight)` The code editor highlight container element.
- `::part(wrap-button)` The wrap button.
- `::part(copy-button)` The copy button.

## CSS States

- `:state(focus)`
