import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import { ORFrame } from "../../components";
import { randomNormal } from "d3-random";
import { funnelData } from "../example_settings/orframe";
import RaisedButton from "material-ui/RaisedButton";
import { sum } from "d3-array";
import SelectField from "material-ui/SelectField";
import MenuItem from "material-ui/MenuItem";

const monthHash = {};

const colors = ["#00a2ce", "#4d430c", "#b3331d", "#b6a756"];

const outsideHash = {};

const groupData = [];
const nRando = randomNormal(50, 15);
for (let x = 1; x < 500; x++) {
  groupData.push({
    x: nRando(),
    value: Math.min(100, Math.max(0, nRando())),
    color: colors[x % 4],
    value2: x
  });
}

//Just to give it a 100 and 0 values
groupData.push({ x: 0, value: 0, color: colors[3], value2: 503 });
groupData.push({ x: 100, value: 100, color: colors[3], value2: 504 });
groupData.push({ x: 100, value: 100, color: colors[0], value2: 504 });
groupData.push({ x: 100, value: 100, color: colors[1], value2: 504 });
groupData.push({ x: 100, value: 100, color: colors[2], value2: 504 });

const components = [];
// Add your component proptype data here
// multiple component proptype documentation supported

components.push({
  name: "ORFrame",
  proptypes: `
    {
  name: PropTypes.string,
  orient: PropTypes.string,
  title: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]),
  margin: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.object
  ]),
  format: PropTypes.string,
  properties: PropTypes.object,
  size: PropTypes.array.isRequired,
  position: PropTypes.array,
  oScaleType: PropTypes.func,
  rScaleType: PropTypes.func,
  oExtent: PropTypes.array,
  rExtent: PropTypes.array,
  invertO: PropTypes.bool,
  invertR: PropTypes.bool,
  oAccessor: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func
  ]),
  rAccessor: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func
  ]),
  annotations: PropTypes.array,
  customHoverBehavior: PropTypes.func,
  customClickBehavior: PropTypes.func,
  optimizeRendering: PropTypes.bool,
  svgAnnotationRules: PropTypes.func,
  oPadding: PropTypes.number,
  projection: PropTypes.string,
  htmlAnnotationRules: PropTypes.func,
  type: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
    PropTypes.func
  ]),
  summaryType: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]),
  connectorType: PropTypes.func,
  tooltipContent: PropTypes.func,
  className: PropTypes.string,
  additionalDefs: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.object
  ]),
  interaction: PropTypes.object,
  renderKey: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func
  ]),
  dataAccessor: PropTypes.func,
  rBaseline: PropTypes.number,
  sortO: PropTypes.func,
  dynamicColumnWidth: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func
  ]),
  renderFn: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func
  ]),
  style: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.func
  ]),
  connectorStyle:  PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.func
  ]),
  summaryStyle:  PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.func
  ]),
  oLabel: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.func
  ]),
  hoverAnnotation: PropTypes.bool,
  axis: PropTypes.object,
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

const exampleAnnotations = [
  {
    stepName: "mop",
    stepValue: 550,
    type: "or",
    label: "OR at 550",
    eventListeners: {
      onMouseEnter: () => console.log("Mouse Enter"),
      onMouseLeave: () => console.log("Mouse Leave")
    }
  },
  {
    type: "enclose",
    rp: "top",
    rd: 25,
    coordinates: [
      { stepName: "streamed", stepValue: 450 },
      { stepName: "streamed", stepValue: 500 }
    ],
    label: "enclose of 450 and 500",
    eventListeners: {
      onMouseEnter: () => console.log("Mouse Enter"),
      onMouseLeave: () => console.log("Mouse Leave")
    }
  },
  {
    stepValue: 850,
    offset: 250,
    dy: -30,
    type: "r",
    label: "r at 850",
    eventListeners: {
      onMouseEnter: () => console.log("Mouse Enter"),
      onMouseLeave: () => console.log("Mouse Leave")
    }
  }
];

const groupAnnotations = [
  { color: "#00a2ce", value: 50, type: "or", label: "OR at 50" },
  {
    type: "enclose",
    rp: "top",
    rd: 25,
    coordinates: [
      { color: "#b3331d", value: 80 },
      { color: "#b3331d", value: 85 }
    ],
    label: "enclose of 80 and 85"
  },
  { value: 15, offset: 250, dy: -30, type: "r", label: "r at 15" }
];

const dataTypeHash = {
  stacked: {
    data: funnelData,
    oAccessor: d => d.stepName,
    pieceStyle: d => ({ fill: d.funnelKey, stroke: "black" }),
    connectorType: d => d.funnelKey,
    connectorStyle: d => ({
      fill: d.source.funnelKey,
      stroke: d.source.funnelKey
    }),
    rAccessor: d => d.stepValue,
    summaryStyle: d => ({
      stroke: d.funnelKey,
      fill: d.funnelKey,
      fillOpacity: 0.5,
      strokeOpacity: 0.75
    }),
    annotations: exampleAnnotations
  },
  group: {
    data: groupData,
    oAccessor: d => d.color,
    pieceStyle: d => ({
      fill: d.color,
      fillOpacity: 0.5,
      stroke: d.color,
      strokeOpacity: 0
    }),
    connectorType: (d, i) => i,
    connectorStyle: d => ({
      fill: d.source.color,
      stroke: d.source.color,
      opacity: outsideHash[d.source.color] ? 0.1 : 1
    }),
    rAccessor: d => d.value,
    summaryStyle: d => ({
      stroke: d.color,
      fill: d.color,
      fillOpacity: 0.5,
      strokeOpacity: 0.75
    }),
    annotations: groupAnnotations
  },
  simple: {
    data: [2, 3, 5, 11, 16],
    oAccessor: undefined,
    pieceStyle: (d, i) => ({ fill: colors[i], stroke: "black" }),
    connectorType: (d, i) => i,
    connectorStyle: (d, i) => ({ fill: colors[i], stroke: "black" }),
    rAccessor: undefined,
    summaryStyle: () => ({
      stroke: "darkgray",
      fill: "black",
      fillOpacity: 0.5,
      strokeOpacity: 0.75
    }),
    annotations: []
  }
};

export default class ORFrameDocs extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      projection: "vertical",
      type: "bar",
      summaryType: "none",
      dynamicColumnWidth: "fixed",
      rAccessor: "relative",
      renderFn: "none",
      connector: "off",
      annotations: "off",
      oPadding: 50,
      dataType: "stacked",
      hoverBehavior: "general",
      example: "basic"
    };
  }

  render() {
    const typeOptions = [
      "bar",
      "clusterbar",
      "point",
      "swarm",
      "none"
    ].map(d => (
      <MenuItem key={"type-option" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));
    const projectionOptions = ["vertical", "horizontal", "radial"].map(d => (
      <MenuItem key={"projection-option" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));
    const cwOptions = ["fixed", "relative"].map(d => (
      <MenuItem key={"cw-option" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));
    const rAccessorOptions = ["relative", "fixed"].map(d => (
      <MenuItem key={"rAccessor-option" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));
    const renderFnOptions = ["none", "sketchy", "painty"].map(d => (
      <MenuItem key={"renderfn-option" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));
    const connectorOptions = ["off", "on"].map(d => (
      <MenuItem key={"connector-option" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));
    const annotationOptions = ["off", "on"].map(d => (
      <MenuItem key={"annotation-option" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));
    const oPaddingOptions = [50, 20, 5, 0].map(d => (
      <MenuItem key={"opadding-option" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));
    const dataTypeOptions = ["stacked", "group", "simple"].map(d => (
      <MenuItem key={"dataType-option" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));
    const hoverOptions = ["general", "piece", "none"].map(d => (
      <MenuItem key={"hover-option" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));
    const summaryOptions = [
      "none",
      "violin",
      "heatmap",
      "boxplot",
      "histogram",
      "contour",
      "joy"
    ].map(d => (
      <MenuItem key={"summary-option" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));
    const exampleOptions = ["basic", "nyc_temp"].map(d => (
      <MenuItem key={"example-option" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ));
    //    const barNumberOptions = [1, 2, 3, 4, 5, 20].map(d => <MenuItem key={'example-option' + d} label={d} value={d}>{d}</MenuItem>)
    const rAccessor =
      this.state.rAccessor === "fixed" ? () => 1 : d => d.stepValue || d.value;
    const reFn =
      this.state.renderFn === "none" ? undefined : () => this.state.renderFn;

    const buttons = [
      this.state.summaryType === "none" ? null : (
        <div key="button-0">
          <span>
            <SelectField
              floatingLabelText="Data Type"
              value={this.state.dataType}
              onChange={(e, i, value) => this.setState({ dataType: value })}
            >
              {dataTypeOptions}
            </SelectField>
          </span>
        </div>
      ),
      <div key="button-1">
        <span>
          <SelectField
            floatingLabelText="type"
            value={this.state.type}
            onChange={(e, i, value) => this.setState({ type: value })}
          >
            {typeOptions}
          </SelectField>
        </span>
      </div>,
      <div key="button-1-0">
        <span>
          <SelectField
            floatingLabelText="summaryType"
            value={this.state.summaryType}
            onChange={(e, i, value) => this.setState({ summaryType: value })}
          >
            {summaryOptions}
          </SelectField>
        </span>
      </div>,
      <div key="button-2">
        <span>
          <SelectField
            floatingLabelText="projection"
            value={this.state.projection}
            onChange={(e, i, value) => this.setState({ projection: value })}
          >
            {projectionOptions}
          </SelectField>
        </span>
      </div>,
      <div key="button-3">
        <span>
          <SelectField
            floatingLabelText="dynamicColumnWidth"
            value={this.state.dynamicColumnWidth}
            onChange={(e, i, value) =>
              this.setState({ dynamicColumnWidth: value })}
          >
            {cwOptions}
          </SelectField>
        </span>
      </div>,
      <div key="button-4">
        <span>
          <SelectField
            floatingLabelText="rAccessor"
            value={this.state.rAccessor}
            onChange={(e, i, value) => this.setState({ rAccessor: value })}
          >
            {rAccessorOptions}
          </SelectField>
        </span>
      </div>,
      <div key="button-5">
        <span>
          <SelectField
            floatingLabelText="renderMode"
            value={this.state.renderFn}
            onChange={(e, i, value) => this.setState({ renderFn: value })}
          >
            {renderFnOptions}
          </SelectField>
        </span>
      </div>,
      <div key="button-6">
        <span>
          <SelectField
            floatingLabelText="connector"
            value={this.state.connector}
            onChange={(e, i, value) => this.setState({ connector: value })}
          >
            {connectorOptions}
          </SelectField>
        </span>
      </div>,
      <div key="button-7">
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
      <div key="button-8">
        <span>
          <SelectField
            floatingLabelText="oPadding"
            value={this.state.oPadding}
            onChange={(e, i, value) => this.setState({ oPadding: value })}
          >
            {oPaddingOptions}
          </SelectField>
        </span>
      </div>,
      <div key="button-9">
        <span>
          <SelectField
            floatingLabelText="hoverBehavior"
            value={this.state.hoverBehavior}
            onChange={(e, i, value) => this.setState({ hoverBehavior: value })}
          >
            {hoverOptions}
          </SelectField>
        </span>
      </div>
    ];

    const axis = {
      orient: "left",
      tickFormat: d => d,
      label: {
        name: "axis label",
        position: { anchor: "middle" },
        locationDistance: 40
      }
    };

    const examples = [];
    examples.push({
      name: "Basic",
      demo: (
        <div>
          <RaisedButton
            primary
            label={"ORFrame API"}
            onTouchTap={() =>
              window.open(`https://github.com/emeeks/semiotic/wiki/orframe`)}
          />
          <ORFrame
            size={[700, 700]}
            renderFn={reFn}
            //              data={dataTypeHash[this.state.dataType].data.filter((d,i) => i < this.state.numberOfBars)}
            data={dataTypeHash[this.state.dataType].data}
            axis={axis}
            projection={this.state.projection}
            type={this.state.type === "none" ? undefined : this.state.type}
            renderMode={this.state.renderFn}
            summaryRenderMode={this.state.renderFn}
            connectorRenderMode={this.state.renderFn}
            summaryType={
              this.state.summaryType === "none" ? (
                undefined
              ) : (
                this.state.summaryType
              )
            }
            summaryStyle={dataTypeHash[this.state.dataType].summaryStyle}
            style={dataTypeHash[this.state.dataType].pieceStyle}
            oLabel={true}
            oPadding={parseInt(this.state.oPadding)}
            oAccessor={dataTypeHash[this.state.dataType].oAccessor}
            rAccessor={
              this.state.rAccessor === "fixed" ? (
                () => 1
              ) : (
                dataTypeHash[this.state.dataType].rAccessor
              )
            }
            connectorType={
              this.state.connector === "on" ? (
                dataTypeHash[this.state.dataType].connectorType
              ) : (
                undefined
              )
            }
            connectorStyle={dataTypeHash[this.state.dataType].connectorStyle}
            hoverAnnotation={this.state.hoverBehavior === "general"}
            pieceHoverAnnotation={this.state.hoverBehavior === "piece"}
            dynamicColumnWidth={
              this.state.dynamicColumnWidth === "fixed" ? (
                undefined
              ) : (
                d => sum(d.map(dataTypeHash[this.state.dataType].rAccessor))
              )
            }
            margin={{ left: 55, top: 50, bottom: 90, right: 55 }}
            annotations={
              this.state.annotations === "on" ? (
                dataTypeHash[this.state.dataType].annotations
              ) : (
                undefined
              )
            }
            download={true}
            downloadFields={["funnelKey"]}
          />
        </div>
      ),
      source: `
      import { ORFrame } from 'semiotic';

    const axis = {
      orient: "left",
      tickFormat: d => d,
      label: {
        name: "axis label",
        position: { anchor: "middle" },
        locationDistance: 40
      }
    }

    const data = ${JSON.stringify(
      dataTypeHash[this.state.dataType].data.filter((d, i) => i < 3)
    )}
    ${this.state.annotations === "off"
      ? ""
      : `const exampleAnnotations = ${JSON.stringify(
          dataTypeHash[this.state.dataType].annotations
        )}`}
        <ORFrame
            size={[ 700,700 ]}
            data={data}
            axis={axis}
            projection={'${this.state.projection}'}
            ${this.state.type !== "none" ? `type={'${this.state.type}'}` : ""}
            ${this.state.summaryType !== "none"
              ? `summaryType={'${this.state.summaryType}'}`
              : ""}
            ${reFn && this.state.type !== "none"
              ? `renderMode={ '${this.state.renderFn}'}`
              : ""}
            ${reFn && this.state.summaryType !== "none"
              ? `summaryRenderMode={ '${this.state.renderFn}'}`
              : ""}
            oLabel={true}
            oPadding={${this.state.oPadding}}
            oAccessor={d => d.stepName}
            ${this.state.dataType === "simple"
              ? ""
              : `rAccessor={${this.state.dataType === "stacked"
                  ? "'stepValue'"
                  : "'value'"}}`}
            ${this.state.connector === "off"
              ? ""
              : `connectorType={d => d.funnelKey}
            connectorStyle={d => {return { fill: d.source.funnelKey, stroke: d.source.funnelKey }}}`}
            style={d => {return { fill: d.funnelKey, stroke: 'black' }}}
            ${this.state.hoverBehavior === "none"
              ? ""
              : this.state.hoverBehavior === "piece"
                ? "pieceHoverAnnotation={true}"
                : "hoverAnnotation={true}"}
            ${this.state.dynamicColumnWidth === "fixed"
              ? ""
              : "dynamicColumnWidth={'stepValue'}"}
            margin={{ left: 55, top: 0, bottom: 50, right: 0 }}
            ${this.state.annotations === "off"
              ? ""
              : "annotations={exampleAnnotations}"}
        />
      `
    });

    return (
      <DocumentComponent
        name="ORFrame"
        api="https://github.com/emeeks/semiotic/wiki/ORFrame"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          The ORFrame lets you create scatterplots, line charts and area
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

ORFrameDocs.title = "ORFrame";
