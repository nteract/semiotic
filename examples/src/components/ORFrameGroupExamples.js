import React from 'react'
import { ORFrame } from 'abacus-viz-framework'
import { randomNormal } from 'd3-random'
import { sum } from 'd3-array'

const colors = [
    "#00a2ce",
    "#4d430c",
    "#b3331d",
    "#b6a756"
]

const testData = []
const nRando = randomNormal(50, 15)
for (let x=1;x<500;x++) {
    testData.push({ x: nRando(), value: Math.max(0, nRando()), color: colors[x%4], value2: x })
}

class ORFrameSummaryExamples extends React.Component {
    constructor(props){
        super(props);
    }

    render() {

        const frameHeight = 300

        const axis = { key: "yAxis", orient: "left", className: "yscale", name: "CountAxis", tickFormat: (d) => d }
        const axis2 = { key: "yAxis", orient: "right", className: "yscale", name: "CountAxis", tickFormat: (d) => d }

        return <div>
            <ORFrame
              title={"boxplot"}
              oLabel={true}
              size={[ 500,frameHeight ]}
              data={testData}
              type={"swarm"}
              projection={"vertical"}
              summaryType={"boxplot"}
              summaryStyle={(d) => ({ stroke: d.color, fill: d.color, fillOpacity: 0.5, strokeOpacity: 0.5 })}
              oAccessor={d => d.color}
              rAccessor={d => d.value}
              style={d => {return { fill: d.color, fillOpacity: 0.5, stroke: d.color, strokeOpacity: 0 }}}
              oPadding={5}
              axis={ axis2 }
            />
<p className="code">{"<ORFrame"}</p>
<p className="code">{"title={'boxplot'}"}</p>
<p className="code">{"oLabel={true}"}</p>
<p className="code">{"size={[ 500,frameHeight ]}"}</p>
<p className="code">{"data={testData}"}</p>
<p className="code">{"type={'swarm'}"}</p>
<p className="code">{"summaryType={'boxplot'}"}</p>
<p className="code">{"summaryStyle={(d) => ({ stroke: d.color, fill: d.color, fillOpacity: 0.5, strokeOpacity: 0.5 })}"}</p>
<p className="code">{"oAccessor={d => d.color}"}</p>
<p className="code">{"rAccessor={d => d.value}"}</p>
<p className="code">{"style={d => {return { fill: d.color, fillOpacity: 0.5, stroke: d.color, strokeOpacity: 0 }}}"}</p>
<p className="code">{"margin={30}"}</p>
<p className="code">{"oPadding={5}"}</p>
<p className="code">{"axis={ axis }"}</p>
            <ORFrame
              title={"violin"}
              oLabel={true}
              size={[ 500,frameHeight ]}
              data={testData}
              type={{ type: "swarm", r: (d,i) => i%3 + 2 }}
              projection={"vertical"}
              summaryType={"violin"}
              summaryStyle={(d) => ({ stroke: d.color, fill: d.color, fillOpacity: 0.5, strokeOpacity: 0.5 })}
              oAccessor={d => d.color}
              rAccessor={d => d.value}
              style={d => {return { fill: d.color, fillOpacity: 0.5, stroke: d.color, strokeOpacity: 0 }}}
              oPadding={5}
              axis={ axis }
            />
<p className="code">{"<ORFrame"}</p>
<p className="code">{"title={'violin'}"}</p>
<p className="code">{"oLabel={true}"}</p>
<p className="code">{"size={[ 500,frameHeight ]}"}</p>
<p className="code">{"data={testData}"}</p>
<p className="code">{"type={'swarm'}"}</p>
<p className="code">{"summaryType={'violin'}"}</p>
<p className="code">{"summaryStyle={(d) => ({ stroke: d.color, fill: d.color, fillOpacity: 0.5, strokeOpacity: 0.5 })}"}</p>
<p className="code">{"oAccessor={d => d.color}"}</p>
<p className="code">{"rAccessor={d => d.value}"}</p>
<p className="code">{"style={d => {return { fill: d.color, fillOpacity: 0.5, stroke: d.color, strokeOpacity: 0 }}}"}</p>
<p className="code">{"margin={30}"}</p>
<p className="code">{"oPadding={5}"}</p>
<p className="code">{"axis={ axis }"}</p>
            <ORFrame
              title={"heatmap"}
              projection={"vertical"}
              oLabel={true}
              size={[ 500,frameHeight ]}
              summaryType={"heatmap"}
              data={testData}
              summaryStyle={(d) => ({ stroke: d.color, fill: d.color, fillOpacity: 0.5, strokeOpacity: 0.5 })}
              oAccessor={d => d.color}
              rAccessor={d => d.value}
              oPadding={5}
              axis={ axis2 }
            />
<p className="code">{"<ORFrame"}</p>
<p className="code">{"title={'heatmap'}"}</p>
<p className="code">{"oLabel={true}"}</p>
<p className="code">{"size={[ 500,frameHeight ]}"}</p>
<p className="code">{"summaryType={'heatmap'}"}</p>
<p className="code">{"summaryStyle={(d) => ({ stroke: d.color, fill: d.color, fillOpacity: 0.5, strokeOpacity: 0.5 })}"}</p>
<p className="code">{"oAccessor={d => d.color}"}</p>
<p className="code">{"rAccessor={d => d.value}"}</p>
<p className="code">{"style={d => {return { fill: d.color, fillOpacity: 0.5, stroke: d.color, strokeOpacity: 0 }}}"}</p>
<p className="code">{"margin={30}"}</p>
<p className="code">{"oPadding={5}"}</p>
<p className="code">{"axis={ axis }"}</p>
            <ORFrame
              title={<g><text>histogram</text></g>}
              projection={"vertical"}
              oLabel={true}
              size={[ 500,frameHeight ]}
              summaryType={"histogram"}
              data={testData}
              summaryStyle={(d) => ({ stroke: d.color, fill: d.color, fillOpacity: 0.5, strokeOpacity: 0.5 })}
              summaryValueAccessor={(d) => sum(d.map(p => p.value2))}
              oAccessor={d => d.color}
              rAccessor={d => d.value}
              oPadding={5}
              axis={ axis }
              rExtent={[ 100, 0 ]}
            />
<p>Fixed extent using <span className="code">rExtent</span> and vertical projection.</p>
<p className="code">{"<ORFrame"}</p>
<p className="code">{"title={'histogram'}"}</p>
<p className="code">{"projection={'vertical'}"}</p>
<p className="code">{"oLabel={true}"}</p>
<p className="code">{"size={[ 500,frameHeight ]}"}</p>
<p className="code">{"summaryType={'histogram'}"}</p>
<p className="code">{"summaryStyle={(d) => ({ stroke: d.color, fill: d.color, fillOpacity: 0.5, strokeOpacity: 0.5 })}"}</p>
<p className="code">{"summaryValueAccessor={(d) => sum(d.map(p => p.value2))}"}</p>
<p className="code">{"oAccessor={d => d.color}"}</p>
<p className="code">{"rAccessor={d => d.value}"}</p>
<p className="code">{"style={d => {return { fill: d.color, fillOpacity: 0.5, stroke: d.color, strokeOpacity: 0 }}}"}</p>
<p className="code">{"margin={30}"}</p>
<p className="code">{"oPadding={5}"}</p>
<p className="code">{"axis={ axis }"}</p>
            <ORFrame
              title={"ekg"}
              data={testData}
              projection={"vertical"}
              oLabel={true}
              size={[ 500,frameHeight ]}
              summaryType={"ekg"}
              summaryStyle={(d) => ({ stroke: d.color, fill: "none", strokeOpacity: 0.5 })}
              oAccessor={d => d.color}
              rAccessor={d => d.value}
              oPadding={5}
              axis={ axis }
            />
            <p>The 'ekg' summaryType is just half a violin plot. Here it is with a vertical projection.</p>
<p className="code">{"<ORFrame"}</p>
<p className="code">{"title={'ekg'}"}</p>
<p className="code">{"projection={'vertical'}"}</p>
<p className="code">{"oLabel={true}"}</p>
<p className="code">{"size={[ 500,frameHeight ]}"}</p>
<p className="code">{"summaryType={'ekg'}"}</p>
<p className="code">{"summaryStyle={(d) => ({ stroke: d.color, fill: d.color, fillOpacity: 0.5, strokeOpacity: 0.5 })}"}</p>
<p className="code">{"oAccessor={d => d.color}"}</p>
<p className="code">{"rAccessor={d => d.value}"}</p>
<p className="code">{"style={d => {return { fill: d.color, fillOpacity: 0.5, stroke: d.color, strokeOpacity: 0 }}}"}</p>
<p className="code">{"margin={30}"}</p>
<p className="code">{"oPadding={5}"}</p>
<p className="code">{"axis={ axis }"}</p>
            </div>
    }
}

module.exports = ORFrameSummaryExamples;
