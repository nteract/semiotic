import * as React from "react"
import { csvParse } from "d3-dsv"
import { XYFrame } from "../../components"

const colors = [
  "#007190",
  "#00a2ce",
  "#d38779",
  "#b3331d",
  "rgb(77, 67, 12)",
  "rgb(182, 167, 86)"
]

const cutHash = {
  Ideal: colors[0],
  Premium: colors[1],
  Good: colors[2],
  "Very Good": colors[3],
  Fair: colors[4]
}

const pointStylingFn = (d) => ({ fill: d.color, fillOpacity: 0.9 })

const canvasAxes = [
  { orient: "bottom", label: "Carat" },
  {
    label: "Price",
    orient: "left",
    tickFormat: (d) => `$${d / 1000}k`
  }
]

const customCanvasClick = (d) => {
  console.info("clicked", d)
}

const customCanvasDoubleclick = (d) => {
  console.info("double-clicked", d)
}

const customTooltipContent = (d) => (
  <div className="tooltip-content">
    <p>Price: ${d.y}</p>
    <p>Caret: {d.x}</p>
    <p>
      {d.coincidentPoints.length > 1 &&
        `+${d.coincidentPoints.length - 1} more diamond${
          (d.coincidentPoints.length > 2 && "s") || ""
        } here`}
    </p>
  </div>
)

const customMargin = { left: 75, bottom: 100, top: 10, right: 10 }

export default class DecisionMatrixExample extends React.Component {
  state = { parsedDiamonds: [], size: [700, 700] }
  constructor(props) {
    super(props)

    fetch("./data/diamonds.csv")
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.text()
      })
      .then((data) => {
        console.log("CSV loaded, length:", data.length)
        const parsedDiamonds = csvParse(data).map((d) => ({
          y: +d.price,
          x: +d.carat,
          size: +d.table,
          color: cutHash[d.cut],
          clarity: d.clarity
        }))
        console.log("Parsed diamonds:", parsedDiamonds.length)
        this.setState({ parsedDiamonds })
      })
      .catch(error => {
        console.error("Failed to load diamonds.csv:", error)
        this.setState({ error: error.message })
      })
  }

  render() {
    const { parsedDiamonds, size, error } = this.state
    if (error) return <div style={{color: 'red'}}>Error: {error}</div>
    if (parsedDiamonds.length === 0) return <div>Loading diamonds data...</div>
    return (
      <div>
        <button
          onClick={() => {
            this.setState({ size: [500, 500] })
          }}
          style={{ color: "black" }}
        >
          Change Size
        </button>
        <XYFrame
          title="canvas interaction"
          points={parsedDiamonds}
          size={size}
          xAccessor="x"
          yAccessor="y"
          pointStyle={pointStylingFn}
          canvasPoints={true}
          axes={canvasAxes}
          margin={customMargin}
          hoverAnnotation={true}
          customClickBehavior={customCanvasClick}
          customDoubleClickBehavior={customCanvasDoubleclick}
          tooltipContent={customTooltipContent}
          disableProgressiveRendering={false}
        />
      </div>
    )
  }
}
