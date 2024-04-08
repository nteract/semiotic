import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import Mark from "../../components/Mark/Mark"

import { XYFrame, ResponsiveXYFrame, MinimapXYFrame } from "../../components"
import {
  curveBasis,
  curveCardinal,
  curveCatmullRom,
  curveLinear,
  curveNatural,
  curveMonotoneX,
  curveStep
} from "d3-shape"
import { randomNormal } from "d3-random"
import { scaleLinear, scalePow } from "d3-scale"
import AnnotationCalloutElbow from "react-annotation/lib/Types/AnnotationCalloutElbow"
import AnnotationBadge from "react-annotation/lib/Types/AnnotationBadge"

import { testData } from "../example_settings/xyframe"

class NameForm extends React.Component {
  constructor(props) {
    super(props)
    this.state = { value: "", type: "x" }
    this.handleChange = this.handleChange.bind(this)
    this.changeType = this.changeType.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleChange(event) {
    this.setState({ value: event.target.value })
  }

  changeType(event) {
    this.setState({ type: event.target.value })
  }

  handleSubmit(event) {
    const { dataPoint, updateAnnotations } = this.props
    const { type, value } = this.state
    event.preventDefault()
    updateAnnotations(
      Object.assign({}, dataPoint, {
        type: type,
        label: value
      })
    )
  }

  render() {
    const { dataPoint } = this.props
    const { value, type } = this.state
    return (
      <form style={{ background: "#DDDDDD" }} onSubmit={this.handleSubmit}>
        <p>
          {dataPoint.x},{dataPoint.y}
        </p>
        <p>Name:</p>
        <input type="text" value={value} onChange={this.handleChange} />
        <select value={type} onChange={this.changeType}>
          <option label="x" value="x">
            X
          </option>
          <option label="y" value="y">
            Y
          </option>
          <option label="xy" value="xy">
            XY
          </option>
        </select>
        <input type="submit" value="Submit" />
      </form>
    )
  }
}

function removeEmptyLines(strings, ...values) {
  return strings
    .map((d, i) => {
      const value = values[i]
      let string = d
      if (value === "") {
        const stringParts = d.split(/\r?\n/)
        string = stringParts
          .filter((d, i) => i !== stringParts.length - 1)
          .join("\n")
      } else if (value) {
        string = `${string}${value}`
      }
      return string
    })
    .join("")
}

const components = []
// Add your component proptype data here
// multiple component proptype documentation supported

const badColors = scaleLinear()
  .domain([0.00005, 0.001, 0.01])
  .range(["#00a2ce", "#4d430c", "#b3331d"])

const curveHash = {
  none: undefined,
  curveBasis,
  curveCardinal,
  curveCatmullRom,
  curveLinear,
  curveNatural,
  curveMonotoneX,
  curveStep
}

const axesLabelHash = {
  basic: `[
    { orient: 'left', tickFormat: d => d },
    { orient: 'bottom', tickFormat: d => d }
      ]`,
  labeled: `[
  { orient: 'right', tickFormat: d => d, label: {
        name: "right label",
        position: { anchor: "middle" },
        locationDistance: 20
      }
  },
  { orient: 'top', tickFormat: d => d, label: {
        name: "top label",
        position: { anchor: "middle" },
        locationDistance: 20
      }
  },
  { orient: 'left', tickFormat: d => d, label: {
        name: "left label",
        position: { anchor: "middle" },
        locationDistance: 20
      }
  },
  { orient: 'bottom', tickFormat: d => d, label: {
        name: "bottom label",
        position: { anchor: "middle" },
        locationDistance: 20
      }
  }
]`,
  hover: `[
  { orient: 'left', tickFormat: d => d,
    glyphFunction:  ({ lineWidth, value }) => <g>
        <path d='M10,0L-15,-15L-15,15L10,0' style={{ fill: '#00a2ce' }} />
        <line x1={lineWidth} style={{ stroke: '#00a2ce', strokeWidth: '2px', strokeDasharray: '5 5' }} />
        <text x={-12} y={3} style={{ fill: 'white', fontSize: '8px' }} >{Math.ceil(value * 10) / 10}</text>
    </g>,
    axisAnnotationFunction: d => this.setState({ axisAnnotation: { type: d.type, [d.type]: d.value, label: 'clicked annotation' } })
  }
]`
}

const axesHash = {
  none: undefined,
  basic: [
    { orient: "left", tickFormat: (d) => d },
    { orient: "bottom", tickFormat: (d) => d, footer: true },
    {
      orient: "bottom",
      tickLineGenerator: ({ xy }) => (
        <line
          key={`line-${xy.y1}-${xy.x1}`}
          x1={xy.x1}
          x2={xy.x2}
          y1={xy.y1}
          y2={xy.y2}
          style={{
            strokeDasharray: "5 5",
            stroke: "green",
            strokeOpacity: 0.5
          }}
        />
      )
    },
    { orient: "bottom", tickSize: 10 }
  ],
  labeled: [
    {
      orient: "right",
      tickFormat: (d) => d,
      label: {
        name: "right label",
        position: { anchor: "middle" }
      }
    },
    {
      orient: "top",
      tickFormat: (d) => d,
      label: {
        name: "top label",
        position: { anchor: "middle" }
      }
    },
    {
      orient: "left",
      tickFormat: (d) => d,
      label: {
        name: "left label",
        position: { anchor: "middle" }
      }
    },
    {
      orient: "bottom",
      tickFormat: (d) => d,
      label: {
        name: "bottom label",
        position: { anchor: "middle" }
      }
    }
  ],
  hover: [
    {
      orient: "bottom",
      tickFormat: (d) => d,
      axisAnnotationFunction: undefined
    },
    {
      orient: "left",
      tickFormat: (d) => d,
      axisAnnotationFunction: undefined
    }
  ]
}

const canvasRenderHash = {
  none: undefined,
  some: (d, i) => i % 2 === 0,
  all: () => true
}

const canvasRenderLabelHash = {
  some: `(d, i) => i > 1`,
  all: `() => true`
}

const canvasRenderNameHash = {
  line: "canvasLines",
  summary: "canvasSummaries",
  points: "canvasPoints"
}

const frameHash = {
  XYFrame,
  ResponsiveXYFrame,
  MinimapXYFrame
}

const fixedExtentHash = {
  none: undefined,
  partial: [undefined, 500],
  full: [200, 500]
}

const fixedExtentLabelHash = {
  partial: "[ undefined, 5 ]",
  full: "[ 2, 5 ]"
}

const customPointHash = {
  none: undefined,
  basic: <Mark markType="rect" x={-4} y={-4} width={8} height={8} />,
  variable: ({ d }) => {
    return d.step < 20 ? (
      <Mark markType="circle" r="5" />
    ) : (
      <Mark markType="rect" x={-4} y={-4} width={8} height={8} />
    )
  }
}

const customPointLabelHash = {
  variable: `({ i }) => i%2 ? <Mark markType='circle' r='5' /> : <Mark markType='rect' x={-4} y={-4} width={8} height={8} />`
}

const summaryStyleHash = {
  basic: () => ({ fill: "#b6a756", stroke: "black", strokeWidth: "1px" }),
  contours: (d) => ({
    fill: badColors(d.value),
    stroke: "black",
    strokeWidth: "1px",
    fillOpacity: 0.5
  })
}

const summaryTypeHash = {
  basic: undefined,
  contours: { type: "contour" }
}

const titleTypesHash = {
  none: undefined,
  simple: "A Simple Title",
  jsx: (
    <g>
      <circle
        r={10}
        cx={-80}
        style={{
          stroke: "#4d430c",
          fill: "#b6a756",
          strokeDasharray: "5 5",
          strokeWidth: 4
        }}
      />
      <circle
        r={10}
        cx={80}
        style={{
          stroke: "#4d430c",
          fill: "#b6a756",
          strokeDasharray: "5 5",
          strokeWidth: 4
        }}
      />
      <text style={{ textAnchor: "middle", fontSize: "24px", fontWeight: 900 }}>
        A JSX Title
      </text>
    </g>
  )
}

const titleTypeLabelHash = {
  none: "",
  simple: `title={'A Simple Title'}`,
  jsx: `title={<g transform='translate(375,50)'>
    <circle r={10} cx={-80} style={{ stroke: '#4d430c', fill: '#b6a756', strokeDasharray: '5 5', strokeWidth: 4 }} />
    <circle r={10} cx={80} style={{ stroke: '#4d430c', fill: '#b6a756', strokeDasharray: '5 5', strokeWidth: 4 }} />
    <text style={{ fontSize: '24px', fontWeight: 900 }}>A JSX Title</text>
    </g>}`
}

components.push({
  name: "XYFrame",
  proptypes: `
  `
})

let displayData = testData.map((d) => {
  const moreData = [
    ...d.data,
    ...d.data.map((p) => ({ py: p.py + Math.random() * 1000, px: p.px + 7 }))
  ]
  return Object.assign(d, { data: moreData })
})

const exampleAnnotations = [
  {
    className: "annotation-class-1",
    px: 4,
    py: 300,
    dx: -30,
    dy: 0,
    type: "react-annotation",
    note: { title: "Note at 4,300" }
  },
  {
    className: "annotation-class-2",
    px: 5,
    py: 1000,
    dx: -30,
    dy: 0,
    type: "react-annotation",
    note: { title: "Note at 5,1000" }
  },
  {
    px: 7,
    id: "linedata-1",
    dx: 30,
    dy: -50,
    type: AnnotationCalloutElbow,
    note: { title: "linedata-1 at 7" }
  },
  {
    px: 10,
    id: "linedata-2",
    dx: 30,
    dy: -50,
    type: AnnotationCalloutElbow,
    note: { title: "linedata-2 at 10" }
  },
  {
    px: 12,
    id: "linedata-3",
    dx: 30,
    dy: -50,
    type: AnnotationCalloutElbow,
    note: { title: "linedata-3 at 12" }
  }
]

const summaryTestData = [
  {
    id: "shape1",
    coordinates: [
      { px: 100, py: 100 },
      { px: 500, py: 100 },
      { px: 500, py: 500 },
      { px: 100, py: 500 }
    ]
  },
  {
    id: "shape2",
    coordinates: [
      { px: 800, py: 800 },
      { px: 600, py: 1700 },
      { px: 1500, py: 1600 }
    ]
  }
]

const pointTestData = []
const nRando = randomNormal(0, 1000)
const pRando = randomNormal(0, 1000)

for (let x = 1; x < 100; x++) {
  pointTestData.push({
    px: nRando() * 2 - 4000,
    py: 2000 + nRando(),
    step: pointTestData.length,
    cat: "#00a2ce"
  })
}
for (let x = 1; x < 100; x++) {
  pointTestData.push({
    px: 2000 + pRando(),
    py: 2000 + pRando() * 2,
    step: pointTestData.length,
    cat: "#4d430c"
  })
}
for (let x = 1; x < 100; x++) {
  pointTestData.push({
    px: pRando() - 2000,
    py: pRando() * 2 - 2000,
    step: pointTestData.length,
    cat: "#b3331d"
  })
}

for (let x = 1; x < 100; x++) {
  pointTestData.push({
    px: pRando() + 2000,
    py: pRando() * 2 - 4000,
    step: pointTestData.length,
    cat: "#b6a756"
  })
}

const pointAnnotations = pointTestData
  .filter((d, i) => i % 20 === 0)
  .map((d, i) =>
    Object.assign(
      {
        color: d.cat,
        dx: 30,
        dy: -50,
        type: AnnotationCalloutElbow,
        note: { title: `Note ${i + 1}` }
      },
      d
    )
  )

const contoursummaryData = [{ id: "#00a2ce", coordinates: pointTestData }]

const summaryDataHash = {
  basic: summaryTestData,
  contours: contoursummaryData
}

const annotationSettingTypes = {
  empty: undefined,
  plainBump: { layout: "bump" },
  bumpOptions: {
    layout: "bump",
    pointSizeFunction: () => 15,
    labelSizeFunction: (noteData) => {
      return [(noteData.note.title || noteData.note.label).length * 6, 30]
    }
  },
  plainMarginalia: { layout: "marginalia" },
  marginaliaLeft: {
    layout: { type: "marginalia", orient: "left" }
  },
  marginaliaNearest: {
    layout: { type: "marginalia", orient: "nearest" }
  }
}

const annotationSettingLabels = (setting) => {
  const hash = {
    empty: "",
    plainBump: '{ layout: "bump" }',
    bumpOptions: `{
        layout: "bump",
        pointSizeFunction: () => 15,
        labelSizeFunction: noteData => {
            return (noteData.note.title || noteData.note.label).length * 6
        }
    }`,
    plainMarginalia: '{ layout: "marginalia" }',
    marginaliaLeft: `{
                layout: { type: "marginalia", orient: "left" }
            }`,
    marginaliaNearest: `{
                layout: { type: "marginalia", orient: "nearest" }
            }`
  }
  return hash[setting] === "" ? "" : `annotationSettings={${hash[setting]}}`
}

const annotationSettingOptions = Object.keys(annotationSettingTypes).map(
  (d) => (
    <option key={d} label={d} value={d}>
      {d}
    </option>
  )
)

export default class XYFrameDocs extends React.Component {
  constructor(props) {
    super(props)
    this.updateDateRange = this.updateDateRange.bind(this)
    this.customHTMLRules = this.customHTMLRules.bind(this)
    this.updateAnnotations = this.updateAnnotations.bind(this)

    this.state = {
      lineType: "none",
      annotations: "off",
      curve: "none",
      margin: "object",
      axes: "basic",
      renderMode: "none",
      defined: "active",
      hoverAnnotation: "off",
      canvasRender: "none",
      frame: "XYFrame",
      fixedExtent: "none",
      matte: "off",
      dataType: "line",
      customPoint: "none",
      summaryType: "basic",
      lineExtent: [1, 8],
      pointExtent: [
        [-1000, 1000],
        [1000, -1000]
      ],
      summaryExtent: [
        [-1000, 1000],
        [1000, -1000]
      ],
      showPoints: "off",
      annotationSettings: "empty",
      axisAnnotatable: "off",
      axisAnnotation: {
        type: "y",
        py: 0,
        label: "click on axis to add an annotation"
      },
      clickAnnotation: undefined,
      backgroundGraphics: "off",
      foregroundGraphics: "off",
      customScale: "none",
      legend: "off",
      title: "none",
      yAccessor: "py"
    }

    //In constructor to get access to this
    axesHash.hover[0].axisAnnotationFunction = (d) =>
      this.setState({
        axisAnnotation: {
          type: d.type,
          [d.type === "x" ? "px" : "py"]: d.value,
          label: "clicked annotation"
        }
      })
    axesHash.hover[1].axisAnnotationFunction = (d) =>
      this.setState({
        axisAnnotation: {
          type: d.type,
          [d.type === "x" ? "px" : "py"]: d.value,
          label: "clicked annotation"
        }
      })
  }

