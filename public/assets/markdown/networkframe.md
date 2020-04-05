A frame that displays topological data, which differs from other forms of data visualization in that x and y position are less important than connections and enclosures.

Supported visualization types include [path diagrams](/guides/path-diagrams), [force layouts](/guides/force-layouts) and [hierarchical diagrams](/guides/hierarchical).

`NetworkFrame` renders [nodes](#node-rendering) and [edges](#edge-rendering) from arrays of nodes (which are optional) and arrays of edges (which are optional). Rendering and styling is based on each element's corresponding properties. NetworkFrame data elements are accessible by tabbing to the data group (nodes or edges) and hitting enter to arrow-key navigate through the data elements.

Nodes are automatically generated from edge references to source or target that do not exist. Nodes are also decorated with a `degree` attribute, which is simple degree centrality (number of connections).

```jsx
import { NetworkFrame } from "semiotic"
;<NetworkFrame
  nodes={[{ name: "Susie" }, { name: "Shirley" }]}
  edges={[
    { source: "Susie", target: "Xianlin" },
    { source: "Shirley", target: "Susie" }
  ]}
  nodeStyle={{ fill: "blue" }}
  edgeStyle={{ stroke: "red" }}
  nodeIDAccessor={"name"}
/>
```

# &lt;API Reference>

- [General Properties](#general-properties)

  - [size: {[_width_, _height_]}](#size-width-height)
  - [networkType: {_string_ | _object_ | _function_ }](#networktype-string-object-function-)
  - [title: {_string_ | _JSX_}](#title-string-jsx)
  - [margin: {_number_ | _object_}](#margin-number-object)
  - [baseMarkProps: { _object_ }](#basemarkprops-object-)
  - [renderKey: { _string_ | _function_ }](#renderkey-string-function-)

- [Node Rendering](#node-rendering)
  - [nodeIDAccessor: {_string_ | _function_}](#nodeidaccessor-string-function)
  - [nodeStyle: {_object_ | _function_}](#nodestyle-object-function)
  - [nodeClass: {_string_ | _function_}](#nodeclass-string-function)
  - [nodeRenderMode: {_string_ | _function_}](#noderendermode-string-function)
  - [nodeLabels: { _boolean_ | _function_ }](#nodelabels-boolean-function)
  - [nodeSizeAccessor: { _number_ | _function_ }](#nodesizeaccessor-number-function)
  - [customNodeIcon { _function_ }](#customnodeicon-function)
  - [canvasNodes { _boolean_ | _function_ }](#canvasnodes-boolean--function)
  - [nodeRenderMode { _string_ | _function_ | _object_ }](#noderendermode-string--function--object)
- [Edge Rendering](#edge-rendering)
  - [sourceAccessor: {_string_ | _function_}](#sourceaccessor-string-function)
  - [targetAccessor: {_string_ | _function_}](#targetaccessor-string-function)
  - [edgeStyle: {_object_ | _function_}](#edgestyle-object-function)
  - [edgeClass: {_string_ | _function_}](#edgeclass-string-function)
  - [edgeRenderMode: {_string_ | _function_}](#edgerendermode-string-function)
  - [customEdgeIcon { _string_ | _object_ | _function_ }](#customedgeicon-_string-object-function)
  - [canvasEdges { _boolean_ | _function_ }](#canvasedges-boolean--function)
- [Annotation and Decoration](#annotation-and-decoration)

  - [tooltipContent: { _function_ }](#tooltipcontent-function)
  - [annotations: { _array_ }](#annotations-array)
  - [svgAnnotationRules: { _function_ }](#svgannotationrules-function)
  - [htmlAnnotationRules: { _function_ }](#htmlannotationrules-function)
  - [annotationSettings: { _object_ }](#annotationsettings-object)
  - [matte: { _boolean_ }](#matte-boolean-)

  - [backgroundGraphics: { _array_ | _JSX_ }](#backgroundgraphics-array-jsx)
  - [foregroundGraphics: { _array_ | _JSX_ }](#foregroundgraphics-array-jsx)

- [Interaction](#interaction)
  - [hoverAnnotation: { _bool_ }](#hoverannotation-bool)
  - [customHoverBehavior: { _function_ }](#customhoverbehavior-function)
  - [customClickBehavior: { _function_ }](#customclickbehavior-function)
  - [customDoubleClickBehavior: { _function_ }](#customdoubleclickbehavior-function)
  - [interaction: { _object_ }](#interaction-object)
- [Miscellaneous](#miscellaneous)
  - [name: { _string_ }](#name-string)
  - [position: { _array_ }](#position-array)
  - [additionalDefs: { _JSX_ }](#additionaldefs-jsx)

## General Properties

### size: {[_width_, _height_]}

If _size_ is specified, sets the width and height of the frame from the array of values. The array must contain two numbers which represents the width and height, respectively. Size defaults to `[500,500]`.

```jsx
<NetworkFrame size={[500, 500]} />
```

### networkType: {_string_ | _object_ | _function_ }

If _networkType_ is specified, sets the network visualization method. Each type organizes network data differently: `"force"`, `"motifs"`, `"sankey"`, `"arc"`, `"chord"`, `"dagre"`, `"matrix"`, `"cluster"`,`"tree"`, `"circlepack"`, `"treemap"`, and `"partition"`

Another advanced setting for a hierarchical networkType is `hierarchyChildren`, which takes a function. By default this is equivalent to `d => d.children`. By setting it to `d => d.values`, for example, one can then use NetworkFrame with a hierarchy as returned by the `nest().entries()` function of d3-collection.

```jsx
<!-- String option -->
<NetworkFrame networkType={"motifs"} />

<!-- Object option -->
<NetworkFrame networkType={{ type: "treemap" , padding: 10, projection: "vertical" }} />
```

See the following pages for detailed information about settings for each `networkType`:

- [Force Diagrams](/guides/hierarchical): for `force` and `motifs`
- [Hierarchical Diagrams](/guides/hierarchical): for `tree`, `cluster`, `circlepack`, `treemap`, and `partition`
- [Path Diagrams](/guides/path-diagrams): for `sankey`, `arc`, `chord`, and `dagre`
- [Adjacency Matrix](/examples/matrix): for `matrix` example

### title: {_string_ | _JSX_}

Centers this title at the top of the chart.

```jsx
<!-- String option -->
<NetworkFrame title={"Chart Title"} />

<!-- JSX option -->
<NetworkFrame title={<g><circle r={5} /><text>Chart Title</text></g>} />
```

### margin: {_number_ | _object_}

The margin can be set to one number, which is applied equally to all sides, or as an object.

```jsx
<!-- Single number option -->
<NetworkFrame margin={10} />

<!-- Object option -->
<NetworkFrame margin={{ top: 5, bottom: 10, left: 15, right: 20 }} />
```

### baseMarkProps: { _object_ }

This object will be spread to all marks that are generated in the frame. This is useful for any props that might be shared by all pieces, and especially useful to set the animation duration for the marks if you want to adjust from the default 1s duration.

```jsx
<NetworkFrame
  baseMarkProps={{ transitionDuration: { default: 500, fill: 2500 } }}
/>
```

### renderKey: { _string_ | _function_ }

By default, generated marks will be rendered with a key based on their array position. If you want to ensure that your marks perform animated transitions in a way that maintains consistency, you can designate a key as a string, in which case it will look for that prop as the key or a function that takes `(datapoint,index)` and returns a string to be used.

```jsx
/* string option */
<NetworkFrame renderKey="somePropToBeUsedAsAKey" />
```

```jsx
/* function option defaulting to array position if no key on datapoint.renderKeyID exists */
<NetworkFrame renderKey={(datapoint, index) => datapoint.renderKeyID || i} />
```

## Node Rendering

(Also known as "vertices" or "friends")

### nodeIDAccessor: {_string_ | _function_}

If nodeIDAccessor is specified, determines how _id_ values are accessed from the nodes array. In the case the data consists of an array of objects, a string can be used to assess the _id_ value(s). A function can also be used to access the _id_ value(s).

```jsx
<!-- String option -->
<!-- e.g. data=[{employee: "Red"}, {employee: "Andy"} ] -->
<NetworkFrame nodeIDAccessor={"employee"} />

<!-- Function option -->
<!-- e.g. data=[{employee: "Red"}, {employee: "Andy"} ] -->
<NetworkFrame nodeIDAccessor={d => d.employee} />
```

### nodeStyle: {_object_ | _function_}

If nodeStyle is specified, determines the style of each rendered node. This can be a React style object or a function that takes the node datapoint and returns a React style object.

```jsx
<!-- Object option -->
<NetworkFrame nodeStyle={{ stroke: "white", fill: "blue" }} />

<!-- Function option -->
<NetworkFrame nodeStyle={d => ({ stroke: "white", fill: d.color })} />
```

### nodeClass: {_string_ | _function_}

If nodeClass is specified, determines the CSS class of each rendered node. This can be a string or a function that takes the node datapoint and returns a string.

```jsx
// Object option
<NetworkFrame nodeClass="friend" />

// Function option
<NetworkFrame nodeClass={d => d.friendType} />
```

### nodeRenderMode: { _string_ | _function_ | _object_ }

If nodeRenderMode is specified, determines the renderMode of the underlying Mark (such as "sketchy").

```jsx
// String option
<NetworkFrame nodeRenderMode="sketchy" />

// Object option
<NetworkFrame nodeRenderMode={ {
  renderMode: "sketchy",
  fillWeight: 3,
  hachureGap: 3.5,
  roughness: 0.5
} } />

// Function option
<NetworkFrame nodeRenderMode={d => d.friendshipLevel === "no so great" ? "sketchy" : undefined} />
```

### canvasNodes: { _boolean_ | _function_ }

If _canvasNodes_ is specified, renders nodes elements in Canvas. The _canvasNodes_ attribute accepts a _boolean_ or a _function_ that evaluates a connector and returns a boolean that determines whether or not to render the node to [`Canvas`](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) instead of [`SVG`](https://developer.mozilla.org/en-US/docs/Web/SVG).

```jsx
/*Boolean option */
<NetworkFrame canvasNodes={ true } ... />

/*Function option */
<NetworkFrame canvasNodes={ (d, i) => } ... />
```

### nodeLabels: { _boolean_ | _function_ }

If _nodeLabels_ is set to `true` then each node will have a text label with the id of the node. Will also accept a function that takes the node and returns SVG JSX to be placed in the label position.

```jsx
<!-- Boolean option -->
<NetworkFrame nodeLabels={true} />

<!-- Function option -->
<NetworkFrame nodeLabels={d => d.degree > 5 ? <text>{d.id}</text> : null} />
```

### nodeSizeAccessor: { _number_ | _function_ }

By default nodes are represented as SVG `<circle>` elements with `r=5`. Use _nodeSizeAccessor_ to set a fixed size (with a number) or a dynamic size (with a function).

```jsx
<!-- Number option -->
<NetworkFrame nodeSizeAccessor={10} />

<!-- Function option -->
<NetworkFrame nodeSizeAccessor={d => d.degree * 5} />
```

### customNodeIcon { _function_ }

A function taking the node datapoint and returning SVG JSX representation of the node.

- d : the data for the node, which includes its x/y data
- i : the array position of the node data in the nodes array
- renderKeyFn : a function for determining the unique key for the rendered element (passed through from your renderKey function in the Frame)
- styleFn : a function for determining the style object given `d` (passed through from the Frame from your nodeStyle)
- classFn : a function for determining the className given `d` (passed through from the Frame from your nodeClass)
- renderMode : a function for determining the renderMode given `d` (passed through from the Frame from your edgeRenderMode)
- key - a string that is generated from the renderKeyFn or `node-${index value of this edge}`
- className : The results of the class function + " node"
- transform : Some nodes, like chord nodes, need to be translated (centered, typically) and the `translate(${d.x},${d.y})` is sent in this form
- baseMarkProps : an object from the Frame’s baseMarkProps property that is meant to be spread to all generated marks, like this edge
- adjustedSize
- chartSize
- margin

```jsx
<NetworkFrame
  customNodeIcon={d => (
    <rect
      width={d.degree}
      height={d.degree}
      x={-d.degree / 2}
      y={-d.degree / 2}
      style={{
        fill: d.createdByFrame ? "rgb(0, 162, 206)" : "rgb(179, 51, 29)"
      }}
    />
  )}
/>
```

## Edge Rendering

(Also known as "links" or "connections")

### sourceAccessor: {_string_ | _function_}

If sourceAccessor is specified, determines how _source_ values are accessed from the edges data array. In the case the data consists of an array of objects, a string can be used to assess the _source_ value(s). A function can also be used to access the _source_ value(s).

```jsx
<!-- String option -->
<!-- e.g. data=[{manager: "Red", report: "Andy"}, {manager: "Warden", report: "Red"}, ... ] -->
<NetworkFrame sourceAccessor={"manager"} />

<!-- Function option -->
<!-- e.g. data=[["Red", "Andy"], ["Warden", "Red"], ... ] -->
<NetworkFrame sourceAccessor={d => d[0]} />
```

### targetAccessor: {_string_ | _function_}

If targetAccessor is specified, determines how _target_ values are accessed from the edges data array. In the case the data consists of an array of objects, a string can be used to assess the _target_ value(s). A function can also be used to access the _target_ value(s).

```jsx
<!-- String option -->
<!-- e.g. data=[{manager: "Red", report: "Andy"}, {manager: "Warden", report: "Red"}, ... ] -->
<NetworkFrame targetAccessor={"report"} />

<!-- Function option -->
<!-- e.g. data=[["Red", "Andy"], ["Warden", "Red"], ... ] -->
<NetworkFrame sourceAccessor={d => d[1]} />
```

### edgeStyle: {_object_ | _function_}

Sets the style of each rendered edge. This can be a React style object or a function that takes the edge datapoint and returns a React style object.

```jsx
<!-- Object option -->
<NetworkFrame edgeStyle={{ stroke: "red", fill: "darkred" }} />

<!-- Function option -->
<NetworkFrame edgeStyle={d => ({ stroke: "white", fill: d.source.color })} />
```

### edgeClass: {_string_ | _function_}

Sets the CSS class of each rendered edge. This can be a string or a function that takes the edge datapoint and returns a string.

```jsx
// Object option
<NetworkFrame edgeClass="friend" />

// Function option
<NetworkFrame edgeClass={d => d.friendType} />
```

### edgeRenderMode: {_string_ | _function_}

If edgeRenderMode is specified, determines the renderMode of the underlying Mark (such as "sketchy").

```jsx
// Object option
<NetworkFrame edgeRenderMode="sketchy" />

// Object option
<NetworkFrame edgeRenderMode={ {
  renderMode: "sketchy",
  fillWeight: 3,
  hachureGap: 3.5,
  roughness: 0.5
} } />

// Function option
<NetworkFrame edgeRenderMode={d => d.friendshipLevel === "no so great" ? "sketchy" : undefined} />
```

### canvasEdges: { _boolean_ | _function_ }

If _canvasEdges_ is specified, renders edge elements in Canvas. The _canvasEdges_ attribute accepts a _boolean_ or a _function_ that evaluates a connector and returns a boolean that determines whether or not to render the edge to [`Canvas`](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) instead of [`SVG`](https://developer.mozilla.org/en-US/docs/Web/SVG).

```jsx
/*Boolean option */
<NetworkFrame canvasEdges={ true } ... />

/*Function option */
<NetworkFrame canvasEdges={ (d, i) => } ... />
```

### edgeType { _string_ | _object_ | _function_ }

A string (One of `'none', 'curve', 'linearc','ribbon','arrowhead','halfarrow','nail','comet','taffy'`) or an object with `{ type }` equal to one of these strings (with additional options depending on which edge type is selected) or a function that takes an edge datapoint and returns SVG JSX representation of the connection between two edges.

```jsx
<!-- String option -->
<NetworkFrame edgeType="halfarrow" />

<!-- Function option -->
<NetworkFrame edgeType={d => <line
    x1={d.source.x}
    x2={d.target.x}
    y1={d.source.y}
    y2={d.target.y}
    style={{ stroke: "red" }}
/>} />
```

### customEdgeIcon { _function_ }

A function taking the edge datapoint and returning SVG JSX representation of the edge.

**Exposed as an object in the first paramter**

- d: The data element of the edge, which has props like source and target that give you x/y coordinates to draw your own edge
- i: the index position in the data array
- renderKeyFn: a function for determining the unique key for the rendered element (passed through from your renderKey function in the Frame)
- styleFn: a function for determining the style object given `d` (passed through from the Frame from your edgeStyle)
- classFn: a function for determining the className given `d` (passed through from the Frame from your edgeClass)
- renderMode: a function for determining the renderMode given `d` (passed through from the Frame from your edgeRenderMode)
- key - a string that is generated from the renderKeyFn or `edge-${index value of this edge}`
- className: The results of the class function + “ edge”
- transform: Some edges, like chord edges, need to be translated (centered, typically) and the `translate(${d.x},${d.y})` is sent in this form
- baseMarkProps: an object from the Frame’s baseMarkProps property that is meant to be spread to all generated marks, like this edge
- adjustedSize
- chartSize
- margin

## Annotation and Decoration

### tooltipContent: { _function_ }

A function returning JSX HTML to display in the [tooltip](/guides/tooltips) (only active if `hoverAnnotation` is set to `true`). The tooltip is passed the node datapoint being hovered. The content is placed on and directly above the hovered point, so take that into account when using CSS to style the position and any additional elements. You can drop any HTML into this floating div, including another frame.

```jsx
<NetworkFrame
  hoverAnnotation={true}
  tooltipContent={d => (
    <div className="tooltip-content">
      <p>{d.name}</p>
      <p>{d.value}</p>
    </div>
  )}
/>
```

### annotations: { _array_ }

An array of objects to be processed using the frame's [built-in annotation](/guides/annotations#built-in-annotation-types) rules or the [custom defined rules](/guides/annotations#custom-annotation-rules). By default `NetworkFrame` supports the following annotation types:

### svgAnnotationRules: { _function_ }

A function that takes an annotation object and returns a JSX SVG element. The function is sent `{ d, i, screenCoordinates, networkFrameProps, networkFrameState, nodes, edges, adjustedPosition, adjustedSize, annotationLayer, voronoiHover }`

### htmlAnnotationRules: { _function_ }

A function that takes an annotation object and returns a JSX HTML element. The function is sent `{ d, i, screenCoordinates, networkFrameProps, networkFrameState, nodes, edges, adjustedPosition, adjustedSize, annotationLayer, voronoiHover }`. Elements can be placed using CSS `left` and `top` and will overlay on the chart. Internally, the default annotation for tooltips uses this method.

### annotationSettings: { _object_ }

An object with `{ layout, pointSizeFunction, labelSizeFunction }` containing [annotation settings](/guides/annotations#annotation-settings) to enable annotations bumping out of each others' way or placing them in the margins.

```jsx
<NetworkFrame
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
<NetworkFrame matte={true} />
```

### backgroundGraphics: { _array_ | _JSX_ }

A JSX or array of JSX to display behind the chart.

### foregroundGraphics: { _array_ | _JSX_ }

A JSX or array of JSX to display in front of the chart.

## Interaction

### hoverAnnotation: { _bool_ }

Turn on automatic [tooltips](/guides/tooltips) for each node. Content of the tooltips defaults to the id value and can be customized with `tooltipContent`.

### customHoverBehavior: { _function_ }

A function to fire on hover of the node being hovered over.

```jsx
<NetworkFrame
  customHoverBehavior={d => {
    this.setState({ hoveredOn: d })
  }}
/>
```

### customClickBehavior: { _function_ }

A function to fire on click of the node being hovered over.

```jsx
<NetworkFrame
  customClickBehavior={d => {
    this.setState({ clickedOn: d })
  }}
/>
```

### customDoubleClickBehavior: { _function_ }

A function to fire on doubleclick of the node being hovered over.

```jsx
<NetworkFrame
  customDoubleClickBehavior={d => {
    this.setState({ doubleclicked: d })
  }}
/>
```

### interaction: { _object_ }

An object passed to the interaction layer that could be used to create an XY brushable region but this hasn't been tested. Likely will be used to implement brush/lasso or other interaction that makes sense in topological space.

## Miscellaneous

### name: { _string_ }

Used internally to identify frames, which comes in handy when you need to link frames together.

### additionalDefs: { _JSX_ }

A JSX or array of JSX to be injected into the visualization layer's SVG `defs`. This is useful for [defining patterns](/guides/sketchy-patterns) that you want to use as fills, or markers or gradients or other SVG material typically defined in defs.

```jsx
<NetworkFrame
  additionalDefs={
    <linearGradient y2="1" id="paleWoodGradient">
      <stop stopColor="#8E0E00" offset="0%" />
      <stop stopColor="#1F1C18" offset="100%" />
    </linearGradient>
  }
/>
```
