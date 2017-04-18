import React from 'react'
import { XYFrame, ORFrame } from 'semiotic';
import { curveBasis } from 'd3-shape'

const testData = [
    { id: "linedata-1", color: "#00a2ce", data: [ { sales: 5, leads: 150, x: 1 }, { sales: 7, leads: 100, x: 2 }, { sales: 7, leads: 112, x: 3 }, { sales: 4, leads: 40, x: 4 }, { sales: 2, leads: 200, x: 5 }, { sales: 3, leads: 180, x: 6 }, { sales: 5, leads: 165, x: 7 } ] }
]

let displayData = testData.map(d => {
    let moreData = [ ...d.data, ...d.data.map(p => ({ sales: p.sales + Math.random() * 5, leads: p.leads + Math.random() * 100, x: p.x + 7 })) ]
    return Object.assign(d, { data: moreData })
})

function drawMarginPath(margin, size) {
    const interiorRing = drawInvertedRing([ [ margin.left, margin.top ],[ size[0] - margin.right, size[1] - margin.bottom ] ])
    const exteriorRing = drawRing([ [ 0, 0 ], size ])

    return exteriorRing + interiorRing
//    return "M 0 192.375 L 0 620.9375 L 540 620.9375 L 540 192.375 L 0 192.375 z M 94.28125 289.5 L 431.4375 289.5 L 431.4375 512.375 L 94.28125 512.375 L 94.28125 289.5 z "

    function drawRing(bbox) {
        return "M" + bbox[0][0] + "," + bbox[0][1] + "L" + bbox[1][0] + "," + bbox[0][1] + "L" + bbox[1][0] + "," + bbox[1][1] + "L" + bbox[0][0] + "," + bbox[1][1] + "Z"
    }
    function drawInvertedRing(bbox) {
        return "M" + bbox[0][0] + "," + bbox[0][1] + "L" + bbox[0][0] + "," + bbox[1][1] + "L" + bbox[1][0] + "," + bbox[1][1] + "L" + bbox[1][0] + "," + bbox[0][1] + "Z"
    }

}

class BoxModelExample extends React.Component {
    constructor(props){
        super(props);
    }

    render() {

      const axes = [
        { key: "yAxis", orient: "left", className: "yscale", name: "CountAxis", ticks: 3, tickFormat: (d) => d + "%" },
        { key: "xAxis", orient: "bottom", className: "xscale", name: "TimeAxis", tickValues: [ 2, 4, 6, 8, 10, 12, 14 ], tickFormat: d => "day" + d  }
      ]
      const axis3 = { key: "yAxis", orient: "top", className: "yscale", name: "CountAxis", ticks: 3, tickFormat: (d) => d }
      const size = [ 500, 300 ]
      const margin = { top: 50, bottom: 50, left: 50, right: 50 }

      const marginGraphic = <path d={drawMarginPath(margin, size)} style={{ fill: "pink" }} />

        return <div>
            <XYFrame
            axes={axes}
            size={size}
            lines={displayData}
            lineDataAccessor={d => d.data}
            xAccessor={d => d.x}
            yAccessor={d => d.sales}
            lineStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color, strokeWidth: "2px" })}
            customLineType={{ type: "line", interpolator: curveBasis, sort: null }}
            margin={margin}
            backgroundGraphics={marginGraphic}
            />
            <ORFrame
                projection="horizontal"
                size={size}
                data={displayData[0].data}
                type={"bar"}
                oAccessor={d => d.x}
                rAccessor={d => d.leads}
                style={() => ({ fill: "#00a2ce", fillOpacity: 0.5, strokeOpacity: 0.75, stroke: 'black' })}
                margin={margin}
                axis={axis3}
                backgroundGraphics={marginGraphic}
            />
            </div>
    }
}

module.exports = BoxModelExample;
