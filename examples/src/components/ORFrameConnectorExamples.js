import React from 'react'
import { ORFrame, funnelize } from 'abacus-viz-framework';
import { scaleLinear } from 'd3-scale'

// const d3colors = d3.scale.category20c()

const colors = scaleLinear().domain([ 0,20,40,60 ]).range([
    "#00a2ce",
    "#4d430c",
    "#b3331d",
    "#b6a756"
])

const testData = []
for (let x=1;x<5;x++) {
  for (let xx=0;xx<=60;xx++) {
    testData.push({ value: Math.random() * 100 + xx * 2, column: "column"+x, color: colors(xx) })
  }
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


const funnelData = funnelize({ data: funnel, steps: [ "visits", "registration", "mop", "signups", "streamed", "paid" ], key: "color" })

class ORFrameConnectorExamples extends React.Component {
    constructor(props){
        super(props);
        this.state = { projection: "vertical", type: "point", columnWidth: "fixed", rAccessor: "relative", renderFn: "none",
          columnExtent: { "column1": undefined, "column2": undefined, "column3": undefined, "column4": undefined }
         }
        this.changeProjection = this.changeProjection.bind(this)
        this.changeType = this.changeType.bind(this)
        this.changeCW = this.changeCW.bind(this)
        this.changeRAccessor = this.changeRAccessor.bind(this)
        this.changeRenderFn = this.changeRenderFn.bind(this)
        this.brushing = this.brushing.bind(this)
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

    brushing(e,c) {
      const columnExtent = this.state.columnExtent
      columnExtent[c] = e
      this.setState(columnExtent)
    }

    render() {
      const outsideHash = {}
      testData.forEach(d => {
        if (!outsideHash[d.color]) {
          if (this.state.columnExtent[d.column] && (d.value > this.state.columnExtent[d.column][0] || d.value < this.state.columnExtent[d.column][1])) {
            outsideHash[d.color] = true
          }
        }
      })

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

        return <div>
            <div><span>type=<select onChange={this.changeType}>{typeOptions}</select></span></div>
            <div><span>projection=<select onChange={this.changeProjection}>{projectionOptions}</select></span></div>
            <div><span>columnWidth=<select onChange={this.changeCW}>{cwOptions}</select></span></div>
            <div><span>rAccessor=<select onChange={this.changeRAccessor}>{rAccessorOptions}</select></span></div>
            <div><span>renderFn=<select onChange={this.changeRenderFn}>{renderFnOptions}</select></span></div>
            <ORFrame
              size={[ 500,frameHeight ]}
              renderFn={reFn}
              oLabel={true}
              data={funnelData}
              axis={axis}
              projection={this.state.projection}
              type={this.state.type}
              connectorType={d => d.funnelKey}
              connectorStyle={d => {return { fill: d.source.funnelKey, stroke: d.source.funnelKey }}}
              oAccessor={d => d.stepName}
              rAccessor={rAccessor}
              style={d => {return { fill: d.funnelKey, stroke: "black" }}}
              hoverAnnotation={true}
              columnWidth={cwFn}
              margin={{ left: 25, top: 20, bottom: 25, right: 0 }}
              oPadding={30}
            />
            <ORFrame
              size={[ 500,frameHeight ]}
              renderFn={reFn}
              oLabel={d => <g transform="translate(0,-20)"><rect height="5" width="5" x="-5" style={{ fill: d }} /><text transform="rotate(45)">{d}</text></g>}
              data={testData}
              projection={this.state.projection}
              type={this.state.type}
              axis={axis}
              connectorType={(d,i) => i}
              connectorStyle={d => {return { fill: d.source.color, stroke: d.source.color, opacity: outsideHash[d.source.color] ? 0.1 : 1 }}}
              columnWidth={cwFn}
              oAccessor={d => d.column}
              rAccessor={rAccessor}
              oPadding={70}
              margin={{ left: 40, right: 20, top: 20, bottom: 40 }}
              style={d => {return { fill: d.color, stroke: d.color, strokeWidth: 1, opacity: outsideHash[d.color] ? 0.1 : 1 }}}
              hoverAnnotation={true}
              interaction={{ columnsBrush: true, end: this.brushing, extent: this.state.columnExtent }}
            />
            </div>
    }
}

module.exports = ORFrameConnectorExamples;
