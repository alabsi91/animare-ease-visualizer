# select-option

The select option component is made to be used with `menu-component` but also it can be used stand alone.

- The host of `<select-option />` can't be styled directly.

## Usage

```html
<menu-component values="0" match-trigger-width="true" type="select">
  <select-option value="0">Option 1</select-option>
  <select-option value="1">Option 2</select-option>
</menu-component>
```

## Methods

### `toggleSelected()`

Toggle the option selected state.

### `focus()`

Focus the option element.

**Type:** `focus(options?: FocusOptions)`

### `click()`

Fire the option click event manually.

## Properties

### `type`

The type for accessibility `"option" | "radio" | "checkbox"`.

**Accessors:** `Get`, `Set`  
**Type:** `"option" | "radio" | "checkbox"`  
**Default:** `"option"`

### `value`

The value of the option.

**Accessors:** `Get`, `Set`  
**Type:** `string`

### `selected`

Whether the option is selected or not.

**Accessors:** `Get`, `Set`  
**Type:** `boolean`  
**Default:** `false`

### `disabled`

Whether the option is disabled or not.

**Accessors:** `Get`, `Set`  
**Type:** `boolean`  
**Default:** `false`

### `label`

The label of the option.

**Accessors:** `Get`, `Set`  
**Type:** `string | null`  
**Default:** `null`

### `onclick`

Set the click event handler.

**Accessors:** `Set`  
**Type:** `(e: MouseEvent) => void`

### `onkeydown`

Set the keydown event handler.

**Accessors:** `Set`  
**Type:** `(e: KeyboardEvent) => void`

## Events

### `valueChange`

Fired when `value` or `selected` is changed.

## Attributes

### `"value"`

The value of the option.

### `"label"`

The label of the option.

### `"selected"`

Whether the option is selected or not.

**Values:** `"true"`, `"false"`  
**Default:** `false`

### `"disabled"`

Whether the option is disabled or not.

**Values:** `"true"`, `"false"`  
**Default:** `false`

### `"type"`

The type for accessibility `"option" | "radio" | "checkbox"`.

**Values:** `"option"`, `"radio"`, `"checkbox"`  
**Default:** `"option"`

## Slots

- `Default` the option contents.

## CSS Properties

- `--ui-clr-surface-1` The background color of the option element.
- `--ui-clr-accent` The background color of the option element when it is active.
- `--ui-clr-surface-2` The background color of the option element when it is hovered.

## CSS Parts

- `::part(option)` The option element.

## CSS States

- `:state(selected)` The option is selected.
- `:state(checked)` The option is checked.
- `:state(disabled)` The option is disabled.
