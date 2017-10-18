import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import SankeyRaw from "./SankeyRaw";
import Select from "material-ui/Select";
import { MenuItem } from "material-ui/Menu";
import Input, { InputLabel } from "material-ui/Input";
import { FormControl, FormHelperText } from "material-ui/Form";

const components = [];

const oldColors = ["#000000", "#FFDD89", "#957244", "#F26223"];

components.push({
  name: "Sankey"
});

export default class Sankey extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      type: "sankey",
      orient: "center"
    };
  }

  render() {
    const typeOptions = ["sankey", "force", "chord"].map(d => (
      <MenuItem key={"type-option-" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));

    const orientOptions = ["justify", "left", "right", "center"].map(d => (
      <MenuItem key={"orient-option-" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));

    const buttons = [
      <FormControl key="button-1-0-0">
        <InputLabel htmlFor="chart-type-input">Chart Type</InputLabel>
        <Select
          value={this.state.type}
          onChange={e => this.setState({ type: e.target.value })}
        >
          {typeOptions}
        </Select>
      </FormControl>,
      <FormControl key="button-2-0-0">
        <InputLabel htmlFor="orient-input">orient</InputLabel>
        <Select
          value={this.state.orient}
          onChange={e => this.setState({ orient: e.target.value })}
        >
          {orientOptions}
        </Select>
      </FormControl>
    ];

    const annotations = [
      {
        type: "node",
        dy: 0,
        dx: 100,
        id: "International aviation",
        label: "Energy spent on international aviation"
      },
      { type: "node", dy: -50, dx: -50, id: "Oil", label: "Big Oil" },
      {
        type: "enclose",
        dy: -100,
        dx: 50,
        ids: ["Wave", "Geothermal", "Hydro", "Tidal"],
        label: "Energy made with wave, tidal, hydro and geothermal"
      }
    ];

    const examples = [];
    examples.push({
      name: "Basic",
      demo: SankeyRaw({
        annotations,
        type: this.state.type,
        orient: this.state.orient
      }),
      source: `
const or_data = [{"id":"Agricultural 'waste'","input":0,"output":262.6972158,"years":[9.282517755,14.61107771,30.99950457,31.97585802,32.98811297,34.0375862,35.12564273,36.2536977,37.42321811],"category":"Agriculture","color":"#4d430c"},
  {"id":"Wave","input":0,"output":0.95365274,"years":[0,0.003002055,0.158441781,0.396104452,0.396104452,0,0,0,0],"category":"Alternative","color":"#b3331d"},
  {"id":"Tidal","input":0,"output":0.325222603,"years":[0.005003425,0.020013699,0.050034247,0.125085616,0.125085616,0,0,0,0],"category":"Alternative","color":"#b3331d"}
  ...]

const network_data = [
  {"2010":127.93,"2015":127.93,"2020":127.93,"2025":127.93,"2030":63.965,"2035":63.965,"2040":63.965,"2045":63.965,"2050":63.965,"source":"Coal reserves","target":"Coal","total":831.545,"value":831.545},
  {"2010":349.7879708,"2015":296.3632186,"2020":211.2161187,"2025":77.82581145,"2030":35.20638477,"2035":19.10842823,"2040":22.86599313,"2045":26.79703903,"2050":31.37680448,"source":"Coal imports","target":"Coal","total":1070.547769,"value":1070.547769},
  {"2010":802.5479528,"2015":646.8288435,"2020":501.7889501,"2025":388.2747242,"2030":300.4395801,"2035":232.47442,"2040":179.8842746,"2045":139.1910227,"2050":107.70336,"source":"Oil reserves","target":"Oil","total":3299.133128,"value":3299.133128},
...]

${this.state.type === "chord"
        ? `const mirroredNetworkData = [
    ...network_data.map(d => ({ source: d.source.id, target: d.target.id, value: d["2010"] })),
    ...network_data.map(d => ({ target: d.source.id, source: d.target.id, value: d["2050"] }))
    ]`
        : ""}

<NetworkFrame
  size={[ 700,400 ]}
  nodes={or_data}
  edges={${this.state.type === "chord"
    ? "mirroredNetworkData"
    : "network_data"}}
  nodeStyle={d => ({ fill: d.id === "Oil" ? "#b3331d" : "rgb(182, 167, 86)", stroke: "black" })}
  edgeStyle={d => ({ stroke: "black", fill: "#00a2ce", strokeWidth: 1, fillOpacity: 0.25, strokeOpacity: 0.1 })}
  nodeIDAccessor="id"
  sourceAccessor="source"
  targetAccessor="target"
  ${this.state.type === "force" ? "nodeSizeAccessor={5}" : ""}
  ${this.state.type === "force" ? 'edgeType={"arrowhead"}' : ""}
  ${this.state.type === "force"
    ? 'zoomToFit={this.state.type === "force"}'
    : ""}
  hoverAnnotation={true}
  ${this.state.type === "chord" ? "edgeWidthAccessor={d => d.value}" : ""}
  networkType={{ type: ${this.state.type}, orient: ${this.state
        .orient}, iterations: 500 }}
  annotations={[ { type: 'node', dy: 0, dx: 100, id: 'International aviation', label: 'Energy spent on international aviation' }
  ,{ type: 'node', dy: 0, dx: 50, id: 'Oil', label: 'Big Oil' }
  ,{ type: 'enclose', dy: -100, dx: 50, ids: [ 'Wave', 'Geothermal', 'Hydro', 'Tidal' ], label: 'Energy made with wave, tidal, hydro and geothermal' }
  ]}
/>
`
    });

    return (
      <DocumentComponent
        name="Sankey"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          The Sankey diagram is used for representing directed acyclic graphs so
          if you send it a network with cycles, it will default to a
          force-directed network.
        </p>
      </DocumentComponent>
    );
  }
}

Sankey.title = "Sankey";
