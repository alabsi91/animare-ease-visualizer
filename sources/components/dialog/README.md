# dialog-component

A dialog web component.

- The host of `<dialog-component />` can't be styled directly.
- Use the `"dialog-toggle"` attribute and give it the id of the dialog on a button element to automatically attach an event
  listener to toggle the dialog.
- Use the `"dialog-open"` attribute and give it the id of the dialog on a button element to automatically attach an event
  listener to open the dialog.
- Use the `"dialog-close"` attribute and give it the id of the dialog on a button element to automatically attach an event
  listener to close the dialog.

**Methods**

- `open()` Open the dialog
- `close()` Close the dialog
- `toggle()` Toggle the dialog between open and closed

**Props**

- `backdropClose` (Get/Set) Dismiss the dialog when clicking outside the dialog. Defaults to `true`.
- `escapeClose` (Get/Set) Dismiss the dialog when pressing the escape key. Defaults to `true`.
- `closeButton` (Get/Set) Show a close button. Defaults to `true`.
- `isOpen` (Get) True when the dialog is open.
- `dialog` (Get) The underlying dialog element.

**Events**

- `open` Event fired when the dialog is opened.
- `close` Event fired when the dialog is closed.

**Slots**

- `close-icon` The icon to use for the close button.
- `Default` The content of the dialog.

**Attributes**

- `"backdrop-close"` Dismiss the dialog when clicking outside the dialog. Defaults to `true`.
- `"escape-close"` Dismiss the dialog when pressing the escape key. Defaults to `true`.
- `"close-button"` Show a close button. Defaults to `true`.

**CSS Properties**

- `--sz-close-icon` The size of the close button svg icon.
- `--clr-close-icon` The color of the close button svg icon.
- `--dur-anim` The duration of the open/close animation.
- `--clr-backdrop` The color of the dialog backdrop.
- `--clr-background` The color of the dialog background.

**CSS Parts**

- `::part(dialog)` The dialog element.
- `::part(content)` The dialog content container element.
- `::part(close-button)` The close button element.
