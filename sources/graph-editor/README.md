# graph-editor

**Methods**

- `setFromPathStr()` Returns `true` on success and `false` otherwise
- `setFromPoints()`
- `zoom()`
- `zoomIn()`
- `zoomOut()`

**Props**

- `PATH_SVG_VIEW_BOX_SIZE` (Get/Set) - The svg viewBox size (width/height) that contain the graph path, anchor points, and control points
- You should change the value in the css side too. (default: `100`)
- `viewport` (Get/Set)
- `graphPanel` (Get/Set)
- `graph` (Get/Set)
- `points` (Get/Set)
- `settings` (Get/Set)
- `historyManager` (Get/Set)
- `keyboardShortcutManager` (Get/Set)
- `abortController` (Get/Set)
- `events` (Get/Set)
- `commandsRef` (Get/Set)

**Events**

- `complete` Fired when the use finish drawing

**CSS Properties**

- `--dur-clr-transition`
- `--clr-panel-background`
- `--clr-grid-line`
- `--clr-graph-txt`
- `--clr-anchor-circle` anchors
- `--clr-active-anchor-circle`
- `--clr-focus-anchor-circle-stroke`
- `--size-anchor-circle`
- `--size-anchor-stroke`
- `--clr-ctrl-circle` ctrl
- `--clr-active-ctrl-circle`
- `--clr-ctrl-line`
- `--clr-active-ctrl-line`
- `--size-ctrl-circle`
- `--clr-path` path
- `--clr-active-path`
- `--clr-filled-path`
- `--size-path-thickness`
- `--size-filled-path-thickness`
