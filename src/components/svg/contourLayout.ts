import { contourDensity } from "d3-contour"
import { scaleLinear } from "d3-scale"

function shapeBounds(coordinates) {
  let left = [Infinity, 0]
  let right = [-Infinity, 0]
  let top = [0, Infinity]
  let bottom = [0, -Infinity]
  coordinates.forEach((d) => {
    left = d[0] < left[0] ? d : left
    right = d[0] > right[0] ? d : right
    bottom = d[1] > bottom[1] ? d : bottom
    top = d[1] < top[1] ? d : top
  })

  return {
    center: [(left[0] + right[0]) / 2, (top[1] + bottom[1]) / 2],
    top,
    left,
    right,
    bottom
  }
}

export function contouring({ summaryType, data, finalXExtent, finalYExtent }) {
  let projectedSummaries = []
  if (!summaryType.type) {
    summaryType = { type: summaryType }
  }

  const {
    resolution = 500,
    thresholds = 10,
    bandwidth = 20,
    neighborhood
  } = summaryType

  const xScale = scaleLinear()
    .domain(finalXExtent)
    .rangeRound([0, resolution])
    .nice()
  const yScale = scaleLinear()
    .domain(finalYExtent)
    .rangeRound([resolution, 0])
    .nice()

  data.forEach((contourData) => {
    let contourProjectedSummaries = contourDensity()
      .size([resolution, resolution])
      .x((d) => xScale(d[0]))
      .y((d) => yScale(d[1]))
      .thresholds(thresholds)
      .bandwidth(bandwidth)(contourData._xyfCoordinates)

    if (neighborhood) {
      contourProjectedSummaries = [contourProjectedSummaries[0]]
    }

    const max = Math.max(...contourProjectedSummaries.map((d) => d.value))

    contourProjectedSummaries.forEach((summary) => {
      summary.parentSummary = contourData
      summary.bounds = []
      summary.percent = summary.value / max
      summary.coordinates.forEach((poly) => {
        poly.forEach((subpoly, i) => {
          poly[i] = subpoly.map((coordpair) => {
            coordpair = [
              xScale.invert(coordpair[0]),
              yScale.invert(coordpair[1])
            ]
            return coordpair
          })
          //Only push bounds for the main poly, not its interior rings, otherwise you end up labeling interior cutouts
          if (i === 0) {
            summary.bounds.push(shapeBounds(poly[i]))
          }
        })
      })
    })
    projectedSummaries = [...projectedSummaries, ...contourProjectedSummaries]
  })

  return projectedSummaries
}
