# menu-trigger

A trigger for `<menu-component />`.

## Usage

```html
<menu-trigger></menu-trigger>
```

## Methods

### `setTriggerLabel()`

Sets the trigger text content only for a child with the id "trigger-label" . (Managed by the menu component)

### `setRole()`

Sets the menu role. Managed by the menu component.

**Type:** `setRole(role: "dialog" | "select" | "menu", controls: string)`

## Properties

### `trigger`

The trigger button element

**Accessors:** `Get`, `Set`  
**Type:** `HTMLButtonElement`

### `noValueLabel`

The trigger text content when no value is set.

**Accessors:** `Get`, `Set`  
**Type:** `string`  
**Default:** `"..."`

### `disabled`

Disable the menu trigger button.

**Accessors:** `Get`, `Set`  
**Type:** `boolean`

## Attributes

### `"trigger-label"`

### `"disabled"`

Disable the menu trigger button.

**Values:** `"true"`, `"false"`

### `"no-value-label"`

The trigger text content when no value is set.

**Default:** `"..."`

## Slots

- `trigger-content` The menu trigger button content.

## CSS Properties

- `--ui-clr-surface-1` The background color of the trigger.
- `--ui-clr-surface-2` The background color of the hovered trigger.
- `--ui-clr-border` The border color of the trigger.
- `--ui-sz-border-thin` The border width of the trigger.
- `--ui-rad-border-md` The border radius of the trigger.
- `--ui-shadow` The shadow of the trigger.

## CSS Parts

- `::part(trigger)` The menu trigger button element.
