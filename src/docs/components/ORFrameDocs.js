import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import { ORFrame } from "../../components";
import { randomNormal } from "d3-random";
import { funnelData } from "../example_settings/orframe";
import Button from "material-ui/Button";
import { sum } from "d3-array";
import Select from "material-ui/Select";
import { MenuItem } from "material-ui/Menu";
import Icon from "material-ui-icons/Sort";
import Input, { InputLabel } from "material-ui/Input";
import { FormControl, FormHelperText } from "material-ui/Form";

const monthHash = {};

const colors = ["#00a2ce", "#4d430c", "#b3331d", "#b6a756"];

const outsideHash = {};

const groupData = [];
const nRando = randomNormal(50, 15);
for (let x = 1; x < 500; x++) {
  groupData.push({
    x: nRando(),
    value: Math.max(0, Math.min(100, Math.max(0, nRando()))),
    color: colors[x % 4],
    value2: x
  });
}

const customBar = {
  type: "clusterbar",
  customMark: (d, i, xy) => [
    <rect
      style={{ fill: "#00a2ce" }}
      x={2}
      width={xy.width - 4}
      height={xy.height}
    />,
    <text
      style={{ fill: "white" }}
      transform={`translate(18,${xy.height}) rotate(-90)`}
    >
      {d.stepName}
    </text>,
    <circle
      style={{ stroke: "white", fill: "#b3331d" }}
      r={xy.width / 2}
      cx={xy.width / 2}
    />,
    <circle
      style={{ stroke: "white", fill: "#b3331d" }}
      r={xy.width / 2 - 2}
      cx={xy.width / 2}
    />,
    <circle
      style={{ stroke: "white", fill: "#b3331d" }}
      r={xy.width / 2 - 4}
      cx={xy.width / 2}
    />
  ]
};

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
      opacity: 1,
      stroke: d.color
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
      oPadding: "20",
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
      "custom",
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
      <div key="button-0">
        <FormControl>
          <InputLabel htmlFor="data-type-input">Data Type</InputLabel>
          <Select
            value={this.state.dataType}
            onChange={e => this.setState({ dataType: e.target.value })}
          >
            {dataTypeOptions}
          </Select>
        </FormControl>
      </div>,
      <div key="button-1">
        <FormControl>
          <InputLabel htmlFor="type-input">type</InputLabel>
          <Select
            value={this.state.type}
            onChange={e => this.setState({ type: e.target.value })}
          >
            {typeOptions}
          </Select>
        </FormControl>
      </div>,
      <div key="button-1-0">
        <FormControl>
          <InputLabel htmlFor="summary-type-input">summaryType</InputLabel>
          <Select
            value={this.state.summaryType}
            onChange={e =>
              this.setState({ dataType: "group", summaryType: e.target.value })}
          >
            {summaryOptions}
          </Select>
        </FormControl>
      </div>,
      <div key="button-2">
        <FormControl>
          <InputLabel htmlFor="projection-input">projection</InputLabel>
          <Select
            value={this.state.projection}
            onChange={e => this.setState({ projection: e.target.value })}
          >
            {projectionOptions}
          </Select>
        </FormControl>
      </div>,
      <div key="button-3">
        <FormControl>
          <InputLabel htmlFor="dynamic-column-width-input">
            dynamicColumnWidth
          </InputLabel>
          <Select
            value={this.state.dynamicColumnWidth}
            onChange={e =>
              this.setState({ dynamicColumnWidth: e.target.value })}
          >
            {cwOptions}
          </Select>
        </FormControl>
      </div>,
      <div key="button-4">
        <FormControl>
          <InputLabel htmlFor="r-accessor-input">rAccessor</InputLabel>
          <Select
            value={this.state.rAccessor}
            onChange={e => this.setState({ rAccessor: e.target.value })}
          >
            {rAccessorOptions}
          </Select>
        </FormControl>
      </div>,
      <div key="button-5">
        <FormControl>
          <InputLabel htmlFor="render-mode-input">renderMode</InputLabel>
          <Select
            value={this.state.renderFn}
            onChange={e => this.setState({ renderFn: e.target.value })}
          >
            {renderFnOptions}
          </Select>
        </FormControl>
      </div>,
      <div key="button-6">
        <FormControl>
          <InputLabel htmlFor="connector-input">connector</InputLabel>
          <Select
            value={this.state.connector}
            onChange={e => this.setState({ connector: e.target.value })}
          >
            {connectorOptions}
          </Select>
        </FormControl>
      </div>,
      <div key="button-7">
        <FormControl>
          <InputLabel htmlFor="annotations-input">annotations</InputLabel>
          <Select
            value={this.state.annotations}
            onChange={e => this.setState({ annotations: e.target.value })}
          >
            {annotationOptions}
          </Select>
        </FormControl>
      </div>,
      <div key="button-8">
        <FormControl>
          <InputLabel htmlFor="o-padding-input">oPadding</InputLabel>
          <Select
            value={this.state.oPadding}
            onChange={e => this.setState({ oPadding: e.target.value })}
          >
            {oPaddingOptions}
          </Select>
        </FormControl>
      </div>,
      <div key="button-9">
        <FormControl>
          <InputLabel htmlFor="hover-behavior-input">hoverBehavior</InputLabel>
          <Select
            floatingLabelText="hoverBehavior"
            value={this.state.hoverBehavior}
            onChange={e => this.setState({ hoverBehavior: e.target.value })}
          >
            {hoverOptions}
          </Select>
        </FormControl>
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

    const actualType =
      this.state.type === "custom" ? customBar : this.state.type;

    const examples = [];
    examples.push({
      name: "Basic",
      demo: (
        <div>
          <Button
            color="primary"
            raised
            onTouchTap={() =>
              window.open(`https://github.com/emeeks/semiotic/wiki/orframe`)}
          >
            ORFrame API
          </Button>
          <ORFrame
            size={[700, 700]}
            renderFn={reFn}
            data={dataTypeHash[this.state.dataType].data}
            axis={axis}
            projection={this.state.projection}
            type={actualType}
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
            rExtent={[0]}
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
            download={false}
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
            ${this.state.type !== "none"
              ? this.state.type !== "custom"
                ? `type={'${this.state.type}'}`
                : `{
              type: "clusterbar",
              customMark: (d, i, xy) => [
                <rect
                  style={{ fill: "#00a2ce" }}
                  x={2}
                  width={xy.width - 4}
                  height={xy.height}
                />,
                <text
                  style={{ fill: "white" }}
                  transform={${"`translate(18,${xy.height}) rotate(-90)`"}}
                >
                  {d.stepName}
                </text>,
                <circle
                  style={{ stroke: "white", fill: "#b3331d" }}
                  r={xy.width / 2}
                  cx={xy.width / 2}
                />,
                <circle
                  style={{ stroke: "white", fill: "#b3331d" }}
                  r={xy.width / 2 - 2}
                  cx={xy.width / 2}
                />,
                <circle
                  style={{ stroke: "white", fill: "#b3331d" }}
                  r={xy.width / 2 - 4}
                  cx={xy.width / 2}
                />
              ]
            }`
              : ""}
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
          The ORFrame lets you create bar charts, pie charts and distribution
          visualizations like violin plots and heatmaps. The 'O' and 'R' stand
          for Ordinal and Range data, meaning you have data split into discrete
          ordered categories (your rows or columns) that you're measuring the
          difference between.
        </p>
        <p>
          Adjust the settings to see the code necessary to deploy that chart.
          For instance change summaryType to "violin" to see violin plots.
        </p>

        <p>
          Data are sent as an array of objects to the data property with summary
          types and connector rules determining whether summaries and connectors
          are drawn.
        </p>
      </DocumentComponent>
    );
  }
}

ORFrameDocs.title = "ORFrame";
ORFrameDocs.icon = <Icon />;
