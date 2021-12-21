import React from "react"
import { OrdinalFrame } from "semiotic"

import theme from "../../theme"

import { funnelData } from "./funnelData"
import "./bar-to-parallel.css"

const Button = props => {
  return (
    <button type="button" onClick={props.onClick}>
      {props.text}
    </button>
  )
}

const stepColors = {
  home: theme[0],
  shop: theme[1],
  basket: theme[2],
  purchase: theme[3],
  return: theme[4],
  extra: theme[5]
}

const regionColors = {
  Wonderland: theme[0],
  "Final Fantasy": theme[1],
  "Middle Earth": theme[2],
  "Long Ago and Far Away": theme[3],
  return: theme[4],
  extra: theme[5]
}
const stepValueHash = {
  home: 0,
  shop: 1,
  basket: 2,
  purchase: 3,
  return: 4
}

const funnelHash = {}
funnelData.forEach(d => {
  if (!funnelHash[d.country]) {
    d.percent = d.people / 1200
  } else {
    d.percent = d.people / funnelHash[d.country]
  }
  funnelHash[d.country] = d.people
})

export class BarToParallel extends React.Component {

  state = {
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

  brushing = (e, c) => {
    const columnExtent = this.state.columnExtent
    columnExtent[c] = e
    this.setState(columnExtent)
  }

  stepForward = () => {
    this.setState({ step: this.state.step + 1 })
  }

  stepBackward = () => {
    this.setState({ step: this.state.step - 1 })
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
        style: d => ({
          fill: stepColors[d.step],
          stroke: stepColors[d.step]
        }),
        type: "bar",
        afterElements: (
          <div className="bar-to-parallel__caption">
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
          <div className="bar-to-parallel__caption">
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
          <div className="bar-to-parallel__caption">
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
          <div className="bar-to-parallel__caption">
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
          <div className="bar-to-parallel__caption">
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
          <div className="bar-to-parallel__caption">
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
          <div className="bar-to-parallel__caption">
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
          <div className="bar-to-parallel__caption">
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
            <Button onClick={this.stepBackward} text="Back!"></Button>
          )}
          {this.state.step === stepSettings.length - 1 ? null : (
            <Button onClick={this.stepForward} text="Forward"></Button>
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
      <div className="bar-to-parallel__container">
        <h2>Ideating within an information model</h2>
        <p>
          This simple stepper lets you move from a bar chart representation of
          funnel data to a sophisticated parallel coordinates representation of
          that same data simply by changing the settings of OrdinalFrame. It's
          meant to mimic the process of iterative design of data visualization
          with stakeholders.
        </p>
        {contentDiv}
      </div>
    )
  }
}
