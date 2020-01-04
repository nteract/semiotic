import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import {
  FacetController,
  OrdinalFrame,
  XYFrame,
  ResponsiveXYFrame
} from "../../components"

const SimpleDivPropsDisplay = props => (
  <div style={{ padding: "20px" }}>
    <h3 style={{ fontSize: "14px", fontWeight: 900 }}>
      Component showing inherited facetprops
    </h3>
    {Object.keys(props.facetprops)
      .map(k => k)
      .join(",")}
  </div>
)

const orData = [
  {
    column: "a",
    color: "lightblue",
    step: 1,
    ovalue: 15
  },
  {
    column: "a",
    color: "darkred",
    step: 2,
    ovalue: 15
  },
  {
    column: "b",
    color: "lightblue",
    step: 3,
    ovalue: 25
  },
  {
    column: "b",
    color: "darkred",
    step: 4,
    ovalue: 15
  },
  {
    column: "c",
    color: "lightblue",
    step: 5,
    ovalue: 5
  },
  {
    column: "c",
    color: "darkred",
    step: 6,
    ovalue: 15
  },
  {
    column: "d",
    color: "lightblue",
    step: 7,
    ovalue: 8
  }
]

const orData2 = [
  {
    column: "a",
    color: "lightblue",
    step: 1,
    ovalue: 30
  },
  {
    column: "a",
    color: "darkred",
    step: 2,
    ovalue: 50
  },
  {
    column: "b",
    color: "lightblue",
    step: 3,
    ovalue: 5
  },
  {
    column: "b",
    color: "darkred",
    step: 4,
    ovalue: 10
  },
  {
    column: "c",
    color: "lightblue",
    step: 5,
    ovalue: 25
  },
  {
    column: "d",
    color: "lightblue",
    step: 6,
    ovalue: 20
  }
]

const orData3 = [
  {
    column: "a",
    color: "lightblue",
    step: 1,
    ovalue: 40
  },
  {
    column: "a",
    color: "darkred",
    step: 2,
    ovalue: 20
  },
  {
    column: "b",
    color: "lightblue",
    step: 3,
    ovalue: 2
  },
  {
    column: "b",
    color: "darkred",
    step: 4,
    ovalue: 20
  },
  {
    column: "c",
    color: "lightblue",
    step: 5,
    ovalue: 10
  },
  {
    column: "c",
    color: "darkred",
    step: 6,
    ovalue: 20
  },
  {
    column: "d",
    color: "lightblue",
    step: 7,
    ovalue: 5
  },
  {
    column: "d",
    color: "darkred",
    step: 8,
    ovalue: 20
  }
]

const components = []

components.push({
  name: "Faceting"
})

const xyFrameData1 = {
  color: "darkred",
  coordinates: orData.map(d => ({ ...d }))
}
const xyFrameData2 = {
  color: "darkred",
  coordinates: []
}
const xyFrameData3 = {
  color: "darkred",
  coordinates: orData3.map(d => ({ ...d }))
}
const xyFrameDataBase = {
  color: "gray",
  coordinates: orData3.map(d => ({ ...d }))
}

