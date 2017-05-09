import React from 'react'
import { XYFrame, calculateDataExtent } from 'semiotic';

const testData = [
    { id: "linedata-1", color: "#00a2ce", data: [ { y: 5, x: 1 }, { y: 7, x: 2 }, { y: 7, x: 3 }, { y: 4, x: 4 }, { y: 2, x: 5 }, { y: 3, x: 6 }, { y: 5, x: 7 } ] },
    { id: "linedata-2", color: "#4d430c", data: [ { y: 1, x: 1 }, { y: 6, x: 2 }, { y: 8, x: 3 }, { y: 6, x: 4 }, { y: 4, x: 5 }, { y: 2, x: 6 }, { y: 0, x: 7 } ] },
    { id: "linedata-3", color: "#b3331d", data: [ { y: 10, x: 1 }, { y: 8, x: 2 }, { y: 2, x: 3 }, { y: 3, x: 4 }, { y: 3, x: 5 }, { y: 4, x: 6 }, { y: 4, x: 7 } ] },
    { id: "linedata-4", color: "#b6a756", data: [ { y: 6, x: 1 }, { y: 3, x: 2 }, { y: 3, x: 3 }, { y: 5, x: 4 }, { y: 6, x: 5 }, { y: 6, x: 6 }, { y: 6, x: 7 } ] }
]

const testData2 = [
    { id: "linedata-1", color: "#00a2ce", data: [ { y: 15, x: 1 }, { y: 17, x: 2 }, { y: 17, x: 3 }, { y: 14, x: 4 }, { y: 12, x: 5 }, { y: 13, x: 6 }, { y: 15, x: 7 } ] },
    { id: "linedata-2", color: "#4d430c", data: [ { y: 11, x: 1 }, { y: 16, x: 2 }, { y: 18, x: 3 }, { y: 16, x: 4 }, { y: 14, x: 5 }, { y: 12, x: 6 }, { y: 10, x: 7 } ] },
    { id: "linedata-3", color: "#b3331d", data: [ { y: 10, x: 1 }, { y: 18, x: 2 }, { y: 12, x: 3 }, { y: 13, x: 4 }, { y: 13, x: 5 }, { y: 14, x: 6 }, { y: 14, x: 7 } ] },
    { id: "linedata-4", color: "#b6a756", data: [ { y: 16, x: 1 }, { y: 13, x: 2 }, { y: 13, x: 3 }, { y: 15, x: 4 }, { y: 16, x: 5 }, { y: 16, x: 6 }, { y: 16, x: 7 } ] }
]

class XYFrameExamplesMisc extends React.Component {
    constructor(props){
        super(props);
    }

    render() {

        const frameHeight = 100

        const precalculatedData1 = calculateDataExtent({
            lineDataAccessor: d => d.data,
            xAccessor: d => d.x,
            yAccessor: d => d.y,
            lines: testData,
            customLineType: "line" })

        const precalculatedData2 = calculateDataExtent({
            lineDataAccessor: d => d.data,
            xAccessor: d => d.x,
            yAccessor: d => d.y,
            lines: testData2,
            customLineType: "line" })
    
      const axes = [
        { key: "yAxis", orient: "left", className: "yscale", name: "CountAxis", tickFormat: (d) => d + "%" },
        { key: "xAxis", orient: "bottom", className: "xscale", name: "TimeAxis", tickValues: [ 1, 2, 3, 4, 5, 6, 7 ], tickFormat: d => d + " day" }
      ]


        return <div>
            <XYFrame
            title='lineRenderMode={() => "sketchy"}'
            size={[ 500,frameHeight ]}
            lines={testData}
            lineDataAccessor={d => d.data}
            xAccessor={d => d.x}
            yAccessor={d => d.y}
            lineStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color })}
            customLineType={"stackedarea"}
            lineRenderMode={() => "sketchy"}
            />
