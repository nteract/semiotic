import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import { NetworkFrame, Mark } from "../../components";
import { edgeData } from "../example_settings/networkframe";
import RaisedButton from "material-ui/RaisedButton";
import SelectField from "material-ui/SelectField";
import MenuItem from "material-ui/MenuItem";

const components = [];
// Add your component proptype data here
// multiple component proptype documentation supported

components.push({
  name: "NetworkFrame",
  proptypes: `
    {
  name: PropTypes.string,
  title: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]),
  margin: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.object
  ]),
  size: PropTypes.array.isRequired,
  position: PropTypes.array,
  nodeIDAccessor: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func
  ]),
  sourceAccessor: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func
  ]),
  targetAccessor: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func
  ]),
  nodeSizeAccessor: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.func
  ]),
  nodeLabels: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.func
  ]),
  edgeWidthAccessor: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func
  ]),
  annotations: PropTypes.array,
  customHoverBehavior: PropTypes.func,
  customClickBehavior: PropTypes.func,
  customDoubleClickBehavior: PropTypes.func,
  htmlAnnotationRules: PropTypes.func,
  networkType: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]),
  tooltipContent: PropTypes.func,
  className: PropTypes.string,
  additionalDefs: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.object
  ]),
  interaction: PropTypes.object,
  renderFn: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func
  ]),
  nodeStyle:  PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.func
  ]),
  edgeStyle:  PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.func
  ]),
  hoverAnnotation: PropTypes.bool,
  backgroundGraphics:  PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.array
  ]),
  foregroundGraphics:  PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.array
  ])
    }
  `
});

const nodeData = [
  { id: "Susie" },
  { id: "Kai" },
  { id: "Elijah" },
  { id: "Enrico" }
];

