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

class BarLineChartExamples extends React.Component {
    constructor(props){
        super(props);
    }

    render() {

      const axes = [
        { key: "yAxis", orient: "left", className: "yscale", name: "CountAxis", tickValues: [ 2, 6, 10 ], tickFormat: (d) => d + "%" },
        { key: "xAxis", orient: "bottom", className: "xscale", name: "TimeAxis", tickValues: [ 2, 4, 6, 8, 10, 12 ], tickFormat: d => "day " + d  }
      ]
      const axis3 = { key: "yAxis", orient: "right", className: "yscale", name: "CountAxis", ticks: 3, tickFormat: (d) => d }

        return <div style={{ height: "300px" }}>
            <div style={{ position: "absolute" }}>
            <ORFrame
                className="divided-line-or"
                size={[ 500,300 ]}
                data={displayData[0].data}
                type={"bar"}
//                renderFn={() => "sketchy"}
                oAccessor={d => d.x}
                rAccessor={d => d.leads}
                style={() => ({ fill: "#b3331d", opacity: 1, stroke: 'white' })}
                margin={{ top: 5, bottom: 25, left: 55, right: 55 }}
                axis={axis3}
            />
            </div>
            <div style={{ position: "absolute" }}>
            <XYFrame
            className="divided-line-xy"
            axes={axes}
            size={[ 500, 300 ]}
            lines={displayData}
            lineDataAccessor={d => d.data}
            xAccessor={d => d.x}
            yAccessor={d => d.sales}
            lineStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color, strokeWidth: "2px" })}
            customLineType={{ type: "line", interpolator: curveBasis, sort: null }}
            margin={{ top: 5, bottom: 25, left: 55, right: 55 }}
            />
            </div>
            </div>
    }
}

module.exports = BarLineChartExamples;
