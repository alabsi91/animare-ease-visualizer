# toggle-checkbox

Checkboxes provide users with a graphical representation of a binary choice (yes or no, on or off). They are most commonly
presented in a series, giving the user multiple choices to make.

**Usage**

```html
<toggle-checkbox label="Label"></toggle-checkbox>
```

**Methods**

- `toggle()` Toggle the checked state.

**Props**

- `checked` (Get/Set) Checked. Defaults to `false`.
- `disabled` (Get/Set) Disabled. Defaults to `false`.
- `label` (Get/Set) Add a label to the toggle switch.
- `type` (Get)
- `value` (Get/Set)

**Events**

- `change` Emitted when the checked value has changed.

**Attributes**

- `"aria-label"` Forwarded to the `<button>` element.
- `"checked"` Checked. Defaults to `false`.
- `"disabled"` Disabled. Defaults to `false`.
- `"label"` Add a label to the toggle switch.

**CSS Properties**

- `--ease-anim` The easing function of the toggle animation.
- `--dur-anim` The duration of the toggle animation.
- `--clr-active` The color of the toggle checkbox when it's checked.
- `--clr-inactive` The color of the toggle checkbox when it's not checked.
- `--clr-checked-icon` The color of the checked icon.
- `--sz-checkbox` The size of the toggle checkbox.

**CSS Parts**

- `::part(checkbox)` The toggle checkbox button element.
- `::part(background)` The toggle checkbox background span element.
- `::part(checked-icon)` The toggle checkbox checked icon element.
- `::part(label)` The toggle checkbox label element.

**CSS States**

- `:state(disabled)`
- `:state(checked)`