<p className="code">{"< XYFrame"}</p>
<p className="code">{"title='lineRenderMode={() => 'sketchy'}"}</p>
<p className="code">{"size={[ 500,frameHeight ]}"}</p>
<p className="code">{"lines={testData}"}</p>
<p className="code">{"lineDataAccessor={d => d.data}"}</p>
<p className="code">{"xAccessor={d => d.x}"}</p>
<p className="code">{"yAccessor={d => d.y}"}</p>
<p className="code">{"lineStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color })}"}</p>
<p className="code">{"customLineType={'stackedarea'}"}</p>
<p className="code">{"lineRenderMode={() => 'sketchy'}"}</p>
            <XYFrame
            title={<g><text>"hoverAnnotation={true}"</text></g>}
            size={[ 500,frameHeight ]}
            lines={testData}
            lineDataAccessor={d => d.data}
            xAccessor={d => d.x}
            yAccessor={d => d.y}
            lineStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color })}
            canvasLines={(d,i) => i > 1}
            customLineType={"line"}
            hoverAnnotation={true}
            />
<p className="code">{"< XYFrame"}</p>
<p className="code">{"title='hoverAnnotation={true}'"}</p>
<p className="code">{"size={[ 500,frameHeight ]}"}</p>
<p className="code">{"lines={testData}"}</p>
<p className="code">{"lineDataAccessor={d => d.data}"}</p>
<p className="code">{"xAccessor={d => d.x}"}</p>
<p className="code">{"yAccessor={d => d.y}"}</p>
<p className="code">{"lineStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color })}"}</p>
<p className="code">{"hoverAnnotation={true}"}</p>
            <XYFrame
            title="axes"
            size={[ 500,400 ]}
            lines={testData}
            lineDataAccessor={d => d.data}
            xAccessor={d => d.x}
            yAccessor={d => d.y}
            lineStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color })}
            hoverAnnotation={true}
            canvasLines={(d,i) => i > 1}
            customLineType={"line"}
            axes={axes}
            margin={ 50 }
            />
<p className="code">{"const axes = ["}</p>
<p className="code">{"{ key: 'yAxis', orient: 'left', className: 'yscale', name: 'CountAxis', tickFormat: (d) => d + '%' },"}</p>
<p className="code">{"{ key: 'xAxis', orient: 'bottom', className: 'xscale', name: 'TimeAxis', tickValues: [ 1, 2, 3, 4, 5, 6, 7 ], tickFormat: d => d + ' day' }"}</p>
<p className="code">{"]"}</p>
<p className="code">{"< XYFrame"}</p>
<p className="code">{"title='axes'"}</p>
<p className="code">{"size={[ 500,400 ]}"}</p>
<p className="code">{"lines={testData}"}</p>
<p className="code">{"lineDataAccessor={d => d.data}"}</p>
<p className="code">{"xAccessor={d => d.x}"}</p>
<p className="code">{"yAccessor={d => d.y}"}</p>
<p className="code">{"lineStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color })}"}</p>
<p className="code">{"hoverAnnotation={true}"}</p>
<p className="code">{"axes={axes}"}</p>
            <XYFrame
            title="fixed single extent"
            size={[ 500,400 ]}
            lines={testData}
            lineDataAccessor={d => d.data}
            xAccessor={d => d.x}
            yAccessor={d => d.y}
            xExtent={[ undefined, 3 ]}
            yExtent={[ undefined, 8 ]}
            lineStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color })}
            hoverAnnotation={true}
            customLineType={"line"}
            axes={axes}
            margin={ 50 }
            />
            <p>If you want to you can precalculate the data by importing `calculateDataExtent` and sending it {`{`}lineDataAccessor, xAccessor, yAccessor, [lines or points], [customLineType, xExtent, yExtent]{`}`} which will return {`{`}projectedLines, projectedPoints, xExtentm, yExtent, fullDataset{`}`} that can be passed directly to the frame. This is useful for calculating shared extents or decorating the data with any metadata that is only applicable based on where it's laid out.</p>

            <XYFrame
            title="Y extent from two precalculated datasets"
            size={[ 500,400 ]}
            lines={testData2}
            lineDataAccessor={d => d.data}
            xAccessor={d => d.x}
            yAccessor={d => d.y}
            lineStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color })}
            hoverAnnotation={true}
            customLineType={"line"}
            axes={axes}
            margin={ 50 }
            projectedLines={precalculatedData1.projectedLines}
            fullDataset={precalculatedData1.fullDataset}
            xExtent={precalculatedData1.xExtent}
            yExtent={[ precalculatedData1.yExtent[0], precalculatedData2.yExtent[1] ]}
            />
            </div>

    }
}

module.exports = XYFrameExamplesMisc;
