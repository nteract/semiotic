import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import { FacetController, OrdinalFrame, XYFrame } from "../../components"

const orData = [
  {
    column: "a",
    color: "lightblue",
    step: 1,
    value: 15
  },
  {
    column: "a",
    color: "darkred",
    step: 2,
    value: 15
  },
  {
    column: "b",
    color: "lightblue",
    step: 3,
    value: 25
  },
  {
    column: "b",
    color: "darkred",
    step: 4,
    value: 15
  },
  {
    column: "c",
    color: "lightblue",
    step: 5,
    value: 5
  },
  {
    column: "c",
    color: "darkred",
    step: 6,
    value: 15
  },
  {
    column: "d",
    color: "lightblue",
    step: 7,
    value: 8
  }
]

const orData2 = [
  {
    column: "a",
    color: "lightblue",
    step: 1,
    value: 30
  },
  {
    column: "a",
    color: "darkred",
    step: 2,
    value: 10
  },
  {
    column: "b",
    color: "lightblue",
    step: 3,
    value: 5
  },
  {
    column: "b",
    color: "darkred",
    step: 4,
    value: 10
  },
  {
    column: "c",
    color: "lightblue",
    step: 5,
    value: 25
  },
  {
    column: "d",
    color: "lightblue",
    step: 6,
    value: 20
  }
]

const orData3 = [
  {
    column: "a",
    color: "lightblue",
    step: 1,
    value: 40
  },
  {
    column: "a",
    color: "darkred",
    step: 2,
    value: 20
  },
  {
    column: "b",
    color: "lightblue",
    step: 3,
    value: 2
  },
  {
    column: "b",
    color: "darkred",
    step: 4,
    value: 20
  },
  {
    column: "c",
    color: "lightblue",
    step: 5,
    value: 10
  },
  {
    column: "c",
    color: "darkred",
    step: 6,
    value: 20
  },
  {
    column: "d",
    color: "lightblue",
    step: 7,
    value: 5
  },
  {
    column: "d",
    color: "darkred",
    step: 8,
    value: 20
  }
]

const components = []

components.push({
  name: "Faceting"
})

export default class FacetControllerDemo extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      type: "partition",
      projection: "radial"
    }
  }
  render() {
    const buttons = []

    const examples = []

    examples.push({
      name: "Basic",
      demo: (
        <div>
          <div style={{ display: "flex" }}>
            <FacetController
              size={[300, 300]}
              margin={{ top: 10, left: 55, bottom: 10, right: 10 }}
              oPadding={5}
              oAccessor="column"
              rAccessor="value"
              type="bar"
              style={d => ({ fill: d.color })}
              pieceIDAccessor="color"
              pieceHoverAnnotation={true}
              sharedRExtent={true}
              axis={{ orient: "left" }}
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
              yAccessor="value"
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
              yAccessor="value"
              lineStyle={{ stroke: "darkred" }}
              hoverAnnotation={true}
              lineIDAccessor={() => true}
              axes={[{ orient: "left" }, { orient: "bottom" }]}
              sharedXExtent={true}
              sharedYExtent={true}
              oPadding={5}
              oAccessor="column"
              rAccessor="value"
              type="bar"
              style={d => ({ fill: d.color })}
              pieceHoverAnnotation={true}
              pieceIDAccessor="color"
              sharedRExtent={true}
              axis={{ orient: "left" }}
            >
              <OrdinalFrame data={orData} />
              <XYFrame title={"LC1"} lines={{ coordinates: orData }} />
              <XYFrame title={"LC2"} lines={{ coordinates: orData2 }} />
              <XYFrame title={"LC3"} lines={{ coordinates: orData3 }} />
            </FacetController>
          </div>
        </div>
      ),
      source: ``
    })

    return (
      <DocumentComponent
        name="Faceting"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>Faceting is super useful</p>
      </DocumentComponent>
    )
  }
}

FacetControllerDemo.title = "Faceting"
