# slider-component

A wrapper around `<input type="range" />` that allow custom styling.

## Usage

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

## Properties

### `input`

Get the underlying `<input type="range" />` element

**Accessors:** `Get`  
**Type:** `HTMLInputElement`

### `value`

The current value.

**Accessors:** `Get`, `Set`  
**Type:** `number`  
**Default:** `50`

### `min`

The minimum value.

**Accessors:** `Get`, `Set`  
**Type:** `number`  
**Default:** `0`

### `max`

The maximum value.

**Accessors:** `Get`, `Set`  
**Type:** `number`  
**Default:** `100`

### `step`

Step per value update.

**Accessors:** `Get`, `Set`  
**Type:** `number`  
**Default:** `1`

### `percentage`

The current value as a percentage `(0-100)`.

**Accessors:** `Get`, `Set`  
**Type:** `number`

### `disabled`

Whether the slider is disabled.

**Accessors:** `Get`, `Set`  
**Type:** `boolean`  
**Default:** `false`

## Events

### `valueChange`

Fired when the value is changed.

## Attributes

### `"label"`

The label of the slider.

### `"aria-label"`

Forwarded to the `<input>` element.

### `"list"`

The id of the `<datalist>` element.

### `"min"`

The minimum value.

**Default:** `0`

### `"max"`

The maximum value.

**Default:** `100`

### `"value"`

The current value.

**Default:** `50`

### `"step"`

Step per value update.

**Default:** `1`

### `"disabled"`

Whether the slider is disabled.

**Values:** `"true"`, `"false"`  
**Default:** `false`

## Slots

- `Default` For the `<datalist>` element.

## CSS Properties

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

## CSS Parts

- `::part(container)` The slider container element
- `::part(track)` The slider track element
- `::part(fill)` The slider fill element
- `::part(thumb)` The slider thumb element
- `::part(input)` The underlying range input element
- `::part(bubble)` The bubble element

## CSS States

- `:state(active)`
