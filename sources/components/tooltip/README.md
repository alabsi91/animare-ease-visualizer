# tooltip-component

A tooltip component that displays a message when hovered over.

- Works only for fine input devices by design.
- Not selectable and hidden from screen readers.
- Pointer events are disabled.
- To offset the tooltip, use `margin` on the `::part(container)` element.

**Usage**

```html
<button id="tooltip-button">Show Alert</button>

<tooltip-component for="tooltip-button" prefer-direction="right">
  <p>A button to show alert</p>
</tooltip-component>
```

**Methods**

- `open()` Open the tooltip.
- `close()` Close the tooltip.
- `toggle()` Toggle the tooltip between open and closed.

**Props**

- `for` (Get/Set) The element to attach the tooltip to.
- `preferDirection` (Get/Set) Open the tooltip in the preferred direction if possible. Defaults to `top`.
- `revealDelay` (Get/Set) The delay before the tooltip is revealed.
- `isOpen` (Get) Returns `true` if the tooltip is open.

**Events**

- `open` Emitted when the tooltip is opened.
- `close` Emitted when the tooltip is closed.

**Slots**

- `Default` The content of the tooltip.

**Attributes**

- `"for"` The element to attach the tooltip to.
- `"prefer-direction"` Open the tooltip in the preferred direction if possible. Defaults to `top`.
- `"reveal-delay"` The delay before the tooltip is revealed.

**CSS Properties**

- `--clr-background` The background color of the tooltip.
- `--clr-border` The border color of the tooltip.
- `--sz-arrow` The size of the arrow that points to the element that the tooltip is attached to.
- `--clr-arrow` The color of the arrow that points to the element that the tooltip is attached to.
- `--dur-anim` The easing function of the show/hide animation.
- `--ease-anim` The easing function of the show/hide animation.

**CSS Parts**

- `::part(container)` The tooltip container element
- `::part(arrow)` The arrow element

**CSS States**

- `:state(open)`
