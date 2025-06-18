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

- `toggleSelected()` Toggle the option selected state.
- `focus(options?: FocusOptions)` Focus the option element.
- `click()` Fire the option click event manually.

**Props**

- `value` (Get/Set) The value of the option.
- `selected` (Get/Set) Whether the option is selected or not. (default: `false`)
- `disabled` (Get/Set) Whether the option is disabled or not. (default: `false`)
- `label` (Get/Set) The label of the option.
- `onclick` (Set) Set the click event handler.
- `onkeydown` (Set) Set the keydown event handler.

**Events**

- `valueChange` Fired when `value` or `selected` is changed.

**Slots**

- `Default` the option contents.

**Attributes**

- `"value"` The value of the option.
- `"label"` The label of the option.
- `"selected"` Whether the option is selected or not. (default: `false`)
- `"disabled"` Whether the option is disabled or not. (default: `false`)
- `"type"` The type for accessibility `"option" | "radio" | "checkbox"`. (default: `"option"`)

**CSS Properties**

- `--ui-clr-surface-1` The background color of the option element.
- `--ui-clr-accent` The background color of the option element when it is active.
- `--ui-clr-surface-2` The background color of the option element when it is hovered.

**CSS Parts**

- `::part(option)` The option element.

**CSS States**

- `:state(selected)` The option is selected.
- `:state(checked)` The option is checked.
- `:state(disabled)` The option is disabled.
