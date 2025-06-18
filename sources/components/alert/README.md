# alert-component

Show a stackable alert on the top layer of the page.

- The host of `<alert-component />` can't be styled directly.

**Usage**

```ts
const alertComponent = document.querySelector("alert-component");
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

- `duration` (Get/Set) The time before dismissing the alert in milliseconds. use `-1` to disable auto dismiss. (default: `5000`)
- `stackStyle` (Get/Set) The style of stacking alerts: `"list"` or `"3d"`. (default: `"3d"`)

**Slots**

- `info-icon` Info icon and title.
- `warning-icon` Warning icon and title.
- `error-icon` Error icon and title.
- `success-icon` Success icon and title.

**Attributes**

- `"duration"` The time before dismissing the alert in milliseconds. use `-1` to disable auto dismiss. (default: `5000`)
- `"stack-style"` The style of stacking alerts: `"list"` or `"3d"`. (default: `"3d"`)

**CSS Properties**

- `--ui-clr-surface-1` The background color of the alert items.
- `--ui-clr-success` The success color.
- `--ui-clr-error` The error color.
- `--ui-clr-info` The info color.
- `--ui-clr-warning` The warning color.
- `--ui-clr-text-muted` The text color of the alert items.
- `--ui-clr-text` The text color of the alert title.
- `--ui-clr-border` The border color of the alert items.
- `--ui-rad-border-md` The border radius of the alert items.
- `--ui-sz-border-thin` The border size of the alert items.
- `--ui-shadow` The shadow of the alert items.
- `--ui-dur-anim-forward` The duration for the reveal animation.
- `--ui-dur-anim-backward` The duration for the dismiss animation.
- `--ui-ease-anim-forward` The easing function for the reveal animation.
- `--ui-ease-anim-backward` The easing function for the dismiss animation.
- `--ui-gap-md` The gap between the alert items.
- `--ui-sz-icon-lg` The size of the alert type icon.
- `--ui-sz-icon-md` The size of the close button icon.

**CSS Parts**

- `::part(popover)` The alert popover element to display the alerts at the top of the page.
- `::part(wrapper)` Alerts items container element
- `::part(item-container)` The alert item container element.
- `::part(icon-container)` The icon container element.
- `::part(divider)` The divider element.
- `::part(item-message)` The message element.
- `::part(close-button)` The close button element.
