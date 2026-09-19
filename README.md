# Advanced Easing Editor

Draw an easing curve on a graph, preview it on a live shape, and export it to the format your platform
wants. Live at [ease.a-labs.space](https://ease.a-labs.space/).

## How it works

### The curve is an SVG path

The editor stores nothing but a path: one `M` command followed by one or more `C` commands, inside a
square box from 0 to 1. SVG measures y downward while an easing curve measures value upward, so the value
at any point is `1 - y`. That is the whole model.

The graph is a web component, [`<graph-editor>`](sources/graph-editor/README.md), which owns the anchors,
the control handles, zooming, snapping and undo.

### From a path to an easing function

Most exports need to ask the curve for a value at a given time, so the path has to become a function.
`ease.custom(pathString)` from [animare](https://github.com/alabsi91/animare) does that.

It parses the path into cubic segments and flips every y. What you get back is a function. Takes a time
between 0 and 1 and returns the value the curve has at that time.

Getting that value is not direct. A cubic is driven by its own parameter from 0 to 1, and that parameter
is not time. Turn it halfway and you do not land halfway across the curve.

So it binary searches. Pick the segment the time falls in, then narrow the parameter until the time it
produces matches the time you asked for. The value sitting at that parameter is the answer.

### From a function to an export

Three strategies, depending on what the target can represent.

**The path goes over as-is.** GSAP CustomEase and Android's PathInterpolator both take a path string, so
they get the curve with its y flipped back upright and nothing else done to it.

**Every segment becomes its own cubic.** Flutter, Jetpack Compose and iOS describe motion as a chain of
cubics, so each `C` command is rewritten with its control points renormalized into that segment's own
box, and carries the time and value range it spans.

**The curve gets sampled.** CSS `linear()`, CSS keyframes and the JS function have no concept of a curve
at all, only points. The JS function is the blunt version. Ask the curve for a fixed number of values,
spread evenly, and write them into a lookup table.

`linear()` tries to spend as few stops as it can. It samples the curve, then greedily fits the longest
straight run that stays within a tolerance, placing a stop only where the line has to bend. The tolerance
itself is binary searched for the tightest one that still fits your stop budget.

One shortcut runs through all of it: a path with a single `C` command is exactly a `cubic-bezier()`, so it
skips sampling and emits the four control points.

Exports expect the curve to run from the bottom left corner to the top right one. When it does not, the
dialog says so rather than quietly emitting something the platform will clamp.

## Built with

| Package                                                   | What it does                                                         |
| --------------------------------------------------------- | -------------------------------------------------------------------- |
| [animare](https://github.com/alabsi91/animare)            | Animation engine. `ease.custom` turns a path into an easing function |
| [@staticview/ui](https://staticview.a-labs.space/)        | Web components for the dialogs, menus, sliders and code previews     |
| [@staticbolt/core](https://codeberg.org/Plant/staticbolt) | Static site builder. Parts, bundling, asset hashing                  |

## Development

```sh
npm install
npm run dev     # dev server
npm run build   # build to dist
npm run serve   # serve the build
```

## License

MIT
