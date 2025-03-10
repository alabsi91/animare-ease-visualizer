# alert-component

Show a stackable alert on the top layer of the page.

- The host of `<alert-component />` can't be styled directly.

**Usage**

```ts
await customElements.whenDefined("alert-component");

const alertComponent = document.querySelector<AlertComponent>("alert-component");
if (!alertComponent) return;

const closeFn = alertComponent.alert({
  type: "info", // "error" | "info" | "success" | "warning"
  message: "Hello world!",
  duration: 5000, // use -1 to disable auto dismissing
  closeBtn: true, // show close button
});
```

```html
<alert-component stack-style="3d"></alert-component>
```

**Methods**

- `alert(options: AlertOptions)` Show An alert.

**Props**

- `duration` (Get/Set) The time before dismissing the alert in milliseconds. use `-1` to disable auto dismiss. Default `5000`.
- `stackStyle` (Get/Set) The style of stacking alerts: `list` or `3d`. Defaults to `3d`.

**Attributes**

- `"duration"` The time before dismissing the alert in milliseconds. use `-1` to disable auto dismiss. Default `5000`.
- `"stack-style"` The style of stacking alerts: `list` or `3d`. Defaults to `3d`.

**CSS Properties**

- `--clr-background` The background color of the alert items
- `--clr-text` The text color of the alert items
- `--dur-anim` The duration of the reveal/hide animation
- `--sp-gap` The gap between the alert items

**CSS Parts**

- `::part(popover)` The alert popover element to display the alerts at the top of the page.
- `::part(alert-container)` Alerts items container element
- `::part(item-container)` The alert item container element.
