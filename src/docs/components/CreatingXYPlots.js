import * as React from "react"
import { XYFrame } from "../../components"

import DocumentComponent from "../layout/DocumentComponent"
import { randomNormal } from "d3-random"
import { scaleThreshold } from "d3-scale"
import { hexbinning, heatmapping } from "../../components/svg/areaDrawing"

// eslint-disable-next-line

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
    x: nRando() * 2 - 3000,
    y: 2000 + nRando(),
    color: "#00a2ce"
  })
}
for (let x = 1; x < 100; x++) {
  pointTestData.push({
    x: 1000 + pRando(),
    y: 1000 + pRando() * 2,
    color: "#4d430c"
  })
}
for (let x = 1; x < 100; x++) {
  pointTestData.push({
    x: pRando() - 1000,
    y: pRando() * 2 - 1000,
    color: "#b3331d"
  })
}

for (let x = 1; x < 100; x++) {
  pointTestData.push({
    x: pRando() + 1000,
    y: pRando() * 2 - 2000,
    color: "#b6a756"
  })
}

const preprocessedHexbinData = hexbinning({
  summaryType: { type: "hexbin" },
  data: { coordinates: pointTestData },
  size: [500, 500]
})

const preprocessedHeatmapData = heatmapping({
  summaryType: { type: "heatmap" },
  data: { coordinates: pointTestData },
  size: [500, 500]
})

export default class CreatingXYPlots extends React.Component {
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
            xAccessor={["x", d => d.x + 1000]}
            yAccessor="y"
            pointStyle={d => ({ fill: d.color })}
            yExtent={[-8500, 8500]}
            //            areaType={{ type: "trendline", regressionType: "logarithmic" }}
            areaStyle={{ stroke: "darkred" }}
            axes={[
              {
                orient: "bottom",
                marginalSummaryType: {
                  type: "ridgeline",
                  showPoints: true,
                  summaryStyle: {
                    fill: "orange",
                    stroke: "brown",
                    fillOpacity: 0.25
                  },
                  pointStyle: {
                    fill: "red",
                    r: 4,
                    fillOpacity: 0.05
                  }
                }
              },
              {
                orient: "left",
                baseline: "under",
                marginalSummaryType: {
                  type: "ridgeline",
                  bins: 4,
                  showPoints: true
                }
              },
              {
                orient: "right",
                marginalSummaryType: {
                  type: "ridgeline",
                  showPoints: true
                }
              },
              {
                orient: "top",
                marginalSummaryType: { type: "ridgeline", showPoints: true }
              }
            ]}
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
            the areas prop of an XYFrame. By setting the summaryType to
            "heatmap" we get a grid of density of that same data.
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
          <p>
            Heatmap will handle low or power scales, whereas hexbin will not.
          </p>
          <XYFrame
            size={[500, 800]}
            summaries={[{ coordinates: pointTestData }]}
            summaryType={{
              type: "heatmap",
              yBins: 10,
              xCellPx: 35,
              binMax: binMax => console.info("bin max", binMax)
            }}
            useAreasAsInteractionLayer={true}
            xAccessor="x"
            yAccessor="y"
            areaStyle={d => ({
              fill: thresholds(d.percent),
              stroke: "black"
            })}
            showSummaryPoints={true}
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
      summaryType={{ type: "heatmap", yBins: 10, xCellPx: 50 }}
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
    function makeHex(h) {
      const hexBase = h.hexCoordinates.map(d => [
        d[0] * h.percent,
        d[1] * h.percent
      ])

      const sortedColors = h.binItems
        .map(d => d.color)
        .sort((a, b) => {
          if (a < b) return -1
          if (a > b) return 1
          return -1
        })
      const step = sortedColors.length / 6

      return (
        <g>
          {hexBase.map((d, i) => {
            const n = hexBase[i + 1] || hexBase[0]
            const hexStep = parseInt(step * i)
            return (
              <path
                fill={sortedColors[hexStep]}
                stroke={"white"}
                strokeWidth={0.5}
                key={`hex-slice-${i}`}
                d={`M0,0L${d[0]},${d[1]}L${n[0]},${n[1]}Z`}
              />
            )
          })}
          <path
            d={`M${h.hexCoordinates.map(d => d.join(",")).join("L")}Z`}
            fill="none"
            stroke="black"
          />
        </g>
      )
    }
    examples.push({
      name: "Hexbin",
      demo: (
        <div>
          <p>
            A second kind of summaryType available in XYFrame is the hexbin.
            It's fundamentally the same as a grid but there's less visual
            distortion because a grid cell center is much more distant from the
            corners of the cell than it is from the sides, whereas with a hex
            this distortion is significantly decreased. Unlike with heatmap you
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
            summaryType={{
              type: "hexbin",
              bins: 10
            }}
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
                  <p>{(d.binItems && d.binItems.length) || "empty"}</p>
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
            areaStyle={d => ({ fill: thresholds(d.percent), stroke: "black" })}
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
            use the showSummaryPoints property (it was named that because it
            started out for line charts, but the same principle applies to area
            charts) that when set to true will draw the points. You can pair
            this with hoverAnnotation for interactivity.
          </p>
          <XYFrame
            areas={[{ coordinates: pointTestData }]}
            showSummaryPoints={true}
            areaType={{ type: "contour", thresholds: 5 }}
            xAccessor="x"
            yAccessor="y"
            areaStyle={d => ({ fill: thresholds(d.percent), stroke: "black" })}
            pointStyle={{ fill: "none", stroke: "black", strokeOpacity: 0.5 }}
            hoverAnnotation={true}
          />
        </div>
      ),
      source: `<XYFrame
      areas={[{ coordinates: pointTestData }]}
      showSummaryPoints={true}
      areaType="contour"
      xAccessor="x"
      yAccessor="y"
      areaStyle={{ fill: "#b3331d", fillOpacity: 0.2 }}
      pointStyle={{ fill: "none", stroke: "black", strokeOpacity: 0.5 }}
      hoverAnnotation={true}
    />`
    })

