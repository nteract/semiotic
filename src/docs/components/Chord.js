import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import { NetworkFrame } from "../../components";
import ChordRaw from "./ChordRaw";
import Select from "material-ui/Select";
import { MenuItem } from "material-ui/Menu";
import Input, { InputLabel } from "material-ui/Input";
import { FormControl, FormHelperText } from "material-ui/Form";

const dematrixifiedEdges = [
  { source: "a", target: "a", value: 11975 },
  { source: "a", target: "b", value: 5871 },
  { source: "a", target: "c", value: 8916 },
  { source: "a", target: "d", value: 2868 },
  { source: "b", target: "a", value: 1951 },
  { source: "b", target: "b", value: 10048 },
  { source: "b", target: "c", value: 2060 },
  { source: "b", target: "d", value: 6171 },
  { source: "c", target: "a", value: 8010 },
  { source: "c", target: "b", value: 16145 },
  { source: "c", target: "c", value: 8090 },
  { source: "c", target: "d", value: 8045 },
  { source: "d", target: "a", value: 1013 },
  { source: "d", target: "b", value: 990 },
  { source: "d", target: "c", value: 940 },
  { source: "d", target: "d", value: 6907 }
];

const components = [];

const originalChordColors = ["#000000", "#FFDD89", "#957244", "#F26223"];

components.push({
  name: "Chord"
});

export default class Chord extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      padAngle: "0.01"
    };
  }

  render() {
    const padAngleOptions = ["0.01", "0", "0.2", "0.4"].map(d => (
      <MenuItem key={"pad-option-" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));

    const buttons = [
      <FormControl key="button-1-0-0">
        <InputLabel htmlFor="pad-angle-input">padAngle</InputLabel>
        <Select
          value={this.state.padAngle}
          onChange={e => this.setState({ padAngle: e.target.value })}
        >
          {padAngleOptions}
        </Select>
      </FormControl>
    ];

    const examples = [];
    examples.push({
      name: "Basic",
      demo: ChordRaw({ padAngle: parseFloat(this.state.padAngle) }),
      source: `
const dematrixifiedEdges = [
  { source: "a", target: "a", value: 11975},
  { source: "a", target: "b", value: 5871},
  { source: "a", target: "c", value: 8916},
  { source: "a", target: "d", value: 2868},
  { source: "b", target: "a", value: 1951},
  { source: "b", target: "b", value: 10048},
  { source: "b", target: "c", value: 2060},
  { source: "b", target: "d", value: 6171},
  { source: "c", target: "a", value: 8010},
  { source: "c", target: "b", value: 16145},
  { source: "c", target: "c", value: 8090},
  { source: "c", target: "d", value: 8045},
  { source: "d", target: "a", value: 1013},
  { source: "d", target: "b", value: 990},
  { source: "d", target: "c", value: 940},
  { source: "d", target: "d", value: 6907},
]

const colors = [
    '#00a2ce',
    '#4d430c',
    '#b3331d',
    '#b6a756'
]

<NetworkFrame
  size={[ 700,400 ]}
  edges={dematrixifiedEdges}
  nodeStyle={(d,i) => ({ fill: colors[d.index], stroke: "black" })}
  edgeStyle={(d,i) => ({ fill: colors[d.target.index], stroke: "black", opacity: 0.5 })}
  nodeSizeAccessor={5}
  sourceAccessor={d => d.source}
  targetAccessor={d => d.target}
  hoverAnnotation={true}
  edgeWidthAccessor={d => d.value}
  networkType={{ type: "chord", padAngle: ${this.state.padAngle} }}
/>
`
    });

    return (
      <DocumentComponent
        name="Chord"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          The Chord diagram is a directed network diagram that tries to
          emphasize the asymmetric relationship between nodes. The edges, which
          are long sweeping arcs, are sized on each end based on the value of
          the connection for the source or the target, and each node prominently
          shows a self-loop in the form of a half-egg shaped arc.
        </p>
        <p>
          This diagram works best when there are many self-loops and uneven but
          reciprocated ties.
        </p>
        <p>
          Because "chord" is just an option in NetworkFrame, it takes the same
          node and edge list that any other network takes. In contrast, the
          traditional D3 implementation of a chord diagram takes a matrix
          dataset.
        </p>
      </DocumentComponent>
    );
  }
}

Chord.title = "Chord";
