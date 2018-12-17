import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import BarLineRaw from "./BarLineRaw"

const components = []
// Add your component proptype data here
// multiple component proptype documentation supported

components.push({
  name: "BarLine"
})

export default class BarLineDocs extends React.Component {
  render() {
    const buttons = []

    const examples = []
    examples.push({
      name: "Basic",
      demo: BarLineRaw,
      source: `
//css
.axis-baseline.leads {
  stroke: rgba(179, 51, 29, 0.5);
}

.tick-line.leads {
  stroke: rgba(179, 51, 29, 0.5);
}

.tick-line.sales {
  stroke: rgba(0, 162, 206, 0.5);
}

.axis-baseline.sales {
  stroke: rgba(0, 162, 206, 0.5);
}

.axis-title.sales text {
  fill: rgba(0, 162, 206);
}

.axis > .sales .axis-label {
  fill: rgba(0, 162, 206);
}

.axis > .leads .axis-label {
  fill: rgba(179, 51, 29);
}

.axis-title.leads text {
  fill: rgba(179, 51, 29);
}
///

const testData = [
  { sales: 5, leads: 150, month: "Jan" },
  { sales: 7, leads: 100, month: "Feb" },
  { sales: 7, leads: 75, month: "Mar" },
  { sales: 4, leads: 50, month: "Apr" },
  { sales: 2, leads: 200, month: "May" },
  { sales: 3, leads: 175, month: "Jun" },
  { sales: 5, leads: 125, month: "Jul" }
]

//for labels and tick options to make sense, the axes order should match the rAccessor order
const barLineAxes = [
  {
    key: "leads-axis",
    orient: "right",
    className: "leads",
    name: "CountAxis",
    ticks: 3,
    tickValues: [0, 25, 50, 75, 100, 125, 150, 175, 200],
    tickFormat: d => d,
    label: "Leads"
  },
  {
    key: "sales-axis",
    orient: "left",
    className: "sales",
    name: "CountAxis",
    tickValues: [0, 1, 2, 3, 4, 5, 6, 7],
    tickFormat: d => d,
    label: "Sales"
  }
]
<OrdinalFrame
size={[500, 300]}
data={testData}
type={{
  type: "point",
  //In order to draw some marks as bars use customMark that returns rect or circle
  customMark: d => {
    if (d.rIndex === 1) {
      return <circle r={6} fill={"rgba(0, 162, 206)"} />
    }
    return (
      <rect
        height={d.scaledValue}
        width={20}
        x={-10}
        fill="rgba(179, 51, 29)"
      />
    )
  }
}}
connectorStyle={{ stroke: "rgba(0, 162, 206)", strokeWidth: 3 }}
oAccessor="month"
//rAccessor order should match the axes order
rAccessor={["leads", "sales"]}
multiAxis={true}
style={() => ({ fill: "#b3331d", opacity: 1, stroke: "white" })}
axis={barLineAxes}
//only draw connectors for the data represented as circles in the customMark
connectorType={d => {
  return d.rIndex !== 0 && d.rIndex
}}
pieceHoverAnnotation={[
  {
    type: "highlight",
    style: {
      stroke: "red",
      fill: "none",
      strokeWidth: 4,
      strokeOpacity: 0.5
    }
  },
  { type: "frame-hover" }
]}
tooltipContent={d => {
  //Change the order of the returned value based on rIndex
  const bothValues = [
    <div style={{ color: "rgba(179, 51, 29)" }} key={"1"}>
      Leads: {d.leads}
    </div>,
    <div style={{ color: "rgba(0, 162, 206)" }} key="2">
      Sales: {d.sales}
    </div>
  ]
  const content = d.rIndex === 0 ? bothValues : bothValues.reverse()
  return (
    <div style={{ fontWeight: 900 }} className="tooltip-content">
      {content}
    </div>
  )
}}
//Render the pieces under the connectors to make the lines look right
renderOrder={["pieces", "connectors"]}
oLabel={true}
margin={{ top: 10, bottom: 50, left: 60, right: 60 }}
/>`
    })

    return (
      <DocumentComponent
        name="Dual Axis Bar & Line Chart"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          ORFrame has a multiAxis prop that, if set to true, will calculate
          separate extents for each of the rAccessor props (meaning you need to
          pass more than one to see any effect) as well as decorating sent axes
          in an order matching the sent rAccessor props so that it renders axes
          with the data extent. You can use the rIndex props of the data to then
          adjust the display and tooltips to show the proper data and render it,
          for instance here using customMark, as a bar/line chart.
        </p>
      </DocumentComponent>
    )
  }
}

BarLineDocs.title = "Dual Axis"
