import React from 'react'
import { XYFrame } from 'abacus-viz-framework';

const testData = [
    { id: "linedata-1", color: "#00a2ce", data: [ { y: 5, x: 1 }, { y: 7, x: 2 }, { y: 7, x: 3 }, { y: 4, x: 4 }, { y: 2, x: 5 }, { y: 3, x: 6 }, { y: 5, x: 7 } ] },
    { id: "linedata-2", color: "#4d430c", data: [ { y: 1, x: 1 }, { y: 6, x: 2 }, { y: 8, x: 3 }, { y: 6, x: 4 }, { y: 4, x: 5 }, { y: 2, x: 6 }, { y: 0, x: 7 } ] },
    { id: "linedata-3", color: "#b3331d", data: [ { y: 10, x: 1 }, { y: 8, x: 2 }, { y: 2, x: 3 }, { y: 3, x: 4 }, { y: 3, x: 5 }, { y: 4, x: 6 }, { y: 4, x: 7 } ] },
    { id: "linedata-4", color: "#b6a756", data: [ { y: 6, x: 1 }, { y: 3, x: 2 }, { y: 3, x: 3 }, { y: 5, x: 4 }, { y: 6, x: 5 }, { y: 6, x: 6 }, { y: 6, x: 7 } ] }
]

class XYFrameExamplesMisc extends React.Component {
    constructor(props){
        super(props);
    }

    render() {

        const frameHeight = 100

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
            title="zoom"
            size={[ 500,400 ]}
            lines={testData}
            lineDataAccessor={d => d.data}
            xAccessor={d => d.x}
            yAccessor={d => d.y}
            lineStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color })}
            hoverAnnotation={true}
            zoomable={true}
            customLineType={"line"}
            axes={axes}
            margin={ 50 }
            />
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
            </div>

    }
}

module.exports = XYFrameExamplesMisc;
