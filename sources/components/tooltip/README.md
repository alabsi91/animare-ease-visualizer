# tooltip-component

A tooltip component that displays a message when hovered over.

- Depends on `<anchor-component />`.
- Works only for fine input devices by design.
- Not selectable and hidden from screen readers.
- Pointer events are disabled.

**Usage**

```html
<button id="tooltip-button">Show Alert</button>

<tooltip-component for="tooltip-button" preferred-sequence="right left bottom top">
  <p>A button to show alert</p>
</tooltip-component>
```

**Methods**

- `open()` Open the tooltip.
- `close()` Close the tooltip.
- `toggle()` Toggle the tooltip between open and closed.

**Props**

- `for` (Get/Set) The element to attach the tooltip to, can be a string selector, a single or an array of elements.
- `preferredSequence` (Get/Set) The preferred directions to open the tooltip. An array of 1 to 4 directions: `top`, `bottom`, `left`, `right` in order of
  preference. When using the class property, an array is expected. When using as an HTML attribute, a string of space-separated
  directions might be expected.
- `revealDelay` (Get/Set) The delay before the tooltip is revealed. (default: `500`)
- `offset` (Get/Set) The tooltip offset, use `margin` like values. Ex: `1em 2em` (default: `"1em"`)
- `isOpen` (Get) Returns `true` if the tooltip is open.

**Events**

- `reveal` Emitted when the tooltip is opened. `detail` is the hovered element.
- `dismiss` Emitted when the tooltip is closed. `detail` is the hovered element.
- `stateChange` Emitted when the tooltip is opened or closed. `detail` is the hovered element.

**Slots**

- `Default` The content of the tooltip.

**Attributes**

- `"for"` The element to attach the tooltip to, can be a string selector, a single or an array of elements.
- `"preferred-sequence"` The preferred directions to open the tooltip. An array of 1 to 4 directions: `top`, `bottom`, `left`, `right` in order of
  preference. When using the class property, an array is expected. When using as an HTML attribute, a string of space-separated
  directions might be expected.
- `"reveal-delay"` The delay before the tooltip is revealed. (default: `500`)
- `"offset"` The tooltip offset, use `margin` like values. Ex: `1em 2em` (default: `"1em"`)

**CSS Properties**

- `--ui-clr-surface-1` The background color of the tooltip.
- `--ui-clr-text-muted` The text color of the tooltip container.
- `--ui-clr-border` The border color of the tooltip.
- `--ui-rad-border-lg` The border radius of the tooltip.
- `--ui-sz-border-thin` The border width of the tooltip.
- `--ui-shadow` The shadow of the tooltip.
- `--wcp-sz-arrow` The size of the arrow that points to the element that the tooltip is attached to.
- `--wcp-sp-offset` The tooltip offset, use `margin` like values. Ex: `1em 2em`. Overridden by `offset` prop/attribute.
- `--ui-ease-anim-forward` The easing function of the show/hide animation.

**CSS Parts**

- `::part(container)` The tooltip container element.
- `::part(arrow)` The arrow element.

**CSS States**

- `:state(open)`
