# select-option

The select option component is made to be used with `menu-component` but also it can be used stand alone.

- The host of `<select-option />` can't be styled directly.

**Usage**

```html
<menu-component values="0" match-trigger-width="true" type="select">
  <select-option value="0">Option 1</select-option>
  <select-option value="1">Option 2</select-option>
</menu-component>
```

**Methods**

- `focus(options?: FocusOptions)` Focus the option element.
- `toggleSelected()` Toggle the option selected state.
- `click()` Fire the option click event manually.

**Props**

- `type` (Get/Set) The type for accessibility. Defaults to `option`.
- `value` (Get/Set) The value of the option.
- `valueAsType` (Get/Set) The parsed value from the `value` attribute string.
- `valueType` (Get/Set) The type of the value. Defaults to `string`.
- `selected` (Get/Set) Selected. Defaults to `false`.
- `disabled` (Get/Set) Disabled. Defaults to `false`.
- `label` (Get/Set) The label of the option.
- `onclick` (Set) Set the click event handler.
- `onkeydown` (Set) Set the keydown event handler.
- `data` (Get/Set) The data of the option.

**Events**

- `change` Fired when `value` or `selected` is changed.

**Slots**

- `Default` the option contents.

**Attributes**

- `"value"` The value of the option.
- `"value-type"` The type of the value. Defaults to `string`.
- `"label"` The label of the option.
- `"selected"` Selected. Defaults to `false`.
- `"disabled"` Disabled. Defaults to `false`.
- `"type"` The type for accessibility. Defaults to `option`.

**CSS Properties**

- `--clr-background` The background color of the option element.
- `--clr-active` The background color of the option element when it is active.
- `--clr-hover` The background color of the option element when it is hovered.

**CSS Parts**

- `::part(option)` The option element.

**CSS States**

- `:state(disabled)`
- `:state(selected)`
- `:state(checked)`
