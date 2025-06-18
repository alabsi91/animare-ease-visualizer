# slider-component

A wrapper around `<input type="range" />` that allow custom styling.

**Usage**

```html
<slider-component label="Slider Label:" list="values" step="1">
  <datalist id="values">
    <option value="0" label="0"></option>
    <option value="25" label="25"></option>
    <option value="50" label="50"></option>
    <option value="75" label="75"></option>
    <option value="100" label="100"></option>
  </datalist>
</slider-component>
```

**Props**

- `input` (Get) Get the underlying `<input type="range" />` element
- `value` (Get/Set) The current value. (defaults: `50`).
- `min` (Get/Set) The minimum value. (defaults: `0`).
- `max` (Get/Set) The maximum value. (defaults: `100`).
- `step` (Get/Set) Step per value update. (defaults: `1`).
- `percentage` (Get/Set) The current value as a percentage `(0-100)`.
- `disabled` (Get/Set) Whether the slider is disabled. (default: `false`)

**Events**

- `valueChange` Fired when the value is changed.

**Slots**

- `Default` For the `<datalist>` element.

**Attributes**

- `"label"` The label of the slider.
- `"aria-label"` Forwarded to the `<input>` element.
- `"min"` The minimum value. (defaults: `0`).
- `"max"` The maximum value. (defaults: `100`).
- `"value"` The current value. (defaults: `50`).
- `"step"` Step per value update. (defaults: `1`).
- `"list"` The id of the `<datalist>` element.
- `"disabled"` Whether the slider is disabled. (default: `false`)

**CSS Properties**

- `--ui-ease-anim-forward` he easing function of the slider animation when it's active.
- `--ui-ease-anim-backward` The easing function of the slider animation when it's not active.
- `--ui-dur-anim-backward` The duration of the slider animation when it's not active.
- `--ui-dur-anim-forward` The duration of the slider animation when it is active.
- `--ui-clr-thumb` The background color of the slider thumb.
- `--ui-clr-text` The color of the slider text.
- `--ui-clr-accent` The background color of filled part of the slider track.
- `--ui-clr-neutral` The color of the empty part of the slider track.
- `--ui-shadow` The shadow of the slider and the thumb.
- `--wcp-sz-thickness` The thickness of the slider.
- `--wcp-sz-thumb` The size of the slider thumb.
- `--wcp-scale-by` The scale of the slider when it is active.
- `--wcp-is-rtl` Whether to use the RTL direction. Use `-1` for `false` and `1` for `true`. The component will detect the direction automatically.

**CSS Parts**

- `::part(container)` The slider container element
- `::part(track)` The slider track element
- `::part(fill)` The slider fill element
- `::part(thumb)` The slider thumb element
- `::part(input)` The underlying range input element
- `::part(bubble)` The bubble element

**CSS States**

- `:state(active)`
