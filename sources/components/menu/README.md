# menu-component

The menu web component is a versatile dropdown like that can be use in different ways.

- **Form associated**
- Depends on `<anchor-component />`.
- Optionally depends on `<menu-trigger />`.
- The host of `<menu-component />` can't be styled directly.
- To offset the menu, use `margin` on the `::part(container)` element.

**Usage**

```html
<menu-component values="0" match-trigger-width="true" type="select">
  <menu-trigger slot="trigger"></menu-trigger>
  <select-option value="0">Option 1</select-option>
  <select-option value="1">Option 2</select-option>
</menu-component>
```

**Methods**

- `refresh()` Force a refresh of the menu after adding/removing `select-option` elements.
- `open(pos?: [number, number], animateUpwards?: boolean)` Open and expand the menu, optionally at a specific position.
- `close()` Close and collapse the menu
- `toggle(pos?: [number, number], animateUpwards?: boolean)` Toggle the menu between open and closed

**Props**

- `required` (Get/Set) When used with forms. (default: `false`)
- `escapeClose` (Get/Set) Dismiss the menu when pressing the escape key. (default: `true`)
- `closeOnSelect` (Get/Set) Close the menu when an option is selected. (default: `true`)
- `matchTriggerWidth` (Get/Set) Menu always matches the trigger width. (default: `false`)
- `multiselect` (Get/Set) Enable multiselect. (default: `false`)
- `value` (Get/Set) The selected value.
- `values` (Get/Set) The selected values. when `multiselect` is `true`.
- `isOpen` (Get) Whether the menu is open
- `trigger` (Get) Get the trigger button element

**Events**

- `valueChange` Emitted when the value changes.
- `menuOpen` Emitted when the menu is opened.
- `menuClose` Emitted when the menu is closed.

**Slots**

- `trigger`
- `Default` The content of the menu.

**Attributes**

- `"required"` When used with forms. (default: `false`)
- `"escape-close"` Dismiss the menu when pressing the escape key. (default: `true`)
- `"popover-role"`
- `"popover-label"`
- `"close-on-select"` Close the menu when an option is selected. (default: `true`)
- `"match-trigger-width"` Menu always matches the trigger width. (default: `false`)
- `"multiselect"` Enable multiselect. (default: `false`)
- `"value"` The selected value.
- `"values"` The selected values separated by `;`. when `multiselect` is `true`
- `"type"` An easy way to setup the accessibility `"select" | "menu" | "dialog"`. (default: `"menu"`)

**CSS Properties**

- `--ui-clr-surface-1` The background color of the menu.
- `--ui-clr-border` The border color of the menu.
- `--ui-sz-border-thin` The border width of the menu.
- `--ui-rad-border-md` The border radius of the menu.
- `--ui-shadow` The shadow of the menu.
- `--ui-ease-anim-forward` The easing function of the open animation.
- `--ui-ease-anim-backward` The easing function of the close animation.
- `--ui-dur-anim-forward` The duration of the open animation.
- `--ui-dur-anim-backward` The duration of the close animation.

**CSS Parts**

- `::part(container)` The menu popover element.
- `::part(trigger)` The menu-trigger custom element slot.

**CSS States**

- `:state(open)`
