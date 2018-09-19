A [`<Frame>`](https://github.com/emeeks/semiotic/wiki/API-Reference#frames) that displays continuous data along the _x_ and _y_ axis. Examples include time series charts, scatterplots, line, and area charts. `<XYFrame>` charts render [points](#point-rendering), [lines](#line-rendering), and/or [area](#area-rendering) elements. Rendering and styling is based on each element's corresponding properties. XYFrame data elements are accessible by tabbing to the data group (points, lines or areas) and hitting enter to arrow-key navigate through the data elements.

```jsx
import { XYFrame } from 'semiotic'

<XYFrame
   points={[{price: 1.25, size: 15}, {price: 2.25, size: 12}, ...]}
   pointStyle={{ fill: "blue" }}
   xAccessor={"price"}
   yAccessor={"size"}
/>
```

**Table of Contents**

- [General Properties](#general-properties)
  - [size: { [_width_, _height_] }](#size--width-height-)
  - [xAccessor: { _string_ | _function_ }](#xaccessor--string--function-)
  - [yAccessor: { _string_ | _function_ }](#yaccessor--string--function-)
  - [title: { _string_ | _JSX_ }](#title--string--jsx-)
  - [margin: { _number_ | _object_ }](#margin--number--object-)
  - [xScaleType: { _d3-scale_ }](#xscaletype--d3-scale-)
  - [yScaleType: { _d3-scale_ }](#yscaletype--d3-scale-)
  - [xExtent: { [_min_, _max_] }](#xextent--min--max-)
  - [yExtent: { [_min_, _max_] }](#yextent--min--max-)
  - [invertX: { _boolean_ }](#invertx--boolean-)
  - [invertY: { _boolean_ }](#inverty--boolean-)
  - [showLinePoints: { _boolean_ }](#showlinepoints--boolean-)
  - [baseMarkProps: { _object_ }](#baseMarkProps--object-)
- [Point Rendering](#point-rendering)
  - [points: { [_data_] }](#points--data-)
  - [pointStyle: { _object_ | _function_ }](#pointstyle--object--function-)
  - [pointClass: { _string_ | _function_ }](#pointclass--string--function-)
  - [canvasPoints: { _boolean_ | _function_ }](#canvaspoints--boolean--function-)
  - [customPointMark: { _JSX_ | _function_ }](#custompointmark--jsx--function-)
- [Line Rendering](#line-rendering)
  - [lines: { [_data_] }](#lines--data-)
  - [lineDataAccessor: { _string_ | _function_ }](#linedataaccessor--string--function-)
  - [lineType: { _string_ | _object_ }](#linetype--string--object-)
  - [lineStyle: { _object_ | _function_ }](#linestyle--object--function-)
  - [lineClass: { _string_ | _function_ }](#lineclass--string--function-)
  - [lineIDAccessor: { _string_ | _function_ }](#lineidaccessor--string--function-)
  - [customLineMark: { _function_ }](#customlinemark--function-)
  - [canvasLines: { _boolean_ | _function_ }](#canvaslines--boolean--function-)
  - [defined: { _function_ }](#defined--function-)
- [Area Rendering](#area-rendering)
  - [areas: { [_data_] }](#areas--data-)
  - [areaDataAccessor: { _string_ | _function_ }](#areadataaccessor--string--function-)
  - [areaStyle: { _function_ | _object_ }](#areastyle--function--object-)
  - [areaClass: { _string_ | _function_ }](#areaclass--string--function-)
  - [canvasAreas: { _boolean_ | _function_ }](#canvasareas--boolean--function-)
- [Annotation and Decoration](#annotation-and-decoration)

  - [tooltipContent: { _function_ }](#tooltipcontent--function-)
  - [axes: { _array_ }](#axes--array-)
  - [legend: bool or object](#legend-bool-or-object)
  - [annotations: { _array_ }](#annotations--array-)
  - [svgAnnotationRules: { _function_ }](#svgannotationrules--function-)
  - [htmlAnnotationRules: { _function_ }](#htmlannotationrules--function-)
  - [annotationSettings: { _object_ }](#annotationsettings--object-)
  - [matte: { _boolean_ }](#matte--boolean-)
  - [backgroundGraphics: { _array_ | _JSX_ }](#backgroundgraphics--array--jsx-)
  - [foregroundGraphics: { _array_ | _JSX_ }](#foregroundgraphics--array--jsx-)
  - [canvasPostProcess: { _"chuckClose"_ | _function_ }](#foregroundgraphics--chuckClose--function-)

- [Interaction](#interaction)
  - [hoverAnnotation: { _bool_ | _array_ }](#hoverannotation--bool--array-)
  - [customHoverBehavior: { _function_ }](#customhoverbehavior--function-)
  - [customClickBehavior: { _function_ }](#customclickbehavior--function-)
  - [customDoubleClickBehavior: { _function_ }](#customdoubleclickbehavior--function-)
  - [interaction: { _object_ }](#interaction--object-)
- [Miscellaneous](#miscellaneous)
  - [dataVersion: { _string_ }](#dataversion--string-)
  - [name: { _string_ }](#name--string-)
  - [additionalDefs: { _JSX_ }](#additionaldefs--jsx-)
  - [download: { _bool_ }](#download--bool-)
  - [downloadFields: { _array_ }](#downloadfields--array-)

## General Properties

### size: { [_width_, _height_] }

If _size_ is specified, sets the width and height of the frame from the array of values. The array must contain two numbers which represents the width and height, respectively. Size defaults to `[500,500]`.

**Note**: _Margin_ will not be added to the frame size. It's more like CSS _padding_.

```jsx
<XYFrame size={ [500,500] } ... />
```

### xAccessor: { _string_ | _function_ }

If _xAccessor_ is specified, determines how _x_ values are accessed from the data array. In the case the data consists of an array of objects, a string can be used to access the _x_ value(s). A function can also be used to access the _x_ value(s).

```jsx
/* String option
e.g. data=[{x: 1, y: 2}, {x:2, y: 4}, ... ] */
<XYFrame xAccessor={ "x" } ... />

/* Function option
e.g. data=[[1, 2], [2, 4], ... ] */
<XYFrame xAccessor={ d => d[0] } ... />
```

### yAccessor: { _string_ | _function_ }

If _yAccessor_ is specified, determines how _y_ values are accessed from the data array. In the case the data consists of an array of objects, a string can be used to assess the _y_ value(s). A function can also be used to access the _y_ value(s).

```jsx
/*String option
e.g. data=[{x: 1, y: 2}, {x: 2, y: 4}, ... ] */
<XYFrame yAccessor={ "y" } ... />

/*Function option
e.g. data=[[1, 2], [2, 4], ... ] */
<XYFrame yAccessor={ d => d[1] } ... />
```

### title: { _string_ | _JSX_ }

If _title_ is specified, sets the text for the chart title, which appears centered at the top of the chart. The title can be either a string or JSX object.

```jsx
/*String option */
<XYFrame title={ "Chart Title" } ... />

/*JSX option */
<XYFrame title={ <text fontSize={30} fill="gold">"Chart Title"</text> } ... />
```

### margin: { _number_ | _object_ }

If _margin_ is specified, sets the margin(s) on the frame. The margin can be set to one number, which is applied equally to all sides, or as an object.

```jsx
/*Single number option */
<XYFrame margin={ 10 } ... />

/*Object option */
<XYFrame margin={ { top: 5, bottom: 10, left: 15, right: 20 } } ... />
```

### xScaleType: { _d3-scale_ }

Custom [D3 scale](https://github.com/d3/d3-scale#d3-scale) for the _x_ axis. Defaults to [`scaleLinear()`](https://github.com/d3/d3-scale#scaleLinear).

```jsx
<XYFrame xScaleType={ d3.scaleTime() } ... />
```

### yScaleType: { _d3-scale_ }

Custom [D3 scale](https://github.com/d3/d3-scale#d3-scale) for the _y_ axis. Defaults to [`scaleLinear()`](https://github.com/d3/d3-scale#scaleLinear).

```jsx
<XYFrame yScaleType={ d3.scaleLinear() } ... />
```

### xExtent: { [_min_, _max_] }

If _xExtent_ is specified, sets the _min_ and/or _max_ value(s) for the _x_ axis. The array may contain two numbers, or it can contain a number and an `undefined` value, if you only want to set the min or max extent. The extent exposes an `onChange` callback function that updates with the calculated extent value.

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

If _invertX_ is specified, inverts the _x_ axis such that the _min_ and _max_ values are transposed.

```jsx
<XYFrame invertX={ true } ... />
```

### invertY: { _boolean_ }

If _invertY_ is specified, inverts the _y_ axis such that the _min_ and _max_ values are transposed.

```jsx
<XYFrame invertY={ true } ... />
```

### showLinePoints: { _boolean_ }

If _showLinePoints_ is specified, displays the points that make up the line and/or area elements. These points will be styled just like points that are added to the `points` array using `pointStyle` or `pointClass` with the only difference being that points will have a `parentLine` or `parentArea` property that will point to the line or area that this point is a part of.

```jsx
<XYFrame showLinePoints={ true } ... />
```

### baseMarkProps: { _object_ }

If _baseMarkProps_ is specified, the object sent will be spread to all marks that are generated in the frame. This is useful for any props that might be shared by all pieces, and especially useful to set the animation duration for the marks if you want to adjust from the default 1s duration.

```jsx
<XYFrame baseMarkProps={{ transitionDuration: { default: 500, fill: 2500 } }} />
```

## Point Rendering

### points: { [_data_] }

An _array_ of arrays or objects representing individual points on a chart. If you want to show points on a line or area chart, use the [`showLinePoints`](#showlinepoints-boolean) property.

```jsx
var points = [[1, 2], [3, 4], [5, 8], [7, 16], [9, 32], [11, 64], [13, 128]]

function MyScatterPlot() {
  return <XYFrame xAccessor={d => d[0]} yAccessor={d => d[1]} points={points} />
}
```

### pointStyle: { _object_ | _function_ }

If _pointStyle_ is specified, sets the inline css `style` of each point element. This can be a JSX style object or a function that is passed the point data and returns a JSX style object.

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

If _pointClass_ is specified, sets the css `class` of each point element. This can be a string class name or a function that takes the point data and returns a string.

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

If _customPointMark_ is specified, renders a _JSX_ [`<Mark>`](https://github.com/emeeks/semiotic/wiki/API-Reference#marks) for each point, otherwise points use `<Mark markType="circle" />`. The _customPointMark_ attribute accepts a _JSX_ object or _function_ that returns a _JSX_ object as the marker for each point.

**Note**: The value(s) of the [`pointStyle`](#pointstyle--object--function-) attribute is then applied to the custom mark, but only at the top level. So if you want to make multipart graphical objects, have the customPointMark declare the style.

```jsx
/*JSX option */
<XYFrame customPointMark={ <Mark markType="rect" /> } ... />

/*Function option */
<XYFrame customPointMark={ d => (<Mark markType="rect" />) } ... />
```

## Line Rendering

### lines: { [_data_] }

An _array_ of arrays or objects representing individual points along a line. If you want to show points along the line, use the [`showLinePoints`](#showlinepoints-boolean) property.

```jsx
var lines = [[[1, 2], [3, 4], [5, 8], [7, 16], [9, 32], [11, 64], [13, 128]]]

function MyLineChart() {
  return <XYFrame xAccessor={d => d[0]} yAccessor={d => d[1]} lines={lines} />
}
```

### lineDataAccessor: { _string_ | _function_ }

If _lineDataAccessor_ is specified, determines how line _coordinates_ are accessed from the data array passed to the [`lines`](#lines--data-) attribute. Defaults to `coordinates`.

```jsx
/*String option */
<XYFrame lineDataAccessor={ "lineValues" } ... />

/*Function option */
<XYFrame lineDataAccessor={ d => d.lineValues } ... />
```

### lineType: { _string_ | _object_ }

If _lineType_ is specified, renders one of the supported [line types](https://github.com/emeeks/semiotic/wiki/lineType-Advanced-Settings). The attribute accepts a _string_ corresponding to one of the supported line types or an _object_ with a `type` key and _string_ value corresponding to one of the supported line types. An optional `options` key on the _object_ that determines how the lines are generated is also supported.

```jsx
/*String option */
<XYFrame lineType={ "stackedarea" } ... />

/*Object option */
<XYFrame lineType={ { type: "stackedarea", sort: (a,b) => a.level - b.level } } ... />
```

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

Is _customLineMark_ is specified, renders a custom _JSX_ element for each line. For example, `<DividedLine>` can be used in place of normal lines or other line generators taking advantage of the `<Frame>`'s settings. The _customLineMark_ attribute accepts a function that returns a _JSX_ object

```jsx
<XYFrame customLineMark={ d => (<DividedLines ... />) } ... />
```

### canvasLines: { _boolean_ | _function_ }

If _canvasLines_ is specified, renders line elements in [`Canvas`](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API). The _canvasLines_ attribute accepts a boolean or a function that evaluates a line and returns a boolean that determines whether or not to render the line to `Canvas` instead of [`SVG`](https://developer.mozilla.org/en-US/docs/Web/SVG).

```jsx
/*Boolean option */
<XYFrame canvasLines={ true } ... />

/*Function option drawing only the even lines with canvas */
<XYFrame canvasLines={ (d, i) => i%2 === 0 } ... />
```

### defined: { _function_ }

If _defined_ is specified, sets the accessor function that controls where the line is defined. Similar to [D3's `line.defined` API](https://github.com/d3/d3-shape/blob/master/README.md#line_defined). Lines will be rendered with gaps where there is no defined data.

```jsx
<XYFrame defined={ d => !isNaN(d[1]) } ... />
```

## Area Rendering

### areas: { [_data_] }

An array of arrays or objects representing individual points on a chart. If you want to show points on an area chart, use the [`showLinePoints`](#showlinepoints-boolean) property.

```js
var points = [[1, 2], [3, 4], [5, 8], [7, 16], [9, 32], [11, 64], [13, 128]]

function MyAreaChart() {
  return <XYFrame xAccessor={d => d[0]} yAccessor={d => d[1]} areas={points} />
}
```

### areaDataAccessor: { _string_ | _function_ }

If _areaDataAccessor_ is specified, determines how area coordinates are accessed from the data array passed to the areas attribute. Defaults to `coordinates`.

```html
/*String option */
<XYFrame areaDataAccessor={ "areaValues" } ... />

/*Function option */
<XYFrame areaDataAccessor={ d => d.areaValues } ... />
```

### areaStyle: { _function_ | _object_ }

If _areaStyle_ is specified, sets the inline css style of each area element.

```html
/*Object option */
<XYFrame areaStyle={ { fill: "#e3e3e3", stroke: "#e3e3e3" } } ... />

/*Function option */
<XYFrame
  ...
  areaStyle={ d => ({ fill: d.fill, stroke: d.stroke }) }
/>
```

### areaClass: { _string_ | _function_ }

If _areaClass_ is specified, sets the css class of each area element.

```html
/*String option */
<XYFrame areaClass={ "area" } ... />

/*Function option */
<XYFrame areaClass={ d => d.className } ... />
```

### canvasAreas: { _boolean_ | _function_ }

If _canvasAreas_ is specified, renders area elements in Canvas. The _canvasAreas_ attribute accepts a _boolean_ or a _function_ that evaluates an area and returns a boolean that determines whether or not to render the area to [`Canvas`](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) instead of [`SVG`](https://developer.mozilla.org/en-US/docs/Web/SVG).

```html
/*Boolean option */
<XYFrame canvasAreas={ true } ... />

/*Function option */
<XYFrame canvasAreas={ (d, i) => } ... />
```

## Annotation and Decoration

### tooltipContent: { _function_ }

A function returning JSX HTML to display in the tooltip (only active if `hoverAnnotation` is set to `true`). The tooltip is passed the data point (which if part of a line or area will be decorated with a corresponding `parentLine` or `parentArea` pointer to that object). The content is placed on and directly above the hovered point, so take that into account when using CSS to style the position and any additional elements. You can drop any HTML into this floating div, including another frame, if you want to have data visualization in your data visualization so you can visualize while you visualize.

### axes: { _array_ }

An array of objects that defines axes. These objects roughly correspond to the options in D3 array, with extended options such as `label`.

### legend: bool or object

A boolean or object determining whether to turn on a legend. Currently only works with line data. If set to `true`, will place a legend on the upper right corner of the chart area. Legends are 100px wide, so you can account for this in your right-hand margin. Can also take an object with `{ position }` that can be set to `"right"` to get the default behavior or `"left"` to place it on the top left corner or an array of exact XY position for the legend. The legend will automatically have items for each line, labeled with the string value that corresponds to the lineIDAccessor of the line.

```jsx
/*boolean option */
<XYFrame legend={true} />
/*object option */
<XYFrame legend={{
        legendGroups: [
          {
            styleFn: d => ({ fill: d.color, stroke: "black" }),
            items: [
              { label: "Area 1", color: "red" },
              { label: "Area 2", color: "blue" }
            ]
          }
        ]
      }} ... />
```

### annotations: { _array_ }

An array of objects to be processed using the frame's built-in annotation rules or the custom defined rules. Annotations need to have the same data properties that your data has, so if your data has `xAccessor="day"` then your annotations will need a corresponding `day` value.

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

A function that takes an annotation object and returns a JSX SVG element. The function is sent `{ d, i, screenCoordinates, xScale, yScale, xAccessor, yAccessor, xyFrameProps, xyFrameState, areas, points, lines }`

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

A function that takes an annotation object and returns a JSX HTML element. The function is sent `{ d, i, screenCoordinates, xScale, yScale, xAccessor, yAccessor, xyFrameProps, xyFrameState, areas, points, lines }`. Elements can be placed using CSS `left` and `top` and will overlay on the chart. Internally, the default annotation for tooltips uses this method.

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

An object with `{ layout, pointSizeFunction, labelSizeFunction }` containing custom annotation settings to enable annotations bumping out of each others' way or placing them in the margins.

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

Turn on automatic tooltips with a voronoi overlay to improve interaction. If you pass true, it will generate a simple SVG circle and a tooltip with content customized via the `tooltipContent` prop. If you pass an array you can pass any number of annotation objects that will have the properties filled with the props of the hovered item, which is good for creating complex highlighting behavior.

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

An object passed to the interaction layer that is currently only used to determine whether to activate the XY brush, its settings, and the actions to fire on its start, brush and end events. Used under the hood in `MinimapXYFrame` to enable the functionality in the minimap.

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

A JSX or array of JSX to be injected into the visualization layer's SVG `defs`. This is useful for defining patterns that you want to use as fills, or markers or gradients or other SVG material typically defined in defs.

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

### download: { _bool_ }

Enable a download button to download the data as a CSV

### downloadFields: { _array_ }

The field keys to download from each datapoint. By default, the CSV download only shows the x and y values.