export default class FacetControllerDemo extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      type: "partition",
      projection: "radial",
      xyframe: { ...xyFrameData3 },
      removeFrame: false
    }
  }
  render() {
    const buttons = []

    const examples = []

    examples.push({
      name: "Basic",
      demo: (
        <div>
          <button
            style={{ color: "black" }}
            onClick={() =>
              this.setState({
                xyframe: {
                  color: "darkred",
                  coordinates: orData3.map((d, i) => ({
                    step: i + 3,
                    ovalue: i * 15
                  }))
                }
              })
            }
          >
            Change
          </button>

          <button
            style={{ color: "black" }}
            onClick={() =>
              this.setState({
                removeFrame: true
              })
            }
          >
            Remove Frame
          </button>
          <div style={{ display: "flex" }}>
            <FacetController
              size={[300, 300]}
              margin={{ top: 10, left: 55, bottom: 10, right: 10 }}
              oPadding={5}
              oAccessor="column"
              rAccessor="ovalue"
              projection="horizontal"
              type="bar"
              style={d => ({ fill: d.color })}
              pieceIDAccessor="color"
              pieceHoverAnnotation={[
                { type: "desaturation-layer" },
                { type: "frame-hover" },
                {
                  type: "highlight",
                  style: { fill: "orange", fillOpacity: 0.5 }
                }
              ]}
              sharedRExtent={true}
              axes={{ orient: "left" }}
            >
              <OrdinalFrame data={orData} />
              <OrdinalFrame data={orData2} />
              <OrdinalFrame data={orData3} />
            </FacetController>
          </div>
          <div style={{ display: "flex" }}>
            <FacetController
              size={[300, 300]}
              margin={{ top: 10, left: 55, bottom: 40, right: 10 }}
              xAccessor="step"
              yAccessor="ovalue"
              lineStyle={d => ({ stroke: d.color })}
              hoverAnnotation={true}
              lineIDAccessor={d => d.color}
              axes={[{ orient: "left" }, { orient: "bottom" }]}
              title="LINE"
              sharedYExtent={true}
              tooltipContent={d => {
                return (
                  <div
                    className="tooltip-content"
                    style={{ background: d.parentLine.color }}
                  >
                    TOOLTIP:
                    {d.parentLine.color}
                  </div>
                )
              }}
            >
              <XYFrame lines={[xyFrameData1, xyFrameDataBase]} />
              {!this.state.removeFrame && (
                <XYFrame lines={[xyFrameData2, xyFrameDataBase]} />
              )}
              <XYFrame
                lines={[this.state.xyframe, xyFrameDataBase]}
                xExtent={[2]}
                invertX={true}
              />
            </FacetController>
          </div>
          <div style={{ display: "flex" }}>
            <FacetController
              size={[300, 300]}
              margin={{ top: 10, left: 55, bottom: 40, right: 10 }}
              xAccessor="step"
              yAccessor="ovalue"
              lineStyle={{ stroke: "darkred" }}
              hoverAnnotation={true}
              lineIDAccessor={() => true}
              axes={[{ orient: "left" }]}
              sharedXExtent={true}
              sharedYExtent={true}
              oPadding={5}
              oAccessor="column"
              rAccessor="ovalue"
              type="bar"
              style={d => ({ fill: d.color })}
              pieceHoverAnnotation={[
                { type: "frame-hover" },
                { type: "highlight", style: { fill: "orange" } }
              ]}
              pieceIDAccessor="color"
              sharedRExtent={true}
            >
              <OrdinalFrame data={orData} />
              <XYFrame
                title={"LC1"}
                lines={xyFrameData1}
                annotations={[
                  {
                    column: "b",
                    color: "lightblue",
                    step: 3,
                    type: "react-annotation",
                    label: "test annotation"
                  }
                ]}
              />
              <XYFrame title={"LC2"} lines={xyFrameData2} />
              <XYFrame title={"LC3"} lines={xyFrameData3} />
            </FacetController>
          </div>
          <div style={{ width: "100%" }}>
            <h3>With non-frame children</h3>
            <FacetController
              size={[300, 300]}
              responsiveWidth={true}
              margin={{ top: 10, left: 55, bottom: 40, right: 10 }}
              xAccessor="step"
              yAccessor="ovalue"
              lineStyle={{ stroke: "darkred" }}
              hoverAnnotation={true}
              lineIDAccessor={() => true}
              axes={[{ orient: "left" }]}
              sharedYExtent={true}
              oPadding={5}
              oAccessor="column"
              rAccessor="ovalue"
              type="bar"
              style={d => ({ fill: d.color })}
              pieceHoverAnnotation={true}
              pieceIDAccessor="color"
              sharedRExtent={true}
            >
              <ResponsiveXYFrame
                title={"LC1"}
                lines={xyFrameData1}
                invertX={true}
              />
              <div>JUST A DIV</div>
              <SimpleDivPropsDisplay />
              <ResponsiveXYFrame title={"LC2"} lines={xyFrameData2} />
              <div>JUST A ANOTHER DIV</div>
              <ResponsiveXYFrame title={"LC3"} lines={xyFrameData3} />
            </FacetController>
          </div>
        </div>
      ),
      source: `const SimpleDivPropsDisplay = props => (
  <div style={{ padding: "20px" }}>
    <h3 style={{ fontSize: "14px", fontWeight: 900 }}>
      Component showing inherited facetprops
    </h3>
    {Object.keys(props.facetprops)
      .map(k => k)
      .join(",")}
  </div>
)

<div>
<div style={{ display: "flex" }}>
  <FacetController
    size={[300, 300]}
    margin={{ top: 10, left: 55, bottom: 10, right: 10 }}
    oPadding={5}
    oAccessor="column"
    rAccessor="ovalue"
    type="bar"
    style={d => ({ fill: d.color })}
    pieceIDAccessor="color"
    pieceHoverAnnotation={true}
    sharedRExtent={true}
    axes={{ orient: "left" }}
  >
    <OrdinalFrame data={orData} />
    <OrdinalFrame data={orData2} />
    <OrdinalFrame data={orData3} />
  </FacetController>
</div>
<div style={{ display: "flex" }}>
  <FacetController
    size={[300, 300]}
    margin={{ top: 10, left: 55, bottom: 40, right: 10 }}
    xAccessor="step"
    yAccessor="ovalue"
    lineStyle={{ stroke: "darkred" }}
    hoverAnnotation={true}
    lineIDAccessor={() => true}
    axes={[{ orient: "left" }, { orient: "bottom" }]}
    sharedXExtent={true}
    sharedYExtent={true}
    title="LINE"
  >
    <XYFrame lines={{ coordinates: orData }} />
    <XYFrame lines={{ coordinates: orData2 }} />
    <XYFrame lines={{ coordinates: orData3 }} />
  </FacetController>
</div>
<div style={{ display: "flex" }}>
  <FacetController
    size={[300, 300]}
    margin={{ top: 10, left: 55, bottom: 40, right: 10 }}
    xAccessor="step"
    yAccessor="ovalue"
    lineStyle={{ stroke: "darkred" }}
    hoverAnnotation={true}
    lineIDAccessor={() => true}
    axes={[{ orient: "left" }, { orient: "bottom" }]}
    sharedXExtent={true}
    sharedYExtent={true}
    oPadding={5}
    oAccessor="column"
    rAccessor="ovalue"
    type="bar"
    style={d => ({ fill: d.color })}
    pieceHoverAnnotation={true}
    pieceIDAccessor="color"
    sharedRExtent={true}
    axes={{ orient: "left" }}
  >
    <OrdinalFrame data={orData} />
    <XYFrame
      title={"LC1"}
      lines={{ coordinates: orData }}
      annotations={[
        {
          column: "b",
          color: "lightblue",
          step: 3,
          type: "react-annotation",
          label: "test annotation"
        }
      ]}
    />
    <XYFrame
      title={"LC2"}
      lines={{ coordinates: orData2 }}
    />
    <XYFrame
      title={"LC3"}
      lines={{ coordinates: orData3 }}
    />
  </FacetController>
</div>

<div style={{ width: "100%" }}>
  <h3>With non-frame children</h3>
  <FacetController
    size={[300, 300]}
    responsiveWidth={true}
    margin={{ top: 10, left: 55, bottom: 40, right: 10 }}
    xAccessor="step"
    yAccessor="ovalue"
    lineStyle={{ stroke: "darkred" }}
    hoverAnnotation={true}
    lineIDAccessor={() => true}
    axes={[{ orient: "left" }, { orient: "bottom" }]}
    sharedYExtent={true}
    oPadding={5}
    oAccessor="column"
    rAccessor="ovalue"
    type="bar"
    style={d => ({ fill: d.color })}
    pieceHoverAnnotation={true}
    pieceIDAccessor="color"
    sharedRExtent={true}
    axes={{ orient: "left" }}
  >
    <ResponsiveXYFrame
      title={"LC1"}
      lines={xyFrameData1}
      invertX={true}
    />
    <div>JUST A DIV</div>
    <SimpleDivPropsDisplay />
    <ResponsiveXYFrame title={"LC2"} lines={xyFrameData2} />
    <div>JUST A ANOTHER DIV</div>
    <ResponsiveXYFrame title={"LC3"} lines={xyFrameData3} />
  </FacetController>
</div>

</div>`
    })

    return (
      <DocumentComponent
        name="Faceting"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          Faceting is accomplshed using the FacetController, which is a wrapper
          that uses composition to decorate any child frames (whether ORFrame,
          NetworkFrame or XYFrame in any mix) with the valid attributes from
          FacetController while implementing two features to help with faceting:
        </p>

        <p>
          pieceHoverAnnotation or hoverAnnotation set to true will create
          tooltips across the frames. You still need to set lineIDAccessor
          and/or pieceIDAccessor to appropriate ovalues for this to work
          relatively. If your pieces in ORFrame have matching data structures
          with points in XYFrame then you will also see tooltips across frames.
          Currently the hover annotation settings in FacetController only accept
          true but in the future will respect the model in the rest of Semiotic
          where you can send an array of annotation types or functions returning
          annotation types which will be propagated across frames.
        </p>

        <p>
          sharedXExtent, sharedYExtent and sharedRExtent will set the respective
          extents of child frames to match the min/max of the smallest and
          largest ovalues of any siblings. Currently this only supports true but
          will also be updated to support the existing extent model in frames
          where you can send partial extents.
        </p>
      </DocumentComponent>
    )
  }
}

FacetControllerDemo.title = "Faceting"
