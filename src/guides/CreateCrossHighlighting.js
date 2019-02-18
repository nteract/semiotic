import React from "react"
import MarkdownText from "../MarkdownText"
import { XYFrame, OrdinalFrame } from "semiotic"
import theme from "../theme"

import { frameProps, linePercent, cumulativeLine } from "./CreateALineChart"
import { stackedFrameProps } from "./CreateABarChart"

export default class CreateCrossHighlighting extends React.Component {
  constructor(props) {
    super(props)

    this.state = { annotations: [] }
  }

  componentDidMount() {
    window.Prism.highlightAll()
  }

  hoverBehavior = d => {
    if (d) {
      this.setState({
        annotations: [
          {
            type: "highlight",
            ...d,
            style: { stroke: "black", strokeWidth: 5 }
          }
        ]
      })
    } else {
      this.setState({
        annotations: []
      })
    }
  }

  render() {
    return (
      <div>
        <MarkdownText
          text={`
Highlighting is a type of [annnotation](/guides/annotations), \`{type:"highlight"}\` that duplicates a mark to the annotation layer for styling. 

A common use case is for highlighting something while dimming out other elements, or for cross-highlighting.

You can send this annotation two ways.


If you want the highlight only on hover, instead of passing \`hoverAnnotation={true}\` on your frame, you can pass an object \`hoverAnnotation=[{ type: "highlight", style: {strokeWidth: 10} }]\`


In XYFrame it uses the function in \`lineIDAccessor\` to evaluate what objects to highlight and will render that shape (or shapes) in the AnnotationLayer with style and class defined by the annotation. 


Move your mouse over the chart to see the line highlighted.

      `}
        />
        <XYFrame
          {...frameProps}
          hoverAnnotation={[
            {
              type: "highlight",
              style: { strokeWidth: 10 }
            }
          ]}
          lineIDAccessor="title"
        />
        <MarkdownText
          text={`
\`\`\`jsx
<XYFrame
  {...frameProps}
  hoverAnnotation={[
    {
      type: "highlight",
      style: { strokeWidth: 10 }
    }
  ]}
  lineIDAccessor="title"
/>
\`\`\`

For highlighting regardless of interactions, send an annotation to the annotations prop and specific the matching \`lineIDAccessor\` in your annotation \`annotations=[{ type: "highlight", style: {strokeWidth: 10}, title: "Ex Machina"}]\`

      `}
        />

        <XYFrame
          {...frameProps}
          annotations={[
            {
              type: "highlight",
              title: "Ex Machina",
              style: { strokeWidth: 10, fill: "blue" }
            }
          ]}
          lineIDAccessor="title"
        />

        <MarkdownText
          text={`
## Dynamic Styles / Maintaining the tooltip

Style can be a React style object or function returning a React style object and class can be a string or function returning a string. 

All highlight annotations created in the annotation layer will always have \`"highlight-annotation"\` class in addition to any passed classes.

You can also maintain the default \`hoverAnnotation\` tooltip behavior by also passing a \`type="frame-hover"\` annotation 



    `}
        />
        <XYFrame
          {...frameProps}
          hoverAnnotation={[
            {
              type: "highlight",
              style: d => {
                return { ...frameProps.lineStyle(d, d.key), strokeWidth: 5 }
              }
            },
            { type: "frame-hover" }
          ]}
          lineIDAccessor="title"
        />

        <MarkdownText
          text={`
\`\`\`jsx
<XYFrame
  {...frameProps}
  hoverAnnotation={[
      type: "highlight",
      style: d => {
        return { stroke: theme[d.key], strokeWidth: 5, fill: "none" };
      }
    },
    { type: "frame-hover" }]}
  lineIDAccessor="title"
/>
\`\`\`

## Desaturation Layer

Using the \`highlight\` annotation in tandem with the \`deaturation-layer\` annotation allows you to create the effect of dimming the background when hovering.

  `}
        />

        <XYFrame
          {...frameProps}
          hoverAnnotation={[
            {
              type: "desaturation-layer",
              style: { fill: "white", opacity: 0.6 }
            },
            {
              type: "highlight",
              style: d => {
                return { ...frameProps.lineStyle(d, d.key), strokeWidth: 5 }
              }
            }
          ]}
          lineIDAccessor="title"
        />

        <MarkdownText
          text={`

\`\`\`jsx
<XYFrame
  {...frameProps}
  hoverAnnotation={[
      type: "highlight",
      style: d => {
        return { stroke: theme[d.key], strokeWidth: 5, fill: "none" };
      }
    },
    {
      type: "desaturation-layer",
      style: { fill: "white", opacity: 0.6 }
    }]}
  lineIDAccessor="title"
/>
\`\`\`

## Cross Highlighting
Frames have custom interaction using \`customHoverBehavior\`, \`customClickBehavior\` and \`customDoubleClickBehavior\`. You can use these to take the value of the hovered or clicked item and pass a highlight annotation made from that data object to the annotations property of another frame to achieve cross-highlighting. 

    `}
        />
        <div className="flex">
          <XYFrame
            customHoverBehavior={this.hoverBehavior}
            {...linePercent}
            hoverAnnotation={true}
            annotations={this.state.annotations}
            size={[400, 300]}
            lineIDAccessor="title"
          />
          <XYFrame
            {...cumulativeLine}
            size={[400, 300]}
            hoverAnnotation={true}
            annotations={this.state.annotations}
            customHoverBehavior={this.hoverBehavior}
            lineIDAccessor="title"
          />
        </div>
        <MarkdownText
          text={`
\`\`\`jsx
import React from "react"
import { frameProps, linePercent, cumulativeLine } from "./CreateALineChart";

export default class CreateCrossHighlighting extends React.Component {
  constructor(props) {
    super(props);
    this.state = { annotations: [] };
  }

  hoverBehavior = d => {
    if (d) {
      this.setState({
        annotations: [
          {
            type: "highlight",
            ...d,
            style: { stroke: "black", strokeWidth: 5 }
          }
        ]
      });
    } else {
      this.setState({
        annotations: []
      });
    }
  };

  render () {
   return <div>
    <XYFrame
    {...linePercent}
      size={[400, 300]}
      hoverAnnotation={true}
      customHoverBehavior={this.hoverBehavior}
      annotations={this.state.annotations}
      lineIDAccessor="title"
    />
    <XYFrame
      {...cumulativeLine}
      size={[400, 300]}
      hoverAnnotation={true}
      customHoverBehavior={this.hoverBehavior}
      annotations={this.state.annotations}
      lineIDAccessor="title"
    />
   </div>
   }
  }
\`\`\`

## Point and Area Highlighting
Highlight annotations will return all points, lines and areas that match the id value of the passed highlight. This can be used to highlight multiple shapes if your lineIDAccessor is sophisticated (or simple) enough. Here I check in lineIDAccessor not only for title but if the object has a parentLine (indicating a point generated by showLinePoints) to match against the parentLine title value.

    `}
        />
        <XYFrame
          {...frameProps}
          hoverAnnotation={[
            {
              type: "highlight",
              style: d => {
                console.log(d)
                return {
                  strokeWidth: 3,
                  stroke: theme[d.key],
                  fill: theme[d.key]
                }
              }
            }
          ]}
          showLinePoints={true}
          pointStyle={{ fill: "none", r: 10 }}
          lineIDAccessor={d => (d.parentLine && d.parentLine.title) || d.title}
        />
        <MarkdownText
          text={`
\`\`\`jsx
<XYFrame
  {...frameProps}
  hoverAnnotation={[
      type: "highlight",
      style: d => {
        return { stroke: theme[d.key], strokeWidth: 5, fill: theme[d.key] };
      }
    },
    {
      type: "desaturation-layer",
      style: { fill: "white", opacity: 0.6 }
    }]}
  showLinePoints={true}
  pointStyle={{ fill: "none", r: 10 }}
  lineIDAccessor={d => (d.parentLine && d.parentLine.title) || d.title}
/>
\`\`\`

## OrinalFrame Highlighting
OrdinalFrames get highlighting, too. Unlike in XYFrame, there's already one built-in id accessor in OrdinalFrame: \`oAccessor\`, additionally if you define a \`pieceIDAccessor\` you can use that to highlight individual pieces (this is the same property used to annotate specific pieces with other OrdinalFrame annotatinos). Without a \`pieceIDAccessor\` defined, all items in a column/row will be highlighted. To enable highlighting on hover for a piece use \`pieceHoverAnnotation\`, for the entire column/row use \`hoverAnnotation\`

Highlighting is not available for custom graphics or summary graphics.

You don't have to send annotations with valid oAccessor or pieceIDAccessor traits. If you do, they will highlight all the pieces that satisfy the one you do send, for example: 

    `}
        />

        <OrdinalFrame
          {...stackedFrameProps}
          pieceHoverAnnotation={[
            {
              type: "highlight",
              style: d => ({
                fill: d.action === "tweets" ? theme[5] : theme[4],
                stroke: "white"
              })
            }
          ]}
          annotations={[
            {
              type: "highlight",
              user: "Betty",
              style: { fill: theme[4], stroke: "none" }
            },
            {
              type: "highlight",
              rIndex: 0,
              style: d => {
                return { fill: "none", stroke: theme[5], strokeWidth: 5 }
              }
            }
          ]}
          pieceIDAccessor="rIndex"
        />
        <MarkdownText
          text={`

\`\`\`jsx

<OrdinalFrame
  {...frameProps}
  pieceHoverAnnotation={[
    {
      type: "highlight",
      style: d => ({
        fill: d.action === "tweets" ? theme[5] : theme[5]
      })
    }
  ]}
  annotations={[
    {
      type: "highlight",
      user: "Betty",
      style: { fill: theme[4], stroke: "none" }
    },
    {
      type: "highlight",
      action: "tweets",
      style: { fill: "none", stroke: theme[5], strokeWidth: 5 }
    }
  ]}
  pieceIDAccessor="action"
/>

\`\`\`

    `}
        />
      </div>
    )
  }
}
