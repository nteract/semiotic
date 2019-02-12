All frames have annotation capabilities that let you easily deploy [react-annotations](https://react-annotation.susielu.com/). There is also built-in support for automatic label adjustment using [labella.js](http://twitter.github.io/labella.js/).

All frames takes a prop `annotations` which is an array of annotation objects:

```jsx
<XYFrame annotations={[{ type: "react-annotation", label: "a note" }]} />
```

This array of annotations is sent to **both** an:

- `svgAnnotationRules` function which renders in an SVG layer
- `htmlAnnotationRules` function which renders in an HTML layer

This allows for the creation of graphical elements in both SVG & HTML for the same annotation type.

There are built-in annotation types handled in the default `htmlAnnotationRules` and `svgAnnotationRules` functions on all frames that let you simply pass an array of settings to the `annotations` prop without having to write custom rendering functions.

Otherwise, you can pass your own `htmlAnnotationRules` and `svgAnnotationRules` to create completely [custom rendering logic](#custom-annotation-rules) based on the annotation type.

## Built-in Annotation Types

Each of the following options is a type of annotation that can be passed to the `annotations` prop:

```jsx
<XYFrame annotations={[{ type: "react-annotation", label: "a note" }, {type: "highlight"}}]]} />

```

### All Frames

- `"react-annotation"` or _**function**_ ([react-annotation](https://react-annotation.susielu.com/) annotation type): Creates an AnnotationLabel that can be passed any additional props that are exposed in react-annotation. Automatically transforms any properties on the annotation that match with your accessor functions.

```jsx
import { AnnotationCalloutCircle } from "react-annotation";
<XYFrame
  annotations={[
    { type: "react-annotation", label: "a note", y: 100 },
    {
      //Example of a react-annotation function
      //type you can send
      type: AnnotationCalloutCircle,
      note: { label: "callout", title: "important" },

      //Will automatically map this to the
      //scaled Y value
      score: 10,
      subject: { radius: 30 }
    }
  ]}
  xAccessor={"week"}
  yAccessor={"score"}
  points={[{ week: 10, score: 20 }]}
/>;
```

- `enclose`, `enclose-rect`, `enclose-hull`: Takes an object with a `“coordinates”` property containing an array of data objects and encloses them with a circle, rectangle, or convex hull labeled with the passed label. For network frame this is not `“coordinates”` but rather an array named `“ids”` that has id values corresponding to the nodeIDAccessor setting. The annotation will also honor a `“padding”` prop that determines the space in pixels to pad the enclosure. Enclose-hull accepts a strokeWidth prop that determines the thickness of the hull stroking.

* `highlight`: redraws the mark but with the passed style function or object, this with the desaturation-layer below allow for easy highlight and cross-highlight behavior. See the [highlighting](/guides/highlighting) page for details.
* `desaturation-layer`: Creates a rect the size of the viz layer that has fill: black and fillOpacity: 0.5, you can pass a style prop to overwrite the default styling

- `frame-hover`: Creates a tooltip, which is a div centered on the datapoint populated with the values derived for that data point, you can use a separate prop `tooltipContent` to customize the value, see the [tooltips](/guides/tooltips) page for details.

TODO: add in eventListener functionality

### XYFrame

- `xy`: creates a circle, use `style` and `label` to customize
- `x`: creates a [react-annotation](https://react-annotation.susielu.com/) AnnotationXYThreshold along the x axis, you must pass a prop that matches the `xAccessor` used for the `XYFrame`, customize with react-annotation settings
- `y`: creates a [react-annotation](https://react-annotation.susielu.com/) AnnotationXYThreshold along the y axis, you must pass a prop that matches the `yAccessor` used for the `XYFrame`, customize with react-annotation settings
- `bounds`: Has a `bounds` property of format `[{left-x, top-y},{right-x, bottom-y}]` and will draw a rectangle around that bounding box. If any values are missing (x or y) in either of the bounds then it defaults to the full size of the viz along that measure.
- `line`: Has a `coordinates` array with two objects in the data format of the frame and will draw a line from the first point to the second.
- `area`: Has a `coordinates` array with objects in the data format of the frame and will draw an area with the coordinates in that array in the order passed, and add text with the a `label` prop positioned at the center of the polygon.
- `horizontal-points`: Takes a datapoint and renders an SVG circle for every datapoint in the dataset that falls along the same horizontal axis. The annotation can also have a `“threshold”` passed (defaults to 1) to determine the pixel tolerance for identifying other datapoints, an `“r”` prop that is a function that takes the point and returns a radius (default is () => 4) and a `“styleFn”` that passes the discovered datapoint and returns a JSX style object.
- `vertical-points`: Takes a datapoint and renders an SVG circle for every datapoint in the dataset that falls along the same vertical axis. The annotation can also have a `“threshold”` passed (defaults to 1) to determine the pixel tolerance for identifying other datapoints, an `“r”` prop that is a function that takes the point and returns a radius (default is () => 4) and a `“styleFn”` that passes the discovered datapoint and returns a JSX style object.

Example:

```jsx
import { AnnotationCalloutElbow } from 'react-annotation'

const variousAnnotations = [
{ type: 'react-annotation', score: 4, attendance: 300, dx: -30, dy: 0, note: { title: 'Note at 4,300' }, subject: { text: 'A', radius: 12 } },
{ type: AnnotationCalloutElbow, score: 7, id: 'linedata-1', dx: 30, dy: -50, note: { title: 'linedata-1 at 7' }, subject: { text: 'C', radius: 12 } },
{ type: 'xy', score: 2, attendance: 2, label: 'Simply XY Annotation' },
{ type: 'x', score: 2, label: 'Simply X Threshold' },
{ type: 'y', y: 2, label: 'Simply Y Threshold' },
{ type: 'enclose', coordinates: [ {score: 3, attendance: 4}, {score: 5, attendance: 3} ], label: 'An enclosure' }
]

<XYFrame
annotations={variousAnnotations}
xAccessor="score"
yAccessor="attendance"
/>
```

### ORFrame

- `or`: a circle annotation with a `“label”` (like “xy” for XYFrame)
- `r`: a [react-annotation](https://react-annotation.susielu.com/) AnnotationXYThreshold annotation at the r value

- `category`: A [react-annotation](https://react-annotation.susielu.com/) AnnotationBracket with the passed “title” and/or “label” based on the passed “categories” array (you pass an array of strings that correspond to the oAccessor category names and the bracket is drawn to surround them, which means it will encompass other columns if they are spread apart). Honors the following props:

  - `bracketType` = "curly" (draw a straight or curly bracket)
  - `position` = projection === "vertical" ? "top" : "left" (whether to show the bracket on top, left, right or bottom)
  - `depth` = 30 (how deep the bracket goes into the viz)
  - `offset` = 0 (how far back from the viz the bracket is)
  - `padding` = 0 (the amount of pixels added to the edge of the bracket)

- `ordinal-line`: takes an array of “coordinates” and renders a line. Honors the following props:
  - `points`: (bool defaults to false) show points
    interactive: (bool defaults to false) Points have an invisible 15px radius of interactivity as per standard hover annotation settings -`lineStyle`: a JSX style object for the line
  - `pointStyle`: a JSX style object or a function that takes a point and returns a JSX style object
  - `curve`: a d3-shape interpolator
  - `radius`: The radius of displayed points
- `column-hover`: Like `frame-hover` but the entire column/row is passed to the function.

### NetworkFrame

- `node`: Creates a [react-annotation](https://react-annotation.susielu.com/) AnnotationCalloutCircle centered on the node with an id corresponding to the “id” prop in the annotation
- `basic-node-label`: Places the “label” prop at the center of the node (label can be SVG JSX)
- `node`: Has an `id` value that corresponds to the idAccessor value of a node, and will draw a circle around that node with the label determined by the `label` value of the annotation object.
- `enclose`: Has an `ids` array with strings corresponding to values returned by the idAccessor value of nodes in this graph and will draw a minimum bounding circle around the nodes found with a label specified in the `label` value of the annotation object.

# Custom Annotation Rules

You can send objects with any `type` value to the `annotations` array but if they don't correspond to any built-in types, they **won't** display.

You can write custom rules to handle new types or override the default behavior for built-in types.

Use `svgAnnotationRules` or `htmlAnnotationRules` depending on the type of JSX elements you want to create. Each of these functions is called on every item in the `annotations` array sent to the Frame. If `hoverAnnotations` is `true` semiotic will append hover annotations such as `frame-hover` or `column-hover` to the array of `annotations` each function is run against.

## Passed values

The custom rules expose the datapoint hovered, scales, and other properties of the frame.

- NetworkFrame: `d, i, networkFrameProps, networkFrameState, nodes, edges`
- XYFrame: `d, i, screenCoordinates, xScale, yScale, xAccessor, yAccessor, xyFrameProps, xyFrameState, areas, points, lines`
- ORFrame: `d, i, oScale, rScale, oAccessor, rAccessor, orFrameProps, orFrameState`

## svgAnnotationRules { _function_ }

This function is run on every item in the annotation array, in addition to any hover annotations added by the Frame, it should return:

- an SVG element in JSX
- `null` if you want it to process all default types in addition to your custom rules
- return `false` if you only want to process your custom rules

```jsx
<XYFrame
  svgAnnotationRules={d => {
    if (d.d.type === "r") {
      return (
        <g
          fontSize="12"
          textAnchor="end"
          fontWeight="bold"
          fill={"pink"}
          transform={`translate(${d.adjustedSize[0] +
            d.orFrameProps.margin.left -
            20}, ${d.screenCoordinates[1]})`}
        >
          <line x2={-d.adjustedSize[0]} stroke={"pink"} />
          <text y={-5}>{d.d.note.title}</text>
        </g>
      );
    }

    return null;
  }}
/>
```

## htmlAnnotationRules { _function_ }

This function is run on every item in the annotation array, in addition to any hover annotations added by the Frame, it should return:

- an HTML element in JSX
- `null` if you want it to process all default types in addition to your custom rules
- return `false` if you only want to process your custom rules

# Further Reading

[Making Annotations First-Class Citizens in Data Visualization](https://medium.com/@Elijah_Meeks/making-annotations-first-class-citizens-in-data-visualization-21db6383d3fe)
