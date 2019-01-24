Annotations provide enormous value to charts and they're less of a challenge now that solutions like [react-annotation](http://react-annotation.susielu.com/) are available. All frames have some shared annotation handling capabilities that let you deploy annotations easily and dynamically and even do some rudimentary label adjustment in crowded charts.

# Built-in SVG Annotation Processing

Each frame can take an array of objects with a `type` and other values passed to `annotations`.

Each kind of frame has a few built-in supported annotation types and also each frame will process a generic `react-annotation` type or a function passed as a type, which is assumed to be a particular type of react-annotation (such as `AnnotationCallout` or `AnnotationBadge`).

## All Frames

- `frame-hover`: Creates a tooltip, which is a div centered on the datapoint populated with whatever is defined in tooltipContent or a sparse default.
- `highlight`: redraws the mark but with the passed style function or object
- `desaturation-layer`: Creates a rect the size of the viz layer that has fill: black and fillOpacity: 0.5 or whatever style prop is passed
- `react-annotation` (or any react-annotation annotation type): Creates a new react-annotation type annotation (defaults to AnnotationLabel)
  enclose, enclose-rect, enclose-hull: Takes an object with “coordinates” (an array of data objects) and encloses them with a circle, rectangle or convex hull labeled with the passed label. For network frame this is not “coordinates” but rather an array named “ids” that has id values corresponding to the nodeIDAccessor setting.
- `enclose`, `enclose-rect`, `enclose-hull`: Takes an object with “coordinates” (an array of data objects) and encloses them with a circle, rectangle or convex hull labeled with the passed label. For network frame this is not “coordinates” but rather an array named “ids” that has id values corresponding to the nodeIDAccessor setting. The annotation will also honor a “padding” prop that determines the space in pixels to pad the enclosure. Enclose-hull accepts a strokeWidth prop that determines the thickness of the hull stroking.

- `react-annotation`: Expects a data object that matches the structure of the data you've sent to the frame that is also structured according to the react-annotation spec. The x and y values will be overwritten with x & y values for the data values of the object e.g. if all of the data you send depends on a `date` property to determine the x position, the annotation's object should also have a `date` property if you want it scaled with the rest of the data.
- _function_: Any function you send as a `type` of the annotation will be expected to be one of the react-annotation types.

TODO: add in eventListener functionality

## XYFrame

- `xy`: creates a circle with passed style with a simple SVG text label with passed label prop
- `x`: creates a react-annotation threshold annotation along the x axis at the point specified by the value with a label as passed
- `y`: creates a react-annotation threshold annotation along the y axis at the point specified by the value with a label as passed
- `bounds`: takes a bounding box in the “bounds” property that is an array with two datapoints indicating the top-left and bottom-right corners. If any values are missing (x or y) in either of the bounds then it defaults to the full size of the viz along that measure.
- `line`: takes a “coordinates” array of datapoints and draws a line from it with a label if the annotation passes a “label” prop.
- `area`: takes a “coordinates” array of datapoints and draws a polygon from them (in the order passed) with a label (if a “label” prop is passed) at the center of the poly.
- `horizontal-points`: Takes a datapoint and renders an SVG circle for every datapoint in the dataset that falls along the same horizontal axis. The annotation can also have a “threshold” passed (defaults to 1) to determine the pixel tolerance for identifying other datapoints, an “r” prop that is a function that takes the point and returns a radius (default is () => 4) and a “styleFn” that passes the discovered datapoint and returns a JSX style object.
- `vertical-points`: Takes a datapoint and renders an SVG circle for every datapoint in the dataset that falls along the same vertical axis. The annotation can also have a “threshold” passed (defaults to 1) to determine the pixel tolerance for identifying other datapoints, an “r” prop that is a function that takes the point and returns a radius (default is () => 4) and a “styleFn” that passes the discovered datapoint and returns a JSX style object.

- `xy`: Has the data values corresponding to the x and y accessors of the frame, and will put a labeled circle with the label determined by the `label` value of the object.
- `x`: Has a data value corresponding to the x accessor of the frame, and will put a labeled line with the label determined by the `label` value of the object.
- `y`: Has a data value corresponding to the y accessor of the frame, and will put a labeled line with the label determined by the `label` value of the object.
- `bounds`: Has a `bounds` property of format `[{left-x, top-y},{right-x, bottom-y}]` and will draw a rectangle around that bounding box.
- `line`: Has a `coordinates` array with two objects in the data format of the frame and will draw a line from the first point to the second.
- `area`: Has a `coordinates` array with objects in the data format of the frame and will draw an area with the coordinates in that array.
- `enclose`: Has a `coordinates` array with objects in the data format of the frame and will draw a minimum bounding circle around the points in that array.

Example:

```jsx
import { AnnotationCalloutElbow } from 'react-annotation'

const variousAnnotations = [
    { type: 'react-annotation', x: 4, y: 300, dx: -30, dy: 0, note: { title: 'Note at 4,300' }, subject: { text: 'A', radius: 12 } },
    { type: AnnotationCalloutElbow, x: 7, id: 'linedata-1', dx: 30, dy: -50, note: { title: 'linedata-1 at 7' }, subject: { text: 'C', radius: 12 } },
    { type: 'xy', x: 2, y: 2, label: 'Simply XY Annotation' },
    { type: 'x', x: 2, label: 'Simply X Threshold' },
    { type: 'y', y: 2, label: 'Simply Y Threshold' },
    { type: 'enclose', coordinates: [ {x: 3, y: 4}, {x: 5, y: 3} ], label: 'An enclosure' }
]

<XYFrame
   annotations={variousAnnotations}
/>
```