    examples.push({
      name: "Multi-Accessor",
      demo: (
        <div>
          <p>
            You can send an array of accessors to areaDataAccessor (or xAccessor
            or yAccessor). The parentSummary has the same basic properties you
            pass but you can inspect the _baseData property to get access to the
            data generated by the areaDataAccessor.
          </p>
          <XYFrame
            areas={[{ coordinates: pointTestData }]}
            areaDataAccessor={[
              d => d.coordinates.filter(p => p.color === "#4d430c"),
              d => d.coordinates.filter(p => p.color === "#00a2ce")
            ]}
            areaType={{ type: "contour", thresholds: 5 }}
            xAccessor="x"
            yAccessor="y"
            areaStyle={d => {
              return {
                stroke: d.parentSummary._baseData[0].color,
                fill: "none",
                strokeOpacity: 0.5,
                strokeWidth: 3,
                strokeDasharray: "15 5"
              }
            }}
          />
        </div>
      ),
      source: `<XYFrame
      areas={[{ coordinates: pointTestData }]}
      areaDataAccessor={[
        d => d.coordinates.filter(p => p.color === "#4d430c"),
        d => d.coordinates.filter(p => p.color === "#00a2ce")
      ]}
      areaType={{ type: "contour", thresholds: 5 }}
      xAccessor="x"
      yAccessor="y"
      areaStyle={d => {
        return {
          stroke: d.parentSummary._baseData[0].color,
          fill: "none",
          strokeOpacity: 0.5,
          strokeWidth: 3,
          strokeDasharray: "15 5"
        }
      }}
    />`
    })

