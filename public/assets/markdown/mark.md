`<Mark>` is a simple component that instantiates different SVG elements depending on the `markType` but also other attributes sent. So, for example, a markType of `rect` will usually result in an SVG rectangle but if you set `renderMode="sketchy"` it will return two SVG paths. All display elements are wrapped in a `<g>` and Mark does have a limited drag-and-drop context. This will probably eventually be its own library in the future. You would pass a Mark any of the native SVG properties you would expect of the markType you intend to render, and Mark will adjust those if the final product is not an element that supports it (such as "r" when the actual rendered element is a path). By default Marks will try to make an animated transition from one state to another, using `flubber.js` if they are SVG paths in their initial and end state.

```js
import { Mark } from "semiotic-mark";

<Mark
  markType="circle"
  renderMode="painty"
  r={5}
  cx={150}
  cy={150}
  style={{ fill: "red" }}
/>;
```

# &lt;API Reference>

## General

### markType: { _string_ }

A required property that sets the SVG equivalent element that this mark will represent, which accepts all SVG standard elements except `ellipse` and `polygon` as well as pseudo markTypes like `horizontalBar` and `verticalBar` which are easier to place that top-left rects that are drawn down.

```html
<mark markType="rect" ... />
```

### forceUpdate: { _boolean_ }

If set to `true`, then _forceUpdate_ will cause an element to change to any new state without a transition. This is useful in cases where there is no decent way to transition or to skip animated transitions for performance purposes.

```html
<mark forceUpdate="{true}" ... />
```

### renderMode: { _string_ }

Marks currently ship with two kinds of renderMode, `sketchy` and `painty`. If set to `sketchy` you'll get a jittered outline and a fill made of individual lines, which doesn't work great for very complex shapes. If set to `painty` you'll get a gooey, painty sort of fill that uses SVG filters. Marks with either of these modes will not experience automatic transitions.

```html
<mark renderMode="sketchy" ... />
```

## Interactivity

Only has effect if the mark is instantiated inside a `<MarkContext />` which decorates Marks with a rudimentary ui state that is automatically updated and checked as you drag and drop Marks.

### draggable: { _boolean_ }

If set to true, you can click on this mark and move it around _visually_. It will stay in its new visual position unless `resetAfter` is set to true.

```html
<mark draggable="{true}" ... />
```

### dropFunction: { _boolean_ }

Setting _dropFunction_ enables a simple drag-and-drop context that tracks the Mark you're dragging and the cursor position. If the cursor is over another Mark, it will fire the _dropFunction_ with `{source, target}` passed.

```html
<Mark dropFunction={d => {mergeThesePieces(d)}}} ... />
```

### resetAfter: { _boolean_ }

If _resetAfter_ is set to true, then the Mark will snap back to its original position after dragging. This is useful for when you want to use drag-and-drop to combine elements, rather than visual repositioning.

```html
<mark resetAfter="{true}" ... />
```

### freezeX: { _boolean_ }

If _freezeX_ is set to true, then the Mark will only drag along the y-axis.

```html
<mark freezeX="{true}" ... />
```

### freezeY: { _boolean_ }

If _freezeY_ is set to true, then the Mark will only drag along the x-axis.

```html
<mark freezeY="{true}" ... />
```

### context: { _object_ }

An object passed to Marks, typically via `<MarkContext />` that keeps track of ui context for interactivity.

### updateContext: { _function_ }

A function passed to Marks, typically via `<MarkContext />` that changes the values in the sent context object.
