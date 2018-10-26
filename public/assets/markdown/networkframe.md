A `<Frame>` that displays topological data, which differs from other forms of data visualization in that x and y position are less important than connections and enclosures. Examples include network diagrams, word trees, sankey diagrams and bubble charts. `<NetworkFrame>` charts render [nodes](#node-rendering) and [edges](#edge-rendering) from arrays of nodes (which are optional) and arrays of edges (which are optional). Rendering and styling is based on each element's corresponding properties. NetworkFrame data elements are accessible by tabbing to the data group (nodes or edges) and hitting enter to arrow-key navigate through the data elements.

Nodes are automatically generated from edge references to source or target that do not exist, these nodes have `createdByFrame: true` if you want to treat them differently. Nodes are also decorated with a `degree` attribute, which is simple degree centrality (number of connections) if you want to use that.

```jsx
import { NetworkFrame } from 'semiotic'

<NetworkFrame
   nodes={[{name: "Susie"}, {name: "Shirley"}]}
   edges={[{source: "Susie", target: "Xianlin"},{source: "Shirley", target: "Susie"}]}
   nodeStyle={{ fill: "blue" }}
   edgeStyle={{ stroke: "red" }}
   nodeIDAccessor={"name"}
/>
```

# &lt;API Reference>

- [General Properties](#general-properties)
  - [size: {[_width_, _height_]}](#size--width---height)
  - [networkType: {_string_ | _object_ | _function_ }](#networktype-string--object--function-)
  - [title: {_string_ | _JSX_}](#title--string---jsx)
  - [margin: {_number_ | _object_}](#margin--number---object)
  - [zoomToFit: { _boolean_ }](#zoomtofit--boolean-)
- [Node Rendering](#node-rendering)
  - [nodeIDAccessor: {_string_ | _function_}](#nodeidaccessor--string---function)
  - [nodeStyle: {_object_ | _function_}](#nodestyle--object---function)
  - [nodeLabels: { _boolean_ | _function_ }](#nodelabels--boolean---function)
  - [nodeSizeAccessor: { _number_ | _function_ }](#nodesizeaccessor--number---function)
  - [customNodeIcon { _function_ }](#customnodeicon--function)
- [Edge Rendering](#edge-rendering)
  - [sourceAccessor: {_string_ | _function_}](#sourceaccessor--string---function)
  - [targetAccessor: {_string_ | _function_}](#targetaccessor--string---function)
  - [edgeStyle: {_object_ | _function_}](#edgestyle--object---function)
  - [customEdgeType { _string_ | _object_ | _function_ }](#customedgetype-_string---object---function)
- [Annotation and Decoration](#annotation-and-decoration)
  - [tooltipContent: { _function_ }](#tooltipcontent--function)
  - [axis: { _object_ }](#axis--object)
  - [oLabel: { _bool_ | _function_ }](#olabel--bool---function)
  - [annotations: { _array_ }](#annotations--array)
  - [legend: { _object_ }](#legend--object)
  - [svgAnnotationRules: { _function_ }](#svgannotationrules--function)
  - [htmlAnnotationRules: { _function_ }](#htmlannotationrules--function)
  - [annotationSettings: { _object_ }](#annotationsettings--object)
  - [backgroundGraphics: { _array_ | _JSX_ }](#backgroundgraphics--array---jsx)
  - [foregroundGraphics: { _array_ | _JSX_ }](#foregroundgraphics--array---jsx)
- [Interaction](#interaction)
  - [hoverAnnotation: { _bool_ }](#hoverannotation--bool)
  - [customHoverBehavior: { _function_ }](#customhoverbehavior--function)
  - [customClickBehavior: { _function_ }](#customclickbehavior--function)
  - [customDoubleClickBehavior: { _function_ }](#customdoubleclickbehavior--function)
  - [interaction: { _object_ }](#interaction--object)
- [Miscellaneous](#miscellaneous)
  - [name: { _string_ }](#name--string)
  - [position: { _array_ }](#position--array)
  - [additionalDefs: { _JSX_ }](#additionaldefs--jsx)
  - [download: { _bool_ }](#download--bool)
  - [downloadFields: { _array_ }](#downloadfields--array)

## General Properties

### size: {[_width_, _height_]}

If _size_ is specified, sets the width and height of the frame from the array of values. The array must contain two numbers which represents the width and height, respectively.

Note: _Margin_ will not be added to the frame size. It's more like CSS _padding_.

```jsx
<NetworkFrame size={[500, 500]} />
```

### networkType: {_string_ | _object_ | _function_ }

If _networkType_ is specified, sets the network visualization method. Currently supports "force" or "motifs" or "wordcloud". Each type organizes network data differently, with "force" providing a typical force-directed network layout, _motifs_ creating the same but with disconnected components placed as tiles, and "wordcloud" trying to use rectangular collision detection. Sending an object allows you to adjust advanced settings, like number of iterations and method specific settings like font size for "word cloud".

Another advanced setting for a hierarchical networkType is `hierarchyChildren`, which takes a function. By default this is equivalent to `d => d.children`. By setting it to `d => d.values`, for example, one can then use NetworkFrame with a hierarchy as returned by the `nest().entries()` function of d3-collection.

_This will also support a "per-tick" function once the specifications can be figured out._

```jsx
<!-- String option -->
<NetworkFrame networkType={"motifs"} />

<!-- Object option -->
<NetworkFrame networkType={{ type: "wordcloud" , rotate: d => d.topic_score < 1, fontSize: 36, fontWeight: 900 }} />
```

### title: {_string_ | _JSX_}

If _title_ is specified, sets the text for the chart title, which appears centered at the top of the chart. The title can be either a string or JSX object.

```jsx
<!-- String option -->
<NetworkFrame title={"Chart Title"} />

<!-- JSX option -->
<NetworkFrame title={<g><circle r={5} /><text>Chart Title</text></g>} />
```

### margin: {_number_ | _object_}

If _margin_ is specified, sets the margin(s) on the frame. The margin can be set to one number, which is applied equally to all sides, or as an object.

```jsx
<!-- Single number option -->
<NetworkFrame margin={10} />

<!-- Object option -->
<NetworkFrame margin={{ top: 5, bottom: 10, left: 15, right: 20 }} />
```

### zoomToFit: { _boolean_ }

If _zoomToFit_ is set to `true` then the layout will be dynamically resized to fit within the available space. This could cause distortion but also prevents the disappearance of disconnected nodes and components.

```jsx
<NetworkFrame zoomToFit={true} />
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

### nodeRenderMode: {_string_ | _function_}

If nodeRenderMode is specified, determines the renderMode of the underlying Mark (such as "sketchy").

```jsx
// Object option
<NetworkFrame nodeRenderMode="sketchy" />

// Function option
<NetworkFrame nodeRenderMode={d => d.friendshipLevel === "no so great" ? "sketchy" : undefined} />
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

If edgeStyle is specified, determines the style of each rendered edge. This can be a React style object or a function that takes the edge datapoint and returns a React style object.

```jsx
<!-- Object option -->
<NetworkFrame edgeStyle={{ stroke: "red", fill: "darkred" }} />

<!-- Function option -->
<NetworkFrame edgeStyle={d => ({ stroke: "white", fill: d.source.color })} />
```

### edgeClass: {_string_ | _function_}

If edgeClass is specified, determines the CSS class of each rendered edge. This can be a string or a function that takes the edge datapoint and returns a string.

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

// Function option
<NetworkFrame edgeRenderMode={d => d.friendshipLevel === "no so great" ? "sketchy" : undefined} />
```

### edgeType { _string_ | _object_ | _function_ }

A string (One of `'none','linearc','ribbon','arrowhead','halfarrow','nail','comet','taffy'`) or an object with `{ type }` equal to one of these strings (with additional options depending on which edge type is selected) or a function that takes an edge datapoint and returns SVG JSX representation of the connection between two edges.

```jsx
<!-- String option -->
<NetworkFrame edgeType="halfarrow" />

<!-- Object option -->
<NetworkFrame edgeType={{ type: "taffy", centerWidth: 1 }} />

<!-- Function option -->
<NetworkFrame edgeType={d => <line
    x1={d.source.x}
    x2={d.target.x}
    y1={d.source.y}
    y2={d.target.y}
    style={{ stroke: "red" }}
/>} />
```

## Annotation and Decoration

### tooltipContent: { _function_ }

A function returning JSX HTML to display in the tooltip (only active if `hoverAnnotation` is set to `true`). The tooltip is passed the node datapoint being hovered. The content is placed on and directly above the hovered point, so take that into account when using CSS to style the position and any additional elements. You can drop any HTML into this floating div, including another frame, if you want to have data visualization in your data visualization so you can visualize while you visualize.

### annotations: { _array_ }

An array of objects to be processed using the frame's built-in annotation rules or the custom defined rules. By default NetworkFrame supports the following annotation types:

- `node`: An object with an `id` value that corresponds to the ID value of a single node.
- `d3-annotation` or a D3-Annotation annotation class function: An object with an `id` that corresponds to a single node, along with traditional D3-Annotation object settings, which will then be modified to have the XY position of the referenced node.
- `enclose`: An object with an array of `ids` that corresponds to nodes that will be circled using the D3-Annotation CalloutCircle method.

### legend: { _object_ }

An object that defines the legend to be displayed on the frame. It uses the format seen in [<Legend>](legend)

```jsx
const legend = {
    legendGroups: [ {
        styleFn: d => ({ fill: d.color, stroke: "black" }),
        items: [
          { label: "Area 1", color: "red" },
          { label: "Area 2", color: "blue" }
        ]
      }]
  }


<NetworkFrame
  legend={legend}
/>
```

### svgAnnotationRules: { _function_ }

A function that takes an annotation object and returns a JSX SVG element. The function is sent `{ d, i, networkFrameProps, networkFrameState, nodes, edges }`

### htmlAnnotationRules: { _function_ }

A function that takes an annotation object and returns a JSX HTML element. The function is sent `{ d, i, networkFrameProps, networkFrameState, nodes, edges }`. Elements can be placed using CSS `left` and `top` and will overlay on the chart. Internally, the default annotation for tooltips uses this method.

### annotationSettings: { _object_ }

An object with `{ layout, pointSizeFunction, labelSizeFunction }` containing custom annotation settings to enable annotations bumping out of each others' way or placing them in the margins.

### backgroundGraphics: { _array_ | _JSX_ }

A JSX or array of JSX to display behind the chart.

### foregroundGraphics: { _array_ | _JSX_ }

A JSX or array of JSX to display in front of the chart.

## Interaction

### hoverAnnotation: { _bool_ }

Turn on automatic tooltips for each node. Content of the tooltips defaults to the id value and can be customized with `tooltipContent`.

### customHoverBehavior: { _function_ }

A function to fire on hover of the node being hovered over.

### customClickBehavior: { _function_ }

A function to fire on click of the node being hovered over.

### customDoubleClickBehavior: { _function_ }

A function to fire on doubleclick of the node being hovered over.

### interaction: { _object_ }

An object passed to the interaction layer that could be used to create an XY brushable region but this hasn't been tested. Likely will be used to implement brush/lasso or other interaction that makes sense in topological space.

## Miscellaneous

### name: { _string_ }

Used internally to identify frames, which comes in handy when you need to link frames together.

### position: { _array_ }

Just an offset and hardly ever useful

### additionalDefs: { _JSX_ }

JSX to be injected into the visualization layer's SVG `defs`.

### download: { _bool_ }

Enable a Node Download button and Edge Download button to download the data as a CSV.

### downloadFields: { _array_ }

The field keys to download from each datapoint. By default, the CSV download only shows the id, source and target values.
