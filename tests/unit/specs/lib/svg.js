//import FS        from 'fs'
//import Immutable from 'immutable'
//import Path      from 'path'
//import Sinon     from 'sinon'
import datedData from '../../fixtures/layouts/datedData'
import projectedDatedData from '../../fixtures/layouts/projectedDatedData'
import stackedPercentComplexData from '../../fixtures/layouts/stackedPercentComplexData'
import stackedTotalComplexData from '../../fixtures/layouts/stackedTotalComplexData'
import bumpAreaComplexData from '../../fixtures/layouts/bumpAreaComplexData'
import bumpLineComplexData from '../../fixtures/layouts/bumpLineComplexData'

import test      from 'tape'
import d3        from 'd3'

import { dividedLine, projectLineData, differenceLine, stackedArea, bumpChart }        from '../../../../src/svg/lineDrawing'

test('SVG Rendering', t => {
    const lineAccessor = d => d.data
    const xAccessor = d => d.x
    const yAccessor = d => d.y


    const complexTestData = datedData;
    const timeExtent = [ new Date("2016-05-30T00:00:00.000Z"), new Date("2016-06-06T00:00:00.000Z") ]
    const yExtent = [ 0, d3.max(complexTestData.map(d => d3.max(d.coordinates.map(p => p.play_secs)))) ]

    const xTimeScale = d3.time.scale().domain(timeExtent).range([ 0, 1000 ])
    //Is the bumping flipped when the yScale is flipped?
    const yValueScale = d3.scale.linear().domain(yExtent).range([ 1000, 0 ])
    const testXScale = d3.scale.identity()

    const complexLineAccessor = d => d.coordinates
    const complexXAccessor = d => xTimeScale(new Date(d.date))
    const complexYAccessor = d => yValueScale(d.play_secs)

    const testData = [
      { id: "linedata-1", data: [ { y: 5, x: 1 }, { y: 7, x: 2 }, { y: 7, x: 3 }, { y: 4, x: 4 }, { y: 2, x: 5 }, { y: 3, x: 6 }, { y: 5, x: 7 } ] },
      { id: "linedata-2", data: [ { y: 1, x: 1 }, { y: 6, x: 2 }, { y: 8, x: 3 }, { y: 6, x: 4 }, { y: 4, x: 5 }, { y: 2, x: 6 }, { y: 0, x: 7 } ] },
      { id: "linedata-3", data: [ { y: 10, x: 1 }, { y: 8, x: 2 }, { y: 2, x: 3 }, { y: 3, x: 4 }, { y: 3, x: 5 }, { y: 4, x: 6 }, { y: 4, x: 7 } ] },
      { id: "linedata-4", data: [ { y: 6, x: 1 }, { y: 3, x: 2 }, { y: 3, x: 3 }, { y: 5, x: 4 }, { y: 6, x: 5 }, { y: 6, x: 6 }, { y: 6, x: 7 } ] }
    ]

    const projectedData = projectLineData({ data: testData, lineDataAccessor: lineAccessor, xProp: "test-prop-x", yProp: "test-prop-y", yPropTop: "test-prop-y-top", yPropBottom: "test-prop-y-bottom", xAccessor, yAccessor })
    const complexProjectedData  = projectLineData({ data: complexTestData, lineDataAccessor: complexLineAccessor, xProp: "test-prop-x", yProp: "test-prop-y", xAccessor: complexXAccessor, yAccessor: complexYAccessor })

  t.test('Projected Lines', tt => {

    const stringifiedExpectedProjectedData = '[{"id":"linedata-1","data":[{"y":5,"x":1,"test-prop-x":1,"test-prop-y":5,"test-prop-y-top":5,"test-prop-y-bottom":5},{"y":7,"x":2,"test-prop-x":2,"test-prop-y":7,"test-prop-y-top":7,"test-prop-y-bottom":7},{"y":7,"x":3,"test-prop-x":3,"test-prop-y":7,"test-prop-y-top":7,"test-prop-y-bottom":7},{"y":4,"x":4,"test-prop-x":4,"test-prop-y":4,"test-prop-y-top":4,"test-prop-y-bottom":4},{"y":2,"x":5,"test-prop-x":5,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":2},{"y":3,"x":6,"test-prop-x":6,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":3},{"y":5,"x":7,"test-prop-x":7,"test-prop-y":5,"test-prop-y-top":5,"test-prop-y-bottom":5}],"key":0},{"id":"linedata-2","data":[{"y":1,"x":1,"test-prop-x":1,"test-prop-y":1,"test-prop-y-top":1,"test-prop-y-bottom":1},{"y":6,"x":2,"test-prop-x":2,"test-prop-y":6,"test-prop-y-top":6,"test-prop-y-bottom":6},{"y":8,"x":3,"test-prop-x":3,"test-prop-y":8,"test-prop-y-top":8,"test-prop-y-bottom":8},{"y":6,"x":4,"test-prop-x":4,"test-prop-y":6,"test-prop-y-top":6,"test-prop-y-bottom":6},{"y":4,"x":5,"test-prop-x":5,"test-prop-y":4,"test-prop-y-top":4,"test-prop-y-bottom":4},{"y":2,"x":6,"test-prop-x":6,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":2},{"y":0,"x":7,"test-prop-x":7,"test-prop-y":0,"test-prop-y-top":0,"test-prop-y-bottom":0}],"key":1},{"id":"linedata-3","data":[{"y":10,"x":1,"test-prop-x":1,"test-prop-y":10,"test-prop-y-top":10,"test-prop-y-bottom":10},{"y":8,"x":2,"test-prop-x":2,"test-prop-y":8,"test-prop-y-top":8,"test-prop-y-bottom":8},{"y":2,"x":3,"test-prop-x":3,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":2},{"y":3,"x":4,"test-prop-x":4,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":3},{"y":3,"x":5,"test-prop-x":5,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":3},{"y":4,"x":6,"test-prop-x":6,"test-prop-y":4,"test-prop-y-top":4,"test-prop-y-bottom":4},{"y":4,"x":7,"test-prop-x":7,"test-prop-y":4,"test-prop-y-top":4,"test-prop-y-bottom":4}],"key":2},{"id":"linedata-4","data":[{"y":6,"x":1,"test-prop-x":1,"test-prop-y":6,"test-prop-y-top":6,"test-prop-y-bottom":6},{"y":3,"x":2,"test-prop-x":2,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":3},{"y":3,"x":3,"test-prop-x":3,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":3},{"y":5,"x":4,"test-prop-x":4,"test-prop-y":5,"test-prop-y-top":5,"test-prop-y-bottom":5},{"y":6,"x":5,"test-prop-x":5,"test-prop-y":6,"test-prop-y-top":6,"test-prop-y-bottom":6},{"y":6,"x":6,"test-prop-x":6,"test-prop-y":6,"test-prop-y-top":6,"test-prop-y-bottom":6},{"y":6,"x":7,"test-prop-x":7,"test-prop-y":6,"test-prop-y-top":6,"test-prop-y-bottom":6}],"key":3}]'

    tt.equal(JSON.stringify(projectedData), stringifiedExpectedProjectedData)
    tt.end()
  })

  t.test('Projected Complex Lines', tt => {

    tt.equal(JSON.stringify(complexProjectedData), projectedDatedData)
    tt.end()
  })

  t.test('Difference Line', tt => {

    //Difference line only deals with arrays with two lines
    const testDataTwoOnly = projectedData.filter((d,i) => i <= 1)

    const differenceData = differenceLine({ data: testDataTwoOnly, yProp: "test-prop-y", yPropTop: "test-prop-y-top", yPropBottom: "test-prop-y-bottom" })

    const stringifiedExpectedDifferenceData = '[{"id":"linedata-1","data":[{"y":5,"x":1,"test-prop-x":1,"test-prop-y":5,"test-prop-y-top":5,"test-prop-y-bottom":1},{"y":7,"x":2,"test-prop-x":2,"test-prop-y":7,"test-prop-y-top":7,"test-prop-y-bottom":6},{"y":7,"x":3,"test-prop-x":3,"test-prop-y":7,"test-prop-y-top":7,"test-prop-y-bottom":7},{"y":4,"x":4,"test-prop-x":4,"test-prop-y":4,"test-prop-y-top":4,"test-prop-y-bottom":4},{"y":2,"x":5,"test-prop-x":5,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":2},{"y":3,"x":6,"test-prop-x":6,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":2},{"y":5,"x":7,"test-prop-x":7,"test-prop-y":5,"test-prop-y-top":5,"test-prop-y-bottom":0}],"key":0},{"id":"linedata-2","data":[{"y":1,"x":1,"test-prop-x":1,"test-prop-y":1,"test-prop-y-top":1,"test-prop-y-bottom":1},{"y":6,"x":2,"test-prop-x":2,"test-prop-y":6,"test-prop-y-top":6,"test-prop-y-bottom":6},{"y":8,"x":3,"test-prop-x":3,"test-prop-y":8,"test-prop-y-top":8,"test-prop-y-bottom":7},{"y":6,"x":4,"test-prop-x":4,"test-prop-y":6,"test-prop-y-top":6,"test-prop-y-bottom":4},{"y":4,"x":5,"test-prop-x":5,"test-prop-y":4,"test-prop-y-top":4,"test-prop-y-bottom":2},{"y":2,"x":6,"test-prop-x":6,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":2},{"y":0,"x":7,"test-prop-x":7,"test-prop-y":0,"test-prop-y-top":0,"test-prop-y-bottom":0}],"key":1}]'

    tt.equal(JSON.stringify(differenceData), stringifiedExpectedDifferenceData)
    tt.end()

  })

  t.test('Stacked Percent', tt => {

    const stackedPercentData = stackedArea({ stackType: "stackedpercent", data: projectedData, xScale: testXScale, xProp: "test-prop-x", yProp: "test-prop-y", offsetProp: "offset-stacked", yPropAdjusted: "yAdjusted-stacked", yPropMiddle: "yMiddle-stacked" })

    const stringifiedExpectedStackPercentData = '[{"id":"linedata-4","data":[{"y":6,"x":1,"test-prop-x":1,"test-prop-y":6,"test-prop-y-top":6,"test-prop-y-bottom":6,"undefined":6,"yMiddle-stacked":3},{"y":3,"x":2,"test-prop-x":2,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":3,"undefined":3,"yMiddle-stacked":1.5},{"y":3,"x":3,"test-prop-x":3,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":3,"undefined":3,"yMiddle-stacked":1.5},{"y":5,"x":4,"test-prop-x":4,"test-prop-y":5,"test-prop-y-top":5,"test-prop-y-bottom":5,"undefined":5,"yMiddle-stacked":2.5},{"y":6,"x":5,"test-prop-x":5,"test-prop-y":6,"test-prop-y-top":6,"test-prop-y-bottom":6,"undefined":6,"yMiddle-stacked":3},{"y":6,"x":6,"test-prop-x":6,"test-prop-y":6,"test-prop-y-top":6,"test-prop-y-bottom":6,"undefined":6,"yMiddle-stacked":3},{"y":6,"x":7,"test-prop-x":7,"test-prop-y":6,"test-prop-y-top":6,"test-prop-y-bottom":6,"undefined":6,"yMiddle-stacked":3}],"key":3},{"id":"linedata-3","data":[{"y":10,"x":1,"test-prop-x":1,"test-prop-y":10,"test-prop-y-top":10,"test-prop-y-bottom":10,"undefined":16,"yMiddle-stacked":11},{"y":8,"x":2,"test-prop-x":2,"test-prop-y":8,"test-prop-y-top":8,"test-prop-y-bottom":8,"undefined":11,"yMiddle-stacked":7},{"y":2,"x":3,"test-prop-x":3,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":2,"undefined":5,"yMiddle-stacked":4},{"y":3,"x":4,"test-prop-x":4,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":3,"undefined":8,"yMiddle-stacked":6.5},{"y":3,"x":5,"test-prop-x":5,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":3,"undefined":9,"yMiddle-stacked":7.5},{"y":4,"x":6,"test-prop-x":6,"test-prop-y":4,"test-prop-y-top":4,"test-prop-y-bottom":4,"undefined":10,"yMiddle-stacked":8},{"y":4,"x":7,"test-prop-x":7,"test-prop-y":4,"test-prop-y-top":4,"test-prop-y-bottom":4,"undefined":10,"yMiddle-stacked":8}],"key":2},{"id":"linedata-1","data":[{"y":5,"x":1,"test-prop-x":1,"test-prop-y":5,"test-prop-y-top":5,"test-prop-y-bottom":1,"undefined":21,"yMiddle-stacked":18.5},{"y":7,"x":2,"test-prop-x":2,"test-prop-y":7,"test-prop-y-top":7,"test-prop-y-bottom":6,"undefined":18,"yMiddle-stacked":14.5},{"y":7,"x":3,"test-prop-x":3,"test-prop-y":7,"test-prop-y-top":7,"test-prop-y-bottom":7,"undefined":12,"yMiddle-stacked":8.5},{"y":4,"x":4,"test-prop-x":4,"test-prop-y":4,"test-prop-y-top":4,"test-prop-y-bottom":4,"undefined":12,"yMiddle-stacked":10},{"y":2,"x":5,"test-prop-x":5,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":2,"undefined":11,"yMiddle-stacked":10},{"y":3,"x":6,"test-prop-x":6,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":2,"undefined":13,"yMiddle-stacked":11.5},{"y":5,"x":7,"test-prop-x":7,"test-prop-y":5,"test-prop-y-top":5,"test-prop-y-bottom":0,"undefined":15,"yMiddle-stacked":12.5}],"key":0},{"id":"linedata-2","data":[{"y":1,"x":1,"test-prop-x":1,"test-prop-y":1,"test-prop-y-top":1,"test-prop-y-bottom":1,"undefined":22,"yMiddle-stacked":21.5},{"y":6,"x":2,"test-prop-x":2,"test-prop-y":6,"test-prop-y-top":6,"test-prop-y-bottom":6,"undefined":24,"yMiddle-stacked":21},{"y":8,"x":3,"test-prop-x":3,"test-prop-y":8,"test-prop-y-top":8,"test-prop-y-bottom":7,"undefined":20,"yMiddle-stacked":16},{"y":6,"x":4,"test-prop-x":4,"test-prop-y":6,"test-prop-y-top":6,"test-prop-y-bottom":4,"undefined":18,"yMiddle-stacked":15},{"y":4,"x":5,"test-prop-x":5,"test-prop-y":4,"test-prop-y-top":4,"test-prop-y-bottom":2,"undefined":15,"yMiddle-stacked":13},{"y":2,"x":6,"test-prop-x":6,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":2,"undefined":15,"yMiddle-stacked":14},{"y":0,"x":7,"test-prop-x":7,"test-prop-y":0,"test-prop-y-top":0,"test-prop-y-bottom":0,"undefined":15,"yMiddle-stacked":15}],"key":1}]'

    tt.equal(JSON.stringify(stackedPercentData), stringifiedExpectedStackPercentData)
    tt.end()
  })
  t.test('Stacked Total', tt => {

    const stackedTotalData = stackedArea({ data: projectedData, xScale: testXScale, xProp: "test-prop-x", yProp: "test-prop-y", yPropTop: "test-prop-y-top", yPropBottom: "test-prop-y-bottom", yPropMiddle: "test-prop-y-middle" })

    const stringifiedExpectedStackTotalData = '[{"id":"linedata-4","data":[{"y":6,"x":1,"test-prop-x":1,"test-prop-y":6,"test-prop-y-top":6,"test-prop-y-bottom":0,"undefined":6,"yMiddle-stacked":3,"test-prop-y-middle":3},{"y":3,"x":2,"test-prop-x":2,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":0,"undefined":3,"yMiddle-stacked":1.5,"test-prop-y-middle":1.5},{"y":3,"x":3,"test-prop-x":3,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":0,"undefined":3,"yMiddle-stacked":1.5,"test-prop-y-middle":1.5},{"y":5,"x":4,"test-prop-x":4,"test-prop-y":5,"test-prop-y-top":5,"test-prop-y-bottom":0,"undefined":5,"yMiddle-stacked":2.5,"test-prop-y-middle":2.5},{"y":6,"x":5,"test-prop-x":5,"test-prop-y":6,"test-prop-y-top":6,"test-prop-y-bottom":0,"undefined":6,"yMiddle-stacked":3,"test-prop-y-middle":3},{"y":6,"x":6,"test-prop-x":6,"test-prop-y":6,"test-prop-y-top":6,"test-prop-y-bottom":0,"undefined":6,"yMiddle-stacked":3,"test-prop-y-middle":3},{"y":6,"x":7,"test-prop-x":7,"test-prop-y":6,"test-prop-y-top":6,"test-prop-y-bottom":0,"undefined":6,"yMiddle-stacked":3,"test-prop-y-middle":3}],"key":3},{"id":"linedata-3","data":[{"y":10,"x":1,"test-prop-x":1,"test-prop-y":10,"test-prop-y-top":16,"test-prop-y-bottom":6,"undefined":16,"yMiddle-stacked":11,"test-prop-y-middle":11},{"y":8,"x":2,"test-prop-x":2,"test-prop-y":8,"test-prop-y-top":11,"test-prop-y-bottom":3,"undefined":11,"yMiddle-stacked":7,"test-prop-y-middle":7},{"y":2,"x":3,"test-prop-x":3,"test-prop-y":2,"test-prop-y-top":5,"test-prop-y-bottom":3,"undefined":5,"yMiddle-stacked":4,"test-prop-y-middle":4},{"y":3,"x":4,"test-prop-x":4,"test-prop-y":3,"test-prop-y-top":8,"test-prop-y-bottom":5,"undefined":8,"yMiddle-stacked":6.5,"test-prop-y-middle":6.5},{"y":3,"x":5,"test-prop-x":5,"test-prop-y":3,"test-prop-y-top":9,"test-prop-y-bottom":6,"undefined":9,"yMiddle-stacked":7.5,"test-prop-y-middle":7.5},{"y":4,"x":6,"test-prop-x":6,"test-prop-y":4,"test-prop-y-top":10,"test-prop-y-bottom":6,"undefined":10,"yMiddle-stacked":8,"test-prop-y-middle":8},{"y":4,"x":7,"test-prop-x":7,"test-prop-y":4,"test-prop-y-top":10,"test-prop-y-bottom":6,"undefined":10,"yMiddle-stacked":8,"test-prop-y-middle":8}],"key":2},{"id":"linedata-1","data":[{"y":5,"x":1,"test-prop-x":1,"test-prop-y":5,"test-prop-y-top":21,"test-prop-y-bottom":16,"undefined":21,"yMiddle-stacked":18.5,"test-prop-y-middle":18.5},{"y":7,"x":2,"test-prop-x":2,"test-prop-y":7,"test-prop-y-top":18,"test-prop-y-bottom":11,"undefined":18,"yMiddle-stacked":14.5,"test-prop-y-middle":14.5},{"y":7,"x":3,"test-prop-x":3,"test-prop-y":7,"test-prop-y-top":12,"test-prop-y-bottom":5,"undefined":12,"yMiddle-stacked":8.5,"test-prop-y-middle":8.5},{"y":4,"x":4,"test-prop-x":4,"test-prop-y":4,"test-prop-y-top":12,"test-prop-y-bottom":8,"undefined":12,"yMiddle-stacked":10,"test-prop-y-middle":10},{"y":2,"x":5,"test-prop-x":5,"test-prop-y":2,"test-prop-y-top":11,"test-prop-y-bottom":9,"undefined":11,"yMiddle-stacked":10,"test-prop-y-middle":10},{"y":3,"x":6,"test-prop-x":6,"test-prop-y":3,"test-prop-y-top":13,"test-prop-y-bottom":10,"undefined":13,"yMiddle-stacked":11.5,"test-prop-y-middle":11.5},{"y":5,"x":7,"test-prop-x":7,"test-prop-y":5,"test-prop-y-top":15,"test-prop-y-bottom":10,"undefined":15,"yMiddle-stacked":12.5,"test-prop-y-middle":12.5}],"key":0},{"id":"linedata-2","data":[{"y":1,"x":1,"test-prop-x":1,"test-prop-y":1,"test-prop-y-top":22,"test-prop-y-bottom":21,"undefined":22,"yMiddle-stacked":21.5,"test-prop-y-middle":21.5},{"y":6,"x":2,"test-prop-x":2,"test-prop-y":6,"test-prop-y-top":24,"test-prop-y-bottom":18,"undefined":24,"yMiddle-stacked":21,"test-prop-y-middle":21},{"y":8,"x":3,"test-prop-x":3,"test-prop-y":8,"test-prop-y-top":20,"test-prop-y-bottom":12,"undefined":20,"yMiddle-stacked":16,"test-prop-y-middle":16},{"y":6,"x":4,"test-prop-x":4,"test-prop-y":6,"test-prop-y-top":18,"test-prop-y-bottom":12,"undefined":18,"yMiddle-stacked":15,"test-prop-y-middle":15},{"y":4,"x":5,"test-prop-x":5,"test-prop-y":4,"test-prop-y-top":15,"test-prop-y-bottom":11,"undefined":15,"yMiddle-stacked":13,"test-prop-y-middle":13},{"y":2,"x":6,"test-prop-x":6,"test-prop-y":2,"test-prop-y-top":15,"test-prop-y-bottom":13,"undefined":15,"yMiddle-stacked":14,"test-prop-y-middle":14},{"y":0,"x":7,"test-prop-x":7,"test-prop-y":0,"test-prop-y-top":15,"test-prop-y-bottom":15,"undefined":15,"yMiddle-stacked":15,"test-prop-y-middle":15}],"key":1}]'

    tt.equal(JSON.stringify(stackedTotalData), stringifiedExpectedStackTotalData)
    tt.end()
  })
  t.test('Bump Area', tt => {

    const bumpAreaData = bumpChart({ bumpType: "bumparea", data: projectedData, xScale: testXScale, xProp: "test-prop-x", yProp: "test-prop-y", yPropTop: "test-prop-y-top", yPropBottom: "test-prop-y-bottom", yPropMiddle: "test-prop-y-middle" })

    const stringifiedExpectedBumpAreaData = '[{"id":"linedata-4","data":[{"y":6,"x":1,"test-prop-x":1,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":2,"undefined":6,"yMiddle-stacked":3,"test-prop-y-middle":3,"_XYFrameRank":2},{"y":3,"x":2,"test-prop-x":2,"test-prop-y":0,"test-prop-y-top":0,"test-prop-y-bottom":0,"undefined":3,"yMiddle-stacked":1.5,"test-prop-y-middle":1.5,"_XYFrameRank":0},{"y":3,"x":3,"test-prop-x":3,"test-prop-y":1,"test-prop-y-top":1,"test-prop-y-bottom":1,"undefined":3,"yMiddle-stacked":1.5,"test-prop-y-middle":1.5,"_XYFrameRank":1},{"y":5,"x":4,"test-prop-x":4,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":2,"undefined":5,"yMiddle-stacked":2.5,"test-prop-y-middle":2.5,"_XYFrameRank":2},{"y":6,"x":5,"test-prop-x":5,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":3,"undefined":6,"yMiddle-stacked":3,"test-prop-y-middle":3,"_XYFrameRank":3},{"y":6,"x":6,"test-prop-x":6,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":3,"undefined":6,"yMiddle-stacked":3,"test-prop-y-middle":3,"_XYFrameRank":3},{"y":6,"x":7,"test-prop-x":7,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":3,"undefined":6,"yMiddle-stacked":3,"test-prop-y-middle":3,"_XYFrameRank":3}],"key":3},{"id":"linedata-3","data":[{"y":10,"x":1,"test-prop-x":1,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":3,"undefined":16,"yMiddle-stacked":11,"test-prop-y-middle":11,"_XYFrameRank":3},{"y":8,"x":2,"test-prop-x":2,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":3,"undefined":11,"yMiddle-stacked":7,"test-prop-y-middle":7,"_XYFrameRank":3},{"y":2,"x":3,"test-prop-x":3,"test-prop-y":0,"test-prop-y-top":0,"test-prop-y-bottom":0,"undefined":5,"yMiddle-stacked":4,"test-prop-y-middle":4,"_XYFrameRank":0},{"y":3,"x":4,"test-prop-x":4,"test-prop-y":0,"test-prop-y-top":0,"test-prop-y-bottom":0,"undefined":8,"yMiddle-stacked":6.5,"test-prop-y-middle":6.5,"_XYFrameRank":0},{"y":3,"x":5,"test-prop-x":5,"test-prop-y":1,"test-prop-y-top":1,"test-prop-y-bottom":1,"undefined":9,"yMiddle-stacked":7.5,"test-prop-y-middle":7.5,"_XYFrameRank":1},{"y":4,"x":6,"test-prop-x":6,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":2,"undefined":10,"yMiddle-stacked":8,"test-prop-y-middle":8,"_XYFrameRank":2},{"y":4,"x":7,"test-prop-x":7,"test-prop-y":1,"test-prop-y-top":1,"test-prop-y-bottom":1,"undefined":10,"yMiddle-stacked":8,"test-prop-y-middle":8,"_XYFrameRank":1}],"key":2},{"id":"linedata-1","data":[{"y":5,"x":1,"test-prop-x":1,"test-prop-y":1,"test-prop-y-top":1,"test-prop-y-bottom":1,"undefined":21,"yMiddle-stacked":18.5,"test-prop-y-middle":18.5,"_XYFrameRank":1},{"y":7,"x":2,"test-prop-x":2,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":2,"undefined":18,"yMiddle-stacked":14.5,"test-prop-y-middle":14.5,"_XYFrameRank":2},{"y":7,"x":3,"test-prop-x":3,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":2,"undefined":12,"yMiddle-stacked":8.5,"test-prop-y-middle":8.5,"_XYFrameRank":2},{"y":4,"x":4,"test-prop-x":4,"test-prop-y":1,"test-prop-y-top":1,"test-prop-y-bottom":1,"undefined":12,"yMiddle-stacked":10,"test-prop-y-middle":10,"_XYFrameRank":1},{"y":2,"x":5,"test-prop-x":5,"test-prop-y":0,"test-prop-y-top":0,"test-prop-y-bottom":0,"undefined":11,"yMiddle-stacked":10,"test-prop-y-middle":10,"_XYFrameRank":0},{"y":3,"x":6,"test-prop-x":6,"test-prop-y":1,"test-prop-y-top":1,"test-prop-y-bottom":1,"undefined":13,"yMiddle-stacked":11.5,"test-prop-y-middle":11.5,"_XYFrameRank":1},{"y":5,"x":7,"test-prop-x":7,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":2,"undefined":15,"yMiddle-stacked":12.5,"test-prop-y-middle":12.5,"_XYFrameRank":2}],"key":0},{"id":"linedata-2","data":[{"y":1,"x":1,"test-prop-x":1,"test-prop-y":0,"test-prop-y-top":0,"test-prop-y-bottom":0,"undefined":22,"yMiddle-stacked":21.5,"test-prop-y-middle":21.5,"_XYFrameRank":0},{"y":6,"x":2,"test-prop-x":2,"test-prop-y":1,"test-prop-y-top":1,"test-prop-y-bottom":1,"undefined":24,"yMiddle-stacked":21,"test-prop-y-middle":21,"_XYFrameRank":1},{"y":8,"x":3,"test-prop-x":3,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":3,"undefined":20,"yMiddle-stacked":16,"test-prop-y-middle":16,"_XYFrameRank":3},{"y":6,"x":4,"test-prop-x":4,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":3,"undefined":18,"yMiddle-stacked":15,"test-prop-y-middle":15,"_XYFrameRank":3},{"y":4,"x":5,"test-prop-x":5,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":2,"undefined":15,"yMiddle-stacked":13,"test-prop-y-middle":13,"_XYFrameRank":2},{"y":2,"x":6,"test-prop-x":6,"test-prop-y":0,"test-prop-y-top":0,"test-prop-y-bottom":0,"undefined":15,"yMiddle-stacked":14,"test-prop-y-middle":14,"_XYFrameRank":0},{"y":0,"x":7,"test-prop-x":7,"test-prop-y":0,"test-prop-y-top":0,"test-prop-y-bottom":0,"undefined":15,"yMiddle-stacked":15,"test-prop-y-middle":15,"_XYFrameRank":0}],"key":1}]'

    tt.equal(JSON.stringify(bumpAreaData), stringifiedExpectedBumpAreaData)
    tt.end()
  })
  t.test('Bump Line', tt => {

    const bumpLineData = bumpChart({ data: projectedData, xScale: testXScale, xProp: "test-prop-x", yProp: "test-prop-y", yPropTop: "test-prop-y-top", yPropBottom: "test-prop-y-bottom", yPropMiddle: "test-prop-y-middle" })

    const stringifiedExpectedBumpLineData = '[{"id":"linedata-4","data":[{"y":6,"x":1,"test-prop-x":1,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":2,"undefined":6,"yMiddle-stacked":3,"test-prop-y-middle":3,"_XYFrameRank":2},{"y":3,"x":2,"test-prop-x":2,"test-prop-y":0,"test-prop-y-top":0,"test-prop-y-bottom":0,"undefined":3,"yMiddle-stacked":1.5,"test-prop-y-middle":1.5,"_XYFrameRank":0},{"y":3,"x":3,"test-prop-x":3,"test-prop-y":1,"test-prop-y-top":1,"test-prop-y-bottom":1,"undefined":3,"yMiddle-stacked":1.5,"test-prop-y-middle":1.5,"_XYFrameRank":1},{"y":5,"x":4,"test-prop-x":4,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":2,"undefined":5,"yMiddle-stacked":2.5,"test-prop-y-middle":2.5,"_XYFrameRank":2},{"y":6,"x":5,"test-prop-x":5,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":3,"undefined":6,"yMiddle-stacked":3,"test-prop-y-middle":3,"_XYFrameRank":3},{"y":6,"x":6,"test-prop-x":6,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":3,"undefined":6,"yMiddle-stacked":3,"test-prop-y-middle":3,"_XYFrameRank":3},{"y":6,"x":7,"test-prop-x":7,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":3,"undefined":6,"yMiddle-stacked":3,"test-prop-y-middle":3,"_XYFrameRank":3}],"key":3},{"id":"linedata-3","data":[{"y":10,"x":1,"test-prop-x":1,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":3,"undefined":16,"yMiddle-stacked":11,"test-prop-y-middle":11,"_XYFrameRank":3},{"y":8,"x":2,"test-prop-x":2,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":3,"undefined":11,"yMiddle-stacked":7,"test-prop-y-middle":7,"_XYFrameRank":3},{"y":2,"x":3,"test-prop-x":3,"test-prop-y":0,"test-prop-y-top":0,"test-prop-y-bottom":0,"undefined":5,"yMiddle-stacked":4,"test-prop-y-middle":4,"_XYFrameRank":0},{"y":3,"x":4,"test-prop-x":4,"test-prop-y":0,"test-prop-y-top":0,"test-prop-y-bottom":0,"undefined":8,"yMiddle-stacked":6.5,"test-prop-y-middle":6.5,"_XYFrameRank":0},{"y":3,"x":5,"test-prop-x":5,"test-prop-y":1,"test-prop-y-top":1,"test-prop-y-bottom":1,"undefined":9,"yMiddle-stacked":7.5,"test-prop-y-middle":7.5,"_XYFrameRank":1},{"y":4,"x":6,"test-prop-x":6,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":2,"undefined":10,"yMiddle-stacked":8,"test-prop-y-middle":8,"_XYFrameRank":2},{"y":4,"x":7,"test-prop-x":7,"test-prop-y":1,"test-prop-y-top":1,"test-prop-y-bottom":1,"undefined":10,"yMiddle-stacked":8,"test-prop-y-middle":8,"_XYFrameRank":1}],"key":2},{"id":"linedata-1","data":[{"y":5,"x":1,"test-prop-x":1,"test-prop-y":1,"test-prop-y-top":1,"test-prop-y-bottom":1,"undefined":21,"yMiddle-stacked":18.5,"test-prop-y-middle":18.5,"_XYFrameRank":1},{"y":7,"x":2,"test-prop-x":2,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":2,"undefined":18,"yMiddle-stacked":14.5,"test-prop-y-middle":14.5,"_XYFrameRank":2},{"y":7,"x":3,"test-prop-x":3,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":2,"undefined":12,"yMiddle-stacked":8.5,"test-prop-y-middle":8.5,"_XYFrameRank":2},{"y":4,"x":4,"test-prop-x":4,"test-prop-y":1,"test-prop-y-top":1,"test-prop-y-bottom":1,"undefined":12,"yMiddle-stacked":10,"test-prop-y-middle":10,"_XYFrameRank":1},{"y":2,"x":5,"test-prop-x":5,"test-prop-y":0,"test-prop-y-top":0,"test-prop-y-bottom":0,"undefined":11,"yMiddle-stacked":10,"test-prop-y-middle":10,"_XYFrameRank":0},{"y":3,"x":6,"test-prop-x":6,"test-prop-y":1,"test-prop-y-top":1,"test-prop-y-bottom":1,"undefined":13,"yMiddle-stacked":11.5,"test-prop-y-middle":11.5,"_XYFrameRank":1},{"y":5,"x":7,"test-prop-x":7,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":2,"undefined":15,"yMiddle-stacked":12.5,"test-prop-y-middle":12.5,"_XYFrameRank":2}],"key":0},{"id":"linedata-2","data":[{"y":1,"x":1,"test-prop-x":1,"test-prop-y":0,"test-prop-y-top":0,"test-prop-y-bottom":0,"undefined":22,"yMiddle-stacked":21.5,"test-prop-y-middle":21.5,"_XYFrameRank":0},{"y":6,"x":2,"test-prop-x":2,"test-prop-y":1,"test-prop-y-top":1,"test-prop-y-bottom":1,"undefined":24,"yMiddle-stacked":21,"test-prop-y-middle":21,"_XYFrameRank":1},{"y":8,"x":3,"test-prop-x":3,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":3,"undefined":20,"yMiddle-stacked":16,"test-prop-y-middle":16,"_XYFrameRank":3},{"y":6,"x":4,"test-prop-x":4,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":3,"undefined":18,"yMiddle-stacked":15,"test-prop-y-middle":15,"_XYFrameRank":3},{"y":4,"x":5,"test-prop-x":5,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":2,"undefined":15,"yMiddle-stacked":13,"test-prop-y-middle":13,"_XYFrameRank":2},{"y":2,"x":6,"test-prop-x":6,"test-prop-y":0,"test-prop-y-top":0,"test-prop-y-bottom":0,"undefined":15,"yMiddle-stacked":14,"test-prop-y-middle":14,"_XYFrameRank":0},{"y":0,"x":7,"test-prop-x":7,"test-prop-y":0,"test-prop-y-top":0,"test-prop-y-bottom":0,"undefined":15,"yMiddle-stacked":15,"test-prop-y-middle":15,"_XYFrameRank":0}],"key":1}]'

    tt.equal(JSON.stringify(bumpLineData), stringifiedExpectedBumpLineData)
    tt.end()

  })

  t.test('Stacked Percent Complex', tt => {

    const stackedPercentData = stackedArea({ stackType: "stackedpercent", data: complexProjectedData, xScale: testXScale, xProp: "test-prop-x", yPropTop: "test-prop-y-top", yPropBottom: "test-prop-y-bottom", yPropMiddle: "test-prop-y-middle" })

    const stringifiedExpectedStackPercentData = stackedPercentComplexData

    tt.equal(JSON.stringify(stackedPercentData), stringifiedExpectedStackPercentData)
    tt.end()
  })
  t.test('Stacked Total Complex', tt => {

    const stackedTotalData = stackedArea({ data: projectedData, xScale: testXScale, xProp: "test-prop-x", yProp: "test-prop-y", yPropTop: "test-prop-y-top", yPropBottom: "test-prop-y-bottom", yPropMiddle: "test-prop-y-middle" })

    const stringifiedExpectedStackTotalData = stackedTotalComplexData

    tt.equal(JSON.stringify(stackedTotalData), stringifiedExpectedStackTotalData)
    tt.end()
  })
  t.test('Bump Area Complex', tt => {

    const bumpAreaData = bumpChart({ bumpType: "bumparea", data: complexProjectedData, xScale: testXScale, xProp: "test-prop-x", yProp: "test-prop-y", yPropTop: "test-prop-y-top", yPropBottom: "test-prop-y-bottom", yPropMiddle: "test-prop-y-middle" })

    const stringifiedExpectedBumpAreaData = bumpAreaComplexData

    tt.equal(JSON.stringify(bumpAreaData), stringifiedExpectedBumpAreaData)
    tt.end()
  })
  t.test('Bump Line Complex', tt => {

    const bumpLineData = bumpChart({ data: complexProjectedData, xScale: testXScale, xProp: "test-prop-x", yProp: "test-prop-y", yPropTop: "test-prop-y-top", yPropBottom: "test-prop-y-bottom", yPropMiddle: "test-prop-y-middle" })

    const stringifiedExpectedBumpLineData = bumpLineComplexData

    tt.equal(JSON.stringify(bumpLineData), stringifiedExpectedBumpLineData)
    tt.end()

  })

  t.test('Divided Line', tt => {

  const parameters = point => {
    if (point.x < 3) {
      return "before"
    }
    if (point.y < 5) {
      return "above"
    }
    return "normal"
  }

    const dividedLineData = dividedLine(parameters, projectedData[0].data, "test-prop-x", "test-prop-y")

    const stringifiedExpectedDividedLineData = '[{"key":"before","points":[{"y":6,"x":1,"test-prop-x":1,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":0,"undefined":6,"yMiddle-stacked":3,"test-prop-y-middle":1,"_XYFrameRank":2},{"y":3,"x":2,"test-prop-x":2,"test-prop-y":0,"test-prop-y-top":0,"test-prop-y-bottom":0,"undefined":3,"yMiddle-stacked":1.5,"test-prop-y-middle":0,"_XYFrameRank":0},{"y":3,"x":3,"test-prop-x":3,"test-prop-y":1,"test-prop-y-top":1,"test-prop-y-bottom":0,"undefined":3,"yMiddle-stacked":1.5,"test-prop-y-middle":0.5,"_XYFrameRank":1}]},{"key":"above","points":[{"y":3,"x":3,"test-prop-x":3,"test-prop-y":1,"test-prop-y-top":1,"test-prop-y-bottom":0,"undefined":3,"yMiddle-stacked":1.5,"test-prop-y-middle":0.5,"_XYFrameRank":1},{"y":3,"x":3,"test-prop-x":3,"test-prop-y":1,"test-prop-y-top":1,"test-prop-y-bottom":0,"undefined":3,"yMiddle-stacked":1.5,"test-prop-y-middle":0.5,"_XYFrameRank":1},{"y":5,"x":4,"test-prop-x":4,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":0,"undefined":5,"yMiddle-stacked":2.5,"test-prop-y-middle":1,"_XYFrameRank":2}]},{"key":"normal","points":[{"y":5,"x":4,"test-prop-x":4,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":0,"undefined":5,"yMiddle-stacked":2.5,"test-prop-y-middle":1,"_XYFrameRank":2},{"y":5,"x":4,"test-prop-x":4,"test-prop-y":2,"test-prop-y-top":2,"test-prop-y-bottom":0,"undefined":5,"yMiddle-stacked":2.5,"test-prop-y-middle":1,"_XYFrameRank":2},{"y":6,"x":5,"test-prop-x":5,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":0,"undefined":6,"yMiddle-stacked":3,"test-prop-y-middle":1.5,"_XYFrameRank":3},{"y":6,"x":6,"test-prop-x":6,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":0,"undefined":6,"yMiddle-stacked":3,"test-prop-y-middle":1.5,"_XYFrameRank":3},{"y":6,"x":7,"test-prop-x":7,"test-prop-y":3,"test-prop-y-top":3,"test-prop-y-bottom":0,"undefined":6,"yMiddle-stacked":3,"test-prop-y-middle":1.5,"_XYFrameRank":3}]}]'

    tt.equal(JSON.stringify(dividedLineData), stringifiedExpectedDividedLineData)
    tt.end()

  })

  t.end()
})
