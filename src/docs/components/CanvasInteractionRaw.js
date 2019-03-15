import * as React from "react"
import { csvParse } from "d3-dsv"
import { XYFrame } from "../../components"
const ROOT = process.env.PUBLIC_URL

const colors = [
  "#007190",
  "#00a2ce",
  "#d38779",
  "#b3331d",
  "rgb(77, 67, 12)",
  "rgb(182, 167, 86)"
]

const cutHash = {
  "Ideal": colors[0],
  "Premium": colors[1],
  "Good": colors[2],
  "Very Good": colors[3],
  "Fair": colors[4],
  "Premium": colors[5]
}

export default class DecisionMatrixExample extends React.Component {
  state = { parsedDiamonds: [] }
  constructor(props) {
    super(props)

    fetch(`${ROOT}/sampledata/diamonds.csv`)
      .then(response => response.text())
      .then(data => {
        const parsedDiamonds = []
        csvParse(data).forEach(d => {
          parsedDiamonds.push({
            y: +d.price,
            x: +d.carat,
            size: +d.table,
            color: cutHash[d.cut],
            clarity: d.clarity
          })
        })
        this.setState({ parsedDiamonds })
      })
  }

  render() {
    const { parsedDiamonds } = this.state
    if (parsedDiamonds.length === 0) return <div>Loading...</div>
    return (
      <div>
        <XYFrame
          title="canvas interaction"
          points={parsedDiamonds}
          size={[700, 700]}
          xAccessor="x"
          yAccessor="y"
          pointStyle={d => ({ fill: d.color, fillOpacity: 0.9 })}
          canvasPoints={true}
          axes={[
            { orient: "bottom", label: "Carat" },
            {
              label: "Price",
              orient: "left",
              tickFormat: d => `$${d / 1000}k`
            }
          ]}
          margin={{ left: 75, bottom: 100, top: 10, right: 10 }}
          hoverAnnotation={true}
          tooltipContent={d => (
            <div className="tooltip-content">
              <p>Price: ${d.y}</p>
              <p>Caret: {d.x}</p>
              <p>
                {d.coincidentPoints.length > 1 &&
                  `+${d.coincidentPoints.length - 1} more diamond${(d
                    .coincidentPoints.length > 2 &&
                    "s") ||
                    ""} here`}
              </p>
            </div>
          )}
        />
      </div>
    )
  }
}
