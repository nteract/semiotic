A frame that displays continuous data along the _x_ and _y_ axis. Examples include [line charts](/guides/line-chart), [scatterplots](/guides/scatterplot), and [area charts](/guides/area-chart).

`<XYFrame>` charts render [points](#point-rendering), [lines](#line-rendering), and [summary](#summary-rendering) elements. Rendering and styling is based on each element's corresponding properties.

`XYFrame` data elements are accessible by tabbing to the data group (points, lines, or summaries) and hitting enter to arrow-key navigate through the data elements.

```jsx
import XYFrame from 'semiotic/lib/XYFrame'

export default () => <XYFrame
   points={[{price: 1.25, size: 15}, {price: 2.25, size: 12}, ...]}
   pointStyle={{ fill: "blue" }}
   xAccessor={"price"}
   yAccessor={"size"}
/>
```

**Table of Contents**

- [General Properties](#general-properties)
  - [size: { [_width_, _height_] }](#size-width-height-)
  - [xAccessor: { _string_ | _function_ }](#xaccessor-string-function-)
  - [yAccessor: { _string_ | _function_ }](#yaccessor-string-function-)
  - [title: { _string_ | _JSX_ }](#title-string-jsx-)
  - [margin: { _number_ | _object_ }](#margin-number-object-)
  - [xScaleType: { _d3-scale_ }](#xscaletype-d3-scale-)
  - [yScaleType: { _d3-scale_ }](#yscaletype-d3-scale-)
  - [xExtent: { [_min_, _max_] }](#xextent-min-max-)
  - [yExtent: { [_min_, _max_] }](#yextent-min-max-)
  - [invertX: { _boolean_ }](#invertx-boolean-)
  - [invertY: { _boolean_ }](#inverty-boolean-)
  - [showLinePoints: { _boolean_ }](#showlinepoints-boolean-)
  - [showSummaryPoints: { _boolean_ }](#showsummarypoints-boolean-)
  - [baseMarkProps: { _object_ }](#basemarkprops-object-)
  - [renderKey: { _string_ | _function_ }](#renderkey-string-function-)
- [Point Rendering](#point-rendering)
  - [points: { [_data_] }](#points-data-)
  - [pointStyle: { _object_ | _function_ }](#pointstyle-object-function-)
  - [pointClass: { _string_ | _function_ }](#pointclass-string-function-)
  - [canvasPoints: { _boolean_ | _function_ }](#canvaspoints-boolean-function-)
  - [customPointMark: { _JSX_ | _function_ }](#custompointmark-jsx-function-)
  - [pointRenderMode { _string_ | _function_ | _object_ }](#pointrendermode-string--function--object)
- [Line Rendering](#line-rendering)
  - [lines: { [_data_] }](#lines-data-)
  - [lineDataAccessor: { _string_ | _function_ }](#linedataaccessor-string-function-)
  - [lineType: { _string_ | _object_ }](#linetype-string-object-)
  - [lineStyle: { _object_ | _function_ }](#linestyle-object-function-)
  - [lineClass: { _string_ | _function_ }](#lineclass-string-function-)
  - [lineIDAccessor: { _string_ | _function_ }](#lineidaccessor-string-function-)
  - [customLineMark: { _function_ }](#customlinemark-function-)
  - [canvasLines: { _boolean_ | _function_ }](#canvaslines-boolean-function-)
  - [defined: { _function_ }](#defined-function-)
  - [lineRenderMode { _string_ | _function_ | _object_ }](#linerendermode-string--function--object)
- [Summary Rendering](#summary-rendering)
  - [summaries: { [_data_] }](#summaries-data-)
  - [summaryDataAccessor: { _string_ | _function_ }](#summarydataaccessor-string-function-)
  - [summaryStyle: { _function_ | _object_ }](#summarystyle-function-object-)
  - [summaryClass: { _string_ | _function_ }](#summaryclass-string-function-)
  - [customSummaryMark: { _function_ }](#customsummarymark-function-)
  - [canvasSummaries: { _boolean_ | _function_ }](#canvassummaries-boolean-function-)
  - [summaryRenderMode { _string_ | _function_ | _object_ }](#summaryrendermode-string--function--object)
- [Annotation and Decoration](#annotation-and-decoration)

  - [tooltipContent: { _function_ }](#tooltipcontent-function-)
  - [axes: { _array_ }](#axes-array-)
  - [annotations: { _array_ }](#annotations-array-)
  - [svgAnnotationRules: { _function_ }](#svgannotationrules-function-)
  - [htmlAnnotationRules: { _function_ }](#htmlannotationrules-function-)
  - [annotationSettings: { _object_ }](#annotationsettings-object-)
  - [matte: { _boolean_ }](#matte-boolean-)
  - [backgroundGraphics: { _array_ | _JSX_ }](#backgroundgraphics-array-jsx-)
  - [foregroundGraphics: { _array_ | _JSX_ }](#foregroundgraphics-array-jsx-)
  - [canvasPostProcess: { _"chuckClose"_ | _function_ }](#foregroundgraphics-chuckclose-function-)

- [Interaction](#interaction)
  - [hoverAnnotation: { _bool_ | _array_ }](#hoverannotation-bool-array-)
  - [customHoverBehavior: { _function_ }](#customhoverbehavior-function-)
  - [customClickBehavior: { _function_ }](#customclickbehavior-function-)
  - [customDoubleClickBehavior: { _function_ }](#customdoubleclickbehavior-function-)
  - [interaction: { _object_ }](#interaction-object-)
- [Miscellaneous](#miscellaneous)
  - [dataVersion: { _string_ }](#dataversion-string-)
  - [name: { _string_ }](#name-string-)
  - [additionalDefs: { _JSX_ }](#additionaldefs-jsx-)

## General Properties

### size: { [_width_, _height_] }

If _size_ is specified, sets the width and height of the frame from the array of values. The array must contain two numbers which represents the width and height, respectively. Size defaults to `[500,500]`.

```jsx
<XYFrame size={ [500,500] } ... />
```

### xAccessor: { _string_ | _function_ }

Determines how _x_ values are accessed from the data array.

```jsx
/* String option
e.g. data=[{x: 1, y: 2}, {x:2, y: 4}, ... ] */
<XYFrame xAccessor={ "x" } ... />

/* Function option
e.g. data=[[1, 2], [2, 4], ... ] */
<XYFrame xAccessor={ d => d[0] } ... />
```

### yAccessor: { _string_ | _function_ }

Determines how _y_ values are accessed from the data array

```jsx
/*String option
e.g. data=[{x: 1, y: 2}, {x: 2, y: 4}, ... ] */
<XYFrame yAccessor={ "y" } ... />

/*Function option
e.g. data=[[1, 2], [2, 4], ... ] */
<XYFrame yAccessor={ d => d[1] } ... />
```

### title: { _string_ | _JSX_ }

Centers this title at the top of the chart.

```jsx
/*String option */
<XYFrame title={ "Chart Title" } ... />

/*JSX option */
<XYFrame title={ <text fontSize={30} fill="gold">"Chart Title"</text> } ... />
```

### margin: { _number_ | _object_ }

The margin can be set to one number, which is applied equally to all sides, or as an object.

```jsx
/*Single number option */
<XYFrame margin={ 10 } ... />

/*Object option */
<XYFrame margin={ { top: 5, bottom: 10, left: 15, right: 20 } } ... />
```

### xScaleType: { _d3-scale_ }

Custom [d3-scale](https://github.com/d3/d3-scale#d3-scale) for the _x_ axis. Defaults to [`scaleLinear()`](https://github.com/d3/d3-scale#scaleLinear).

```jsx
<XYFrame xScaleType={ d3.scaleTime() } ... />
```

### yScaleType: { _d3-scale_ }

Custom [d3-scale](https://github.com/d3/d3-scale#d3-scale) for the _y_ axis. Defaults to [`scaleLinear()`](https://github.com/d3/d3-scale#scaleLinear).

```jsx
<XYFrame yScaleType={ d3.scaleLinear() } ... />
```

### xExtent: { [_min_, _max_] }

If _xExtent_ is specified, sets the _min_ and _max_ value(s) for the _x_ axis. The array may contain two numbers, or it can contain a number and an `undefined` value, if you only want to set the min or max extent.

The extent exposes an `onChange` callback function that updates with the calculated extent value.

```jsx
/*min and max values set */
<XYFrame xExtent={ [20,250] } ... />

/*only min value set */
<XYFrame xExtent={ [20, undefined] } ... />

/*onChange without setting extent */
<XYFrame xExtent={ { onChange: d => { console.log(d) } } } ... />

/*onChange with setting extent */
<XYFrame xExtent={ { extent: [20, undefined], onChange: d => { console.log(d) } } } ... />
```

### yExtent: { [_min_, _max_] }

If _yExtent_ is specified, sets the _min_ and/or _max_ value(s) for the _y_ axis. The array may contain two numbers, or it can contain a number and an `undefined` value, if you only want to set the min or max extent.

The extent exposes an `onChange` callback function that updates with the calculated extent value.

```jsx
/*min and max values set */
<XYFrame yExtent={ [0,500] } ... />

/*only max value set */
<XYFrame yExtent={ [undefined, 350] } ... />

/*onChange without setting extent */
<XYFrame yExtent={ { onChange: d => { console.log(d) } } } ... />

/*onChange with setting extent */
<XYFrame yExtent={ { extent: [undefined, 350], onChange: d => { console.log(d) } } } ... />
```

### invertX: { _boolean_ }

Inverts the _x_ axis such that the _min_ and _max_ values are transposed.

```jsx
<XYFrame invertX={ true } ... />
```

### invertY: { _boolean_ }

Inverts the _y_ axis such that the _min_ and _max_ values are transposed.

```jsx
<XYFrame invertY={ true } ... />
```

### showLinePoints: { _boolean_ }

If _showLinePoints_ is specified, displays the points that make up the line elements. These points will be styled just like points that are added to the `points` array using `pointStyle` or `pointClass` with the only difference being that points will have a `parentLine` or `parentSummary` property that will point to the line or summary that this point is a part of.

```jsx
<XYFrame showLinePoints={ true } ... />
```

### showSummaryPoints: { _boolean_ }

If _showSummaryPoints_ is specified, displays the points that make up the summaries for summary elements. These points will be styled just like points that are added to the `points` array using `pointStyle` or `pointClass`.

```jsx
<XYFrame showSummaryPoints={ true } ... />
```

### baseMarkProps: { _object_ }

This object will be spread to all marks that are generated in the frame. This is useful for any props that might be shared by all pieces, and especially useful to set the animation duration for the marks if you want to adjust from the default 1s duration.

```jsx
<XYFrame baseMarkProps={{ transitionDuration: { default: 500, fill: 2500 } }} />
```

### renderKey: { _string_ | _function_ }

By default, generated marks will be rendered with a key based on their array position. If you want to ensure that your marks perform animated transitions in a way that maintains consistency, you can designate a key as a string, in which case it will look for that prop as the key or a function that takes `(datapoint,index)` and returns a string to be used.

```jsx
/* string option */
<XYFrame renderKey="somePropToBeUsedAsAKey" />
```

```jsx
/* function option defaulting to array position if no key on datapoint.renderKeyID exists */
<XYFrame renderKey={(datapoint, index) => datapoint.renderKeyID || i} />
```

## Point Rendering

### points: { [_data_] }

An _array_ of arrays or objects representing individual points on a chart. If you want to show points on a line or summary chart, use the [`showLinePoints`](#showlinepoints-boolean) property.

```jsx
var points = [[1, 2], [3, 4], [5, 8], [7, 16], [9, 32], [11, 64], [13, 128]]

function MyScatterPlot() {
  return <XYFrame xAccessor={d => d[0]} yAccessor={d => d[1]} points={points} />
}

var points = [
  { value: 3, week: 1 },
  { value: 5, week: 2 },
  { value: 2, week: 3 }
]

function MyScatterPlot() {
  return <XYFrame xAccessor={"week"} yAccessor={"value"} points={points} />
}
```

### pointStyle: { _object_ | _function_ }

Sets the inline css `style` of each point element. This can be a JSX style object or a function that is passed the point data and returns a JSX style object.

```jsx
/*Object option */
<XYFrame pointStyle={ { fill: "red", stroke: "grey", strokeWidth: 1 } } ... />

/*Function option */
<XYFrame
  ...
  pointStyle={ d => ({ fill: d.fill, stroke: d.stroke, strokeWidth: d.strWidth }) }
/>
```

### pointClass: { _string_ | _function_ }

Sets the css `class` of each point element. This can be a string class name or a function that takes the point data and returns a string.

```jsx
/*String option */
<XYFrame pointClass={ "scatter-points" } ... />

/*Function option */
<XYFrame pointClass={ d => d.className } ... />
```

### canvasPoints: { _boolean_ | _function_ }

If _canvasPoints_ is specified, determines whether or not to render points to [Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) instead of [SVG](https://developer.mozilla.org/en-US/docs/Web/SVG). The _canvasPoints_ attribute accepts a boolean or a function that evaluates each point and returns a boolean.

```jsx
/*Boolean option */
<XYFrame canvasPoints={ true } ... />

/*Function option rendering only points with a size value of smaller than 5 with canvas */
<XYFrame canvasPoints={ d => d.size < 5 } ... />
```

### customPointMark: { _JSX_ | _function_ }

A function taking the point data and returning SVG JSX representation of the point.

**Exposed as an object in the first paramter**

- d: The data element
- i: the index position in the data array
- xy: position
- xScale
- yScale
- styleFn: a function for determining the style object given `d` (passed through from the Frame from your pointStyle)
- classFn: a function for determining the className given `d` (passed through from the Frame from your pointClass)
- renderMode: a function for determining the renderMode given `d` (passed through from the Frame from your pointRenderMode)
- key: a string that is generated from the renderKeyFn
- baseMarkProps: an object from the Frame’s baseMarkProps property that is meant to be spread to all generated marks, like this edge
- adjustedSize: size of the overall frame, helpful for ResponsiveFrames
- chartSize: size of the chart without margins
- margin

```jsx
/*JSX option */
<XYFrame customPointMark={ <Mark markType="rect" /> } ... />

/*Function option */
<XYFrame customPointMark={ d => (<Mark markType="rect" />) } ... />
```

### pointRenderMode: { _string_ | _function_ | _object_ }

If _pointRenderMode_ is specified, points are rendered in a non-photorealistic manner. This can be basic sketchy rendering using `"sketchy"` or an object with `renderMode: "sketchy"` and properties matching those found in [roughjs](https://roughjs.com/) or a function that takes a line data object and returns a string or object such as that. Sketchy render mode is honored in canvas rendering.

```jsx
/*Boolean option */
<XYFrame pointRenderMode={ "sketchy" } ... />

/* Object option */
<XYFrame pointRenderMode={ {
  renderMode: "sketchy",
  fillWeight: 3,
  hachureGap: 3.5,
  roughness: 0.5
} } ... />

/*Function option */
<XYFrame pointRenderMode={ d => d.uncertain === true && "sketchy" } ... />

```

## Line Rendering

### lines: { [_data_] }

An _array_ of arrays or objects representing individual points along a line. If you want to show points along the line, use the [`showLinePoints`](#showlinepoints-boolean) property.

```jsx
var lines = [[[1, 2], [3, 4], [5, 8], [7, 16], [9, 32], [11, 64], [13, 128]]]

function MyLineChart() {
  return <XYFrame xAccessor={d => d[0]} yAccessor={d => d[1]} lines={lines} />
}

var lines = [{ coordinates:[
  { value: 3, week: 1 },
  { value: 5, week: 2 },
  { value: 2, week: 3 }
]]

function MyLineChart() {
  return <XYFrame xAccessor={"week"} yAccessor={"value"} lines={lines} />
```

### lineDataAccessor: { _string_ | _function_ }

If _lineDataAccessor_ is specified, determines how line _coordinates_ are accessed from the data array passed to the [`lines`](#lines--data-) attribute. Defaults to `d => d.coordinates`.

```jsx
/*String option */
<XYFrame lineDataAccessor={ "lineValues" } ... />

/*Function option */
<XYFrame lineDataAccessor={ d => d.lineValues } ... />
```

### lineType: { _string_ | _object_ }

If _lineType_ is specified, renders one of the supported line types:
`"line"`, `"linepercent"`, `"difference"`, `"stackedarea"`, `"stackedpercent"`, `"bumpline"`, `"bumparea"`, `"cumulative"`, `"cumulative-reverse"`, otherwise it defaults to `"line"`. See the [line chart](/guides/line-chart) and [area chart](/guides/area-chart) guides for examples.

The attribute accepts a _string_ corresponding to one of the supported line types or an _object_ with a `type` key and _string_ value corresponding to one of the supported line types. An optional `options` key on the _object_ that determines how the lines are generated is also supported.

```jsx
/*String option */
<XYFrame lineType={ "stackedarea" } ... />

/*Object option */
<XYFrame lineType={ { type: "stackedarea", sort: (a,b) => a.level - b.level } } ... />
```

- Shared settings
  - `interpolator`: Takes a d3 style curve, like those found in `d3-shape`.
- `"line"` settings
  - `y1`: Allows you to set the `y1` accessor to create "area lines" such as filled areas that grow from the zero baseline or ribbons.
- `stackedarea` settings
  - `sort`: the sorting function by which to order the shapes vertically. Defaults to largest shapes on the bottom and you can send `null` to prevent sorting.
- `stackdpercent` settings
  - `sort`: the sorting function by which to order the shapes vertically. Defaults to largest shapes on the bottom and you can send `null` to prevent sorting.

### lineStyle: { _object_ | _function_ }

Required to set the inline css `style` of each line element. This can be a JSX style object or a function that takes the line data and returns a JSX style object.

```jsx
/*Object option */
<XYFrame lineStyle={ { stroke: "#e3e3e3", strokeWidth: 2 } } ... />

/*Function option */
<XYFrame
  ...
  lineStyle={ d => ({ stroke: d.stroke, strokeWidth: d.strWidth }) }
/>
```

### lineClass: { _string_ | _function_ }

If _lineClass_ is specified, sets the css `class` of each line element. This can take a string or a function that evaluates the line data and returns a string.

```jsx
/*String option */
<XYFrame lineClass={ "line" } ... />

/*Function option */
<XYFrame lineClass={ d => d.className } ... />
```

### lineIDAccessor: { _string_ | _function_ }

If _lineIDAccessor_ is specified, sets the id of the corresponding line. The _lineIDAccessor_ accepts a _string_ or a _function_ that returns a _string_ indicating the `id` name. Defaults to `"semioticLineID"`. The ID value is used to place annotations relative along the line.

```jsx
/*String option */
<XYFrame lineIDAccessor={ "myLineId" } ... />

/*Function option */
<XYFrame lineIDAccessor={ d => d.id } ... />
```

### customLineMark: { _function_ }

A function taking the line datapoint and returning SVG JSX representation of the line.

For example, `<DividedLine>` can be used in place of normal lines or other line generators taking advantage of the `<Frame>`'s settings.

**Exposed as an object in the first paramter**

- d: The data element
- i: the index position in the data array
- xScale
- yScale
- styleFn: a function for determining the style object given `d` (passed through from the Frame from your lineStyle)
- classFn: a function for determining the className given `d` (passed through from the Frame from your lineClass)
- renderMode: a function for determining the renderMode given `d` (passed through from the Frame from your lineRenderMode)
- key: a string that is generated from the renderKeyFn
- baseMarkProps: an object from the Frame’s baseMarkProps property that is meant to be spread to all generated marks, like this edge
- adjustedSize: size of the overall frame, helpful for ResponsiveFrames
- chartSize: size of the chart without margins
- margin

```jsx
<XYFrame customLineMark={ d => (<DividedLines ... />) } ... />
```

### canvasLines: { _boolean_ | _function_ }

If _canvasLines_ is specified, renders line elements in [`Canvas`](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API). The _canvasLines_ attribute accepts a boolean or a function that evaluates a line and returns a boolean that determines whether or not to render the line to Canvas instead of [`SVG`](https://developer.mozilla.org/en-US/docs/Web/SVG).

```jsx
/*Boolean option */
<XYFrame canvasLines={ true } ... />

/*Function option drawing only the even lines with canvas */
<XYFrame canvasLines={ (d, i) => i%2 === 0 } ... />
```

### lineRenderMode: { _string_ | _function_ | _object_ }

If _lineRenderMode_ is specified, lines are rendered in a non-photorealistic manner. This can be basic sketchy rendering using `"sketchy"` or an object with `renderMode: "sketchy"` and properties matching those found in [roughjs](https://roughjs.com/) or a function that takes a line data object and returns a string or object such as that. Sketchy render mode is honored in canvas rendering.

```jsx
/*Boolean option */
<XYFrame lineRenderMode={ "sketchy" } ... />

/* Object option */
<XYFrame lineRenderMode={ {
  renderMode: "sketchy",
  fillWeight: 3,
  hachureGap: 3.5,
  roughness: 0.5
} } ... />

/*Function option */
<XYFrame lineRenderMode={ d => d.uncertain === true && "sketchy" } ... />

```

### defined: { _function_ }

If _defined_ is specified, sets the accessor function that controls where the line is defined. Similar to [D3's `line.defined` API](https://github.com/d3/d3-shape/blob/master/README.md#line_defined). Lines will be rendered with gaps where there is no defined data.

```jsx
<XYFrame defined={ d => !isNaN(d[1]) } ... />
```

## Summary Rendering

### summaries: { [_data_] }

An array of arrays or objects representing individual points on a chart. If you want to show points on an summary chart, use the [`showSummaryPoints`](#showsummarypoints-boolean) property.

```js
var points = [[1, 2], [3, 4], [5, 8], [7, 16], [9, 32], [11, 64], [13, 128]]

function MyAreaChart() {
  return <XYFrame xAccessor={d => d[0]} yAccessor={d => d[1]} summaries={points} />
}
```

### summaryDataAccessor: { _string_ | _function_ }

If _summaryDataAccessor_ is specified, determines how summary coordinates are accessed from the data array passed to the summaries attribute. Defaults to `coordinates`.

```html
/*String option */ <XYFrame summaryDataAccessor={ "areaValues" } ... /> /*Function
option */ <XYFrame summaryDataAccessor={ d => d.areaValues } ... />
```

### summaryStyle: { _function_ | _object_ }

If _summaryStyle_ is specified, sets the inline css style of each summary element.

```html
/*Object option */ <XYFrame summaryStyle={ { fill: "#e3e3e3", stroke: "#e3e3e3" } }
... /> /*Function option */ <XYFrame ... summaryStyle={ d => ({ fill: d.fill,
stroke: d.stroke }) } />
```

### summaryClass: { _string_ | _function_ }

If _summaryClass_ is specified, sets the css class of each summary element.

```html
/*String option */ <XYFrame summaryClass={ "area" } ... /> /*Function option */
<XYFrame summaryClass={ d => d.className } ... />
```

### summaryType: { _string_ | _object_ }

If _summaryType_ is specified, renders one of the following supported summary types: `"contour"`, `"heatmap"`, `"hexbin"`, `"basic"`, otherwise it defaults to `"basic"`. Each of these takes a set of points passed either to the `points` prop or as `coordinates` of an object (or objects) sent to the `summaries` and either creates summary graphics (all options except `basic`) or draws summaries assuming the points sent are coordinates in order for a shape (`basic`).

See the [XY summaries](/guides/xy-summaries) guide for detailed settings.

The attribute accepts a _string_ corresponding to one of the supported line types or an _object_ with a `type` key and _string_ value corresponding to one of the supported line types. Other optional keys are shown below in shared settings and for particular summary types:

```jsx
/*String option */
<XYFrame summaryType={ "hexbin" } ... />

/*Object option */
<XYFrame summaryType={ { type: "hexbin", bins: 0.1 } } ... />
```

### customSummaryMark: { _JSX_ | _function_ }

A function taking the summary datapoint and returning SVG JSX representation of the summary.

**Exposed as an object in the first paramter**

- d: The data element
- i: the index position in the data array
- xScale
- yScale
- styleFn: a function for determining the style object given `d` (passed through from the Frame from your summaryStyle)
- classFn: a function for determining the className given `d` (passed through from the Frame from your summaryClass)
- renderMode: a function for determining the renderMode given `d` (passed through from the Frame from your summaryRenderMode)
- key: a string that is generated from the renderKeyFn
- baseMarkProps: an object from the Frame’s baseMarkProps property that is meant to be spread to all generated marks, like this edge
- adjustedSize: size of the overall frame, helpful for ResponsiveFrames
- chartSize: size of the chart without margins
- margin

```jsx
/*JSX option */
<XYFrame customSummaryMark={ <Mark markType="rect" /> } ... />

/*Function option */
<XYFrame customSummaryMark={ d => (<Mark markType="rect" />) } ... />
```

### canvasSummaries: { _boolean_ | _function_ }

If _canvasSummaries_ is specified, renders summary elements in Canvas. The _canvasSummaries_ attribute accepts a _boolean_ or a _function_ that evaluates an summary and returns a boolean that determines whether or not to render the summary to [`Canvas`](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) instead of [`SVG`](https://developer.mozilla.org/en-US/docs/Web/SVG).

```jsx
/*Boolean option */
<XYFrame canvasSummaries="{" true } ... />

/*Function option */ <XYFrame canvasSummaries={ (d, i) => } ... />
```

### summaryRenderMode: { _string_ | _function_ | _object_ }

If _summaryRenderMode_ is specified, summaries are rendered in a non-photorealistic manner. This can be basic sketchy rendering using `"sketchy"` or an object with `renderMode: "sketchy"` and properties matching those found in [roughjs](https://roughjs.com/) or a function that takes a line data object and returns a string or object such as that. Sketchy render mode is honored in canvas rendering.

```jsx
/*Boolean option */
<XYFrame summaryRenderMode={ "sketchy" } ... />

/* Object option */
<XYFrame summaryRenderMode={ {
  renderMode: "sketchy",
  fillWeight: 3,
  hachureGap: 3.5,
  roughness: 0.5
} } ... />

/*Function option */
<XYFrame summaryRenderMode={ d => d.uncertain === true && "sketchy" } ... />

```

## Annotation and Decoration

### tooltipContent: { _function_ }

A function returning JSX HTML to display in the [tooltip](/guides/tooltips) (only active if `hoverAnnotation` is set to `true`). The tooltip is passed the data point (which if part of a line or summary will be decorated with a corresponding `parentLine` or `parentSummary` pointer to that object). The content is placed on and directly above the hovered point, so take that into account when using CSS to style the position and any additional elements. You can drop any HTML into this floating div, including another frame.

```jsx
<XYFrame
  hoverAnnotation={true}
  tooltipContent={d => (
    <div className="tooltip-content">
      <p>{d.name}</p>
      <p>{d.value}</p>
    </div>
  )}
/>
```

### axes: { _array_ }

An array of objects that defines axes. These objects roughly correspond to the options in [d3-axis](https://github.com/d3/d3-axis), with extended options such as `label`.

### annotations: { _array_ }

An array of objects to be processed using the frame's [built-in annotation](/guides/annotations#built-in-annotation-types) rules or the [custom defined rules](/guides/annotations#custom-annotation-rules). Annotations that have the same data properties that your data has will be automatically placed in the transformed x/y space.

```jsx
/*boolean option */
<XYFrame
  annotations={[
    { type: "xy", label: "A sample XY Annotation", day: 5, value: 105 },
    { type: "x", label: "A sample X Threshold Annotation", day: 5 },
    { type: "y", label: "A sample Y Threshold Annotation", value: 105 }
  ]}
/>
```

### svgAnnotationRules: { _function_ }

A function that takes an annotation object and returns a JSX SVG element. The function is sent `{ d, i, screenCoordinates, xScale, yScale, xAccessor, yAccessor, xyFrameProps, xyFrameState, summaries, points, lines, adjustedPosition, adjustedSize, annotationLayer, voronoiHover }`

```jsx
<XYFrame svgAnnotationRules={({ d, screenCoordinates }) => {
   if (d.type === "myCustomType") {
      return <g transform={`translate(${screenCoordinates})`}>
      <circle r={10} fill="red" />
      <text>{d.customLabelOrSomething}</text>
   }

   // Always return null if you want the default rules to be processed for types not defined in your custom rules
   return null
   }
} />
```

### htmlAnnotationRules: { _function_ }

A function that takes an annotation object and returns a JSX HTML element. The function is sent `{ d, i, screenCoordinates, xScale, yScale, xAccessor, yAccessor, xyFrameProps, xyFrameState, summaries, points, lines, adjustedPosition, adjustedSize, annotationLayer, voronoiHover }`. Elements can be placed using CSS `left` and `top` and will overlay on the chart. Internally, the default annotation for tooltips uses this method.

```jsx
<XYFrame
  svgAnnotationRules={({ d, screenCoordinates }) => {
    if (d.type === "myCustomType") {
      return (
        <div
          style={{
            left: `${screenCoordinates[0]}px`,
            bottom: `${screenCoordinates[1]}px`
          }}
        >
          {d.customLabelOrSomething}
        </div>
      )
    }

    // Always return null if you want the default rules to be processed for types not defined in your custom rules
    return null
  }}
/>
```

### annotationSettings: { _object_ }

An object with `{ layout, pointSizeFunction, labelSizeFunction }` containing [annotation settings](/guides/annotations#annotation-settings) to enable annotations bumping out of each others' way or placing them in the margins.

By default, marginalia will consider the entire frame size, i.e. height (if orient is `left` or `right`) or width (if orient is `top` or `bottom`). If you want to add a certain padding, you can use an additional `layout` property called `axisMarginOverride`. E.g. if you want the labels to not go below the bottom axis, set `axisMarginOverride={ bottom:0 }`, where `bottom:0` refers to the y-coordinate of `size[1] - margin.bottom`. If you want to add another 10px padding above the bottom x-axis, then set `axisMarginOverride={ bottom:-10 }`

```jsx
<XYFrame
  annotationSettings={{
    layout: {
      type: "marginalia",
      orient: "nearest",
      characterWidth: 8,
      lineWidth: 20,
      padding: 2,
      iterations: 1000,
      pointSizeFunction: () => 2
    }
  }}
/>
```

### matte: { _boolean_ }

Whether to turn on a matte (a border that covers the margin area to hide overflow) or a JSX custom matte.

```jsx
<XYFrame matte={true} />
```

### backgroundGraphics: { _array_ | _JSX_ }

A JSX or array of JSX to display behind the chart.

```jsx
<XYFrame backgroundGraphics={<image src="amazing.gif" />} />
```

### foregroundGraphics: { _array_ | _JSX_ }

A JSX or array of JSX to display in front of the chart.

```jsx
<XYFrame foregroundGraphics={<image src="copyright.png" />} />
```

### canvasPostProcess: { _"chuckClose"_ | _function_ }

Any HTML5 canvas processing that you might want to do to your canvas rendered elements. It has a built in transformation that makes your dataviz look like a Chuck Close painting or you can write a custom function.

```jsx
//Chuck Close
<XYFrame
   canvasPostProcess="chuckClose"
/>

//function option creating a glowing effect
<XYFrame
   canvasPostProcess={(canvas, context, size) => {
  const dataURL = canvas.toDataURL("image/png")
  const baseImage = document.createElement("img")

  baseImage.src = dataURL
  baseImage.onload = () => {
    context.clearRect(0, 0, size[0] + 120, size[1] + 120)
    context.filter = "blur(10px)"
    context.drawImage(baseImage, 0, 0)
    context.filter = "blur(5px)"
    context.drawImage(baseImage, 0, 0)
    context.filter = "none"
    context.drawImage(baseImage, 0, 0)
  }
}}
/>
```

## Interaction

### hoverAnnotation: { _bool_ | _array_ }

Turn on automatic [tooltips](/guides/tooltips) with a voronoi overlay to improve interaction. If you pass true, it will generate a simple SVG circle and a tooltip with content customized via the `tooltipContent` prop. If you pass an array you can pass any number of annotation objects that will have the properties filled with the props of the hovered item, which is good for creating complex highlighting behavior.

```jsx
// boolean
<XYFrame
hoverAnnotation={true}
/>

// boolean
<XYFrame
hoverAnnotation={[
   { type: "frame-hover" },
   { type: "highlight" },
   { type: "y" }
]}
/>
```

### customHoverBehavior: { _function_ }

A function to fire on hover that passes the data being hovered over.

```jsx
<XYFrame
  customHoverBehavior={d => {
    this.setState({ hoveredOn: d })
  }}
/>
```

### customClickBehavior: { _function_ }

A function to fire on click that passes the data being hovered over.

```jsx
<XYFrame
  customClickBehavior={d => {
    this.setState({ clickedOn: d })
  }}
/>
```

### customDoubleClickBehavior: { _function_ }

A function to fire on doubleclick that passes the data being hovered over.

```jsx
<XYFrame
  customDoubleClickBehavior={d => {
    this.setState({ doubleclicked: d })
  }}
/>
```

### interaction: { _object_ }

An object passed to the interaction layer that is currently only used to determine whether to activate the XY brush, its settings, and the actions to fire on its start, brush and end events. Used under the hood in `MinimapXYFrame` to enable the functionality in the minimap. See the [XY Brushes](/guides/xy-brushes) example.

- `start`: The function to run on the start of a brush
- `during`: The function to run at the during a brush
- `end`: The function to run at the end of a brush
- `brush`: A string `"xBrush"`, `"yBrush"`, or `"xyBrush"`
- `extent`: The base value for the brush, so you can set an extent if you want to initialize the brush with

```jsx
<XYFrame
  interaction={{
    start: startBrushingFunction,
    during: whileBrushingFunction,
    end: endBrushingFunction,
    brush: "xBrush", //xBrush, yBrush or xyBrush
    extent: extent //optional set starting extent
  }}
/>
```

## Miscellaneous

### dataVersion: { _string_ }

A simple optimization option. If you set dataVersion (a string) then XYFrame will not update the visualization layer until it receives a different string. This allows you to manage rendering when your code is making React re-render your chart all the time. This is a crude method and what you should do for optimization is make sure that any functions or data you're sending to your frame only change when they have actually changed (which means not creating arrays or functions inline or in your render function but up the chain somewhere).

### name: { _string_ }

Used internally to identify frames, which comes in handy when you need to link frames together.

### additionalDefs: { _JSX_ }

A JSX or array of JSX to be injected into the visualization layer's SVG `defs`. This is useful for [defining patterns](/guides/sketchy-patterns) that you want to use as fills, or markers or gradients or other SVG material typically defined in defs.

```jsx
<XYFrame
  additionalDefs={
    <linearGradient y2="1" id="paleWoodGradient">
      <stop stopColor="#8E0E00" offset="0%" />
      <stop stopColor="#1F1C18" offset="100%" />
    </linearGradient>
  }
/>
```

