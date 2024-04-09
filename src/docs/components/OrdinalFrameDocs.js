import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import { OrdinalFrame } from "../../components"
import { randomNormal } from "d3-random"
import { funnelData } from "../example_settings/orframe"
import { sum } from "d3-array"

// const monthHash = {}

const colors = ["#00a2ce", "#4d430c", "#b3331d", "#b6a756"]

const outsideHash = {}

// const glowyCanvas = (canvas, context, size) => {
//   const dataURL = canvas.toDataURL("image/png")
//   const baseImage = document.createElement("img")

//   baseImage.src = dataURL
//   baseImage.onload = () => {
//     context.clearRect(0, 0, size[0] + 120, size[1] + 120)
//     context.filter = "blur(10px)"
//     context.drawImage(baseImage, 0, 0)
//     context.filter = "blur(5px)"
//     context.drawImage(baseImage, 0, 0)
//     context.filter = "none"
//     context.drawImage(baseImage, 0, 0)
//   }
// }

const groupData = []
const nRando = randomNormal(50, 15)
for (let x = 1; x < 500; x++) {
  groupData.push({
    x: nRando(),
    value: Math.max(0, Math.min(100, Math.max(0, nRando()))),
    color: colors[x % 4],
    value2: x
  })
}

const customBar = {
  type: "clusterbar",
  customMark: (d, i, xy) => [
    <rect
      style={{ fill: d.funnelKey, stroke: "black" }}
      x={2}
      width={xy.width - 4}
      height={xy.height}
      key={`rect${i}`}
    />,
    <text
      style={{ fill: "white" }}
      transform={`translate(18,${xy.height}) rotate(-90)`}
      key={`text${i}`}
    >
      {d.stepName}
    </text>,
    <circle
      style={{ stroke: "white", fill: "#b3331d" }}
      r={xy.width / 2}
      cx={xy.width / 2}
      key={`circle-a-${i}`}
    />,
    <circle
      style={{ stroke: "white", fill: "#b3331d" }}
      r={xy.width / 2 - 2}
      cx={xy.width / 2}
      key={`circle-b-${i}`}
    />,
    <circle
      style={{ stroke: "white", fill: "#b3331d" }}
      r={xy.width / 2 - 4}
      cx={xy.width / 2}
      key={`circle-c-${i}`}
    />
  ]
}

//Just to give it a 100 and 0 values
groupData.push({ x: 0, value: 0, color: colors[3], value2: 503 })
groupData.push({ x: 100, value: 100, color: colors[3], value2: 504 })
groupData.push({ x: 100, value: 100, color: colors[0], value2: 504 })
groupData.push({ x: 100, value: 100, color: colors[1], value2: 504 })
groupData.push({ x: 100, value: 100, color: colors[2], value2: 504 })

const components = []
// Add your component proptype data here
// multiple component proptype documentation supported

components.push({
  name: "OrdinalFrame",
  proptypes: `
  `
})

const exampleAnnotations = [
  {
    stepName: "mop",
    stepValue: 550,
    type: "or",
    label: "OR at 550",
    eventListeners: {
      onMouseEnter: () => console.info("Mouse Enter"),
      onMouseLeave: () => console.info("Mouse Leave")
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
      onMouseEnter: () => console.info("Mouse Enter"),
      onMouseLeave: () => console.info("Mouse Leave")
    }
  },
  {
    stepValue: 850,
    offset: 250,
    dy: -30,
    type: "r",
    label: "r at 850",
    eventListeners: {
      onMouseEnter: () => console.info("Mouse Enter"),
      onMouseLeave: () => console.info("Mouse Leave")
    }
  }
]

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
]

