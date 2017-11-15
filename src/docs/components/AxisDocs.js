import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import { Axis } from "../../components"
import { scaleLinear, scaleTime } from "d3-scale"

const components = []
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
    ]),
    label: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.object
      // the label object takes the following properties
      // name : String to be displayed
      // locationDistance: Offset in px from original position      
      // position: Object with the following options
      //   location: One of "outside" or "inside" defaults to "outside"
      //   anchor: One of "middle", "start", or "end", defaults to "middle"
      //   rotation: Angle used in an svg transform rotation
    ])
    }
  `
})

export default class AxisDocs extends React.Component {
  render() {
    const buttons = []

    const examples = []
    examples.push({
      name: "Basic",
      demo: (
        <svg style={{ height: "600px", width: "700px" }}>
          <g transform={"translate(100,20)"}>
            <Axis
              size={[200, 200]}
              scale={scaleLinear()
                .domain([10, 1000])
                .range([200, 0])}
              orient={"left"}
              label={"Just an Axis (left)"}
            />
          </g>
          <g transform={"translate(400,20)"}>
            <Axis
              size={[200, 200]}
              scale={scaleTime()
                .domain([new Date(2017, 1, 1), new Date(2017, 10, 17)])
                .range([0, 200])}
              orient={"bottom"}
              tickFormat={d => `${d.getMonth()}-${d.getDate()}`}
              label={"Format Your Dates"}
            />
          </g>
          <g transform={"translate(100,320)"}>
            <Axis
              size={[200, 200]}
              scale={scaleLinear()
                .domain([10, 1000])
                .range([200, 0])}
              orient={"left"}
              label={"Footer Left"}
              footer={true}
            />
          </g>
          <g transform={"translate(400,320)"}>
            <Axis
              size={[200, 200]}
              scale={scaleTime()
                .domain([new Date(2017, 1, 1), new Date(2017, 10, 17)])
                .range([0, 200])}
              orient={"bottom"}
              tickFormat={d => `${d.getMonth()}-${d.getDate()}`}
              label={"Footer Bottom"}
              footer={true}
            />
          </g>
        </svg>
      ),
      source: `
      import { Axis } from 'semiotic';

        <svg style={{ height: '400px', width: '800px' }}>
          <g transform={"translate(100,20)"}>
            <Axis
              size={[200, 200]}
              scale={scaleLinear()
                .domain([10, 1000])
                .range([200, 0])}
              orient={"left"}
              label={"Just an Axis (left)"}
            />
          </g>
          <g transform={"translate(400,20)"}>
            <Axis
              size={[200, 200]}
              scale={scaleTime()
                .domain([new Date(2017, 1, 1), new Date(2017, 10, 17)])
                .range([0, 200])}
              orient={"bottom"}
              tickFormat={d => ${"`${d.getMonth()}-${d.getDate()}`"}}
              label={"Format Your Dates"}
            />
          </g>
          <g transform={"translate(100,320)"}>
            <Axis
              size={[200, 200]}
              scale={scaleLinear()
                .domain([10, 1000])
                .range([200, 0])}
              orient={"left"}
              label={"Footer Left"}
              footer={true}
            />
          </g>
          <g transform={"translate(400,320)"}>
            <Axis
              size={[200, 200]}
              scale={scaleTime()
                .domain([new Date(2017, 1, 1), new Date(2017, 10, 17)])
                .range([0, 200])}
              orient={"bottom"}
              tickFormat={d => ${"`${d.getMonth()}-${d.getDate()}`"}}
              label={"Footer Bottom"}
              footer={true}
            />
          </g>
        </g>
        </svg>
      `
    })

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
          The tickFormat function can return SVG JSX. Remember if you're using
          dates and scaleTime that you need to format your dates otherwise
          they'll defaul to the js .toString() (and very long) version for
          display.
        </p>

        <p>
          Data are sent to the data properties with summary types and connector
          rules determining whether summaries and connectors are drawn.
        </p>
      </DocumentComponent>
    )
  }
}

AxisDocs.title = "Axis"