  updateDateRange(dataType, e) {
    this.setState({ [`${dataType}Extent`]: e })
  }

  updateAnnotations(newAnnotation) {
    this.setState({ clickAnnotation: newAnnotation })
  }

  customHTMLRules({ screenCoordinates, d }) {
    if (d.type === "form") {
      return (
        <div
          style={{
            pointerEvents: "all",
            position: "absolute",
            left: screenCoordinates[0],
            top: screenCoordinates[1]
          }}
        >
          <NameForm updateAnnotations={this.updateAnnotations} dataPoint={d} />
        </div>
      )
    }
    //If you don't return null, it will suppress the rest of your HTML rules
    return null
  }

  render() {
    const dataTypeOptions = ["line", "point", "summary"].map((d) => (
      <option key={`data-type-option-${d}`} value={d}>
        {d}
      </option>
    ))

    const marginHash = {
      none: undefined,
      number: 10,
      object: {
        top: 60,
        bottom: 65,
        left: 60,
        right: this.state.legend === "on" ? 120 : 20
      }
    }

    const options = [
      "none",
      "line",
      "linepercent",
      "cumulative",
      "difference",
      "stackedarea",
      "stackedpercent",
      "bumpline",
      "bumparea"
    ].map((d) => (
      <option key={`line-option-${d}`} value={d}>
        {d}
      </option>
    ))

    const renderOptions = ["none", "sketchy", "painty"].map((d) => (
      <option key={`render-option-${d}`} value={d}>
        {d}
      </option>
    ))

    const definedOptions = ["active", "inactive"].map((d) => (
      <option key={`defined-option-${d}`} value={d}>
        {d}
      </option>
    ))

    const hoverAnnotationOptions = ["off", "on"].map((d) => (
      <option key={`hover-annotation-option-${d}`} value={d}>
        {d}
      </option>
    ))

    const matteOptions = ["off", "on"].map((d) => (
      <option key={`matte-option-${d}`} value={d}>
        {d}
      </option>
    ))

    const annotationOptions = ["off", "on"].map((d) => (
      <option key={`annotation-option-${d}`} value={d}>
        {d}
      </option>
    ))

    const showPointOptions = ["off", "on"].map((d) => (
      <option key={`show-point-option-${d}`} value={d}>
        {d}
      </option>
    ))

    const axisAnnotationableOptions = ["off", "on"].map((d) => (
      <option key={`axis-annotatable-option-${d}`} value={d}>
        {d}
      </option>
    ))

    const foregroundGraphicsOptions = ["off", "on"].map((d) => (
      <option key={`foreground-option-${d}`} value={d}>
        {d}
      </option>
    ))

    const backgroundGraphicsOptions = ["off", "on"].map((d) => (
      <option key={`background-option-${d}`} value={d}>
        {d}
      </option>
    ))

    const legendOptions = ["off", "on"].map((d) => (
      <option key={`legend-option-${d}`} value={d}>
        {d}
      </option>
    ))

    const customScaleOptions = ["none", "pow"].map((d) => (
      <option key={`customScale-option-${d}`} value={d}>
        {d}
      </option>
    ))

    const fixedExtentOptions = ["none", "partial", "full"].map((d) => (
      <option key={`fixed-extent-annotation-option-${d}`} value={d}>
        {d}
      </option>
    ))

    const customPointOptions = ["none", "basic", "variable"].map((d) => (
      <option key={`custom-point-option-${d}`} value={d}>
        {d}
      </option>
    ))

    const summaryTypeOptions = ["basic", "contours"].map((d) => (
      <option key={`summary-type-option-${d}`} value={d}>
        {d}
      </option>
    ))

    const titleOptions = Object.keys(titleTypesHash).map((d) => (
      <option key={`title-option-${d}`} value={d}>
        {d}
      </option>
    ))

    const canvasRenderOptions = Object.keys(canvasRenderHash).map((d) => (
      <option key={`canvas-render-annotation-option-${d}`} value={d}>
        {d}
      </option>
    ))

    const curveOptions = Object.keys(curveHash).map((d) => (
      <option key={`curve-option-${d}`} value={d}>
        {d}
      </option>
    ))

    const marginOptions = Object.keys(marginHash).map((d) => (
      <option key={`margin-option-${d}`} value={d}>
        {d}
      </option>
    ))

    const axesOptions = Object.keys(axesHash).map((d) => (
      <option key={`axes-option-${d}`} value={d}>
        {d}
      </option>
    ))

    const frameOptions = Object.keys(frameHash).map((d) => (
      <option key={`frame-option-${d}`} value={d}>
        {d}
      </option>
    ))

    if (
      this.state.lineType === "difference" ||
      this.state.lineType === "line"
    ) {
      displayData = testData.filter((d, i) => i > 1)
    }

    const ReactFrame = frameHash[this.state.frame]

    const annotationSource = removeEmptyLines`annotations={exampleAnnotations}
    ${annotationSettingLabels(this.state.annotationSettings)}`

    const linesSource = removeEmptyLines`lines={displayData}
      lineDataAccessor={${
        this.state.frame === "MinimapXYFrame"
          ? "d => d.data.filter(p => p.px >= this.state.extent[0] && p.px <= this.state.extent[1])"
          : '"data"'
      }}
      lineStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color, strokeWidth: '3px' })}
      ${
        this.state.lineType === "none"
          ? ""
          : `lineType={{ type: "${this.state.lineType}"${
              this.state.curve === "none"
                ? ""
                : `, interpolator: ${this.state.curve}`
            } }}`
      }
      ${
        this.state.renderMode === "none"
          ? ""
          : `lineRenderMode={() => "${this.state.renderMode}"}`
      }
      ${this.state.defined === "inactive" ? "" : "defined={d => d.py !== 0}"}
      ${this.state.showPoints === "on" ? "showLinePoints={true}" : ""}`

    const summariesSource = removeEmptyLines`summaries={summaryData}
      summaryStyle={() => ({ fill: 'purple', stroke: 'red', strokeWidth: '1px' })}
      ${this.state.showPoints === "on" ? "showLinePoints={true}" : ""}
      ${
        this.state.renderMode === "none"
          ? ""
          : `summaryRenderMode={() => "${this.state.renderMode}"}`
      }`

    const pointsSource = removeEmptyLines`points={testData}
      pointStyle={d => ({ fill: d.cat, stroke: 'black', strokeWidth: 1 })}
      ${
        this.state.customPoint !== "none"
          ? `customPointMark={${customPointLabelHash[this.state.customPoint]}}`
          : ""
      }
      ${
        this.state.renderMode === "none"
          ? ""
          : `pointRenderMode={() => "${this.state.renderMode}"}`
      }`

    const dataTypeSource = {
      line: linesSource,
      summary: summariesSource,
      point: pointsSource
    }

    const annotationType = {
      line: exampleAnnotations,
      summary: pointAnnotations,
      point: pointAnnotations
    }

    const customScaleType = {
      none: undefined,
      pow: scalePow().exponent(2)
    }

    let finalAnnotations = []
    if (this.state.annotations === "on") {
      finalAnnotations = annotationType[this.state.dataType]
    }

    if (this.state.axisAnnotatable === "on") {
      finalAnnotations = [...finalAnnotations, this.state.axisAnnotation]
    }

    const undefinedOptions = {}

    if (this.state.frame === "ResponsiveXYFrame")
      undefinedOptions.responsiveWidth = true
    const displayFrame = (
      <div>
        <button
          onClick={() => {
            this.setState({ yAccessor: "px" })
          }}
        >
          Change yAccessor
        </button>
        <ReactFrame
          {...undefinedOptions}
          title={titleTypesHash[this.state.title]}
          size={[700, 700]}
          lines={this.state.dataType === "line" ? displayData : undefined}
          summaries={
            this.state.dataType === "summary"
              ? summaryDataHash[this.state.summaryType]
              : undefined
          }
          summaryStyle={summaryStyleHash[this.state.summaryType]}
          summaryType={summaryTypeHash[this.state.summaryType]}
          points={this.state.dataType === "point" ? pointTestData : undefined}
          pointStyle={(d) => ({
            fill: (d.parentLine && d.parentLine.color) || d.cat,
            stroke: "black",
            strokeWidth: 0.5,
            r: d.parentSummary && 5
          })}
          customPointMark={customPointHash[this.state.customPoint]}
          lineDataAccessor={(d) =>
            d.data.filter(
              (p) =>
                this.state.frame !== "MinimapXYFrame" ||
                (p.px >= this.state.lineExtent[0] &&
                  p.px <= this.state.lineExtent[1])
            )
          }
          xAccessor={"px"}
          yAccessor={this.state.yAccessor}
          showLinePoints={true}
          annotations={finalAnnotations}
          annotationSettings={
            annotationSettingTypes[this.state.annotationSettings]
          }
          matte={this.state.matte === "on"}
          xExtent={
            this.state.frame === "MinimapXYFrame" &&
            this.state.dataType !== "line" &&
            this.state[`${this.state.dataType}Extent`] &&
            this.state[`${this.state.dataType}Extent`][0]
              ? [
                  this.state[`${this.state.dataType}Extent`][0][0],
                  this.state[`${this.state.dataType}Extent`][1][0]
                ]
              : undefined
          }
          yExtent={
            this.state.frame === "MinimapXYFrame" &&
            this.state.dataType !== "line" &&
            this.state[`${this.state.dataType}Extent`] &&
            this.state[`${this.state.dataType}Extent`][0]
              ? [
                  this.state[`${this.state.dataType}Extent`][1][1],
                  this.state[`${this.state.dataType}Extent`][0][1]
                ]
              : fixedExtentHash[this.state.fixedExtent]
          }
          lineStyle={(d) => ({
            fill:
              this.state.lineType === "line" || this.state.lineType === "none"
                ? "none"
                : d.color,
            fillOpacity: 0.5,
            stroke: d.color,
            strokeWidth: "3px"
          })}
          lineType={
            this.state.lineType === "none"
              ? undefined
              : {
                  type: this.state.lineType,
                  interpolator: curveHash[this.state.curve],
                  sort: null
                }
          }
          margin={marginHash[this.state.margin]}
          defined={
            this.state.defined === "inactive" ? undefined : (d) => d.py !== 0
          }
          lineRenderMode={
            this.state.renderMode === "none"
              ? undefined
              : () => this.state.renderMode
          }
          summaryRenderMode={
            this.state.renderMode === "none"
              ? undefined
              : () => this.state.renderMode
          }
          pointRenderMode={
            this.state.renderMode === "none"
              ? undefined
              : () => this.state.renderMode
          }
          hoverAnnotation={this.state.hoverAnnotation === "on"}
          /*          hoverAnnotation={[
            { type: "y", disable: ["connector", "note"] },
            { type: "x", disable: ["connector", "note"] },
            d => ({ type: "xy", label: d.cat }),
            { type: "frame-hover" },
            {
              type: "vertical-points",
              threshold: 5,
              r: (d, i) => i + 5
            },
            {
              type: "horizontal-points",
              threshold: 5,
              r: (d, i) => i + 5
            }
          ]} */
          canvasLines={
            this.state.canvasRender === "none"
              ? undefined
              : canvasRenderHash[this.state.canvasRender]
          }
          canvasPoints={
            this.state.canvasRender === "none"
              ? undefined
              : canvasRenderHash[this.state.canvasRender]
          }
          canvasSummaries={
            this.state.canvasRender === "none"
              ? undefined
              : canvasRenderHash[this.state.canvasRender]
          }
          lineIDAccessor={"id"}
          customClickBehavior={(d) =>
            this.setState({
              clickAnnotation: Object.assign({ type: "form" }, d)
            })
          }
          htmlAnnotationRules={this.customHTMLRules}
          backgroundGraphics={
            this.state.backgroundGraphics === "off" ? null : (
              <text
                x={300}
                y={350}
                style={{ opacity: 0.25, fontWeight: 900, fontSize: "36px" }}
              >
                backgroundGraphics
              </text>
            )
          }
          renderKey={(d, i) => d.id || i}
          foregroundGraphics={
            this.state.foregroundGraphics === "off" ? null : (
              <text
                x={300}
                y={400}
                style={{
                  fill: "white",
                  stroke: "black",
                  fontWeight: 900,
                  fontSize: "36px"
                }}
              >
                foregroundGraphics
              </text>
            )
          }
          yScaleType={customScaleType[this.state.customScale]}
          axes={axesHash[this.state.axes]}
          legend={this.state.dataType === "line" && this.state.legend === "on"}
          minimap={
            this.state.frame === "MinimapXYFrame"
              ? {
                  margin: { top: 20, bottom: 35, left: 20, right: 20 },
                  lineStyle: (d) => ({
                    fill: d.color,
                    fillOpacity: 0.5,
                    stroke: d.color
                  }),
                  lineType:
                    this.state.lineType === "none"
                      ? undefined
                      : {
                          type: this.state.lineType,
                          interpolator: curveHash[this.state.curve],
                          sort: null
                        },
                  brushEnd: (e) =>
                    this.updateDateRange(`${this.state.dataType}`, e),
                  yBrushable: this.state.dataType === "line" ? false : true,
                  xBrushExtent:
                    this.state.dataType === "line"
                      ? this.state[`${this.state.dataType}Extent`]
                      : this.state[`${this.state.dataType}Extent`][0],
                  yBrushExtent: this.state[`${this.state.dataType}Extent`][1],
                  lines:
                    this.state.dataType === "line" ? displayData : undefined,
                  summaries:
                    this.state.dataType === "summary"
                      ? summaryDataHash[this.state.summaryType]
                      : undefined,
                  points:
                    this.state.dataType === "point" ? pointTestData : undefined,
                  summaryStyle: summaryStyleHash[this.state.summaryType],
                  summaryType: summaryTypeHash[this.state.summaryType],
                  pointStyle: (d) => ({
                    fill: d.cat,
                    stroke: "black",
                    strokeWidth: 1
                  }),
                  lineDataAccessor: (d) => d.data,
                  size:
                    this.state.dataType === "line" ? [700, 150] : [300, 300],
                  axes: axesHash[this.state.axes]
                    ? [axesHash[this.state.axes][1]]
                    : undefined,
                  annotations:
                    this.state.annotations === "on"
                      ? finalAnnotations.map((d) =>
                          Object.assign({}, d, {
                            type: AnnotationBadge,
                            subject: { text: "A", radius: 12 }
                          })
                        )
                      : undefined
                }
              : undefined
          }
        />
      </div>
    )

    const examples = []
    examples.push({
      name: "Basic",
      demo: displayFrame,
      source: removeEmptyLines`
      import { ${this.state.frame} } from 'semiotic';
        
      <${this.state.frame}
      ${titleTypeLabelHash[this.state.title]}
      size={[ 700,500 ]}
      ${
        this.state.frame === "ResponsiveXYFrame" ? "responsiveWidth={true}" : ""
      }
      ${this.state.annotations === "on" ? annotationSource : ""}
      ${dataTypeSource[this.state.dataType]}
      ${
        this.state.fixedExtent === "none"
          ? ""
          : `yExtent={${fixedExtentLabelHash[this.state.fixedExtent]}}`
      }
      ${this.state.matte === "off" ? "" : "matte={true}"}
      xAccessor="px"
      yAccessor="py"
      lineIDAccessor="id"
      ${
        this.state.margin === "none"
          ? ""
          : `margin={${JSON.stringify(marginHash[this.state.margin])}}`
      }
      ${
        this.state.axes === "none"
          ? ""
          : `axes={${axesLabelHash[this.state.axes]}}`
      }
      ${this.state.hoverAnnotation === "off" ? "" : "hoverAnnotation={true}"}
      ${
        this.state.canvasRender === "none"
          ? ""
          : `${canvasRenderNameHash[this.state.dataType]}={${
              canvasRenderLabelHash[this.state.canvasRender]
            }}`
      }
      ${
        this.state.backgroundGraphics === "off"
          ? ""
          : 'backgroundGraphics={<text x={300} y={350} style={{ opacity: 0.25, fontWeight: 900, fontSize: "36px" }}>backgroundGraphics</text>}'
      }
      ${
        this.state.foregroundGraphics === "off"
          ? ""
          : 'foregroundGraphics={<text x={300} y={400} style={{ fill: "white", stroke: "black", fontWeight: 900, fontSize: "36px" }}>foregroundGraphics</text>}'
      }
      ${
        this.state.dataType === "line" && this.state.legend === "on"
          ? "legend={true}"
          : ""
      }
      ${
        this.state.frame === "MinimapXYFrame"
          ? removeEmptyLines`minimap={
          { margin: { top: 20, bottom: 35, left: 20, right: 20 },
          ${dataTypeSource[this.state.dataType]}
          brushEnd: this.updateDateRange,
          yBrushable: false,
          xBrushExtent: this.state.extent,
          lines: displayData,
          lineDataAccessor: d => d.data,
          size: [ 700, 150 ],
          axes: [ axes[1] ],
          ${
            this.state.annotations === "on"
              ? "annotations: badgeAnnotations"
              : ""
          }
          }`
          : ""
      }
      />`
    })

    const linebuttons = [
      <form key="button-1">
        <label htmlFor="hover-behavior-input">lineType</label>
        <select
          value={this.state.lineType}
          onChange={(e) =>
            this.setState({
              lineType: e.target.value
            })
          }
        >
          {options}
        </select>
      </form>,
      this.state.lineType === "none" ? null : (
        <form key="button-2">
          <label htmlFor="hover-behavior-input">lineType.curve</label>
          <select
            value={this.state.curve}
            onChange={(e) => this.setState({ curve: e.target.value })}
          >
            {curveOptions}
          </select>
        </form>
      ),

      <form key="button-6">
        <label htmlFor="hover-behavior-input">defined</label>
        <select
          value={this.state.defined}
          onChange={(e) => this.setState({ defined: e.target.value })}
        >
          {definedOptions}
        </select>
      </form>,
      <form key="button-6-3-6-2">
        <label htmlFor="hover-behavior-input">legend</label>
        <select
          value={this.state.legend}
          onChange={(e) => this.setState({ legend: e.target.value })}
        >
          {legendOptions}
        </select>
      </form>
    ]

    const pointbuttons = [
      <form key="button-1">
        <label htmlFor="hover-behavior-input">customPointMark</label>
        <select
          value={this.state.customPoint}
          onChange={(e) =>
            this.setState({
              customPoint: e.target.value
            })
          }
        >
          {customPointOptions}
        </select>
      </form>
    ]

    const summarybuttons = [
      <form key="button-1">
        <label htmlFor="hover-behavior-input">summaryType</label>
        <select
          value={this.state.summaryType}
          onChange={(e) =>
            this.setState({
              summaryType: e.target.value
            })
          }
        >
          {summaryTypeOptions}
        </select>
      </form>,
      <form key="button-3-0-0">
        <label htmlFor="hover-behavior-input">showPoints</label>
        <select
          value={this.state.showPoints}
          onChange={(e) => this.setState({ showPoints: e.target.value })}
        >
          {showPointOptions}
        </select>
      </form>
    ]

    const annotationbuttons = [
      <form key="button-3-0-0">
        <label htmlFor="hover-behavior-input">annotations</label>
        <select
          value={this.state.annotations}
          onChange={(e) => this.setState({ annotations: e.target.value })}
        >
          {annotationOptions}
        </select>
      </form>,
      <form key="button-3-2-0">
        <label htmlFor="hover-behavior-input">annotationSettings</label>
        <select
          value={this.state.annotationSettings}
          onChange={(e) =>
            this.setState({ annotationSettings: e.target.value })
          }
        >
          {annotationSettingOptions}
        </select>
      </form>
    ]

    const graphicsbuttons = [
      <form key="button-g-1-0">
        <label htmlFor="hover-behavior-input">backgroundGraphics</label>
        <select
          value={this.state.backgroundGraphics}
          onChange={(e) =>
            this.setState({ backgroundGraphics: e.target.value })
          }
        >
          {backgroundGraphicsOptions}
        </select>
      </form>,

      <form key="button-g-2-0">
        <label htmlFor="hover-behavior-input">foregroundGraphics</label>
        <select
          value={this.state.foregroundGraphics}
          onChange={(e) =>
            this.setState({ foregroundGraphics: e.target.value })
          }
        >
          {foregroundGraphicsOptions}
        </select>
      </form>
    ]

    const buttons = [
      <form key="button-0">
        <label htmlFor="hover-behavior-input">Change Frame</label>
        <select
          value={this.state.frame}
          onChange={(e) => this.setState({ frame: e.target.value })}
        >
          {frameOptions}
        </select>
      </form>,
      <form key="button-0-1-0">
        <label htmlFor="hover-behavior-input">title</label>
        <select
          value={this.state.title}
          onChange={(e) => this.setState({ title: e.target.value })}
        >
          {titleOptions}
        </select>
      </form>,
      <form key="button-0-1">
        <label htmlFor="hover-behavior-input">Data Type</label>
        <select
          value={this.state.dataType}
          onChange={(e) => this.setState({ dataType: e.target.value })}
        >
          {dataTypeOptions}
        </select>
      </form>,
      this.state.dataType === "line" ? linebuttons : null,
      this.state.dataType === "point" ? pointbuttons : null,
      this.state.dataType === "summary" ? summarybuttons : null,
      annotationbuttons,

      <form key="button-3-0">
        <label htmlFor="hover-behavior-input">fixedExtent</label>
        <select
          value={this.state.fixedExtent}
          onChange={(e) => this.setState({ fixedExtent: e.target.value })}
        >
          {fixedExtentOptions}
        </select>
      </form>,
      <form key="button-3-1">
        <label htmlFor="hover-behavior-input">matte</label>
        <select
          value={this.state.matte}
          onChange={(e) => this.setState({ matte: e.target.value })}
        >
          {matteOptions}
        </select>
      </form>,
      <form key="button-3">
        <label htmlFor="hover-behavior-input">margin</label>
        <select
          value={this.state.margin}
          onChange={(e) => this.setState({ margin: e.target.value })}
        >
          {marginOptions}
        </select>
      </form>,
      <form key="button-4">
        <label htmlFor="hover-behavior-input">axes</label>
        <select
          value={this.state.axes}
          onChange={(e) => this.setState({ axes: e.target.value })}
        >
          {axesOptions}
        </select>
      </form>,
      this.state.axes === "hover" ? (
        <div key="button-3-1-0">
          <label htmlFor="hover-behavior-input">Axis Annotate</label>
          <select
            value={this.state.axisAnnotatable}
            onChange={(e) => this.setState({ axisAnnotatable: e.target.value })}
          >
            {axisAnnotationableOptions}
          </select>
        </div>
      ) : null,

      <form key="button-5">
        <label htmlFor="hover-behavior-input">Render Mode</label>
        <select
          value={this.state.renderMode}
          onChange={(e) => this.setState({ renderMode: e.target.value })}
        >
          {renderOptions}
        </select>
      </form>,
      <form key="button-7">
        <label htmlFor="hover-behavior-input">hoverAnnotation</label>
        <select
          value={this.state.hoverAnnotation}
          onChange={(e) => this.setState({ hoverAnnotation: e.target.value })}
        >
          {hoverAnnotationOptions}
        </select>
      </form>,
      <form key="button-8">
        <label htmlFor="hover-behavior-input">canvasRender</label>
        <select
          value={this.state.canvasRender}
          onChange={(e) => this.setState({ canvasRender: e.target.value })}
        >
          {canvasRenderOptions}
        </select>
      </form>,
      <form key="button-9">
        <label htmlFor="hover-behavior-input">customScale</label>
        <select
          value={this.state.customScale}
          onChange={(e) => this.setState({ customScale: e.target.value })}
        >
          {customScaleOptions}
        </select>
      </form>,
      graphicsbuttons
    ]

    return (
      <DocumentComponent
        name="XYFrame"
        api="https://github.com/emeeks/semiotic/wiki/XYFrame"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          The XYFrame lets you create scatterplots, line charts and summary
          visualizations like contours. You can experiment with the settings to
          see the code necessary to deploy that chart in your app.
        </p>
        <p>
          For instance, adjust the lineType property to see different variations
          of the line chart, such as a bump chart or stacked summary chart.
        </p>
        <p>
          Or turn on annotations to see how semiotic automatically processes
          annotations.
        </p>
        <iframe
          width="560"
          height="315"
          src="https://www.youtube.com/embed/0HIj_7-ghaE"
          frameBorder="0"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      </DocumentComponent>
    )
  }
}

XYFrameDocs.title = "XYFrame"
