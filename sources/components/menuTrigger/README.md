# menu-trigger

A trigger for `<menu-component />`.

**Usage**

```html
<menu-trigger></menu-trigger>
```

**Methods**

- `setTriggerLabel()` Sets the trigger text content only for a child with the id "trigger-label" . (Managed by the menu component)
- `setRole(role: "dialog" | "select" | "menu", controls: string)` Sets the menu role. Managed by the menu component.

**Props**

- `trigger` (Get/Set) The trigger button element
- `disabled` (Get/Set) Disable the menu trigger button.

**Slots**

- `trigger-content` The menu trigger button content.

**Attributes**

- `"trigger-label"`
- `"disabled"` Disable the menu trigger button.

**CSS Properties**

- `--ui-clr-surface-1` The background color of the trigger.
- `--ui-clr-surface-2` The background color of the hovered trigger.
- `--ui-clr-border` The border color of the trigger.
- `--ui-sz-border-thin` The border width of the trigger.
- `--ui-rad-border-md` The border radius of the trigger.
- `--ui-shadow` The shadow of the trigger.

**CSS Parts**

- `::part(trigger)` The menu trigger button element.
