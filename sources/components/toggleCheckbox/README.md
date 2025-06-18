# toggle-checkbox

Checkboxes provide users with a graphical representation of a binary choice (yes or no, on or off). They are most commonly
presented in a series, giving the user multiple choices to make.

- **Form associated**

**Usage**

```html
<toggle-checkbox label="Label"></toggle-checkbox>
```

**Methods**

- `toggle()` Toggle the checked state.

**Props**

- `checked` (Get/Set) Whether the checkbox is checked. (default: `false`)
- `disabled` (Get/Set) Whether the checkbox is disabled. (default: `false`)
- `label` (Get/Set) Add a label to the toggle switch.

**Events**

- `stateChange` Emitted when the checked value has changed.

**Attributes**

- `"checked"` Whether the checkbox is checked. (default: `false`)
- `"disabled"` Whether the checkbox is disabled. (default: `false`)
- `"label"` Add a label to the toggle switch.
- `"aria-label"` Forwarded to the `<button>` element.

**CSS Properties**

- `--ui-ease-anim-forward` The easing function for the toggle animation.
- `--ui-dur-anim-forward` The duration of the toggle animation.
- `--ui-clr-accent` The color of the toggle checkbox when it's checked.
- `--ui-clr-neutral` The color of the toggle checkbox when it's not checked.
- `--ui-clr-border` The color of the toggle checkbox border.
- `--ui-sz-border-thick` The size of the toggle checkbox border.
- `--ui-clr-text-on-accent` The color of the checked icon.
- `--ui-clr-sz-checkbox` The size of the toggle checkbox.

**CSS Parts**

- `::part(checkbox)` The toggle checkbox button element.
- `::part(background)` The toggle checkbox background span element.
- `::part(checked-icon)` The toggle checkbox checked icon element.
- `::part(label)` The toggle checkbox label element.

**CSS States**

- `:state(disabled)`
- `:state(checked)`
