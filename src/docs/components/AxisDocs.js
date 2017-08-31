import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import { Axis } from "../../components";
import { scaleLinear } from "d3-scale";

const components = [];
// Add your component proptype data here
// multiple component proptype documentation supported

components.push({
  name: "Axis",
  proptypes: `
    {
    name: PropTypes.string,
    className: PropTypes.string,
    orient: PropTypes.string,
    position: PropTypes.array,
    size: PropTypes.array,
    rotate: PropTypes.number,
    scale: PropTypes.func,
    margin: PropTypes.object,
    annotationFunction: PropTypes.func,
    format: PropTypes.string,
    tickFormat: PropTypes.func,
    tickValues: PropTypes.array,
    padding: PropTypes.number,
    ticks: PropTypes.oneOfType([
      PropTypes.array,
      PropTypes.number
    ])
    }
  `
});

export default class AxisDocs extends React.Component {
  render() {
    const buttons = [];

    const examples = [];
    examples.push({
      name: "Basic",
      demo: (
        <svg style={{ height: "400px", width: "800px" }}>
          <g transform={"translate(300,0)"}>
            <Axis
              size={[20, 200]}
              scale={scaleLinear()
                .domain([10, 1000])
                .range([20, 200])}
              orient={"left"}
              label={"Just an Axis (left)"}
            />
          </g>
        </svg>
      ),
      source: `
      import { Axis } from 'semiotic';

        <svg style={{ height: '400px', width: '800px' }}>
        <g transform={'translate(300,0)'}>
            <Axis
            size={[ 20,200 ]}
            scale={scaleLinear().domain([ 10, 1000 ]).range([ 20, 200 ])}
            orient={'left'}
            label={'Just an Axis'}
            position={[ 100,0 ]}
        />
        </g>
        </svg>
      `
    });

    return (
      <DocumentComponent
        name="Axis"
        api="https://github.com/emeeks/semiotic/wiki/Axis"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          The Axis lets you create a traditional D3 axis that can be labeled and
          is capable of being brushable.
        </p>

        <p>
          Data are sent to the data properties with summary types and connector
          rules determining whether summaries and connectors are drawn.
        </p>
      </DocumentComponent>
    );
  }
}

AxisDocs.title = "Axis";
