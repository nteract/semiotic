import React from 'react'
import { XYFrame } from 'abacus-viz-framework';
import { curveBasis, curveCardinal, curveCatmullRom, curveLinear, curveNatural, curveMonotoneX, curveStep  } from 'd3-shape'

const testData = [
    { id: "linedata-1", color: "#00a2ce", data: [ { y: 5, x: 1 }, { y: 7, x: 2 }, { y: 7, x: 3 }, { y: 4, x: 4 }, { y: 2, x: 5 }, { y: 3, x: 6 }, { y: 5, x: 7 } ] },
    { id: "linedata-2", color: "#4d430c", data: [ { y: 1, x: 1 }, { y: 6, x: 2 }, { y: 8, x: 3 }, { y: 6, x: 4 }, { y: 4, x: 5 }, { y: 2, x: 6 }, { y: 0, x: 7 } ] },
    { id: "linedata-3", color: "#b3331d", data: [ { y: 10, x: 1 }, { y: 8, x: 2 }, { y: 0, x: 3 }, { y: 0, x: 4 }, { y: 3, x: 5 }, { y: 4, x: 6 }, { y: 4, x: 7 } ] },
    { id: "linedata-4", color: "#b6a756", data: [ { y: 6, x: 1 }, { y: 3, x: 2 }, { y: 3, x: 3 }, { y: 5, x: 4 }, { y: 6, x: 5 }, { y: 6, x: 6 }, { y: 6, x: 7 } ] }
]

class XYFrameExamples extends React.Component {
    constructor(props){
        super(props);
        this.state = { customLineType: "line", curve: "basis" }
        this.changeCustomLineType = this.changeCustomLineType.bind(this)
        this.changeCurve = this.changeCurve.bind(this)
    }

    changeCustomLineType(e) {
        this.setState({ customLineType: e.target.value })
    }

    changeCurve (e) {
        this.setState({ curve: e.target.value })
    }

    render() {

        const frameHeight = 100
        const options = [ "line", "difference", "stackedarea", "bumpline", "bumparea" ]
            .map(d => <option key={"line-option-" + d} label={d} value={d}>{d}</option>)

        const curveOptions = [ "curveBasis", "curveCardinal", "curveCatmullRom", "curveLinear", "curveNatural", "curveMonotoneX", "curveStep" ]
            .map(d => <option key={"curve-option-" + d} label={d} value={d}>{d}</option>)
        let displayData = testData

        const curveHash = { curveBasis, curveCardinal, curveCatmullRom, curveLinear, curveNatural, curveMonotoneX, curveStep }

        if (this.state.customLineType === "difference") {
            displayData = testData.filter((d,i) => i < 2)
        }

        return <div>
            <span>customLineType=<select onChange={this.changeCustomLineType}>{options}</select></span>
            <span>curve<select onChange={this.changeCurve}>{curveOptions}</select></span>

            <XYFrame
            size={[ 500,frameHeight ]}
            lines={displayData}
            lineDataAccessor={d => d.data}
            xAccessor={d => d.x}
            yAccessor={d => d.y}
            lineStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color })}
            showLinePoints={true}
            canvasLines={(d,i) => i%2 === 0}
            customLineType={this.state.customLineType}
            margin={10}
            />
            <XYFrame
            size={[ 500,frameHeight ]}
            lines={displayData}
            lineDataAccessor={d => d.data}
            xAccessor={d => d.x}
            yAccessor={d => d.y}
            lineStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color })}
            canvasLines={(d,i) => i%2 === 0}
            customLineType={{ type: this.state.customLineType, interpolator: curveHash[this.state.curve], sort: null }}
            margin={10}
            defined={d => d.y !== 0}
            />
            </div>
    }
}

module.exports = XYFrameExamples;
