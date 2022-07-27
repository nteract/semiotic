import React from "react"
import { mount } from "enzyme"
import FacetController from "./FacetController"
import OrdinalFrame from "./OrdinalFrame"
import { ResponsiveXYFrame } from "./ResponsiveXYFrame"

jest.mock("./useBoundingRect")

const SimpleDivPropsDisplay = (props) => (
  <div style={{ padding: "20px" }}>
    <h3 style={{ fontSize: "14px", fontWeight: 900 }}>
      Component showing inherited facetprops
    </h3>
    {Object.keys(props.facetprops)
      .map((k) => k)
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
  coordinates: orData.map((d) => ({ ...d }))
}
const xyFrameData2 = {
  color: "darkred",
  coordinates: []
}
const xyFrameData3 = {
  color: "darkred",
  coordinates: orData3.map((d) => ({ ...d }))
}

describe("FacetController", () => {
  it("renders without crashing", () => {
    mount(
      <FacetController>
        <div>Div Child 1</div>
        <div>Div Child 2</div>
      </FacetController>
    )
  })

  it("renders Semiotic frames", () => {
    mount(
      <FacetController
        size={[300, 300]}
        margin={{ top: 10, left: 55, bottom: 10, right: 10 }}
        oPadding={5}
        oAccessor="column"
        rAccessor="ovalue"
        projection="horizontal"
        type="bar"
        style={(d) => ({ fill: d.color })}
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
    )
  })

  it("renders mixed vanilla HTML & Semiotic frames", () => {
    mount(
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
        style={(d) => ({ fill: d.color })}
        pieceHoverAnnotation={true}
        pieceIDAccessor="color"
        sharedRExtent={true}
      >
        <ResponsiveXYFrame title={"LC1"} lines={xyFrameData1} invertX={true} />
        <div>JUST A DIV</div>
        <SimpleDivPropsDisplay />
        <ResponsiveXYFrame title={"LC2"} lines={xyFrameData2} />
        <div>JUST A ANOTHER DIV</div>
        <ResponsiveXYFrame title={"LC3"} lines={xyFrameData3} />
      </FacetController>
    )
  })
})
