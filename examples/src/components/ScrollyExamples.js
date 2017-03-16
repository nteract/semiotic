import React from 'react'
import { SmartFrame } from 'abacus-viz-framework';
//import { curveBasis, curveCardinal, curveCatmullRom, curveLinear, curveNatural, curveMonotoneX, curveStep  } from 'd3-shape'
import { randomNormal } from 'd3-random'
//import d3 from 'd3'

const colors = [
    "#00a2ce",
    "#4d430c",
    "#b3331d",
    "#b6a756"
]

const countries = [
    "Brazil",
    "China",
    "United States",
    "Egypt"
]

let testData = []
const nRando = randomNormal(50, 15)
for (let x=1;x<100;x++) {
    testData.push({ x: nRando(), value: Math.max(0, nRando()), color: colors[x%4], country: countries[x%4] })
}

testData = testData.sort((a,b) => a.x - b.x)

// const aggData = d3.nest().key(d => d.color).entries(testData).map(d => Object.assign({ color: d.key }, d))

class ScrollyExamples extends React.Component {
    constructor(props){
        super(props);
        this.state = { customLineType: "line", curve: "basis", frame: "xyFrame" }
        this.changeCustomLineType = this.changeCustomLineType.bind(this)
        this.changeCurve = this.changeCurve.bind(this)
        this.changeFrame = this.changeFrame.bind(this)
    }

    changeCustomLineType(e) {
        this.setState({ customLineType: e.target.value })
    }

    changeCurve (e) {
        this.setState({ curve: e.target.value })
    }

    changeFrame (e) {
        this.setState({ frame: e.target.value })
    }

    render() {

        const options = [ "line", "difference", "stackedarea", "bumpline", "bumparea" ].map(d => <option key={"line" + d} label={d} value={d}>{d}</option>)

        const curveOptions = [ "curveBasis", "curveCardinal", "curveCatmullRom", "curveLinear", "curveNatural", "curveMonotoneX", "curveStep" ].map(d => <option key={"curve" + d} label={d} value={d}>{d}</option>)

        const frameOptions = [ "xyFrame", "orFrame" ].map(d => <option key={"frame" + d} label={d} value={d}>{d}</option>)

//        const curveHash = { curveBasis, curveCardinal, curveCatmullRom, curveLinear, curveNatural, curveMonotoneX, curveStep }

        const xAccessor = this.state.frame === "xyFrame" ? d => d.x : d => d.country

{/*            aggStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color })}
                        customAggType={{ type: this.state.customLineType, interpolator: curveHash[this.state.curve], sort: null }}
                        aggData={aggData}
            */}

        return <div>
            <span>customLineType=<select onChange={this.changeCustomLineType}>{options}</select></span>
            <span>curve<select onChange={this.changeCurve}>{curveOptions}</select></span>
            <span>frame<select onChange={this.changeFrame}>{frameOptions}</select></span>
            <SmartFrame
            frameType={this.state.frame}
            size={[ 500,500 ]}
            pieceData={testData}
            padding={5}
            aggDataAccessor={d => d.values}
            xAccessor={xAccessor}
            yAccessor={d => d.value}
            pieceStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color })}
            customPieceType="swarm"
            margin={10}
            />
            </div>
    }
}

module.exports = ScrollyExamples;