export default class NetworkFrameDocs extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      annotations: "off",
      networkType: "force",
      edge: "none",
      nodeSize: "degree",
      customNodeIcon: "off"
    };
  }

  render() {
    const edgeOptions = [
      "none",
      "linearc",
      "ribbon",
      "arrowhead",
      "halfarrow",
      "nail",
      "comet",
      "taffy"
    ].map(d => (
      <MenuItem key={"edgeType-option-" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));

    const nodeSizeOptions = ["degree", "inDegree", "outDegree"].map(d => (
      <MenuItem key={"nodeSize-option-" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));

    const annotationOptions = ["off", "on"].map(d => (
      <MenuItem key={"annotation-option-" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));

    const networkTypeOptions = ["force", "motifs"].map(d => (
      <MenuItem key={"networkType-option-" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));

    const customNodeOptions = ["off", "on"].map(d => (
      <MenuItem key={"customNode-option-" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));

    const annotations = [
      { type: "node", dy: 25, id: "Miles", label: "Smart guy" },
      {
        type: "enclose",
        dy: -70,
        dx: 75,
        ids: ["Tony", "Fil", "Adam"],
        label: "Gang"
      }
    ];
    const buttons = [
      <div key="button-0">
        <span>
          <SelectField
            floatingLabelText="edgeType"
            value={this.state.edge}
            onChange={(e, i, value) => this.setState({ edge: value })}
          >
            {edgeOptions}
          </SelectField>
        </span>
      </div>,
      <div key="button-1">
        <span>
          <SelectField
            floatingLabelText="nodeSize"
            value={this.state.nodeSize}
            onChange={(e, i, value) => this.setState({ nodeSize: value })}
          >
            {nodeSizeOptions}
          </SelectField>
        </span>
      </div>,
      <div key="button-2">
        <span>
          <SelectField
            floatingLabelText="annotations"
            value={this.state.annotations}
            onChange={(e, i, value) => this.setState({ annotations: value })}
          >
            {annotationOptions}
          </SelectField>
        </span>
      </div>,
      <div key="button-3">
        <span>
          <SelectField
            floatingLabelText="networkType"
            value={this.state.networkType}
            onChange={(e, i, value) => this.setState({ networkType: value })}
          >
            {networkTypeOptions}
          </SelectField>
        </span>
      </div>,
      <div key="button-4">
        <span>
          <SelectField
            floatingLabelText="customNodeIcon"
            value={this.state.customNodeIcon}
            onChange={(e, i, value) => this.setState({ customNodeIcon: value })}
          >
            {customNodeOptions}
          </SelectField>
        </span>
      </div>
    ];

    const examples = [];
    examples.push({
      name: "Basic",
      demo: (
        <div>
          <RaisedButton
            primary
            label={"NetworkFrame API"}
            onTouchTap={() =>
              window.open(
                `https://github.com/emeeks/semiotic/wiki/networkframe`
              )}
          />
          <NetworkFrame
            size={[750, 500]}
            edges={edgeData}
            nodes={nodeData}
            margin={60}
            edgeStyle={() => ({
              stroke: "#4d430c",
              fill: "#4d430c",
              fillOpacity: 0.25,
              strokeWidth: "1px"
            })}
            nodeStyle={d => ({
              fill: d.createdByFrame ? "#1aa962" : "rgb(179, 51, 29)"
            })}
            networkType={{
              type: this.state.networkType,
              iterations: 500,
              edgeStrength: 0.1
            }}
            edgeType={this.state.edge}
            nodeSizeAccessor={d => d[this.state.nodeSize] + 2}
            customNodeIcon={
              this.state.customNodeIcon === "on" ? (
                ({ d, transform, key }) => (
                  <Mark
                    key={key}
                    rx={0}
                    ry={0}
                    transform={transform}
                    markType="rect"
                    width={d.degree}
                    height={d.degree}
                    x={-d.degree / 2}
                    y={-d.degree / 2}
                    style={{
                      fill: d.createdByFrame
                        ? "rgb(0, 162, 206)"
                        : "rgb(179, 51, 29)"
                    }}
                  />
                )
              ) : (
                undefined
              )
            }
            annotations={
              this.state.annotations === "on" ? annotations : undefined
            }
            zoomToFit={true}
            nodeLabels={true}
            hoverAnnotation={true}
            download={true}
            annotationSettings={{
              pointSizeFunction: d => (d.subject && d.subject.radius) || 5,
              labelSizeFunction: noteData => {
                return noteData.note.label.length * 5.5;
              }
            }}
          />
        </div>
      ),
      source: `
      import { NetworkFrame } from 'semiotic';

        <NetworkFrame
            size={[ 750, 500 ]}
            edges={edgeData}
            nodes={nodeData}
            margin={60}
            edgeStyle={() => ({ stroke: '#a91a1a', fill: '#a91a1a', fillOpacity: 0.25, strokeWidth: '1px' })}
            nodeStyle={d => ({ fill: d.createdByFrame ? '#1aa962' : "rgb(179, 51, 29)" })}
            networkType={{ type: '${this.state
              .networkType}', iterations: 500, edgeStrength: 0.1 }}
            edgeType={'${this.state.edge}'}
            ${this.state.customNodeIcon !== "on"
              ? ""
              : `customNodeIcon={ ? ({ d }) => <Mark
                markType="rect"
                width={d.degree}
                height={d.degree}
                x={-d.degree / 2}
                y={-d.degree / 2}
                style={{ fill: d.createdByFrame ? "rgb(0, 162, 206)" : "rgb(179, 51, 29)" }}
            />`}
            nodeSizeAccessor={d => d.${this.state.nodeSize} + 2}
            ${this.state.annotations === "on"
              ? "annotations={annotations}"
              : ""}
            zoomToFit={true}
            nodeLabels={true}
            hoverAnnotation={true}
            annotationSettings={{
                pointSizeFunction: d => d.subject && d.subject.radius || 5,
                labelSizeFunction: noteData => {
                    return noteData.note.label.length * 5.5
              } }}
        />
      `
    });

    return (
      <DocumentComponent
        name="NetworkFrame"
        api="https://github.com/emeeks/semiotic/wiki/NetworkFrame"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          The NetworkFrame lets you create scatterplots, line charts and area
          visualizations like contours and alpha shapes.
        </p>

        <p>
          Data are sent to the data properties with summary types and connector
          rules determining whether summaries and connectors are drawn.
        </p>
      </DocumentComponent>
    );
  }
}

NetworkFrameDocs.title = "NetworkFrame";
