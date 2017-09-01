import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import BarLineRaw from "./BarLineRaw";

const components = [];
// Add your component proptype data here
// multiple component proptype documentation supported

components.push({
  name: "BarLine"
});

export default class BarLineDocs extends React.Component {
  render() {
    const buttons = [];

    const examples = [];
    examples.push({
      name: "Basic",
      demo: BarLineRaw,
      source: `
      import { XYFrame, ORFrame } from 'semiotic'
      import { curveBasis } from 'd3-shape'
      
      const axes = [
            { key: 'yAxis', orient: 'left', className: 'yscale', name: 'CountAxis', tickValues: [ 2, 6, 10 ], tickFormat: (d) => d + '%' },
            { key: 'xAxis', orient: 'bottom', className: 'xscale', name: 'TimeAxis', tickValues: [ 2, 4, 6, 8, 10, 12 ], tickFormat: d => 'day ' + d  }
      ]

      const axis3 = { key: 'yAxis', orient: 'right', className: 'yscale', name: 'CountAxis', ticks: 3, tickFormat: (d) => d }

      const sharedProps = {
            size: [ 500,300 ],
            margin: { top: 5, bottom: 25, left: 55, right: 55 }
      }

        <div style={{ height: '300px' }}>
            <div style={{ position: 'absolute' }}>
            <ORFrame
                { ...sharedProps }
                className='divided-line-or'
                data={displayData[0].data}
                type={'bar'}
                renderMode={"sketchy"}
                oAccessor={d => d.x}
                rAccessor={d => d.leads}
                style={() => ({ fill: '#b3331d', opacity: 1, stroke: 'white' })}
                axis={axis3}
            />
            </div>
            <div style={{ position: 'absolute' }}>
            <XYFrame
                { ...sharedProps }
                className='divided-line-xy'
                axes={axes}
                lines={displayData}
                lineDataAccessor={d => d.data}
                lineRenderMode={"sketchy"}
                xAccessor={d => d.x}
                yAccessor={d => d.sales}
                lineStyle={() => ({ stroke: '#00a2ce', strokeWidth: '2px' })}
                lineType={{ type: 'line', interpolator: curveBasis }}
            />
            </div>
            </div>
      `
    });

    return (
      <DocumentComponent
        name="Dual Axis Bar & Line Chart"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          An example of how to layer two frames to create a dual-axis bar and
          line chart.
        </p>
      </DocumentComponent>
    );
  }
}

BarLineDocs.title = "Dual Axis";
