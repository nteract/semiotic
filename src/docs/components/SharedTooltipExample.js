import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import SharedTooltipExampleRaw from "./SharedTooltipExampleRaw"

import Select from "@material-ui/core/Select"
import MenuItem from '@material-ui/core/MenuItem'
import InputLabel from '@material-ui/core/InputLabel'
import FormControl from "@material-ui/core/FormControl"

const components = []
// Add your component proptype data here
// multiple component proptype documentation supported

components.push({
  name: "Shared Tooltip Example"
})

const sharedExampleCode = `
  const tooltipStyles = {
    header: {fontWeight: 'bold', borderBottom: 'thin solid black',
      marginBottom: '10px', textAlign: 'center'},
    lineItem: {position: 'relative', display: 'block', textAlign: 'left'},
    title: {display: 'inline-block', margin: '0 5px 0 15px'},
    value: {display: 'inline-block', fontWeight: 'bold', margin: '0'},
    wrapper: {background:"rgba(255,255,255,0.8)",
      minWidth: "max-content", whiteSpace: "nowrap"}
  }

  ...

  function fetchSharedTooltipContent(passedData){
    const points = lines
      .map((point) => {
        return {
          id: point.id,
          color: point.color,
          data: point.data.find((i) => {
            // Search the lines for a similar x value for vertical shared tooltip
            // Can implement a 'close enough' conditional here too (fuzzy equality)
            return i.x.getTime() === passedData.x.getTime();
          }),
        };
      })
      .sort((a, b) => {
        return b.data.y - a.data.y;
      });

  const returnArray = [
      <div
        key={'header_multi'}
        style={tooltipStyles.header}
      >
        {Records for: {timeFormat("%m/%d/%Y")(new Date(passedData.x))}}
      </div>
    ];

    points.forEach((point, i) => {
      const title = point.id;
      const valString = {point.data.y} units;

      returnArray.push([
        <div
          key={tooltip_line_{i}}
          style={tooltipStyles.lineItem}
        >
          <p
            key={tooltip_color_{i}}
            style={{
              width: '10px',
              height: '10px',
              backgroundColor: point.color,
              display: 'inline-block',
              position: 'absolute',
              top: '8px',
              left: '0',
              margin: '0' 
            }}
          />
          <p key={tooltip_p_{i}} style={tooltipStyles.title}>{{title} =}</p>
          <p key={tooltip_p_val_{i}} style={tooltipStyles.value}>{valString}</p>
        </div>,
      ]);
    });

    return (
      <div
        className="tooltip-content"
        style={tooltipStyles.wrapper}
      >
        {returnArray}
      </div>
    );
  }

  ...

  <XYFrame
    size={[700, 300]}
    className={"sharedTooltip"}
    xScaleType={scaleTime()}
    lineDataAccessor={d => d.data}
    xAccessor={d => d.x}
    yAccessor={d => d.y}
    lines={lines}
    lineStyle={d => {return { stroke: d.color, strokeWidth: "2px"}}}
    axes={chartAxes}
    margin={{ top: 50, left: 40, right: 10, bottom: 40 }}
    pointStyle={() => {
      return {
        fill: 'none',
        stroke: 'black',
        strokeWidth: '1.5px',
      };
    }}
    hoverAnnotation={[
      { type: 'x', disable: ['connector', 'note']},
      { type: 'frame-hover' },
      { type: 'vertical-points', threshold: 0.1, r: () => 5 }
    ]}
    tooltipContent={(d) => {
      fetchSharedTooltipContent(d) 
    }}
  />`

const singletonExampleCode = `
  const tooltipStyles = {
    header: {fontWeight: 'bold', borderBottom: 'thin solid black',
      marginBottom: '10px', textAlign: 'center'},
    lineItem: {position: 'relative', display: 'block', textAlign: 'left'},
    title: {display: 'inline-block', margin: '0 5px 0 15px'},
    value: {display: 'inline-block', fontWeight: 'bold', margin: '0'},
    wrapper: {background:"rgba(255,255,255,0.8)",
      minWidth: "max-content", whiteSpace: "nowrap"}
  }

  ...

  function fetchSingletonTooltip(d) {
    const title = d.parentLine.id;
    const valString = {d.y} units;

      const returnArray = [
        <div
          key={'header_singleton'}
          style={tooltipStyles.header}
        >
          {Records for: {timeFormat("%m/%d/%Y")(new Date(d.x))}}
        </div>,
        <div
          key={'tooltip_singleton_line'}
          style={tooltipStyles.lineItem}
        >
          <p
            key={'tooltip_singelton_color'}
            style={{
              width: '10px',
              height: '10px',
              backgroundColor: d.parentLine.color,
              display: 'inline-block',
              position: 'absolute',
              top: '8px',
              left: '0',
              margin: '0' 
            }}
          />
          <p key={'tooltip_singleton_p'} style={tooltipStyles.title}>
            {{title} =}
          </p>
          <p key={'tooltip_singelton_p_val'} style={tooltipStyles.value}>
            {valString}
          </p>
        </div>,
      ];

    return (
      <div
        className="tooltip-content"
        style={tooltipStyles.wrapper}
      >
        {returnArray}
      </div>
    );
  }
  ...

  <XYFrame
    size={[700, 300]}
    className={"sharedTooltip"}
    xScaleType={scaleTime()}
    lineDataAccessor={d => d.data}
    xAccessor={d => d.x}
    yAccessor={d => d.y}
    lines={lines}
    lineStyle={d => {return { stroke: d.color, strokeWidth: "2px"}}}
    axes={chartAxes}
    margin={{ top: 50, left: 40, right: 10, bottom: 40 }}
    hoverAnnotation={ true }
    tooltipContent={(d) => {
      return fetchSingletonTooltip(d);
    }}
  />
`

export default class SharedTooltipExample extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      tooltipSelection: "Shared"
    }
  }

  render() {
    const toolTipFrame = SharedTooltipExampleRaw(this.state.tooltipSelection)
    const examples = []
    examples.push({
      name: `${this.state.tooltipSelection} Tooltip`,
      demo: toolTipFrame,
      source:
        this.state.tooltipSelection === "Shared"
          ? sharedExampleCode
          : singletonExampleCode
    })

    const toolTipOptions = ["Shared", "Individual"].map(d => (
      <MenuItem key={`shared-tooltip-option-${d}`} value={d}>
        {d}
      </MenuItem>
    ))

    const buttons = [
      <FormControl key="button-1">
        <InputLabel htmlFor="hover-behavior-input">toolTip</InputLabel>
        <Select
          id="tooltip-selection-option"
          value={this.state.tooltipSelection}
          onChange={e => this.setState({ tooltipSelection: e.target.value })}
        >
          {toolTipOptions}
        </Select>
      </FormControl>
    ]

    return (
      <DocumentComponent
        name="Shared Tooltip Example"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          When designing a chart, you may wish to have a hover tooltip display
          all values for a given axis value. This example shows how to implement
          a shared tooltip with respect to the X axis. Certian style
          considerations such as ordering and color matching are also
          considered. Individual (point based) tooltips are default behavior in
          Semiotic, and can be toggled on via chart settings.
        </p>
      </DocumentComponent>
    )
  }
}

SharedTooltipExample.title = "Shared Tooltips"
