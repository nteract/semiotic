import React from "react"
import { OrdinalFrame } from "../../components"
import Button from "material-ui/Button"

const stepColors = {
  home: "#007190",
  shop: "#00a2ce",
  basket: "#d38779",
  purchase: "#b3331d",
  return: "rgb(77, 67, 12)",
  extra: "rgb(182, 167, 86)"
}

const regionColors = {
  "Wonderland": "#007190",
  "Final Fantasy": "#00a2ce",
  "Middle Earth": "#d38779",
  "Long Ago and Far Away": "#b3331d",
  "return": "rgb(77, 67, 12)",
  "extra": "rgb(182, 167, 86)"
}
const stepValueHash = {
  home: 0,
  shop: 1,
  basket: 2,
  purchase: 3,
  return: 4
}

const funnelData = [
  {
    step: "home",
    country: "The Oyster Shack",
    region: "Wonderland",
    people: 1200
  },
  {
    step: "home",
    country: "Gold Saucer",
    region: "Final Fantasy",
    people: 1100
  },
  { step: "home", country: "Lothlorian", region: "Middle Earth", people: 1000 },
  {
    step: "home",
    country: "Lilliput",
    region: "Long Ago and Far Away",
    people: 900
  },
  { step: "home", country: "Midgar", region: "Final Fantasy", people: 800 },
  { step: "home", country: "Mushroom", region: "Wonderland", people: 700 },
  { step: "home", country: "Mordor", region: "Middle Earth", people: 600 },
  {
    step: "home",
    country: "Barsoom",
    region: "Long Ago and Far Away",
    people: 500
  },
  {
    step: "home",
    country: "Fort Condor",
    region: "Final Fantasy",
    people: 400
  },
  {
    step: "home",
    country: "March Hare's Seat",
    region: "Wonderland",
    people: 300
  },
  {
    step: "home",
    country: "Minas Tirith",
    region: "Middle Earth",
    people: 200
  },
  {
    step: "home",
    country: "Fantastica",
    region: "Long Ago and Far Away",
    people: 100
  },
  {
    step: "shop",
    country: "The Oyster Shack",
    region: "Wonderland",
    people: 600
  },
  {
    step: "shop",
    country: "Gold Saucer",
    region: "Final Fantasy",
    people: 550
  },
  { step: "shop", country: "Lothlorian", region: "Middle Earth", people: 500 },
  {
    step: "shop",
    country: "Lilliput",
    region: "Long Ago and Far Away",
    people: 450
  },
  { step: "shop", country: "Midgar", region: "Final Fantasy", people: 400 },
  { step: "shop", country: "Mushroom", region: "Wonderland", people: 350 },
  { step: "shop", country: "Mordor", region: "Middle Earth", people: 300 },
  {
    step: "shop",
    country: "Barsoom",
    region: "Long Ago and Far Away",
    people: 250
  },
  {
    step: "shop",
    country: "Fort Condor",
    region: "Final Fantasy",
    people: 200
  },
  {
    step: "shop",
    country: "March Hare's Seat",
    region: "Wonderland",
    people: 150
  },
  {
    step: "shop",
    country: "Minas Tirith",
    region: "Middle Earth",
    people: 100
  },
  {
    step: "shop",
    country: "Fantastica",
    region: "Long Ago and Far Away",
    people: 50
  },
  {
    step: "basket",
    country: "The Oyster Shack",
    region: "Wonderland",
    people: 450
  },
  {
    step: "basket",
    country: "Gold Saucer",
    region: "Final Fantasy",
    people: 405
  },
  {
    step: "basket",
    country: "Lothlorian",
    region: "Middle Earth",
    people: 420
  },
  {
    step: "basket",
    country: "Lilliput",
    region: "Long Ago and Far Away",
    people: 305
  },
  { step: "basket", country: "Midgar", region: "Final Fantasy", people: 120 },
  { step: "basket", country: "Mushroom", region: "Wonderland", people: 105 },
  { step: "basket", country: "Mordor", region: "Middle Earth", people: 100 },
  {
    step: "basket",
    country: "Barsoom",
    region: "Long Ago and Far Away",
    people: 125
  },
  {
    step: "basket",
    country: "Fort Condor",
    region: "Final Fantasy",
    people: 100
  },
  {
    step: "basket",
    country: "March Hare's Seat",
    region: "Wonderland",
    people: 75
  },
  {
    step: "basket",
    country: "Minas Tirith",
    region: "Middle Earth",
    people: 50
  },
  {
    step: "basket",
    country: "Fantastica",
    region: "Long Ago and Far Away",
    people: 25
  },
  {
    step: "purchase",
    country: "The Oyster Shack",
    region: "Wonderland",
    people: 150
  },
  {
    step: "purchase",
    country: "Gold Saucer",
    region: "Final Fantasy",
    people: 300
  },
  {
    step: "purchase",
    country: "Lothlorian",
    region: "Middle Earth",
    people: 310
  },
  {
    step: "purchase",
    country: "Lilliput",
    region: "Long Ago and Far Away",
    people: 120
  },
  { step: "purchase", country: "Midgar", region: "Final Fantasy", people: 110 },
  { step: "purchase", country: "Mushroom", region: "Wonderland", people: 100 },
  { step: "purchase", country: "Mordor", region: "Middle Earth", people: 100 },
  {
    step: "purchase",
    country: "Barsoom",
    region: "Long Ago and Far Away",
    people: 95
  },
  {
    step: "purchase",
    country: "Fort Condor",
    region: "Final Fantasy",
    people: 90
  },
  {
    step: "purchase",
    country: "March Hare's Seat",
    region: "Wonderland",
    people: 85
  },
  {
    step: "purchase",
    country: "Minas Tirith",
    region: "Middle Earth",
    people: 40
  },
  {
    step: "purchase",
    country: "Fantastica",
    region: "Long Ago and Far Away",
    people: 20
  },
  {
    step: "return",
    country: "The Oyster Shack",
    region: "Wonderland",
    people: 100
  },
  {
    step: "return",
    country: "Gold Saucer",
    region: "Final Fantasy",
    people: 90
  },
  { step: "return", country: "Lothlorian", region: "Middle Earth", people: 10 },
  {
    step: "return",
    country: "Lilliput",
    region: "Long Ago and Far Away",
    people: 35
  },
  { step: "return", country: "Midgar", region: "Final Fantasy", people: 30 },
  { step: "return", country: "Mushroom", region: "Wonderland", people: 25 },
  { step: "return", country: "Mordor", region: "Middle Earth", people: 20 },
  {
    step: "return",
    country: "Barsoom",
    region: "Long Ago and Far Away",
    people: 15
  },
  {
    step: "return",
    country: "Fort Condor",
    region: "Final Fantasy",
    people: 10
  },
  {
    step: "return",
    country: "March Hare's Seat",
    region: "Wonderland",
    people: 5
  },
  {
    step: "return",
    country: "Minas Tirith",
    region: "Middle Earth",
    people: 0
  },
  {
    step: "return",
    country: "Fantastica",
    region: "Long Ago and Far Away",
    people: 0
  }
]