    examples.push({
      name: "Preprocessed Data",
      demo: (
        <div>
          <p>
            Hexbin and heatmap both accept a customMark property allowing you to
            draw a custom mark in the space of the cell or hex.
          </p>
          <XYFrame
            title={`Max Bin: ${preprocessedHexbinData.binMax} (Gold)`}
            size={[500, 500]}
            areas={preprocessedHexbinData}
            areaType={{
              type: "hexbin"
            }}
            xAccessor="x"
            yAccessor="y"
            areaStyle={d => ({
              fill:
                d.value === preprocessedHexbinData.binMax
                  ? "gold"
                  : thresholds(d.percent),
              stroke: "black"
            })}
          />
          <XYFrame
            title={`Max Bin: ${preprocessedHeatmapData.binMax} (Gold)`}
            size={[500, 500]}
            areas={preprocessedHeatmapData}
            areaType={{
              type: "heatmap"
            }}
            xAccessor="x"
            yAccessor="y"
            areaStyle={d => ({
              fill:
                d.value === preprocessedHeatmapData.binMax
                  ? "gold"
                  : thresholds(d.percent),
              stroke: "black"
            })}
          />
        </div>
      ),
      source: `const preprocessedHexbinData = hexbinning({
  areaType: { type: "hexbin" },
  data: { coordinates: pointTestData },
  size: [500, 500]
})
      `
    })

    examples.push({
      name: "Custom Glyphs",
      demo: (
        <div>
          <p>
            Hexbin and heatmap both accept a customMark property allowing you to
            draw a custom mark in the space of the cell or hex.
          </p>
          <XYFrame
            size={[500, 800]}
            areas={[{ coordinates: pointTestData }]}
            areaType={{
              type: "heatmap",
              yBins: 10,
              xCellPx: 35,
              customMark: ({ d }) => {
                return (
                  <ellipse
                    fill={thresholds(d.percent)}
                    stroke="none"
                    cx={d.gw / 2}
                    cy={d.gh / 2}
                    rx={(d.gw / 2) * d.percent}
                    ry={(d.gh / 2) * d.percent}
                  />
                )
              }
            }}
            xAccessor="x"
            yAccessor="y"
          />
          <XYFrame
            areas={[{ coordinates: pointTestData }]}
            areaType={{
              type: "hexbin",
              bins: 10,
              customMark: ({ d }) => makeHex(d)
            }}
            xAccessor="x"
            yAccessor="y"
            baseMarkProps={{ forceUpdate: true }}
          />
        </div>
      ),
      source: `//customMark for heatmap
<XYFrame
size={[500, 800]}
areas={[{ coordinates: pointTestData }]}
areaType={{
  type: "heatmap",
  yBins: 10,
  xCellPx: 35,
  customMark: d => (
    <ellipse
      fill={thresholds(d.percent)}
      stroke="none"
      cx={d.gw / 2}
      cy={d.gh / 2}
      rx={d.gw / 2 * d.percent}
      ry={d.gh / 2 * d.percent}
    />
  )
}}
xAccessor="x"
yAccessor="y"
/>
    
//customMark for hexbin
function makeHex(h) {
  const hexBase = h.hexCoordinates.map(d => [
    d[0] * h.percent,
    d[1] * h.percent
  ])

  const sortedColors = h.binItems.map(d => d.color).sort((a, b) => a < b)
  const step = sortedColors.length / 6

  return (
    <g>
      {hexBase.map((d, i) => {
        const n = hexBase[i + 1] || hexBase[0]
        const hexStep = parseInt(step * i)
        return (
          <path
            fill={sortedColors[hexStep]}
            stroke={"white"}
            strokeWidth={0.5}
            key={${"`hex-slice-${i}`"}}
            d={${"`M0,0L${d[0]},${d[1]}L${n[0]},${n[1]}Z`"}}
          />
        )
      })}
      <path
        d={${"`M${h.hexCoordinates.map(d => d.join(',')).join('L')}Z`"}}
        fill="none"
        stroke="black"
      />
    </g>
  )
}
<XYFrame
areas={[{ coordinates: pointTestData }]}
areaType={{
  type: "hexbin",
  bins: 10,
  customMark: d => makeHex(d)
}}
xAccessor="x"
yAccessor="y"
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
          The very basics of how to create XY Plots such as scatterplots, grids
          and hexbins with Semiotic.
        </p>
      </DocumentComponent>
    )
  }
}

CreatingXYPlots.title = "Creating XY Plots"
