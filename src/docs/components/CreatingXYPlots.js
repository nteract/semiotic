import React from "react"
import { XYFrame } from "../../components"

import DocumentComponent from "../layout/DocumentComponent"
import { randomNormal } from "d3-random"
import { scaleThreshold } from "d3-scale"

const components = []
const pointTestData = []
const nRando = randomNormal(0, 1000)
const pRando = randomNormal(0, 1000)

const steps = ["none", "#FBEEEC", "#f3c8c2", "#e39787", "#ce6751", "#b3331d"]
const thresholds = scaleThreshold()
  .domain([0.01, 0.25, 0.5, 0.75, 1])
  .range(steps)

for (let x = 1; x < 100; x++) {
  pointTestData.push({
    x: nRando() * 2 - 4000,
    y: 4000 + nRando(),
    color: "#00a2ce"
  })
}
for (let x = 1; x < 100; x++) {
  pointTestData.push({
    x: 2000 + pRando(),
    y: 2000 + pRando() * 2,
    color: "#4d430c"
  })
}
for (let x = 1; x < 100; x++) {
  pointTestData.push({
    x: pRando() - 2000,
    y: pRando() * 2 - 2000,
    color: "#b3331d"
  })
}

for (let x = 1; x < 100; x++) {
  pointTestData.push({
    x: pRando() + 2000,
    y: pRando() * 2 - 4000,
    color: "#b6a756"
  })
}