const funnelHash = {}
funnelData.forEach(d => {
  if (!funnelHash[d.country]) {
    d.percent = d.people / 1200
  } else {
    d.percent = d.people / funnelHash[d.country]
  }
  funnelHash[d.country] = d.people
})

export default class InformationModel extends React.Component {
  constructor(props) {
    super(props)

    this.brushing = this.brushing.bind(this)

    this.state = {
      type: "Process",
      step: 0,
      sankeyorient: "center",
      prototypeSeed: 1,
      designSeed: 1,
      mode: "prototype",
      columnExtent: {
        home: [0, 1.05],
        shop: [0.35, 0.6],
        basket: [0.2, 0.9],
        purchase: [0.25, 1.2],
        return: [0, 0.8]
      }
    }
  }

  brushing(e, c) {
    const columnExtent = this.state.columnExtent
    columnExtent[c] = e
    this.setState(columnExtent)
  }

  render() {
    const sortRegions = (a, b) => {
      if (stepValueHash[a.step] < stepValueHash[b.step]) {
        return -1
      }
      if (stepValueHash[a.step] > stepValueHash[b.step]) {
        return 1
      }
      if (a.region < b.region) {
        return 1
      }
      if (a.region > b.region) {
        return -1
      }
      if (a.country < b.country) {
        return 1
      }
      if (a.country > b.country) {
        return -1
      }
      return -1
    }

    const hiddenHash = new Map()

    Object.keys(this.state.columnExtent).forEach(key => {
      if (this.state.columnExtent[key]) {
        const extent = this.state.columnExtent[key]
        funnelData
          .filter(
            d =>
              d.step === key && (d.percent < extent[0] || d.percent > extent[1])
          )
          .forEach(p => {
            hiddenHash.set(p.country, true)
          })
      }
    })

    const stepSettings = [
      {
        style: d => ({ fill: stepColors[d.step], stroke: stepColors[d.step] }),
        type: "bar",
        afterElements: (
          <div>
            <p>
              Representing funnels is a common problem in analytical
              applications. You have a site or a process that your users move
              through, and the health of that process is seen in the amount of
              users moving from one step to the next.
            </p>
            <p>
              Funnels are commonly represented as bar charts. Here we see the
              steps and a bar showing the amount of users at each step. By
              providing the data in a familiar form, you can then iterate within
              that particular model of the information (a set of steps and the
              numerical value at that step).
            </p>
          </div>
        )
      },
      {
        data: funnelData.sort(sortRegions),
        style: d => ({
          fill: regionColors[d.region],
          stroke: regionColors[d.region]
        }),
        type: "bar",
        afterElements: (
          <div>
            <p>
              One common way to add value to a chart like this is to use a
              stacked bar chart. Because the individual "pieces" of data are
              modeled, it's just a matter of sorting and coloring the pieces by
              region. This allows you to show the contribution of each region to
              each step.
            </p>
          </div>
        )
      },
      {
        data: funnelData.sort(sortRegions),
        style: d => ({
          fill: regionColors[d.region],
          stroke: regionColors[d.region]
        }),
        type: "bar",
        oPadding: 40,
        connectorType: d => d.country,
        connectorStyle: d => ({
          fill: regionColors[d.source.region],
          stroke: regionColors[d.source.region]
        }),
        afterElements: (
          <div>
            <p>
              Because a funnel is about "flow" you might end up drawing
              connections between the steps, to show the magnitude of flow from
              one step to another.
            </p>
          </div>
        )
      },
      {
        data: funnelData.sort(sortRegions),
        style: d => ({
          fill: regionColors[d.region],
          stroke: regionColors[d.region]
        }),
        type: "point",
        connectorType: d => d.country,
        connectorStyle: d => ({
          fill: regionColors[d.source.region],
          stroke: regionColors[d.source.region]
        }),
        afterElements: (
          <div>
            <p>
              Rather than showing the aggregate value at each step, we can use
              the "point" type to show the individual country values at each
              step. Notice the axis has adjusted so you can see how much each
              country contributes, with each point still colored by region. By
              connecting these points you've created a slopegraph.
            </p>
          </div>
        )
      },
      {
        data: funnelData.sort(sortRegions),
        style: d => ({
          fill: regionColors[d.region],
          stroke: regionColors[d.region]
        }),
        type: "swarm",
        connectorType: d => d.country,
        connectorStyle: d => ({
          fill: regionColors[d.source.region],
          stroke: regionColors[d.source.region]
        }),
        afterElements: (
          <div>
            <p>
              To clear up overlap in crowded regions, you might use the "swarm"
              type to create a "swarmgraph" if that's a thing.
            </p>
          </div>
        )
      },
      {
        data: funnelData.sort(sortRegions),
        style: d => ({
          fill: regionColors[d.region],
          stroke: regionColors[d.region]
        }),
        type: "swarm",
        rAccessor: "percent",
        axis: {
          orient: "left",
          tickFormat: d => `${Math.floor(d * 10) * 10}%`
        },
        connectorType: d => d.country,
        connectorStyle: d => ({
          fill: regionColors[d.source.region],
          stroke: regionColors[d.source.region]
        }),
        afterElements: (
          <div>
            <p>
              Or you might realize that what's important aren't the raw numbers
              but rather the percent that of people who made it from each step
              to the next.
            </p>
          </div>
        )
      },
      {
        data: funnelData.sort(sortRegions),
        style: d => ({
          fill: hiddenHash.get(d.country) ? "gray" : regionColors[d.region],
          stroke: hiddenHash.get(d.country) ? "gray" : regionColors[d.region],
          opacity: hiddenHash.get(d.country) ? 0.25 : 1
        }),
        type: "swarm",
        axis: {
          orient: "left",
          tickFormat: d => `${Math.floor(d * 10) * 10}%`
        },
        rAccessor: "percent",
        connectorType: d => d.country,
        connectorStyle: d => ({
          fill: hiddenHash.get(d.source.country)
            ? "gray"
            : regionColors[d.source.region],
          stroke: hiddenHash.get(d.source.country)
            ? "gray"
            : regionColors[d.source.region],
          opacity: hiddenHash.get(d.source.country) ? 0.25 : 1
        }),
        interaction: {
          columnsBrush: true,
          end: this.brushing,
          extent: this.state.columnExtent
        },
        afterElements: (
          <div>
            <p>
              If you add a brush to the columns to let users highlight different
              paths, you've created a parallel coordinates chart. Had you walked
              in with a parallel coordinates chart when the ask was for a bar
              chart, stakeholders might have been resistant, but it's a natural
              progression in the design process and didn't require any change in
              the data, just the settings for how it's displayed.
            </p>
          </div>
        )
      },
      {
        size: [700, 700],
        data: funnelData.sort(sortRegions),
        style: d => ({
          fill: regionColors[d.region],
          stroke: regionColors[d.region]
        }),
        axis: {
          orient: "left",
          tickFormat: d => `${Math.floor(d * 10) * 10}%`
        },
        type: "swarm",
        rAccessor: "percent",
        projection: "radial",
        oPadding: 25,
        connectorType: d => d.country,
        connectorStyle: d => ({
          fill: regionColors[d.source.region],
          stroke: regionColors[d.source.region]
        }),
        afterElements: (
          <div>
            <p>
              And if your stakeholders need to enter their chart in the next
              data visualization contest, you can easily transform it into a
              radial chart.
            </p>
          </div>
        )
      }
    ]

    const contentDiv = (
      <div className="infomodel-proto infomodel">
        <div className="infomodel-buttons">
          {this.state.step === 0 ? null : (
            <Button
              raised
              color="primary"
              onClick={() => {
                this.setState({ step: this.state.step - 1 })
              }}
            >
              Back!
            </Button>
          )}
          {this.state.step === stepSettings.length - 1 ? null : (
            <Button
              raised
              color="primary"
              onClick={() => {
                this.setState({ step: this.state.step + 1 })
              }}
            >
              Forward!
            </Button>
          )}
        </div>
        <OrdinalFrame
          size={[700, 500]}
          rAccessor={"people"}
          oAccessor={"step"}
          data={funnelData}
          oPadding={10}
          oLabel={true}
          margin={{ left: 50, bottom: 50, right: 0, top: 30 }}
          axis={{ orient: "left" }}
          {...stepSettings[this.state.step]}
        />
      </div>
    )

    return (
      <div className="infomodel-container">
        <h2>Ideating within an information model</h2>
        <p>
          This simple stepper lets you move from a bar chart representation of
          funnel data to a sophisticated parallel coordinates represenatation of
          that same data simply by changing the settings of OrdinalFrame. It's
          meant to mimic the process of iterative design of data visualization
          with stakeholders.
        </p>
        {contentDiv}
      </div>
    )
  }
}

InformationModel.title = "Information Model"