const dataTypeHash = {
  stacked: {
    data: funnelData,
    oAccessor: (d) => d.stepName,
    pieceStyle: (d) => ({ fill: d.funnelKey, stroke: d.funnelKey }),
    connectorType: (d) => d.funnelKey,
    connectorStyle: (d) => ({
      fill: d.source.funnelKey,
      stroke: d.source.funnelKey
    }),
    rAccessor: (d) => d.stepValue,
    summaryStyle: (d) => ({
      stroke: d.funnelKey,
      fill: d.funnelKey,
      fillOpacity: 0.5,
      strokeOpacity: 0.75
    }),
    annotations: exampleAnnotations
  },
  group: {
    data: groupData,
    oAccessor: (d) => d.color,
    pieceStyle: (d) => ({
      fill: d.color,
      opacity: 1,
      stroke: d.color
    }),
    connectorType: (d, i) => i,
    connectorStyle: (d) => ({
      fill: d.source.color,
      stroke: d.source.color,
      opacity: outsideHash[d.source.color] ? 0.1 : 1
    }),
    rAccessor: (d) => d.value,
    summaryStyle: (d) => ({
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
}

export default class OrdinalFrameDocs extends React.Component {
  constructor(props) {
    super(props)
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
      example: "basic",
      oExtent: [],
      rExtent: []
    }
  }

  render() {
    const typeOptions = [
      "bar",
      "barpercent",
      "clusterbar",
      "point",
      "swarm",
      "custom",
      "none"
    ].map((d) => (
      <option key={`type-option${d}`} label={d} value={d}>
        {d}
      </option>
    ))
    const projectionOptions = ["vertical", "horizontal", "radial"].map((d) => (
      <option key={`projection-option${d}`} label={d} value={d}>
        {d}
      </option>
    ))
    const cwOptions = ["fixed", "relative"].map((d) => (
      <option key={`cw-option${d}`} label={d} value={d}>
        {d}
      </option>
    ))
    const rAccessorOptions = ["relative", "fixed"].map((d) => (
      <option key={`rAccessor-option${d}`} label={d} value={d}>
        {d}
      </option>
    ))
    const renderFnOptions = ["none", "sketchy", "painty"].map((d) => (
      <option key={`renderfn-option${d}`} label={d} value={d}>
        {d}
      </option>
    ))
    const connectorOptions = ["off", "on"].map((d) => (
      <option key={`connector-option${d}`} label={d} value={d}>
        {d}
      </option>
    ))
    const annotationOptions = ["off", "on"].map((d) => (
      <option key={`annotation-option${d}`} label={d} value={d}>
        {d}
      </option>
    ))
    const oPaddingOptions = [50, 20, 5, 0].map((d) => (
      <option key={`opadding-option${d}`} label={d} value={d}>
        {d}
      </option>
    ))
    const dataTypeOptions = ["stacked", "group", "simple"].map((d) => (
      <option key={`dataType-option${d}`} label={d} value={d}>
        {d}
      </option>
    ))
    const hoverOptions = ["general", "piece", "none"].map((d) => (
      <option key={`hover-option${d}`} label={d} value={d}>
        {d}
      </option>
    ))
    const summaryOptions = [
      "none",
      "violin",
      "heatmap",
      "boxplot",
      "histogram",
      "contour",
      "ridgeline"
    ].map((d) => (
      <option key={`summary-option${d}`} label={d} value={d}>
        {d}
      </option>
    ))
    // const exampleOptions = ["basic", "nyc_temp"].map(d => (
    //   <option key={`example-option${d}`} label={d} value={d}>
    //     {d}
    //   </option>
    // ))
    //    const barNumberOptions = [1, 2, 3, 4, 5, 20].map(d => <option key={'example-option' + d} label={d} value={d}>{d}</option>)
    // const rAccessor =
    //   this.state.rAccessor === "fixed" ? () => 1 : d => d.stepValue || d.value
    const reFn =
      this.state.renderFn === "none" ? undefined : () => this.state.renderFn

    const buttons = [
      <div key="button-0">
        <form>
          <label htmlFor="data-type-input">Data Type</label>
          <select
            value={this.state.dataType}
            onChange={(e) => this.setState({ dataType: e.target.value })}
          >
            {dataTypeOptions}
          </select>
        </form>
      </div>,
      <div key="button-1">
        <form>
          <label htmlFor="type-input">type</label>
          <select
            value={this.state.type}
            onChange={(e) => this.setState({ type: e.target.value })}
          >
            {typeOptions}
          </select>
        </form>
      </div>,
      <div key="button-1-0">
        <form>
          <label htmlFor="summary-type-input">summaryType</label>
          <select
            value={this.state.summaryType}
            onChange={(e) =>
              this.setState({ dataType: "group", summaryType: e.target.value })
            }
          >
            {summaryOptions}
          </select>
        </form>
      </div>,
      <div key="button-2">
        <form>
          <label htmlFor="projection-input">projection</label>
          <select
            value={this.state.projection}
            onChange={(e) => this.setState({ projection: e.target.value })}
          >
            {projectionOptions}
          </select>
        </form>
      </div>,
      <div key="button-3">
        <form>
          <label htmlFor="dynamic-column-width-input">dynamicColumnWidth</label>
          <select
            value={this.state.dynamicColumnWidth}
            onChange={(e) =>
              this.setState({ dynamicColumnWidth: e.target.value })
            }
          >
            {cwOptions}
          </select>
        </form>
      </div>,
      <div key="button-4">
        <form>
          <label htmlFor="r-accessor-input">rAccessor</label>
          <select
            value={this.state.rAccessor}
            onChange={(e) => this.setState({ rAccessor: e.target.value })}
          >
            {rAccessorOptions}
          </select>
        </form>
      </div>,
      <div key="button-5">
        <form>
          <label htmlFor="render-mode-input">renderMode</label>
          <select
            value={this.state.renderFn}
            onChange={(e) => this.setState({ renderFn: e.target.value })}
          >
            {renderFnOptions}
          </select>
        </form>
      </div>,
      <div key="button-6">
        <form>
          <label htmlFor="connector-input">connector</label>
          <select
            value={this.state.connector}
            onChange={(e) => this.setState({ connector: e.target.value })}
          >
            {connectorOptions}
          </select>
        </form>
      </div>,
      <div key="button-7">
        <form>
          <label htmlFor="annotations-input">annotations</label>
          <select
            value={this.state.annotations}
            onChange={(e) => this.setState({ annotations: e.target.value })}
          >
            {annotationOptions}
          </select>
        </form>
      </div>,
      <div key="button-8">
        <form>
          <label htmlFor="o-padding-input">oPadding</label>
          <select
            value={this.state.oPadding}
            onChange={(e) => this.setState({ oPadding: e.target.value })}
          >
            {oPaddingOptions}
          </select>
        </form>
      </div>,
      <div key="button-9">
        <form>
          <label htmlFor="hover-behavior-input">hoverBehavior</label>
          <select
            value={this.state.hoverBehavior}
            onChange={(e) => this.setState({ hoverBehavior: e.target.value })}
          >
            {hoverOptions}
          </select>
        </form>
      </div>
    ]

    // const axis = {
    //   orient: "top",
    //   tickFormat: d => d,
    //   label: {
    //     name: "axis label",
    //     position: { anchor: "middle" },
    //     locationDistance: 40
    //   }
    // }

    const actualType =
      this.state.type === "custom" ? customBar : this.state.type

    const examples = []
    examples.push({
      name: "Basic",
      demo: (
        <div>
          <button color="primary">OrdinalFrame API</button>
          <p>O Extent Values: {this.state.oExtent.join(", ")}</p>
          <p>R Extent Values: {this.state.rExtent.join(", ")}</p>
          <OrdinalFrame
            size={[700, 700]}
            data={dataTypeHash[this.state.dataType].data}
            axes={{ orient: "left", baseline: "under" }}
            projection={this.state.projection}
            type={actualType}
            renderMode={
              (this.state.renderFn !== "none" && this.state.renderFn) ||
              undefined
            }
            summaryRenderMode={
              (this.state.renderFn !== "none" && this.state.renderFn) ||
              undefined
            }
            connectorRenderMode={
              (this.state.renderFn !== "none" && this.state.renderFn) ||
              undefined
            }
            summaryType={
              this.state.summaryType === "none"
                ? undefined
                : this.state.summaryType
            }
            rExtent={{
              onChange: (d) => {
                this.setState({ rExtent: d })
              }
            }}
            oExtent={{
              onChange: (d) => {
                this.setState({ oExtent: d })
              }
            }}
            summaryStyle={dataTypeHash[this.state.dataType].summaryStyle}
            style={dataTypeHash[this.state.dataType].pieceStyle}
            oLabel={true}
            oPadding={parseInt(this.state.oPadding)}
            oAccessor={dataTypeHash[this.state.dataType].oAccessor}
            rAccessor={
              this.state.rAccessor === "fixed"
                ? () => 1
                : dataTypeHash[this.state.dataType].rAccessor
            }
            connectorType={
              this.state.connector === "on"
                ? dataTypeHash[this.state.dataType].connectorType
                : undefined
            }
            connectorStyle={dataTypeHash[this.state.dataType].connectorStyle}
            hoverAnnotation={this.state.hoverBehavior === "general"}
            pieceHoverAnnotation={this.state.hoverBehavior === "piece"}
            dynamicColumnWidth={
              this.state.dynamicColumnWidth === "fixed"
                ? undefined
                : (d) => sum(d.map(dataTypeHash[this.state.dataType].rAccessor))
            }
            //            margin={{ left: 55, top: 50, bottom: 90, right: 55 }}
            annotations={
              this.state.annotations === "on"
                ? dataTypeHash[this.state.dataType].annotations
                : undefined
            }
            baseMarkProps={{ transitionDuration: 3000 }}
            canvasSummaries={true}
          />
        </div>
      ),
      source: `
      import { OrdinalFrame } from 'semiotic';

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
    ${
      this.state.annotations === "off"
        ? ""
        : `const exampleAnnotations = ${JSON.stringify(
            dataTypeHash[this.state.dataType].annotations
          )}`
    }
        <OrdinalFrame
            size={[ 700,700 ]}
            data={data}
            axes={axis}
            rExtent={{
              onChange: d => {
                this.setState({ rExtent: d })
              }
            }}
            oExtent={{
              onChange: d => {
                this.setState({ oExtent: d })
              }
            }}
            projection={'${this.state.projection}'}
            ${
              this.state.type !== "none"
                ? this.state.type !== "custom"
                  ? `type={'${this.state.type}'}`
                  : `type={{
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
            }}`
                : ""
            }
            ${
              this.state.summaryType !== "none"
                ? `summaryType={'${this.state.summaryType}'}`
                : ""
            }
            ${
              reFn && this.state.type !== "none"
                ? `renderMode={ '${this.state.renderFn}'}`
                : ""
            }
            ${
              reFn && this.state.summaryType !== "none"
                ? `summaryRenderMode={ '${this.state.renderFn}'}`
                : ""
            }
            oLabel={true}
            oPadding={${this.state.oPadding}}
            oAccessor={d => d.stepName}
            ${
              this.state.dataType === "simple"
                ? ""
                : `rAccessor={${
                    this.state.dataType === "stacked"
                      ? "'stepValue'"
                      : "'value'"
                  }}`
            }
            ${
              this.state.connector === "off"
                ? ""
                : `connectorType={d => d.funnelKey}
            connectorStyle={d => {return { fill: d.source.funnelKey, stroke: d.source.funnelKey }}}`
            }
            style={d => {return { fill: d.funnelKey, stroke: 'black' }}}
            ${
              this.state.hoverBehavior === "none"
                ? ""
                : this.state.hoverBehavior === "piece"
                ? "pieceHoverAnnotation={true}"
                : "hoverAnnotation={true}"
            }
            ${
              this.state.dynamicColumnWidth === "fixed"
                ? ""
                : "dynamicColumnWidth={'stepValue'}"
            }
            margin={{ left: 55, top: 0, bottom: 50, right: 0 }}
            ${
              this.state.annotations === "off"
                ? ""
                : "annotations={exampleAnnotations}"
            }
        />
      `
    })

    return (
      <DocumentComponent
        name="OrdinalFrame"
        api="https://github.com/emeeks/semiotic/wiki/OrdinalFrame"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          The OrdinalFrame lets you create bar charts, pie charts and
          distribution visualizations like violin plots and heatmaps. It's
          called 'Ordinal' because you're looking at data split into discrete
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
    )
  }
}

OrdinalFrameDocs.title = "OrdinalFrame"
