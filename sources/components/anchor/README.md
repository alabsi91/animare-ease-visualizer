# anchor-component

Anchors an element to another element.

- Use margins alongside CSS states on the anchored element to offset it from the anchor element.

**Usage**

```html
<div class="anchored-element"></div>

<anchor-component anchor-element=".anchor-element" preferred-position-order="top start start, right" autoupdate>
  <div class="anchored-element"></div>
</anchor-component>

<style>
  anchor-component:state(top) .anchored-element {
    margin-block-end: 2em;
    background-color: #ff5733;
  }

  anchor-component:state(bottom) .anchored-element {
    margin-block-start: 2em;
    background-color: #33ff57;
  }

  anchor-component:state(left) .anchored-element {
    margin-inline-end: 2em;
    background-color: #3357ff;
  }

  anchor-component:state(right) .anchored-element {
    margin-inline-start: 2em;
    background-color: #ff33a8;
  }

  anchor-component:state(misaligned) .anchored-element {
    display: none;
  }
</style>
```

**Methods**

- `getAnchoredRect()` Calculates the bounding rect of the anchored element using the preferred position order.
- `updatePosition()` Updates the anchored element position.
- `startAutoUpdate()` Starts the automatic update of the anchored element position.
- `stopAutoUpdate()` Stops the automatic update of the anchored element position.
- `getAnchorPosition()` Gets the current anchor position: "top", "bottom", "left", "right", "misaligned" or undefined.
- `onUpdate()` Invoked when the component is updated

**Props**

- `autoupdate` (Get/Set) Uses `requestAnimationFrame` to always update the position. (default: `false`)
- `anchorElement` (Get/Set) The anchor element (reference element), can be a string selector or an element.
- `anchoredElement` (Get/Set) The anchored element (positioned element), can be a string selector or an element. Or the direct children of
  `anchor-component`.
- `anchorToRect` (Set)
- `anchorElementRect` (Get)
- `preferredPositionOrder` (Get/Set) The preferred position area sequence. In which order to try to position the anchored element.

**Attributes**

- `"anchor-element"` The anchor element (reference element), can be a string selector or an element.
- `"anchored-element"` The anchored element (positioned element), can be a string selector or an element. Or the direct children of
  `anchor-component`.
- `"preferred-position-order"` The preferred position area sequence. In which order to try to position the anchored element.
- `"autoupdate"` Uses `requestAnimationFrame` to always update the position. (default: `false`)

**CSS States**

- `:state(top)` - When the anchored element is above the anchor element.
- `:state(bottom)` - When the anchored element is below the anchor element.
- `:state(left)` - When the anchored element is to the left of the anchor element.
- `:state(right)` - When the anchored element is to the right of the anchor element.
- `:state(misaligned)` - If the anchored element anchors incorrectly due to lack of space or invalid measurements.
