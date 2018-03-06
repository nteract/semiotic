import React from 'react'
import DocumentComponent from '../layout/DocumentComponent'
import { Legend } from '../../components'

const components = []

components.push({
  name: 'Legend',
  proptypes: `
    {
    title: PropTypes.string,
    width: PropTypes.number,
    legendGroups: PropTypes.array
    }
  `
})

export default class LegendDocs extends React.Component {
  render() {
    const buttons = []

    const examples = []

    const areaLegendGroups = [
      {
        styleFn: d => ({ fill: d.color, stroke: 'black' }),
        items: [
          { label: 'Area 1', color: '#b3331d' },
          { label: 'Area 2', color: '#007190' }
        ]
      }
    ]

    const lineLegendGroups = [
      {
        type: 'line',
        styleFn: d => ({ stroke: d.color }),
        items: [
          { label: 'Line 1', color: '#b3331d' },
          { label: 'Line 2', color: '#007190' }
        ]
      }
    ]

    examples.push({
      name: 'Basic',
      demo: 
        <svg style={{ height: '400px', width: '800px' }}>
          <g transform={'translate(50,0)'}>
            <Legend
              title={'Test Area Legend'}
              legendGroups={areaLegendGroups}
            />
          </g>

          <g transform={'translate(200,0)'}>
            <Legend
              title={'Test Line Legend'}
              legendGroups={lineLegendGroups}
            />
          </g>
          <g transform={'translate(350,0)'}>
            <Legend
              title={'Both Legend'}
              legendGroups={[...lineLegendGroups, ...areaLegendGroups]}
            />
          </g>
        </svg>,      
      source: `
const areaLegendGroups = [
  {
    styleFn: d => ({ fill: d.color, stroke: "black" }),
    items: [
      { label: "Area 1", color: "#b3331d" },
      { label: "Area 2", color: "#007190" }
    ]
  }
];

const lineLegendGroups = [
  {
    type: "line",
    styleFn: d => ({ stroke: d.color }),
    items: [
      { label: "Line 1", color: "#b3331d" },
      { label: "Line 2", color: "#007190" }
    ]
  }
];

<svg style={{ height: "400px", width: "800px" }}>
    <g transform={"translate(50,0)"}>
      <Legend
        title={"Test Area Legend"}
        legendGroups={areaLegendGroups}
      />
    </g>

    <g transform={"translate(200,0)"}>
      <Legend
        title={"Test Line Legend"}
        legendGroups={lineLegendGroups}
      />
    </g>
    <g transform={"translate(350,0)"}>
      <Legend
        title={"Both Legend"}
        legendGroups={[...lineLegendGroups, ...areaLegendGroups]}
      />
    </g>
  </svg>
      `
    })

    return (
      <DocumentComponent
        name="Legend"
        api="https://github.com/emeeks/semiotic/wiki/Legend"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>The Legend lets you create a simple legend with interactivity.</p>
      </DocumentComponent>
    )
  }
}

LegendDocs.title = 'Legend'