export default class CreatingXYPlots extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    const examples = []
    examples.push({
      name: "Data",
      demo: (
        <div>
          <p>
            XYFrame lets you present points as simple scatterplots but also
            exposes area functions that let you see the density of those points
            with contours, hexbins and grids.
          </p>
          <p>This is the dataset we'll be using in our examples:</p>
        </div>
      ),
      source: `const pointTestData = [
  { x: 5, y: 10, color: "blue },
  { x: 20, y: -20, color: "red"}
]`
    })

    examples.push({
      name: "Scatterplot",
      demo: (
        <div>
          <p>
            Making a scatterplot from this kind of data is simple, just send the
            array to the points attribute of an XYFrame.
          </p>
          <XYFrame
            points={pointTestData}
            xAccessor="x"
            yAccessor="y"
            pointStyle={d => ({ fill: d.color })}
          />
        </div>
      ),
      source: `          <XYFrame
      points={pointTestData}
      xAccessor="x"
      yAccessor="y"
      pointStyle={d => ({ fill: d.color })}
    />`
    })

    examples.push({
      name: "Heatmap",
      demo: (
        <div>
          <p>
            A heatmap, or any other area visualization, requires us to send the
            points data as a coordinates attribute of an object being sent to
            the areas prop of an XYFrame. By setting the areaType to "heatmap"
            we get a grid of density of that same data.
          </p>
          <p>
            The heatmap cell size is by default set to 5% of the size of the
            XYFrame (which can result in rectangles). You can pass a xBins or
            yBins (they take a number of bins or a percent if less than 1) or
            xCellPx or yCellPx (which take a pixel size of the cell) or any
            combination to create a cell. If you send the pixel size for one
            side it will default to a square of that pixel size but you can set
            the x to cell pixel size and the y to bin number (or percent) if you
            want. If the sizes don't match up with the size of your frame it can
            result in overflowing cells if it is not wholly divisible by your
            frame size.
          </p>
          <p>
            Each cell has an associated datapoint with a calculated percent
            indicating the number of items in that cell. If you turn
            hoverAnnotation on, the grid exposes a hover point at each center
            which has a binItems property with all the points in that cell. You
            can use this to display a simple count (as in this example) or a
            data visualization of the points in that grid, or anything else you
            want in the tooltip using tooltipContent.
          </p>
          <XYFrame
            size={[500, 800]}
            areas={[{ coordinates: pointTestData }]}
            areaType={{ type: "heatmap", yBins: 10, xCellPx: 35 }}
            xAccessor="x"
            yAccessor="y"
            areaStyle={d => ({
              fill: thresholds(d.percent),
              stroke: "black"
            })}
            hoverAnnotation={true}
            tooltipContent={d => {
              return (
                <div className="tooltip-content">
                  <p>Points in cell: {d.binItems.length}</p>
                </div>
              )
            }}
            areaRenderMode={{
              renderMode: "sketchy",
              fillWeight: 3,
              hachureGap: 4
            }}
            margin={{ left: 60, bottom: 60, top: 30, right: 30 }}
            axes={[
              { orient: "left", footer: true },
              { orient: "bottom", footer: true }
            ]}
          />
        </div>
      ),
      source: `<XYFrame
      size={[500, 800]}
      areas={[{ coordinates: pointTestData }]}
      areaType={{ type: "heatmap", yBins: 10, xCellPx: 50 }}
      xAccessor="x"
      yAccessor="y"
      areaStyle={d => ({
        fill: thresholds(d.percent),
        stroke: "black"
      })}
      hoverAnnotation={true}
      tooltipContent={d => {
        return (
          <div className="tooltip-content">
            <p>Points in cell: {d.binItems.length}</p>
          </div>
        )
      }}
      margin={{ left: 60, bottom: 60, top: 30, right: 30 }}
      axes={[
        { orient: "left", footer: true },
        { orient: "bottom", footer: true }
      ]}
    />`
    })

    examples.push({
      name: "Hexbin",
      demo: (
        <div>
          <p>
            A second kind of areaType available in XYFrame is the hexbin. It's
            fundamentally the same as a grid but there's less visual distortion
            because a grid cell center is much more distant from the corners of
            the cell than it is from the sides, whereas with a hex this
            distortion is significantly decreased. Unlike with heatmap you
            cannot control the distortion of the hexbin, you can only set it to
            a pixel size using cellPx or a number of bins (using a number or a
            percent if less than 1) which will base the number off the width of
            the frame.
          </p>
          <p>
            Like the heatmap, a hexbin exposes binItems for tooltips and a
            percent calculation for styling.
          </p>
          <XYFrame
            areas={[{ coordinates: pointTestData }]}
            areaType={{ type: "hexbin", bins: 10 }}
            xAccessor="x"
            yAccessor="y"
            areaStyle={d => ({
              fill: thresholds(d.percent),
              stroke: "black"
            })}
            areaRenderMode="sketchy"
            hoverAnnotation={true}
            tooltipContent={d => {
              return (
                <div className="tooltip-content">
                  <p>{d.binItems.length}</p>
                </div>
              )
            }}
            margin={{ left: 60, bottom: 60, top: 30, right: 30 }}
            axes={[
              { orient: "left", footer: true },
              { orient: "bottom", footer: true }
            ]}
          />
        </div>
      ),
      source: `<XYFrame
      areas={[{ coordinates: pointTestData }]}
      areaType={{ type: "hexbin", xBins: 10 }}
      xAccessor="x"
      yAccessor="y"
      areaStyle={d => ({
        fill: thresholds(d.percent),
        stroke: "black"
      })}
      areaRenderMode="sketchy"
      hoverAnnotation={true}
      tooltipContent={d => {
        return (
          <div className="tooltip-content">
            <p>{d.binItems.length}</p>
          </div>
        )
      }}
      margin={{ left: 60, bottom: 60, top: 30, right: 30 }}
      axes={[
        { orient: "left", footer: true },
        { orient: "bottom", footer: true }
      ]}
    />`
    })

    examples.push({
      name: "Contour Plot",
      demo: (
        <div>
          <p>
            A contour plot results from setting the areaType to "contour". The
            contours are regions of density of that same data.
          </p>
          <p>
            The contour shapes in Semiotic are basically just graphics, they
            don't have any data about which points fall within them and the
            particular method they're drawn means they overlap on each other, so
            the main way to visualize them is via fillOpacity.
          </p>
          <XYFrame
            areas={[{ coordinates: pointTestData }]}
            areaType="contour"
            xAccessor="x"
            yAccessor="y"
            areaStyle={{ fill: "#b3331d", fillOpacity: 0.2 }}
          />
        </div>
      ),
      source: `<XYFrame
      areas={[{ coordinates: pointTestData }]}
      areaType="contour"
      xAccessor="x"
      yAccessor="y"
      areaStyle={{ fill: "#b3331d", fillOpacity: 0.2 }}
    />`
    })

    examples.push({
      name: "Contour Plot",
      demo: (
        <div>
          <p>
            If you want to layer the area visualization with points for your
            readers, you can add the points separately (like the scatterplot) or
            use the showLinePoints property (it was named that because it
            started out for line charts, but the same principle applies to area
            charts) that when set to true will draw the points. You can pair
            this with hoverAnnotation for interactivity.
          </p>
          <XYFrame
            areas={[{ coordinates: pointTestData }]}
            showLinePoints={true}
            areaType="contour"
            xAccessor="x"
            yAccessor="y"
            areaStyle={{ fill: "#b3331d", fillOpacity: 0.2 }}
            pointStyle={{ fill: "none", stroke: "black", strokeOpacity: 0.5 }}
            hoverAnnotation={true}
          />
        </div>
      ),
      source: `<XYFrame
      areas={[{ coordinates: pointTestData }]}
      showLinePoints={true}
      areaType="contour"
      xAccessor="x"
      yAccessor="y"
      areaStyle={{ fill: "#b3331d", fillOpacity: 0.2 }}
      pointStyle={{ fill: "none", stroke: "black", strokeOpacity: 0.5 }}
      hoverAnnotation={true}
    />`
    })

    return (
      <DocumentComponent
        name="Creating XY Plots"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          The very basics of how to create a bar chart or stacked bar chart with
          labels and an axis in Semiotic.
        </p>
      </DocumentComponent>
    )
  }
}

CreatingXYPlots.title = "Creating XY Plots"
