# slider-component

A wrapper around `<input type="range" />` that allow custom styling.

**Props**

- `input` (Get) Get the underlying `<input type="range" />` element
- `value` (Get/Set) The current value. Defaults to `50`.
- `min` (Get/Set) The minimum value. Defaults to `0`.
- `max` (Get/Set) The maximum value. Defaults to `100`.
- `step` (Get/Set) Step per value update. Defaults to `1`.
- `percentage` (Get/Set) The current value as a percentage `(0-100)`.
- `disabled` (Get/Set) Disabled. Defaults to `false`.

**Events**

- `change` Fired when the value is changed.

**Slots**

- `Default` For the `<datalist>` element.

**Attributes**

- `"label"` The label of the slider.
- `"aria-label"` Forwarded to the `<input>` element.
- `"list"` The id of the `<datalist>` element.
- `"min"` The minimum value. Defaults to `0`.
- `"max"` The maximum value. Defaults to `100`.
- `"value"` The current value. Defaults to `50`.
- `"step"` Step per value update. Defaults to `1`.
- `"disabled"` Disabled. Defaults to `false`.

**CSS Properties**

- `--easing`
- `--active-easing` The easing function of the slider animation when it's active.
- `--animation-duration` The duration of the slider animation when it's not active.
- `--active-animation-duration` The duration of the slider animation when it is active.
- `--thickness` The thickness of the slider.
- `--thumb-size` The size of the slider thumb.
- `--thumb-color` The background color of the slider thumb.
- `--filled-color` The background color of filled part of the slider track.
- `--empty-color` The color of the empty part of the slider track.
- `--scale-by` The scale of the slider when it is active.
- `--is-rtl` Whether to use the RTL direction. Use `-1` for `false` and `1` for `true`. The component will detect the direction automatically.

**CSS Parts**

- `::part(container)` The slider container element
- `::part(track)` The slider track element
- `::part(fill)` The slider fill element
- `::part(thumb)` The slider thumb element
- `::part(input)` The underlying range input element
- `::part(bubble)` The bubble element

**CSS States**

- `:state(active)`
