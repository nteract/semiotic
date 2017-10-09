import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import { ORFrame } from "../../components";
import DonutChartRaw from "./DonutChartRaw";
import Select from "material-ui/Select";
import { MenuItem } from "material-ui/Menu";
import Input, { InputLabel } from "material-ui/Input";
import { FormControl, FormHelperText } from "material-ui/Form";

const components = [];

components.push({
  name: "PieDonut"
});

export default class PieDonutDocs extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      innerRadius: "25",
      kind: "pie",
      padding: "0"
    };
  }

  render() {
    const examples = [];

    const kindOptions = ["pie", "nightingale"].map(d => (
      <MenuItem key={"kind-option" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));
    const innerOptions = ["25", "0", "5", "75", "150"].map(d => (
      <MenuItem key={"radius-option" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));
    const paddingOptions = ["0", "10", "20", "40"].map(d => (
      <MenuItem key={"padding-option" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));

    const buttons = [
      <div key="button-0">
        <FormControl>
          <InputLabel htmlFor="type-input">Type</InputLabel>
          <Select
            floatingLabelText="Kind of Chart"
            value={this.state.kind}
            onChange={(e, i, value) => this.setState({ kind: value })}
          >
            {kindOptions}
          </Select>
          <FormHelperText>Alignment with an input</FormHelperText>
        </FormControl>
      </div>,
      <div key="button-1">
        <FormControl>
          <InputLabel htmlFor="inner-radius-input">innerRadius</InputLabel>
          <Select
            value={this.state.innerRadius}
            onChange={(e, i, value) => this.setState({ innerRadius: value })}
          >
            {innerOptions}
          </Select>
          <FormHelperText>Alignment with an input</FormHelperText>
        </FormControl>
      </div>,
      <div key="button-2">
        <FormControl>
          <InputLabel htmlFor="padding-input">padding</InputLabel>
          <Select
            floatingLabelText="padding"
            value={this.state.padding}
            onChange={(e, i, value) => this.setState({ padding: value })}
          >
            {paddingOptions}
          </Select>
          <FormHelperText>Alignment with an input</FormHelperText>
        </FormControl>
      </div>
    ];

    examples.push({
      name: "Basic",
      demo: DonutChartRaw(this.state),
      source: `
          const colors = [
              '#00a2ce',
              '#4d430c',
              '#b3331d',
              '#b6a756'
          ]
          const data = [ 5, 8, 10, 15 ]

           <ORFrame
              size={[ 700,400 ]}
              data={data}
              projection={"radial"}
              style={d => ({ fill: "red", stroke: "darkgray", strokeWidth: 1 })}
              type={{ type: "bar", innerRadius: ${this.state.innerRadius} }}
              oLabel={true}
              ${this.state.kind === "pie"
                ? "dynamicColumnWidth={d => d.value}"
                : ""}
              rAccessor={${this.state.kind === "pie"
                ? "() => 1"
                : "d => d.value"}}
              margin={{ left: 20, top: 20, bottom: 20, right: 20 }}
              oPadding={${this.state.padding}}
            />

      `
    });

    return (
      <DocumentComponent
        name="Pie/Donut"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          Pie charts aren't evil and people love donut charts. They're just
          radially projected ORFrames of the "bar" type. If you want to make a
          donut chart, send an object as your type, with its type set to "bar"
          and its innerRadius set to your preferred innerRadius.
        </p>
      </DocumentComponent>
    );
  }
}

PieDonutDocs.title = "Pie/Donut";
