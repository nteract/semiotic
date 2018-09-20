A `<Frame>` that displays continuous data along the _ordinal_ and _range_ axes. Examples include bar charts, pie charts (which map the ordinal axis radially), violin plots, timelines and funnel diagrams. `<OrdinalFrame>` charts render [pieces](#piece-rendering) and [summaries](#summary-rendering). Rendering and styling is based on each element's corresponding properties. OrdinalFrame data elements are accessible by tabbing to the data group (pieces or summaries) and hitting enter to arrow-key navigate through the data elements.

```jsx
import { OrdinalFrame } from 'semiotic'

<OrdinalFrame
   data={[{department: "art", students: 50}, {department: "science", students: 8}, ...]}
   style={{ fill: "blue" }}
   rAccessor={"students"}
   oAccessor={"department"}
/>
```

# &lt;API Reference>

- [General Properties](#general-properties)
  - [size: {[_width_, _height_]}](#size--width---height-)
  - [rAccessor: {_string_ | _function_}](#raccessor--string---function-)
  - [oAccessor: {_string_ | _function_}](#oaccessor--string---function-)
  - [sortO: {_function_}](#sorto--function-)
  - [projection: {_string_}](#projection--string-)
  - [title: {_string_ | _JSX_}](#title--string---jsx-)
  - [margin: {_number_ | _object_}](#margin--number---object-)
  - [rScaleType: {_d3-scale_}](#rscaletype--d3-scale-)
  - [oScaleType: {_d3-scale_}](#oscaletype--d3-scale-)
  - [rExtent: {[_min_, _max_]}](#rextent--min---max-)
  - [invertR: bool](#invertr-bool)
  - [data: {[ { column: "a", value: 5 }, { column: "b", value: 3 } ...]}](#data-column-a-value-5-column-b-value-3)
  - [oPadding: { _number_ }](#opadding--number-)
  - [dynamicColumnWidth: { _string_ | \_func}](#dynamicColumnWidth--string---func-)
- [Piece Rendering](#piece-rendering)
  - [type { _string_ | _object_ | _func_ }](#type--string--object--func-)
  - [style: { _object_ | _function_ }](#style--object---function-)
  - [pieceClass: { _string_ | _function_ }](#piececlass--string---function-)
- [Summary Rendering](#summary-rendering)
  - [summaryType { _string_ | _object_ | _func_ }](#summarytype-_string---object---func-)
  - [summaryStyle: { _object_ | _function_ }](#summarystyle--object---function-)
  - [summaryClass: { _string_ | _function_ }](#summaryclass--string---function-)
  - [summaryPosition: { _function_ }](#summaryposition--function-)
- [Annotation and Decoration](#annotation-and-decoration)
  - [tooltipContent: { _function_ }](#tooltipcontent--function-)
  - [axis: { _object_ }](#axis--object-)
  - [legend: { _object_ }](#legend--object-)
  - [oLabel: { _bool_ | _function_ }](#olabel--bool---function-)
  - [annotations: { _array_ }](#annotations--array-)
  - [svgAnnotationRules: { _function_ }](#svgannotationrules--function-)
  - [htmlAnnotationRules: { _function_ }](#htmlannotationrules--function-)
  - [backgroundGraphics: { _array_ | _JSX_ }](#backgroundgraphics--array---jsx-)
  - [foregroundGraphics: { _array_ | _JSX_ }](#foregroundgraphics--array---jsx-)
- [Interaction](#interaction)
  - [hoverAnnotation: { _bool_ }](#hoverannotation--bool-)
  - [pieceHoverAnnotation: { _bool_ | _object_ }](#piecehoverannotation--bool---object-)
  - [customHoverBehavior: { _function_ }](#customhoverbehavior--function-)
  - [customClickBehavior: { _function_ }](#customclickbehavior--function-)
  - [customDoubleClickBehavior: { _function_ }](#customdoubleclickbehavior--function-)
  - [interaction: { _object_ }](#interaction--object-)
- [Miscellaneous](#miscellaneous)
  - [name: { _string_ }](#name--string-)
  - [position: { _array_ }](#position--array-)
  - [additionalDefs: { _JSX_ }](#additionaldefs--jsx-)
  - [download: { _bool_ }](#download--bool-)
  - [downloadFields: { _array_ }](#downloadfields--array-)

## General Properties

### size: {[_width_, _height_]}

If _size_ is specified, sets the width and height of the frame from the array of values. The array must contain two numbers which represents the width and height, respectively.

Note: _Margin_ will not be added to the frame size. It's more like CSS _padding_.

```jsx
<OrdinalFrame size={[500,500]} ... />
```

### rAccessor: { _string_ | _function_ }

If _rAccessor_ is specified, determines how _range_ values are accessed from the data array. In the case the data consists of an array of objects, a string can be used to assess the _range_ value(s). A function can also be used to access the _range_ value(s).

```jsx
/*String option
e.g. data=[{value: 1, column: 1}, {value: 4, column: 2}, ... ]*/
<OrdinalFrame rAccessor={"value"} ... />

/*Function option
e.g. data=[[1, "art"], [2, "science"], ... ]*/
<OrdinalFrame rAccessor={d => d[0]} ... />
```

### oAccessor: { _string_ | _function_ }

If _oAccessor_ is specified, determines how _ordinal_ values are accessed from the data array. In the case the data consists of an array of objects, a string can be used to assess the _ordinal_ value(s). A function can also be used to access the _ordinal_ value(s).

```jsx
/*String option
e.g. data=[{value: 1, column: 1}, {value: 4, column: 2}, ... ]*/
<OrdinalFrame oAccessor={"column"} ... />

/*Function option
e.g. data=[[1, "art"], [2, "science"], ... ]*/
<OrdinalFrame oAccessor={d => d[1]} ... />
```

### sortO: { _function_ }

If _sortO_ is specified, sets the sorting function of the columns. By default, the columns are sorted based on data order (the first item of a particular ordinal value will be the first column). The function sent to _sortO_ is a simple array sorting function that takes the string name of ordinal values.

```jsx
//sorts by alphabetical order
<OrdinalFrame sortO={(a,b) => a < b} ... />
```

### projection: { _string_ }

If _projection_ is specified, sets the orientation of the chart. The three possible options are "horizontal", "vertical" or "radial". Defaults to "vertical".

```jsx
<OrdinalFrame projection={"horizontal"} ... />
```

### title: { _string_ | _JSX_ }

If _title_ is specified, sets the text for the chart title, which appears centered at the top of the chart. The title can be either a string or JSX object.

```jsx
/*String option*/
<OrdinalFrame title={"Chart Title"} ... />

/*JSX option*/
<OrdinalFrame title={<g><circle r={5} /><text>Chart Title</text></g>} ... />
```

### margin: { _number_ | _object_ }

If _margin_ is specified, sets the margin(s) on the frame. The margin can be set to one number, which is applied equally to all sides, or as an object. So it's more like CSS _padding_.

```jsx
/*Single number option*/
<OrdinalFrame margin={10} ... />

/*Object option*/
<OrdinalFrame margin={{ top: 5, bottom: 10, left: 15, right: 20 }} ... />
```

### rScaleType: { _d3-scale_ }

Custom [D3 scale](https://github.com/d3/d3-scale#d3-scale) for the range. Defaults to [scaleLinear()](https://github.com/d3/d3-scale#scaleLinear).

```jsx
<OrdinalFrame rScaleType={d3.scaleTime()} ... />
```

### oScaleType: { _d3-scale_ }

Custom [D3 scale](https://github.com/d3/d3-scale#d3-scale) for the ordinal values. Changing this can have strange effects.

```jsx
<OrdinalFrame oScaleType={d3.scaleThreshold()} ... />
```

### rExtent: { [_min_, _max_] | _object_ }

If _rExtent_ is specified, sets the _min_ and/or _max_ value(s) for the _range_. The array may contain two numbers, or it can contain a number and an `undefined` value, if you only want to set the min or max extent. If you send an object you can register a function to fire when the extent is recalculated that returns the calculated extent.

```jsx
/*min and max values set*/
<OrdinalFrame rExtent={[20,250]} ... />

/*only min value set*/
<OrdinalFrame rExtent={[20, undefined]} ... />

/*log calculated extent*/
<OrdinalFrame rExtent={{ onChange: d => console.log("calculated extent: ", d) }} ... />

/*log calculated extent and set extent*/
<OrdinalFrame
   rExtent={{ extent: [20, undefined], onChange: d => console.log("calculated extent: ", d) }}
... />
```

### invertR: { _bool_ }

Flip range so that the min is on the left or top.

### data: { _array_ }

An array of objects or numerical values used to render both summary and piece visualizations in OrdinalFrame. The column of the data is based on its oAccessor value, while its position or height is determined by its rAccessor value.

```jsx
<OrdinalFrame
   data={[ { column: "a", value: 5 }, { column: "b", value: 3 } ...]}
/>
```

### oPadding: { _number_ }

The distance in pixels between each column.

```jsx
<OrdinalFrame oPadding={5} />
```

### dynamicColumnWidth: { _string_ | _func_ }

If _dynamicColumnWidth_ is specified, sets the column width of the frame based on the data. If a string, then columnWidth is proportionate to the total value of the string property for each column, for instance used in the Marimekko Chart example where bar width is based on the total value for that bar. If set to a function, the function is passed an array of pieces in that column which you can measure in any way you want, for instance in the Joy Plot example this is used to calculate the max value of a column and sets the column width proportional to that value.

```jsx
/*String option*/
<OrdinalFrame dynamicColumnWidth={"value"} ... />

/*Function option*/
<OrdinalFrame dynamicColumnWidth={pieces => max(pieces.map(p => p.value))} ... />
```

### pixelColumnWidth: { _number_ }

If _pixelColumnWidth_ is specified, the row (in the case of horizontal) or column (in the case of vertical) size will be fixed to the number specified. The corresponding size setting will be ignored as the height or width of the chart will be based on the number of columns times the set value.

```jsx
<OrdinalFrame pixelColumnWidth={40} ... />
```

## Piece Rendering

"Piece" refers to the individual components of data visualization forms like bar charts and swarm plots. A "piece" of a bar chart is a segment in a stacked bar chart or the entire bar of a simple bar chart, or one of the circles in a swarm plot.

### type { _string_ | _object_ | _func_ }

A string (`"bar"`, `"timeline"`, `"clusterbar"`, `"swarm"`, `"point"`, `"none"`) or object with `type` equal to one of those strings to use method-specific options such as `{ type: "swarm", r: 8 }`, or a function that takes data and the OrdinalFrame calculated settings and creates JSX elements. See the Waterfall Chart in the interactive examples to see how to use custom type functions.

```jsx
// basic
<OrdinalFrame type="bar" ... />

// with options
<OrdinalFrame type={{ type: "swarm", r: 20, customMark: d => <circle r={20} fill: "red" />}} ... />
```

### style: { _object_ | _function_ }

A React style object or a function taking a single datapoint and returning a React style object. This is applied to each piece.

```jsx
// object
<OrdinalFrame style={{ fill: "red" }} ... />

// function
<OrdinalFrame style={d => ({ fill: d.color })} ... />
```

### pieceClass: { _string_ | _function_ }

A string or function that takes a piece and returns a string that is assigned to that piece's class.

```jsx
// object
<OrdinalFrame pieceClass="cool-piece" ... />

// function
<OrdinalFrame pieceClass={d => d.classSettings} ... />
```

## Summary Rendering

"Summary" refers to a complex visual element that summarizes all of the datapoints that fall within a particular column. These can be single shapes, like a violin plot, or multiple pieces, like a histogram or heat map.

### summaryType { _string_ | _object_ | _func_ }

A string (`"heatmap"`, `"boxplot"`, `"histogram"`, `"joy"`, `"contour"`, `"violin"`) or object with `type` equal to one of those strings (with further method-specific settings such as `{ type: "contour", bandwidth: 15 }` or `{ type: "joy", amplitude: 30 }`, or a function that takes data and the OrdinalFrame calculated settings and creates JSX elements. See [[summaryType Advanced Settings]] for more details on how to use the extended settings.

```jsx
// string
<OrdinalFrame summaryType="violin" ... />

// object
<OrdinalFrame summaryType={{ type: "joy", amplitude: 30 }} ... />
```

### summaryStyle: { _object_ | _function_ }

A React style object or a function taking a single datapoint and returning a React style object. This is applied to each piece.

```jsx
// object
<OrdinalFrame summaryStyle={{ fill: "red" }} ... />

// function
<OrdinalFrame summaryStyle={d => ({ fill: d.color })} ... />
```

### summaryClass: { _string_ | _function_ }

A string or function that takes a piece and returns a string that is assigned to that piece's class.

```jsx
// string
<OrdinalFrame summaryClass="cool-class" ... />

// function
<OrdinalFrame summaryClass={d => d.customClass} ... />
```

### summaryPosition: { _function_ }

A function that takes a the `middle` of a `summary`, the `key`, and the index of the summary and returns a value that will be applied across the axis of the projection with `translate` (x for vertical projections, y for horizontal projections).

## Annotation and Decoration

### tooltipContent: { _function_ }

A function returning JSX HTML to display in the tooltip (only active if `hoverAnnotation` or `pieceHoverAnnotation` is set to `true`). The tooltip is passed the array of pieces associated with the column being hovered. The content is placed on and directly above the hovered point, so take that into account when using CSS to style the position and any additional elements. You can drop any HTML into this floating div, including another frame, if you want to have data visualization in your data visualization so you can visualize while you visualize.

```jsx
<OrdinalFrame
  tooltipContent={d => (
    <div className="tooltip-content">
      <p>{d.name}</p>
      <p>{d.value}</p>
    </div>
  )}
/>
```

### axis: { _object_ }

An object that define the range axis. These objects roughly correspond to the options in `d3-axis`, with extended options such as `label`. Use oLabel to set labels for the columns.

```jsx
<OrdinalFrame axis={{ orient: "left" }} />
```

### legend: { _object_ }

An object that defines the legend to be displayed on the frame. It uses the format seen in [<Legend>](legend)

```jsx
<OrdinalFrame
  legend={{
    legendGroups: [
      {
        styleFn: d => ({ fill: d.color, stroke: 'black' }),
        items: [
          { label: 'Area 1', color: 'red' },
          { label: 'Area 2', color: 'blue' },
        ],
      },
    ],
  }}
  ...
/>
```

### oLabel: { _bool_ | _function_ | _object_ }

Whether to show a labels for each column (simple boolean `true`) or a function that takes the string value associated with the column (from your oAccessor) and returns JSX centered on the basic title location. Or an object with a `label` prop that can be a bool or a function allowing for more complex placement. Currently this is just an `orient` prop that can be `"right"` or `"top"` to change the label position from the default left (for horizontal) or right (for vertical) or `"stem"` or `"center"` to change a radial label from its default edge as well as a `padding` prop that determines the outset or inset of a label in radial mode.

```jsx
// boolean
<OrdinalFrame oLabel={true} ... />

// function
<OrdinalFrame oLabel={d => <text fontSize={36}>{d}</text> } ... />

// object
<OrdinalFrame oLabel={
   { label: true,
     orient: "stem",
     padding: -5  }
} ... />
```

### annotations: { _array_ }

An array of objects to be processed using the frame's built-in annotation rules or the custom defined rules. See [[Using Annotations]] for more details.

```jsx
<OrdinalFrame
   annotations={[
      { type: "or", valueL 5, category: "tomatoes", label: "5 of these tomatoes" }
   ]}
 />
```

### svgAnnotationRules: { _function_ }

A function that takes an annotation object and returns a JSX SVG element. The function is sent `{ d, i, oScale, rScale, oAccessor, rAccessor, ordinalFrameProps, adjustedPosition, adjustedSize, annotationLayer, ordinalFrameState }`

### htmlAnnotationRules: { _function_ }

A function that takes an annotation object and returns a JSX HTML element. The function is sent `{ d, i, oScale, rScale, oAccessor, rAccessor, ordinalFrameProps, adjustedPosition, adjustedSize, annotationLayer, ordinalFrameState }`. Elements can be placed using CSS `left` and `top` and will overlay on the chart. Internally, the default annotation for tooltips uses this method.

### annotationSettings: { _object_ }

An object with `{ layout, pointSizeFunction, labelSizeFunction }` containing custom annotation settings to enable annotations bumping out of each others' way or placing them in the margins.

### backgroundGraphics: { _array_ | _JSX_ }

A JSX or array of JSX to display behind the chart.

### foregroundGraphics: { _array_ | _JSX_ }

A JSX or array of JSX to display in front of the chart.

## Interaction

### hoverAnnotation: { _bool_ }

Turn on automatic tooltips for each column with a column overlay to improve interaction. Content of the tooltips defaults to the o and r value and can be customized with `tooltipContent`. Tooltip is shown at the max or sum value of the column.

### pieceHoverAnnotation: { _bool_ | _object_ }

Turn on automatic tooltips for individual pieces with a voronoi overlay to improve interaction. Content of the tooltips defaults to the o and r value and can be customized with `tooltipContent`. If you are displaying both pieces and summaries, you can send an object with { onlyPieces: true } to force the overlay to generate based on pieces, otherwise it will default to generating the overlay based on summaries.

### customHoverBehavior: { _function_ }

A function to fire on hover that passes the column or piece being hovered over.

### customClickBehavior: { _function_ }

A function to fire on click that passes the column or piece being hovered over.

### customDoubleClickBehavior: { _function_ }

A function to fire on doubleclick that passes the column or piece being hovered over.

### interaction: { _object_ }

An object passed to the interaction layer that is currently only used to determine whether to activate the column brushes, their settings, and the actions to fire on its start, brush and end events. See the Parallel Coordinates and Brushable Swarm Plot in the interactive examples.

## Miscellaneous

### name: { _string_ }

Used internally to identify frames, which comes in handy when you need to link frames together.

### position: { _array_ }

Just an offset and hardly ever useful

### additionalDefs: { _JSX_ }

JSX to be injected into the visualization layer's SVG `defs`.

### download: { _bool_ }

Enable a download button to download the data as a CSV

### downloadFields: { _array_ }

The field keys to download from each datapoint. By default, the CSV download only shows the o and r values.
