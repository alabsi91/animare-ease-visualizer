# dialog-component

A dialog web component.

- The host of `<dialog-component />` can't be styled directly.
- Use the `"dialog-toggle"` attribute and give it the id of the dialog on a button element to automatically attach an event
  listener to toggle the dialog.
- Use the `"dialog-open"` attribute and give it the id of the dialog on a button element to automatically attach an event
  listener to open the dialog.
- Use the `"dialog-close"` attribute and give it the id of the dialog on a button element to automatically attach an event
  listener to close the dialog.

**Usage**

```html
<button class="button" dialog-toggle="dialog">Open Dialog</button>

<dialog-component id="dialog" aria-label="Example Dialog">
  <p class="dialog-title">Dialog Title</p>
  <p class="dialog-content">Dialog Content</p>
</dialog-component>
```

**Methods**

- `open()` Open the dialog
- `close()` Close the dialog
- `toggle()` Toggle the dialog between open and closed

**Props**

- `backdropClose` (Get/Set) Dismiss the dialog when clicking outside the dialog. (default: `false`)
- `escapeClose` (Get/Set) Dismiss the dialog when pressing the escape key. (default: `true`)
- `closeButton` (Get/Set) Show a close button. (default: `true`)
- `isOpen` (Get) True when the dialog is open.
- `dialog` (Get) The underlying dialog element.

**Events**

- `opened` Event fired when the dialog is opened.
- `dismissed` Event fired when the dialog is closed.
- `stateChanged` Event fired when the dialog is opened or closed.

**Slots**

- `close-icon` The icon to use for the close button.
- `Default` The content of the dialog.

**Attributes**

- `"backdrop-close"` Dismiss the dialog when clicking outside the dialog. (default: `false`)
- `"escape-close"` Dismiss the dialog when pressing the escape key. (default: `true`)
- `"close-button"` Show a close button. (default: `true`)

**CSS Properties**

- `--ui-clr-surface-1` The color of the dialog background.
- `--ui-clr-backdrop` The color of the dialog backdrop.
- `--ui-shadow` The shadow of the dialog.
- `--ui-rad-border-lg` The border radius of the dialog.
- `--ui-sz-icon-md` The size of the close button svg icon.
- `--ui-clr-text` The color of the close button svg icon.
- `--ui-dur-anim-forward` The duration for the reveal animation.
- `--ui-dur-anim-backward` The duration for the dismiss animation.
- `--ui-ease-anim-forward` The easing function for the reveal animation.
- `--ui-ease-anim-backward` The easing function for the dismiss animation.

**CSS Parts**

- `::part(dialog)` The dialog element.
- `::part(content)` The dialog content container element.
- `::part(close-button)` The close button element.
