# menu-component

The menu web component is a versatile dropdown like that can be use in different ways.

- **Form associated**
- Depends on `<anchor-component />`.
- Optionally depends on `<menu-trigger />`.
- The host of `<menu-component />` can't be styled directly.
- To offset the menu, use `margin` on the `::part(container)` element.

## Usage

```html
<menu-component values="0" match-trigger-width="true" type="select">
  <menu-trigger slot="trigger"></menu-trigger>
  <select-option value="0">Option 1</select-option>
  <select-option value="1">Option 2</select-option>
</menu-component>
```

## Methods

### `refresh()`

Force a refresh of the menu after adding/removing `select-option` elements.

### `open()`

Open and expand the menu, optionally at a specific position.

**Type:** `open(pos?: [number, number], animateUpwards?: boolean)`

### `close()`

Close and collapse the menu

### `toggle()`

Toggle the menu between open and closed

**Type:** `toggle(pos?: [number, number], animateUpwards?: boolean)`

## Properties

### `required`

When used with forms.

**Accessors:** `Get`, `Set`  
**Type:** `boolean`  
**Default:** `false`

### `escapeClose`

Dismiss the menu when pressing the escape key.

**Accessors:** `Get`, `Set`  
**Type:** `boolean`  
**Default:** `true`

### `closeOnSelect`

Close the menu when an option is selected.

**Accessors:** `Get`, `Set`  
**Type:** `boolean`  
**Default:** `true`

### `matchTriggerWidth`

Menu always matches the trigger width.

**Accessors:** `Get`, `Set`  
**Type:** `boolean`  
**Default:** `false`

### `scrollToSelected`

Scroll to the selected option.

**Accessors:** `Get`, `Set`  
**Type:** `boolean`  
**Default:** `true`

### `type`

An easy way to setup the accessibility `"select" | "menu" | "dialog"`.

**Accessors:** `Get`, `Set`  
**Type:** `"menu" | "select" | "dialog"`  
**Default:** `"menu"`

### `multiselect`

Enable multiselect.

**Accessors:** `Get`, `Set`  
**Type:** `boolean`  
**Default:** `false`

### `value`

The selected value.

**Accessors:** `Get`, `Set`  
**Type:** `string`

### `values`

The selected values. when `multiselect` is `true`.

**Accessors:** `Get`, `Set`  
**Type:** `ReadonlySet<string>`

### `isOpen`

Whether the menu is open

**Accessors:** `Get`  
**Type:** `boolean`

### `trigger`

Get the trigger button element

**Accessors:** `Get`  
**Type:** `HTMLButtonElement | undefined`

## Events

### `valueChange`

Emitted when the value changes.

### `menuOpen`

Emitted when the menu is opened.

### `menuClose`

Emitted when the menu is closed.

## Attributes

### `"values"`

The selected values separated by `;`. when `multiselect` is `true`

### `"required"`

When used with forms.

**Values:** `"true"`, `"false"`  
**Default:** `false`

### `"escape-close"`

Dismiss the menu when pressing the escape key.

**Values:** `"true"`, `"false"`  
**Default:** `true`

### `"popover-role"`

### `"popover-label"`

### `"close-on-select"`

Close the menu when an option is selected.

**Values:** `"true"`, `"false"`  
**Default:** `true`

### `"match-trigger-width"`

Menu always matches the trigger width.

**Values:** `"true"`, `"false"`  
**Default:** `false`

### `"scroll-to-selected"`

Scroll to the selected option.

**Values:** `"true"`, `"false"`  
**Default:** `true`

### `"multiselect"`

Enable multiselect.

**Values:** `"true"`, `"false"`  
**Default:** `false`

### `"value"`

The selected value.

### `"type"`

An easy way to setup the accessibility `"select" | "menu" | "dialog"`.

**Values:** `"menu"`, `"select"`, `"dialog"`  
**Default:** `"menu"`

## Slots

- `trigger`
- `Default` The content of the menu.

## CSS Properties

- `--ui-clr-surface-1` The background color of the menu.
- `--ui-clr-border` The border color of the menu.
- `--ui-sz-border-thin` The border width of the menu.
- `--ui-rad-border-md` The border radius of the menu.
- `--ui-shadow` The shadow of the menu.
- `--ui-ease-anim-forward` The easing function of the open animation.
- `--ui-ease-anim-backward` The easing function of the close animation.
- `--ui-dur-anim-forward` The duration of the open animation.
- `--ui-dur-anim-backward` The duration of the close animation.

## CSS Parts

- `::part(container)` The menu popover element.
- `::part(trigger)` The menu-trigger custom element slot.

## CSS States

- `:state(open)`