## ORFrame

- `column-hover`: Like frame-hover but the entire column/row is passed to the function.
- `or`: Presents a simple circle annotation with a passed “label” (like “xy” for XYFrame)
- `r`: Creates a threshold annotation at the r value
  category: Creates an AnnotationBracket with the passed “title” and/or “label” based on the passed “categories” array (you pass an array of strings that correspond to the oAccessor category names and the bracket is drawn to surround them, which means it will encompass other columns if they are spread apart). Honors the following props:

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

## NetworkFrame

- `node`: Creates an AnnotationCalloutCircle centered on the node with an id corresponding to the “id” prop in the annotation
- `basic-node-label`: Places the “label” prop at the center of the node (label can be SVG JSX)
- `node`: Has an `id` value that corresponds to the idAccessor value of a node, and will draw a circle around that node with the label determined by the `label` value of the annotation object.
- `enclose`: Has an `ids` array with strings corresponding to values returned by the idAccessor value of nodes in this graph and will draw a minimum bounding circle around the nodes found with a label specified in the `label` value of the annotation object.

# Custom Annotation Rules

You can send objects with any `type` value to the `annotations` array but if they don't correspond to any built-in types, they **won't** display.

You can write custom rules to handle **new** types and the built-in types to override the default behavior.

Use `svgAnnotationRules` or `htmlAnnotationRules` depending on the type of JSX elements you want to create. Each of these functions is called on every item in the `annotations` array sent to the Frame. If `hoverAnnotations` is `true` semiotic will append hover annotations such as `frame-hover` or `column-hover` to the array of `annotations` each function is run against.

## Passed values

Because it's hard to tell all the different things you might want to do with an annotation, the custom rules expose not only the datapoint hovered, but also the scales and other properties of the frame.

- NetworkFrame: `d, i, networkFrameProps, networkFrameState, nodes, edges`
- XYFrame: `d, i, screenCoordinates, xScale, yScale, xAccessor, yAccessor, xyFrameProps, xyFrameState, areas, points, lines`
- ORFrame: `d, i, oScale, rScale, oAccessor, rAccessor, orFrameProps, orFrameState`

## svgAnnotationRules { _function_ }

This function is run on every item in the annotation array, in addition to any hover annotations added by the Frame, it should return:

- an SVG element in JSX
- `null` if you want it to process all default types in addition to your custom rules
- return `false` if you only want to process your custom rules

TODO: start with a simpler example, you're introducing 'parentLine' and 'coincidentPoints' all in this one example without the context they need. For example parentLine only shows up on the annotations that are hover annotations. Something that isn't clear as a first time reader of the docs.

The example below shows how to create a parent line based on all lines that cross through the hovered point. Notice it checks to see if the annotation has a `parentLine` prop--you can use any test you want, whether it's of the `type` or like this. It returns `null` otherwise so that it doesn't eat other built-in annotations. It also uses the `coincidentPoints` property of a hovered element, which is an array of all points being hovered over, which is useful for charts that have overlapping lines on the same point.

```jsx
import { line } from 'd3-shape'
<XYFrame
  svgAnnotationRules ={({ d, xScale, yScale }) => {
    if (!d.parentLine) {
        return null
    }
    const lineRenderer = line().x(d => xScale(d._xyfX)).y(d => yScale(d._xyfY)).curve(curveMonotoneX)

    return d.coincidentPoints.map((p,q) => {
        const lineD = lineRenderer(p.parentLine.data)
        return <path key={`hover-line-${q}`} d={lineD} style={{ fill: "none", stroke: "black", strokeWidth: 3 }}
    />
    })
  }
/>
```

In contrast this is a custom svg rule for drawing points on all lines at the hovered x position. The `_xyfX` value is the calculated XYFrame x value of the point (but not the scaled value, it still needs to be passed to a scale to get the pixel position). Again, it returns `null` otherwise so it doesn't eat other annotations that don't match. The lines array is a projected array of lines data, which makes it easy to get the datapoints that correspond to the x position of the hovered datapoint. It returns an array of `<circle>` elements.

```jsx
<XYFrame
  svgAnnotationRules ={({ d, lines, xScale, yScale }) => {
    if (d && d._xyfX) {
        const thesePoints = lines.map(line => {
            return line.data.find(p => p._xyfX === d._xyfX)
        })

        return thesePoints.map(p => {
            return <circle r={2} style={{ fill: "red" }} cx={xScale(p._xyfX)} cy={yScale(p._xyfY)} />
        })
    }
    return null
  }
/>
```

## htmlAnnotationRules { _function_ }

This function is run on every item in the annotation array, in addition to any hover annotations added by the Frame, it should return:

- an HTML element in JSX
- `null` if you want it to process all default types in addition to your custom rules
- return `false` if you only want to process your custom rules

TODO: this statement needs more context
If you want to place it over the hovered element on the chart, the x and y position corresponds to an `absolute` positioned HTML element with `left` equal to x and `top` equal to y.

TODO: add example using frame-hover-column-hover

```jsx
```

# Further Reading

[Making Annotations First-Class Citizens in Data Visualization](https://medium.com/@Elijah_Meeks/making-annotations-first-class-citizens-in-data-visualization-21db6383d3fe)
