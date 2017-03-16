import React from 'react'
import { MinimapXYFrame } from 'abacus-viz-framework';
import { curveBasis, curveCardinal, curveCatmullRom, curveLinear, curveNatural, curveMonotoneX, curveStep  } from 'd3-shape'

const testData = [
    { id: "linedata-1", color: "#00a2ce", data: [ { y: 5, x: 1 }, { y: 7, x: 2 }, { y: 7, x: 3 }, { y: 4, x: 4 }, { y: 2, x: 5 }, { y: 3, x: 6 }, { y: 5, x: 7 } ] },
    { id: "linedata-2", color: "#4d430c", data: [ { y: 1, x: 1 }, { y: 6, x: 2 }, { y: 8, x: 3 }, { y: 6, x: 4 }, { y: 4, x: 5 }, { y: 2, x: 6 }, { y: 0, x: 7 } ] },
    { id: "linedata-3", color: "#b3331d", data: [ { y: 10, x: 1 }, { y: 8, x: 2 }, { y: 2, x: 3 }, { y: 3, x: 4 }, { y: 3, x: 5 }, { y: 4, x: 6 }, { y: 4, x: 7 } ] },
    { id: "linedata-4", color: "#b6a756", data: [ { y: 6, x: 1 }, { y: 3, x: 2 }, { y: 3, x: 3 }, { y: 5, x: 4 }, { y: 6, x: 5 }, { y: 6, x: 6 }, { y: 6, x: 7 } ] }
]

let displayData = testData.map(d => {
    let moreData = [ ...d.data, ...d.data.map(p => ({ y: p.y + Math.random() * 10, x: p.x + 7 })) ]
    return Object.assign(d, { data: moreData })
})

class XYFrameWithMinimapExamples extends React.Component {
    constructor(props){
        super(props);
        this.state = { customLineType: "bumparea", curve: "curveBasis", extent: [ 1,8 ] }
        this.changeCustomLineType = this.changeCustomLineType.bind(this)
        this.changeCurve = this.changeCurve.bind(this)
        this.updateDateRange = this.updateDateRange.bind(this)
    }

    changeCustomLineType(e) {
        this.setState({ customLineType: e.target.value })
    }

    changeCurve (e) {
        this.setState({ curve: e.target.value })
    }
    updateDateRange (e) {
        this.setState({ extent: e })
    }

    render() {

        const frameWidth = 500
        const options = [ "line", "difference", "stackedarea", "bumpline", "bumparea" ]
            .map(d => <option key={"line-option-" + d} label={d} value={d}>{d}</option>)

        const curveOptions = [ "curveBasis", "curveCardinal", "curveCatmullRom", "curveLinear", "curveNatural", "curveMonotoneX", "curveStep" ]
            .map(d => <option key={"curve-option-" + d} label={d} value={d}>{d}</option>)

        const curveHash = { curveBasis, curveCardinal, curveCatmullRom, curveLinear, curveNatural, curveMonotoneX, curveStep }
        let finaldisplayData = displayData

        if (this.state.customLineType === "difference") {
            finaldisplayData = displayData.filter((d,i) => i < 2)
        }

      const axes = [
        { key: "yAxis", orient: "left", className: "yscale", name: "CountAxis", tickValues: [ 10, 20, 30, 40, 50 ], tickFormat: (d) => d + "%" },
        { key: "xAxis", orient: "bottom", className: "xscale", name: "TimeAxis", tickValues: [ 2, 4, 6, 8, 10, 12, 14 ], tickFormat: d => d + " day" }
      ]

        return <div>
            <span>customLineType=<select onChange={this.changeCustomLineType}>{options}</select></span>
            <span>curve<select onChange={this.changeCurve}>{curveOptions}</select></span>
            <MinimapXYFrame
            renderBefore={true}
            axes={axes}
            size={[ frameWidth, 300 ]}
            lines={finaldisplayData}
            lineDataAccessor={d => d.data.filter(p => p.x >= this.state.extent[0] && p.x <= this.state.extent[1])}
            xAccessor={d => d.x}
            yAccessor={d => d.y}
            lineStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color })}
            customLineType={{ type: this.state.customLineType, interpolator: curveHash[this.state.curve], sort: null }}
            minimap={{ margin: {top: 20, bottom: 20, left: 20, right: 20}, lineStyle: d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color }), customLineType: { type: this.state.customLineType, interpolator: curveHash[this.state.curve], sort: null }, brushEnd: this.updateDateRange, yBrushable: false, xBrushExtent: this.state.extent, lines: finaldisplayData, lineDataAccessor: d => d.data, size: [ frameWidth, 150 ], axes: [axes[1]] }}
            lineRenderMode={() => "sketchy"}
            />
            </div>
    }
}

module.exports = XYFrameWithMinimapExamples;
