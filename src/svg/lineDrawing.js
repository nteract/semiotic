import { sum } from 'd3-array'
//import assert from 'assert';

import { clone, flatten, uniq } from 'lodash'

const datesForUnique = d => d instanceof Date ? d.toString() : d

export const projectLineData = ({ data, lineDataAccessor, xProp, yProp, yPropTop, yPropBottom, xAccessor, yAccessor }) => {
  if (!Array.isArray(data)) {
    data = [ data ]
  }
  return data.map((d, i) => {
    let originalLineData = clone(d)
    originalLineData.data = lineDataAccessor(d).map((p, q) => {
        let originalCoords = clone(p)

        originalCoords[xProp] = xAccessor(p, q)
        originalCoords[yProp] = yAccessor(p, q)
        originalCoords[yPropTop] = originalCoords[yProp]
        originalCoords[yPropBottom] = originalCoords[yProp]

        return originalCoords
      })
    originalLineData.key = i
    return originalLineData
  });
}

export const differenceLine = ({ data, yProp, yPropTop, yPropBottom }) => {
//  assert(data.length === 2 || data[0].data.length === data[1].data.length, 'Difference line line can only be created with an array of two sets of points where both have the same number of points');

  data.forEach((l, i) =>
    {
      l.data.forEach((point, q) => {
        let otherLine = i === 0 ? 1 : 0;
          if (point[yProp] > data[otherLine].data[q][yProp]) {
            point[yPropBottom] = data[otherLine].data[q][yProp]
            point[yPropTop] = point[yProp]
          } else {
            point[yPropTop] = point[yProp]
            point[yPropBottom] = point[yProp]
          }
      })
    })

  return data
}

export const stackedArea = ({ type = "stackedarea", data, xProp, yProp, yPropMiddle, sort, yPropTop, yPropBottom }) => {

  const uniqXValues = uniq(flatten(data.map(d => d.data.map(p => datesForUnique(p[xProp])))))
  let stackSort = (a,b) => sum(b.data.map(p => p[yProp])) - sum(a.data.map(p => p[yProp]))
  if ( type === "stackedpercent-invert" || type === "stackedarea-invert") {
    stackSort = (a,b) => sum(a.data.map(p => p[yProp])) - sum(b.data.map(p => p[yProp]))
  }
  sort = sort === undefined ? stackSort : sort

  if (sort !== null) {
    data = data.sort(sort)
  }

  uniqXValues.forEach(xValue => {
    let offset = 0
    const stepValues = flatten(data.map(d => d.data.filter(p => datesForUnique(p[xProp]) === xValue)))

      const stepTotal = sum(stepValues.map(d => d[yProp]))

      stepValues.forEach(l => {

          if (type === "stackedpercent" || type === "stackedpercent-invert") {
            const adjustment = stepTotal === 0 ? 0 : l[yProp] / stepTotal

            l[yPropBottom] = stepTotal === 0 ? 0 : offset / stepTotal;
            l[yPropTop] = l[yPropBottom] + adjustment
            l[yPropMiddle] = l[yPropBottom] + adjustment / 2
          }
          else {
            l[yPropBottom] = offset
            l[yPropTop] = offset + l[yProp]
            l[yPropMiddle] = offset + l[yProp] / 2
          }
          offset += l[yProp]
      })
  })

  return data
}

export const lineChart = ({ data }) => {
  return data
}

export const bumpChart = ({ type = "bumpline", data, xProp, yProp, yPropMiddle, yPropTop, yPropBottom }) => {

  const uniqXValues = uniq(flatten(data.map(d => d.data.map(p => datesForUnique(p[xProp])))))
  let bumpSort = (a,b) => {
    if (a[yProp] > b[yProp]) {
      return 1
    }
    if (a[yProp] < b[yProp]) {
      return -1
    }
    return -1
  }
  if (type === "bumparea-invert" || type === "bumpline-invert") {
    bumpSort = (a,b) => {
    if (a[yProp] < b[yProp]) {
      return 1
    }
    if (a[yProp] > b[yProp]) {
      return -1
    }
      return -1
    }
  }

  uniqXValues.forEach(xValue => {
    let offset = 0
    flatten(data.map(d => d.data.filter(p => datesForUnique(p[xProp]) === xValue)))
      .sort(bumpSort)
      .forEach((l, rank) => {
        //determine ranking and offset by the number of less than this one at each step
        l._XYFrameRank = rank
        if (type === "bumparea" || type === "bumparea-invert") {
          l[yPropTop] = offset + l[yProp]
          l[yPropMiddle] = offset + l[yProp] / 2
          l[yPropBottom] = offset
          offset += l[yProp]
        }
        else {
          l[yProp] = rank;
          l[yPropTop] = rank
          l[yPropBottom] = rank
        }
      })
  })

  return data

}

export const dividedLine = (parameters, points, searchIterations = 10) => {
  let currentParameters = parameters(points[0], 0)
  let currentPointsArray = []
  let dividedLinesData = [ { key: currentParameters, points: currentPointsArray } ]
  points.forEach((point, pointI) => {

    const newParameters = parameters(point, pointI)

    let matchingParams = newParameters === currentParameters;

    if (typeof currentParameters === "object") {
      matchingParams = JSON.stringify(newParameters) === JSON.stringify(currentParameters)
    }

    if (matchingParams) {
      currentPointsArray.push(point)
    }
    else {
      const lastPoint = currentPointsArray[currentPointsArray.length - 1];
      let pointA = lastPoint;
      let pointB = point;

      for (let x = 0; x<searchIterations; x++) {
        const keys = Object.keys(pointA)
        const findPoints = simpleSearchFunction(pointA, pointB, currentParameters, parameters, keys)
        pointA = findPoints[0]
        pointB = findPoints[1]
      }
      currentPointsArray.push(pointB)
      currentPointsArray = [ pointB, point ]
      dividedLinesData.push({ key: newParameters, points: currentPointsArray })
      currentParameters = newParameters
    }
  })
  return dividedLinesData
}

function simpleSearchFunction(pointA, pointB, current, parameters, keys) {
  const betweenPoint = { };
  keys.forEach(key => {
    betweenPoint[key] = typeof pointA[key] === "number" ? (pointA[key] + pointB[key]) / 2 : undefined
  })

  if (JSON.stringify(parameters(betweenPoint)) === JSON.stringify(current)) {
    return [ betweenPoint, pointB ]
  }
  return [ pointA, betweenPoint ]
}

export function funnelize ({ data, steps, key }) {
  const funnelData = []
  if (!Array.isArray(data)) {
    data = [ data ]
  }
  if (!steps) {
    steps = uniq(flatten(data.map(d => Object.keys(d))))
  }

  data.forEach((datum, i) => {
    const datumKey = key ? datum[key] : i
    steps.forEach(step => {
      const funnelDatum = { funnelKey: datumKey }
      funnelDatum.stepName = step
      funnelDatum.stepValue = datum[step] ? datum[step] : 0
      funnelData.push(funnelDatum)
    })
  })

  return funnelData

}
