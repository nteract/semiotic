import React from 'react'
import { ORFrame, funnelize } from 'semiotic';
//import d3 from 'd3'

// const d3colors = d3.scale.category20c()

const colors = [
    "#00a2ce",
    "#4d430c",
    "#b3331d",
    "#b6a756",
    "#00a2ce",
    "#4d430c",
    "#b3331d"
]
const testData = []
for (let x=1;x<100;x++) {
    testData.push({ value: Math.random() * 100, color: colors[x%4] })
}

const funnel = [ {
  color: "#00a2ce",
  visits: 1000,
  registration: 900,
  mop: 500,
  signups: 400,
  streamed: 300,
  paid: 100
},{
  color: "#b3331d",
  visits: 200,
  registration: 180,
  mop: 170,
  signups: 160,
  streamed: 150,
  paid: 140
},{
  color: "#b6a756",
  visits: 300,
  registration: 100,
  mop: 50,
  signups: 50,
  streamed: 50,
  paid: 50
} ]

const stackedPieData = [
  { pie: "one", color: "#00a2ce", value: 25 },
  { pie: "one", color: "#b3331d", value: 70 },
  { pie: "one", color: "#b6a756", value: 5 },
  { pie: "two", color: "#00a2ce", value: 50 },
  { pie: "two", color: "#b3331d", value: 20 },
  { pie: "two", color: "#b6a756", value: 30 },
  { pie: "three", color: "#00a2ce", value: 90 },
  { pie: "three", color: "#b3331d", value: 5 },
  { pie: "three", color: "#b6a756", value: 5 }
]

const stackedPieDataWithNegatives = [
  { pie: "one", color: "#00a2ce", value: 25 },
  { pie: "one", color: "#b3331d", value: 50 },
  { pie: "one", color: "#b6a756", value: 10 },
  { pie: "two", color: "#00a2ce", value: -25 },
  { pie: "two", color: "#b3331d", value: -50 },
  { pie: "two", color: "#b6a756", value: -10 },
  { pie: "three", color: "#00a2ce", value: 25 },
  { pie: "three", color: "#b3331d", value: -50 },
  { pie: "three", color: "#b6a756", value: 10 }
]

const funnelData = funnelize({ data: funnel, steps: [ "visits", "registration", "mop", "signups", "streamed", "paid" ], key: "color" })

class ORFramePieceExamples extends React.Component {
    constructor(props){
        super(props);
        this.state = { projection: "vertical", type: "bar", columnWidth: "fixed", rAccessor: "relative", renderFn: "none" }
        this.changeProjection = this.changeProjection.bind(this)
        this.changeType = this.changeType.bind(this)
        this.changeCW = this.changeCW.bind(this)
        this.changeRAccessor = this.changeRAccessor.bind(this)
        this.changeRenderFn = this.changeRenderFn.bind(this)
    }

    changeProjection(e) {
        this.setState({ projection: e.target.value })
    }

    changeType(e) {
        this.setState({ type: e.target.value })
    }

    changeCW(e) {
        this.setState({ columnWidth: e.target.value })
    }

    changeRAccessor(e) {
        this.setState({ rAccessor: e.target.value })
    }

    changeRenderFn(e) {
        this.setState({ renderFn: e.target.value })
    }

