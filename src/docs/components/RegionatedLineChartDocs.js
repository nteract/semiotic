import React from 'react'
import DocumentComponent from '../layout/DocumentComponent'
import RegionatedLineChartRaw from './RegionatedLineChartRaw'

export default class RegionatedLineChartDocs extends React.Component {
  render() {
    const examples = []
    examples.push({
      name: 'Basic',
      demo: RegionatedLineChartRaw,
      source: `
      `
    })

    return (
      <DocumentComponent
        name="RegionatedLineChart"
        components={[]}
        examples={examples}
        buttons={[]}
      >
        <p>
          Using DividedLine and area rendering to highlight the parts of a line
          that are significantly higher or lower.
        </p>
        <p>
          On hover, the custom tooltip takes advantage of the coincidentPoints
          being exposed in the hovered element to draw all lines that intersect
          with the hovered point.
        </p>
        <p>
          dataVersion is used to prevent the chart from rerendering on hover.
          dataVersion takes a string and as long as that string remains
          unchanged, the chart will not rerender. This can be used when you're
          passing complex and large datasets as a key to manage the update logic
          of the chart.
        </p>
      </DocumentComponent>
    )
  }
}

RegionatedLineChartDocs.title = 'RegionatedLineChart'
