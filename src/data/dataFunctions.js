import { projectLineData } from '../svg/lineDrawing'
import { projectedX, projectedY, projectedYTop, projectedYMiddle, projectedYBottom } from '../constants/coordinateNames'
import { differenceLine, stackedArea, bumpChart, lineChart } from '../svg/lineDrawing'
import { max, min } from 'd3-array'

const builtInTransformations = {
  stackedarea: stackedArea,
  "stackedarea-invert": stackedArea,
  stackedpercent: stackedArea,
  "stackedpercent-invert": stackedArea,
  difference: differenceLine,
  bumparea: bumpChart,
  bumpline: bumpChart,
  "bumparea-invert": bumpChart,
  line: lineChart

}

export const calculateDataExtent = ({ lineDataAccessor = d => d.coordinates, xAccessor = d => d[0], yAccessor = d => d[1], points, lines, customLineType, showLinePoints, xExtent, yExtent, invertX, invertY }) => {
    let fullDataset = []
    let initialProjectedLines = []

    let projectedPoints = [], projectedLines = []

    if (points) {
        projectedPoints = points.map((d, i) => {
        const x = xAccessor(d,i)
        const y = yAccessor(d,i)
        return Object.assign({ [projectedX]: x, [projectedY]: y }, d)
        })
        fullDataset = projectedPoints
    }
    else if (lines) {

        initialProjectedLines = projectLineData({ data: lines, lineDataAccessor, xProp: projectedX, yProp: projectedY, yPropTop: projectedYTop, yPropBottom: projectedYBottom, xAccessor: xAccessor, yAccessor: yAccessor })

        const optionsObject = { xProp: projectedX, yProp: projectedY, yPropMiddle: projectedYMiddle, yPropTop: projectedYTop, yPropBottom: projectedYBottom }

        projectedLines = lineTransformation(customLineType, optionsObject)(initialProjectedLines)

        projectedLines.forEach(d => {
            fullDataset = [ ...fullDataset, ...d.data.map(p => Object.assign({ parentLine: d }, p)) ]
        })

    //Handle "expose points on lines" option now that sending points and lines simultaneously is no longer allowed
        if (showLinePoints) {
            projectedPoints = fullDataset
        }
    }


    function lineTransformation(lineType = { type: "line" }, options) {
        const differenceCatch = (olineType, data) => lineType === "difference" && data.length !== 2 ? "line" : olineType
        if (builtInTransformations[lineType]) {
            return data => builtInTransformations[differenceCatch(lineType, data)]({ type: lineType, ...options, data })
        }

        if (builtInTransformations[lineType.type]) {
            return data => builtInTransformations[differenceCatch(lineType.type, data)]({ ...lineType, ...options, data })
        }

        //otherwise assume a function
        return data => lineType({ ...options, data })
    }

    let xMin = xExtent && xExtent[0] !== undefined ? xExtent[0] : min(fullDataset.map(d => d[projectedX]))
    let xMax = xExtent && xExtent[1] !== undefined ? xExtent[1] : max(fullDataset.map(d => d[projectedX]))

    let yMin = yExtent && yExtent[0] !== undefined ? yExtent[0] : min(fullDataset.map(d => d[projectedYBottom] === undefined ? d[projectedY] : d[projectedYBottom]))
    let yMax = yExtent && yExtent[1] !== undefined ? yExtent[1] : max(fullDataset.map(d => d[projectedYTop] === undefined ? d[projectedY] : d[projectedYTop]))

    let finalYExtent = [ yMin, yMax ]
    let finalXExtent = [ xMin, xMax ]

    if (invertX) {
        finalXExtent = [ finalXExtent[1],finalXExtent[0] ]
    }
    if (invertY) {
        finalYExtent = [ finalYExtent[1],finalYExtent[0] ]
    }

    return { xExtent: finalXExtent, yExtent: finalYExtent, projectedLines, projectedPoints, fullDataset }

}