    render() {

        const frameHeight = 300

        const typeOptions = [ "bar", "point", "swarm" ].map(d => <option key={"type-option" + d} label={d} value={d}>{d}</option>)
        const projectionOptions = [ "vertical", "horizontal", "radial" ].map(d => <option key={"projection-option" + d} label={d} value={d}>{d}</option>)
        const cwOptions = [ "fixed", "relative" ].map(d => <option key={"cw-option" + d} label={d} value={d}>{d}</option>)
        const rAccessorOptions = [ "relative", "fixed" ].map(d => <option key={"rAccessor-option" + d} label={d} value={d}>{d}</option>)
        const renderFnOptions = [ "none", "sketchy", "painty" ].map(d => <option key={"renderfn-option" + d} label={d} value={d}>{d}</option>)

        const rAccessor = this.state.rAccessor === "fixed" ? () => 1 : d => d.stepValue || d.value
        const cwFn = this.state.columnWidth === "fixed" ? undefined : d => d.stepValue || d.value
        const reFn = this.state.renderFn === "none" ? undefined : () => this.state.renderFn

        const axis = { key: "yAxis", orient: "left", className: "yscale", name: "CountAxis", tickFormat: (d) => d }
        const axisRight = { key: "yAxis", orient: "right", className: "yscale", name: "CountAxis", tickFormat: (d) => d }

        return <div>
            <div><span>type=<select onChange={this.changeType}>{typeOptions}</select></span></div>
            <div><span>projection=<select onChange={this.changeProjection}>{projectionOptions}</select></span></div>
            <div><span>columnWidth=<select onChange={this.changeCW}>{cwOptions}</select></span></div>
            <div><span>rAccessor=<select onChange={this.changeRAccessor}>{rAccessorOptions}</select></span></div>
            <div><span>renderFn=<select onChange={this.changeRenderFn}>{renderFnOptions}</select></span></div>
            <ORFrame
              title={"title"}
              renderFn={reFn}
              size={[ 500,frameHeight ]}
              projection={this.state.projection}
              type={this.state.type}
              data={[ 10, 4, 8, 3, 5, 7 ]}
              oPadding={5}
              margin={20}
              style={(d,i) => {return { fill: colors[i], stroke: "black" }}}
              hoverAnnotation={true}
            />
<p><b>Basic bar chart</b></p>
<p className="code">{"const colors = ['#00a2ce','#4d430c','#b3331d','#b6a756','#00a2ce','#4d430c','#b3331d']"}</p>
<p className="code">{"<ORFrame"}</p>
<p className="code">{"title={'title'}"}</p>
<p className="code">{"size={[ 500,frameHeight ]}"}</p>
<p className="code">{"data={[ 10, 4, 8, 3, 5, 7 ]}"}</p>
<p className="code">{"oPadding={5}"}</p>
<p className="code">{"margin={20}"}</p>
<p className="code">{"style={(d,i) => {return { fill: colors[i], stroke: 'black' }}}"}</p>
<p className="code">{"hoverAnnotation={true}"}</p>
            <ORFrame
              size={[ 500,frameHeight ]}
              renderFn={reFn}
              data={funnelData}
              axis={axis}
              projection={this.state.projection}
              type={this.state.type}
              oAccessor={d => d.stepName}
              rAccessor={rAccessor}
              style={d => {return { fill: d.funnelKey, stroke: "black" }}}
              hoverAnnotation={true}
              columnWidth={this.state.rAccessor === "fixed" ? d => d.stepValue : undefined}
              margin={{ left: 25, top: 0, bottom: 25, right: 0 }}
            />
<p><b>Stacked</b></p>
<p className="code">{"<ORFrame"}</p>
<p className="code">{"size={[ 500,frameHeight ]}"}</p>
<p className="code">{"data={funnelData}"}</p>
<p className="code">{"oLabel={true}"}</p>
<p className="code">{"axis={axis}"}</p>
<p className="code">{"projection={this.state.projection}"}</p>
<p className="code">{"type={this.state.type}"}</p>
<p className="code">{"oAccessor={d => d.stepName}"}</p>
<p className="code">{"rAccessor={d => d.stepValue}"}</p>
<p className="code">{"style={d => {return { fill: d.funnelKey, stroke: 'black' }}}"}</p>
<p className="code">{"hoverAnnotation={true}"}</p>
<p className="code">{"columnWidth={this.state.columnWidth}"}</p>
<p className="code">{"margin={{ left: 10, top: 0, bottom: 0, right: 0 }}"}</p>
            <ORFrame
              size={[ 500,frameHeight ]}
              renderFn={reFn}
              data={stackedPieDataWithNegatives}
              axis={axis}
              projection={this.state.projection}
              type={this.state.type}
              oAccessor={d => d.pie}
              rAccessor={rAccessor}
              style={d => {return { fill: d.color, stroke: "black" }}}
              hoverAnnotation={true}
              columnWidth={this.state.rAccessor === "fixed" ? d => d.stepValue : undefined}
              margin={{ left: 25, top: 0, bottom: 25, right: 0 }}
            />
<p><b>Stacked</b></p>
<p className="code">{"<ORFrame"}</p>
<p className="code">{"size={[ 500,frameHeight ]}"}</p>
<p className="code">{"data={funnelData}"}</p>
<p className="code">{"oLabel={true}"}</p>
<p className="code">{"axis={axis}"}</p>
<p className="code">{"projection={this.state.projection}"}</p>
<p className="code">{"type={this.state.type}"}</p>
<p className="code">{"oAccessor={d => d.stepName}"}</p>
<p className="code">{"rAccessor={d => d.stepValue}"}</p>
<p className="code">{"style={d => {return { fill: d.funnelKey, stroke: 'black' }}}"}</p>
<p className="code">{"hoverAnnotation={true}"}</p>
<p className="code">{"columnWidth={this.state.columnWidth}"}</p>
<p className="code">{"margin={{ left: 10, top: 0, bottom: 0, right: 0 }}"}</p>
            <ORFrame
              size={[ 500,frameHeight ]}
              renderFn={reFn}
              oLabel={d => <g transform="translate(0,-20)"><rect height="5" width="5" x="-5" style={{ fill: d }} /><text transform="rotate(45)">{d}</text></g>}
              data={testData}
              projection={this.state.projection}
              type={this.state.type}
              axis={axis}
              columnWidth={cwFn}
              oAccessor={d => d.color}
              rAccessor={rAccessor}
              oPadding={5}
              margin={{ left: 40, right: 20, top: 20, bottom: 40 }}
              style={d => {return { fill: d.color, stroke: d.color }}}
              hoverAnnotation={true}
            />
<p><b>Custom Labeling</b></p>
<p className="code">{"<ORFrame"}</p>
<p className="code">{"size={[ 500,frameHeight ]}"}</p>
<p className="code">{"data={testData}"}</p>
<p className="code">{"oLabel={d => <g><rect height='5' width='5' x='-5' style={{ fill: d }} /><text transform='rotate(45)'>{d}</text></g>}"}</p>
<p className="code">{"axis={axis}"}</p>
<p className="code">{"projection={this.state.projection}"}</p>
<p className="code">{"type={this.state.type}"}</p>
<p className="code">{"oAccessor={d => d.color}"}</p>
<p className="code">{"rAccessor={d => d.value}"}</p>
<p className="code">{"style={d => {return { fill: d.color, stroke: d.color }}}"}</p>
<p className="code">{"hoverAnnotation={true}"}</p>
<p className="code">{"columnWidth={this.state.columnWidth}"}</p>
<p className="code">{"oPadding={5}"}</p>
<p className="code">{"margin={ left: 20, right: 20, top: 20, bottom: 40 }"}</p>
            <ORFrame
              size={[ 500, frameHeight ]}
              renderFn={reFn}
              oLabel={true}
              data={stackedPieData.filter(d => d.pie === "two")}
              oPadding={5}
              axis={axisRight}
              margin={20}
              oAccessor={d => d.color}
              projection={this.state.projection}
              type={this.state.type}
              columnWidth={cwFn}
              rAccessor={rAccessor}
              style={d => {return { fill: d.color, stroke: "black" }}}
              hoverAnnotation={true}
            />
<p><b>Right-hand Axis</b></p>
<p className="code">{"<ORFrame"}</p>
<p className="code">{"size={[ 500,frameHeight ]}"}</p>
<p className="code">{"stackedPieData.filter(d => d.pie === 'two')"}</p>
<p className="code">{"oLabel={true}"}</p>
<p className="code">{"axis={axisRight}"}</p>
<p className="code">{"projection={this.state.projection}"}</p>
<p className="code">{"type={this.state.type}"}</p>
<p className="code">{"oAccessor={d => d.color}"}</p>
<p className="code">{"rAccessor={d => d.value}"}</p>
<p className="code">{"style={d => {return { fill: d.color, stroke: 'black' }}}"}</p>
<p className="code">{"hoverAnnotation={true}"}</p>
<p className="code">{"columnWidth={this.state.columnWidth}"}</p>
<p className="code">{"oPadding={5}"}</p>
<p className="code">{"margin={20}"}</p>
            </div>
    }
}

module.exports = ORFramePieceExamples;
