import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import {
  XYFrame,
  ResponsiveXYFrame,
  MinimapXYFrame,
  Mark
} from "../../components";
import {
  curveBasis,
  curveCardinal,
  curveCatmullRom,
  curveLinear,
  curveNatural,
  curveMonotoneX,
  curveStep
} from "d3-shape";
import { randomNormal } from "d3-random";
import { scaleLinear, scalePow } from "d3-scale";
import { annotationCalloutElbow, annotationBadge } from "d3-svg-annotation";
import { testData } from "../example_settings/xyframe";
import RaisedButton from "material-ui/RaisedButton";
import SelectField from "material-ui/SelectField";
import MenuItem from "material-ui/MenuItem";
import Icon from "material-ui/svg-icons/action/timeline";

class NameForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = { value: "", type: "x" };
    this.handleChange = this.handleChange.bind(this);
    this.changeType = this.changeType.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    this.setState({ value: event.target.value });
  }

  changeType(event) {
    this.setState({ type: event.target.value });
  }

  handleSubmit(event) {
    event.preventDefault();
    this.props.updateAnnotations(
      Object.assign({}, this.props.dataPoint, {
        type: this.state.type,
        label: this.state.value
      })
    );
  }

  render() {
    return (
      <form style={{ background: "#DDDDDD" }} onSubmit={this.handleSubmit}>
        <p>
          {this.props.dataPoint.x},{this.props.dataPoint.y}
        </p>
        <p>Name:</p>
        <input
          type="text"
          value={this.state.value}
          onChange={this.handleChange}
        />
        <select value={this.state.type} onChange={this.changeType}>
          <MenuItem label="x" value="x">
            X
          </MenuItem>
          <MenuItem label="y" value="y">
            Y
          </MenuItem>
          <MenuItem label="xy" value="xy">
            XY
          </MenuItem>
        </select>
        <input type="submit" value="Submit" />
      </form>
    );
  }
}

function removeEmptyLines(strings, ...values) {
  return strings
    .map((d, i) => {
      const value = values[i];
      let string = d;
      if (value === "") {
        const stringParts = d.split(/\r?\n/);
        string = stringParts
          .filter((d, i) => i !== stringParts.length - 1)
          .join("\n");
      } else if (value) {
        string = `${string}${value}`;
      }
      return string;
    })
    .join("");
}

const components = [];
// Add your component proptype data here
// multiple component proptype documentation supported

const badColors = scaleLinear()
  .domain([0.00005, 0.001, 0.01])
  .range(["#00a2ce", "#4d430c", "#b3331d"]);

const curveHash = {
  none: undefined,
  curveBasis,
  curveCardinal,
  curveCatmullRom,
  curveLinear,
  curveNatural,
  curveMonotoneX,
  curveStep
};

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
};

const axesHash = {
  none: undefined,
  basic: [
    { orient: "left", tickFormat: d => d },
    { orient: "bottom", tickFormat: d => d, footer: true }
  ],
  labeled: [
    {
      orient: "right",
      tickFormat: d => d,
      label: {
        name: "right label",
        position: { anchor: "middle" },
        locationDistance: 20
      }
    },
    {
      orient: "top",
      tickFormat: d => d,
      label: {
        name: "top label",
        position: { anchor: "middle" },
        locationDistance: 20
      }
    },
    {
      orient: "left",
      tickFormat: d => d,
      label: {
        name: "left label",
        position: { anchor: "middle" },
        locationDistance: 20
      }
    },
    {
      orient: "bottom",
      tickFormat: d => d,
      label: {
        name: "bottom label",
        position: { anchor: "middle" },
        locationDistance: 20
      }
    }
  ],
  hover: [
    {
      orient: "bottom",
      tickFormat: d => d,
      axisAnnotationFunction: undefined
    },
    {
      orient: "left",
      tickFormat: d => d,
      axisAnnotationFunction: undefined
    }
  ]
};

const canvasRenderHash = {
  none: undefined,
  some: (d, i) => i % 2 === 0,
  all: () => true
};

const canvasRenderLabelHash = {
  some: `(d, i) => i > 1`,
  all: `() => true`
};

const canvasRenderNameHash = {
  line: "canvasLines",
  area: "canvasAreas",
  points: "canvasPoints"
};

const frameHash = {
  XYFrame,
  ResponsiveXYFrame,
  MinimapXYFrame
};

const fixedExtentHash = {
  none: undefined,
  partial: [undefined, 500],
  full: [200, 500]
};

const fixedExtentLabelHash = {
  partial: "[ undefined, 5 ]",
  full: "[ 2, 5 ]"
};

const customPointHash = {
  none: undefined,
  basic: <Mark markType="rect" x={-4} y={-4} width={8} height={8} />,
  variable: ({ i }) =>
    i % 2 ? (
      <Mark markType="circle" r="5" />
    ) : (
      <Mark markType="rect" x={-4} y={-4} width={8} height={8} />
    )
};

const customPointLabelHash = {
  variable: `({ i }) => i%2 ? <Mark markType='circle' r='5' /> : <Mark markType='rect' x={-4} y={-4} width={8} height={8} />`
};

const areaStyleHash = {
  basic: () => ({ fill: "#b6a756", stroke: "black", strokeWidth: "1px" }),
  contours: d => ({
    fill: badColors(d.value),
    stroke: "black",
    strokeWidth: "1px",
    fillOpacity: 0.5
  })
};

const areaTypeHash = {
  basic: undefined,
  contours: { type: "contour" }
};

const titleTypesHash = {
  none: undefined,
  simple: "A Simple Title",
  jsx: (
    <g transform="translate(375,20)">
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
};

const titleTypeLabelHash = {
  none: "",
  simple: `title={'A Simple Title'}`,
  jsx: `title={<g transform='translate(375,50)'>
    <circle r={10} cx={-80} style={{ stroke: '#4d430c', fill: '#b6a756', strokeDasharray: '5 5', strokeWidth: 4 }} />
    <circle r={10} cx={80} style={{ stroke: '#4d430c', fill: '#b6a756', strokeDasharray: '5 5', strokeWidth: 4 }} />
    <text style={{ fontSize: '24px', fontWeight: 900 }}>A JSX Title</text>
    </g>}`
};

components.push({
  name: "XYFrame",
  proptypes: `
    {
    name: PropTypes.string,
    lines: PropTypes.oneOfType([
      PropTypes.array,
      PropTypes.object
    ]),
    points: PropTypes.oneOfType([
      PropTypes.array,
      PropTypes.object
    ]),
    areas: PropTypes.oneOfType([
      PropTypes.array,
      PropTypes.object
    ]),
    title: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.object
    ]),
    margin: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.object
    ]),
    dataVersion: PropTypes.string,
    axes: PropTypes.oneOfType([
      PropTypes.array,
      PropTypes.object
    ]),
    matte: PropTypes.oneOfType([
      PropTypes.bool,
      PropTypes.object
    ]),
    size: PropTypes.array.isRequired,
    position: PropTypes.array,
    xScaleType: PropTypes.func,
    yScaleType: PropTypes.func,
    xExtent: PropTypes.array,
    yExtent: PropTypes.array,
    invertX: PropTypes.bool,
    invertY: PropTypes.bool,
    xAccessor: PropTypes.oneOfType([
      PropTypes.func,
      PropTypes.string
    ]),
    yAccessor: PropTypes.oneOfType([
      PropTypes.func,
      PropTypes.string
    ]),
    hoverAnnotation: PropTypes.bool,
    lineDataAccessor: PropTypes.oneOfType([
      PropTypes.func,
      PropTypes.string
    ]), //are you missing a point data accessor? 
    areaDataAccessor: PropTypes.oneOfType([
      PropTypes.func,
      PropTypes.string
    ]),
    backgroundGraphics: PropTypes.oneOfType([
      PropTypes.array,
      PropTypes.object
    ]),
    foregroundGraphics: PropTypes.oneOfType([
      PropTypes.array,
      PropTypes.object
    ]),
    additionalDefs: PropTypes.oneOfType([
      PropTypes.array,
      PropTypes.object
    ]),
    customHoverBehavior: PropTypes.func,
    customClickBehavior: PropTypes.func,
    customDoubleclickBehavior: PropTypes.func,
    lineType: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.object
    ]),
    showLinePoints: PropTypes.bool,
    defined: PropTypes.func,
    lineStyle: PropTypes.func,
    pointStyle: PropTypes.func,
    areaStyle: PropTypes.func,
    lineClass: PropTypes.func,
    pointClass: PropTypes.func,
    areaClass: PropTypes.func,
    canvasPoints: PropTypes.func,
    customPointMark: PropTypes.func,
    customLineMark: PropTypes.func,
    lineIDAccessor: PropTypes.func,
    svgAnnotationRules: PropTypes.func,
    htmlAnnotationRules: PropTypes.func,
    tooltipContent: PropTypes.func,
    annotations: PropTypes.array,
    interaction: PropTypes.object,
    download: PropTypes.bool, //add a download button for graphs data as csv
    downloadFields: PropTypes.array //additional fields aside from x,y to add to the csv
    }
  `
});

let displayData = testData.map(d => {
  let moreData = [
    ...d.data,
    ...d.data.map(p => ({ py: p.py + Math.random() * 1000, px: p.px + 7 }))
  ];
  return Object.assign(d, { data: moreData });
});

const exampleAnnotations = [
  {
    className: "annotation-class-1",
    px: 4,
    py: 300,
    dx: -30,
    dy: 0,
    type: "d3-annotation",
    note: { title: "Note at 4,300" },
    subject: { text: "A", radius: 12 }
  },
  {
    className: "annotation-class-2",
    px: 5,
    py: 1000,
    dx: -30,
    dy: 0,
    type: "d3-annotation",
    note: { title: "Note at 5,1000" },
    subject: { text: "B", radius: 12 }
  },
  {
    px: 7,
    id: "linedata-1",
    dx: 30,
    dy: -50,
    type: annotationCalloutElbow,
    note: { title: "linedata-1 at 7" },
    subject: { text: "C", radius: 12 }
  },
  {
    px: 10,
    id: "linedata-2",
    dx: 30,
    dy: -50,
    type: annotationCalloutElbow,
    note: { title: "linedata-2 at 10" },
    subject: { text: "D", radius: 12 }
  },
  {
    px: 12,
    id: "linedata-3",
    dx: 30,
    dy: -50,
    type: annotationCalloutElbow,
    note: { title: "linedata-3 at 12" },
    subject: { text: "E", radius: 12 }
  }
];

const areaTestData = [
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
];

const pointTestData = [];
const nRando = randomNormal(0, 1000);
const pRando = randomNormal(0, 1000);

for (let x = 1; x < 100; x++) {
  pointTestData.push({
    px: nRando() * 2 - 4000,
    py: 2000 + nRando(),
    step: pointTestData.length,
    cat: "#00a2ce"
  });
}
for (let x = 1; x < 100; x++) {
  pointTestData.push({
    px: 2000 + pRando(),
    py: 2000 + pRando() * 2,
    step: pointTestData.length,
    cat: "#4d430c"
  });
}
for (let x = 1; x < 100; x++) {
  pointTestData.push({
    px: pRando() - 2000,
    py: pRando() * 2 - 2000,
    step: pointTestData.length,
    cat: "#b3331d"
  });
}

for (let x = 1; x < 100; x++) {
  pointTestData.push({
    px: pRando() + 2000,
    py: pRando() * 2 - 4000,
    step: pointTestData.length,
    cat: "#b6a756"
  });
}

const pointAnnotations = pointTestData
  .filter((d, i) => i % 20 === 0)
  .map((d, i) =>
    Object.assign(
      {
        color: d.cat,
        dx: 30,
        dy: -50,
        type: annotationCalloutElbow,
        note: { title: `Note ${i + 1}` }
      },
      d
    )
  );

const contourAreaData = [{ id: "#00a2ce", coordinates: pointTestData }];

const areaDataHash = {
  basic: areaTestData,
  contours: contourAreaData
};

const annotationSettingTypes = {
  empty: undefined,
  plainBump: { layout: "bump" },
  bumpOptions: {
    layout: "bump",
    pointSizeFunction: () => 15,
    labelSizeFunction: noteData => {
      return (noteData.note.title || noteData.note.label).length * 6;
    }
  },
  plainMarginalia: { layout: "marginalia" },
  marginaliaLeft: {
    layout: { type: "marginalia", orient: "left" }
  },
  marginaliaNearest: {
    layout: { type: "marginalia", orient: "nearest" }
  }
};

const downloadFieldOptions = {
  line: ["id", "color", "data"],
  area: ["id", "coordinates"],
  point: ["step", "cat"]
};

const annotationSettingLabels = setting => {
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
  };
  return hash[setting] === "" ? "" : `annotationSettings={${hash[setting]}}`;
};

const annotationSettingOptions = Object.keys(annotationSettingTypes).map(d => (
  <MenuItem key={d} label={d} value={d}>
    {d}
  </MenuItem>
));

export default class XYFrameDocs extends React.Component {
  constructor(props) {
    super(props);
    this.updateDateRange = this.updateDateRange.bind(this);
    this.customHTMLRules = this.customHTMLRules.bind(this);
    this.updateAnnotations = this.updateAnnotations.bind(this);

    this.state = {
      lineType: "none",
      annotations: "off",
      curve: "none",
      margin: "object",
      axes: "basic",
      renderMode: "none",
      defined: "active",
      hoverAnnotation: "on",
      canvasRender: "none",
      frame: "XYFrame",
      fixedExtent: "none",
      matte: "off",
      dataType: "line",
      customPoint: "none",
      areaType: "basic",
      lineExtent: [1, 8],
      pointExtent: [[-1000, 1000], [1000, -1000]],
      areaExtent: [[-1000, 1000], [1000, -1000]],
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
      legend: "off"
    };

    //In constructor to get access to this
    axesHash.hover[0].axisAnnotationFunction = d =>
      this.setState({
        axisAnnotation: {
          type: d.type,
          [d.type === "x" ? "px" : "py"]: d.value,
          label: "clicked annotation"
        }
      });
    axesHash.hover[1].axisAnnotationFunction = d =>
      this.setState({
        axisAnnotation: {
          type: d.type,
          [d.type === "x" ? "px" : "py"]: d.value,
          label: "clicked annotation"
        }
      });
  }

  updateDateRange(dataType, e) {
    this.setState({ [`${dataType}Extent`]: e });
  }

  updateAnnotations(newAnnotation) {
    this.setState({ clickAnnotation: newAnnotation });
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
      );
    }
    //If you don't return null, it will suppress the rest of your HTML rules
    return null;
  }

  render() {
    const dataTypeOptions = ["line", "point", "area"].map(d => (
      <MenuItem key={"data-type-option-" + d} primaryText={d} value={d} />
    ));

    const marginHash = {
      none: undefined,
      number: 10,
      object: {
        top: 60,
        bottom: 65,
        left: 60,
        right: this.state.legend === "on" ? 120 : 20
      }
    };

    const options = [
      "none",
      "line",
      "difference",
      "stackedarea",
      "bumpline",
      "bumparea"
    ].map(d => <MenuItem key={"line-option-" + d} primaryText={d} value={d} />);

    const renderOptions = ["none", "sketchy", "painty"].map(d => (
      <MenuItem key={"render-option-" + d} primaryText={d} value={d} />
    ));

    const definedOptions = ["active", "inactive"].map(d => (
      <MenuItem key={"defined-option-" + d} primaryText={d} value={d} />
    ));

    const hoverAnnotationOptions = ["off", "on"].map(d => (
      <MenuItem
        key={"hover-annotation-option-" + d}
        primaryText={d}
        value={d}
      />
    ));

    const matteOptions = ["off", "on"].map(d => (
      <MenuItem key={"matte-option-" + d} primaryText={d} value={d} />
    ));

    const annotationOptions = ["off", "on"].map(d => (
      <MenuItem key={"annotation-option-" + d} primaryText={d} value={d} />
    ));

    const showPointOptions = ["off", "on"].map(d => (
      <MenuItem key={"show-point-option-" + d} primaryText={d} value={d} />
    ));

    const axisAnnotationableOptions = ["off", "on"].map(d => (
      <MenuItem
        key={"axis-annotatable-option-" + d}
        primaryText={d}
        value={d}
      />
    ));

    const foregroundGraphicsOptions = ["off", "on"].map(d => (
      <MenuItem key={"foreground-option-" + d} primaryText={d} value={d} />
    ));

    const backgroundGraphicsOptions = ["off", "on"].map(d => (
      <MenuItem key={"background-option-" + d} primaryText={d} value={d} />
    ));

    const legendOptions = ["off", "on"].map(d => (
      <MenuItem key={"legend-option-" + d} primaryText={d} value={d} />
    ));

    const customScaleOptions = ["none", "pow"].map(d => (
      <MenuItem key={"customScale-option-" + d} primaryText={d} value={d} />
    ));

    const fixedExtentOptions = ["none", "partial", "full"].map(d => (
      <MenuItem
        key={"fixed-extent-annotation-option-" + d}
        primaryText={d}
        value={d}
      />
    ));

    const customPointOptions = ["none", "basic", "variable"].map(d => (
      <MenuItem key={"custom-point-option-" + d} primaryText={d} value={d} />
    ));

    const areaTypeOptions = ["basic", "contours"].map(d => (
      <MenuItem key={"area-type-option-" + d} primaryText={d} value={d} />
    ));

    const titleOptions = Object.keys(titleTypesHash).map(d => (
      <MenuItem key={"title-option-" + d} primaryText={d} value={d} />
    ));

    const canvasRenderOptions = Object.keys(canvasRenderHash).map(d => (
      <MenuItem
        key={"canvas-render-annotation-option-" + d}
        primaryText={d}
        value={d}
      />
    ));

    const curveOptions = Object.keys(curveHash).map(d => (
      <MenuItem key={"curve-option-" + d} primaryText={d} value={d} />
    ));

    const marginOptions = Object.keys(marginHash).map(d => (
      <MenuItem key={"margin-option-" + d} primaryText={d} value={d} />
    ));

    const axesOptions = Object.keys(axesHash).map(d => (
      <MenuItem key={"axes-option-" + d} primaryText={d} value={d} />
    ));

    const frameOptions = Object.keys(frameHash).map(d => (
      <MenuItem key={"frame-option-" + d} primaryText={d} value={d} />
    ));

    if (this.state.lineType === "difference") {
      displayData = testData.filter((d, i) => i < 2);
    }

    const ReactFrame = frameHash[this.state.frame];

    const annotationSource = removeEmptyLines`annotations={exampleAnnotations}
    ${annotationSettingLabels(this.state.annotationSettings)}`;

    const linesSource = removeEmptyLines`lines={displayData}
      lineDataAccessor={${this.state.frame === "MinimapXYFrame"
        ? "d => d.data.filter(p => p.px >= this.state.extent[0] && p.px <= this.state.extent[1])"
        : '"data"'}}
      lineStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color, strokeWidth: '3px' })}
      ${this.state.lineType === "none"
        ? ""
        : `lineType={{ type: "${this.state.lineType}"${this.state.curve ===
          "none"
            ? ""
            : `, interpolator: ${this.state.curve}`} }}`}
      ${this.state.renderMode === "none"
        ? ""
        : `lineRenderMode={() => "${this.state.renderMode}"}`}
      ${this.state.defined === "inactive" ? "" : "defined={d => d.py !== 0}"}
      ${this.state.showPoints === "on" ? "showLinePoints={true}" : ""}`;

    const areasSource = removeEmptyLines`areas={areaData}
      areaStyle={() => ({ fill: 'purple', stroke: 'red', strokeWidth: '1px' })}
      ${this.state.showPoints === "on" ? "showLinePoints={true}" : ""}
      ${this.state.renderMode === "none"
        ? ""
        : `areaRenderMode={() => "${this.state.renderMode}"}`}`;

    const pointsSource = removeEmptyLines`points={testData}
      pointStyle={d => ({ fill: d.cat, stroke: 'black', strokeWidth: 1 })}
      ${this.state.customPoint !== "none"
        ? `customPointMark={${customPointLabelHash[this.state.customPoint]}}`
        : ""}
      ${this.state.renderMode === "none"
        ? ""
        : `pointRenderMode={() => "${this.state.renderMode}"}`}`;

    const dataTypeSource = {
      line: linesSource,
      area: areasSource,
      point: pointsSource
    };

    const annotationType = {
      line: exampleAnnotations,
      area: pointAnnotations,
      point: pointAnnotations
    };

    const customScaleType = {
      none: undefined,
      pow: scalePow().exponent(2)
    };

    let finalAnnotations = [];
    if (this.state.annotations === "on") {
      finalAnnotations = annotationType[this.state.dataType];
    }

    if (this.state.axisAnnotatable === "on") {
      finalAnnotations = [...finalAnnotations, this.state.axisAnnotation];
    }

    let displayFrame = (
      <div>
        <RaisedButton
          primary
          label={"XYFrame API"}
          onTouchTap={() =>
            window.open(`https://github.com/emeeks/semiotic/wiki/xyframe`)}
        />
        <ReactFrame
          title={titleTypesHash[this.state.title]}
          size={[700, 700]}
          responsiveWidth={this.state.frame === "XYFrame" ? undefined : true}
          lines={this.state.dataType === "line" ? displayData : undefined}
          areas={
            this.state.dataType === "area" ? (
              areaDataHash[this.state.areaType]
            ) : (
              undefined
            )
          }
          areaStyle={areaStyleHash[this.state.areaType]}
          areaType={areaTypeHash[this.state.areaType]}
          points={this.state.dataType === "point" ? pointTestData : undefined}
          pointStyle={d => ({ fill: d.cat, stroke: "black", strokeWidth: 0.5 })}
          customPointMark={customPointHash[this.state.customPoint]}
          lineDataAccessor={d =>
            d.data.filter(
              p =>
                this.state.frame !== "MinimapXYFrame" ||
                (p.px >= this.state.lineExtent[0] &&
                  p.px <= this.state.lineExtent[1])
            )}
          xAccessor={"px"}
          yAccessor={"py"}
          showLinePoints={this.state.showPoints === "on"}
          annotations={finalAnnotations}
          annotationSettings={
            annotationSettingTypes[this.state.annotationSettings]
          }
          matte={this.state.matte === "on"}
          xExtent={
            this.state.frame === "MinimapXYFrame" &&
            this.state.dataType !== "line" ? (
              [
                this.state[`${this.state.dataType}Extent`][0][0],
                this.state[`${this.state.dataType}Extent`][1][0]
              ]
            ) : (
              undefined
            )
          }
          yExtent={
            this.state.frame === "MinimapXYFrame" &&
            this.state.dataType !== "line" ? (
              [
                this.state[`${this.state.dataType}Extent`][1][1],
                this.state[`${this.state.dataType}Extent`][0][1]
              ]
            ) : (
              fixedExtentHash[this.state.fixedExtent]
            )
          }
          lineStyle={d => ({
            fill: d.color,
            fillOpacity: 0.5,
            stroke: d.color,
            strokeWidth: "3px"
          })}
          lineType={
            this.state.lineType === "none" ? (
              undefined
            ) : (
              {
                type: this.state.lineType,
                interpolator: curveHash[this.state.curve],
                sort: null
              }
            )
          }
          margin={marginHash[this.state.margin]}
          flubberSegments={4}
          defined={
            this.state.defined === "inactive" ? undefined : d => d.py !== 0
          }
          axes={axesHash[this.state.axes]}
          lineRenderMode={
            this.state.renderMode === "none" ? (
              undefined
            ) : (
              () => this.state.renderMode
            )
          }
          areaRenderMode={
            this.state.renderMode === "none" ? (
              undefined
            ) : (
              () => this.state.renderMode
            )
          }
          pointRenderMode={
            this.state.renderMode === "none" ? (
              undefined
            ) : (
              () => this.state.renderMode
            )
          }
          hoverAnnotation={this.state.hoverAnnotation === "on"}
          canvasLines={
            this.state.canvasRender === "none" ? (
              undefined
            ) : (
              canvasRenderHash[this.state.canvasRender]
            )
          }
          canvasPoints={
            this.state.canvasRender === "none" ? (
              undefined
            ) : (
              canvasRenderHash[this.state.canvasRender]
            )
          }
          canvasAreas={
            this.state.canvasRender === "none" ? (
              undefined
            ) : (
              canvasRenderHash[this.state.canvasRender]
            )
          }
          customClickBehavior={d =>
            this.setState({
              clickAnnotation: Object.assign({ type: "form" }, d)
            })}
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
          download={false}
          //            legend={{ title: "test", position: "right", width: 200, legendGroups: [
          //              { label: "Red stuff", styleFn: (d,i) => ({ fill: "red", fillOpacity: i * .25 + .25 }), items: [{ label: "a" }, { label: "b" }, { label: "c" }] },
          //              { label: "Blue stuff", styleFn: (d,i) => ({ fill: "blue", fillOpacity: i * .25 + .25 }), items: [{ label: "d" }, { label: "e" }, { label: "f" }] }
          //            ] }}
          downloadFields={downloadFieldOptions[this.state.dataType]}
          legend={this.state.dataType === "line" && this.state.legend === "on"}
          minimap={
            this.state.frame === "MinimapXYFrame" ? (
              {
                margin: { top: 20, bottom: 35, left: 20, right: 20 },
                lineStyle: d => ({
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
                brushEnd: e =>
                  this.updateDateRange(`${this.state.dataType}`, e),
                yBrushable: this.state.dataType === "line" ? false : true,
                xBrushExtent: this.state[`${this.state.dataType}Extent`],
                lines: this.state.dataType === "line" ? displayData : undefined,
                areas:
                  this.state.dataType === "area"
                    ? areaDataHash[this.state.areaType]
                    : undefined,
                points:
                  this.state.dataType === "point" ? pointTestData : undefined,
                areaStyle: areaStyleHash[this.state.areaType],
                areaType: areaTypeHash[this.state.areaType],
                pointStyle: d => ({
                  fill: d.cat,
                  stroke: "black",
                  strokeWidth: 1
                }),
                lineDataAccessor: d => d.data,
                size: this.state.dataType === "line" ? [700, 150] : [300, 300],
                axes: axesHash[this.state.axes]
                  ? [axesHash[this.state.axes][1]]
                  : undefined,
                annotations:
                  this.state.annotations === "on"
                    ? finalAnnotations.map(d =>
                        Object.assign({}, d, { type: annotationBadge })
                      )
                    : undefined
              }
            ) : (
              ""
            )
          }
        />
      </div>
    );

    const examples = [];
    examples.push({
      name: "Basic",
      demo: displayFrame,
      source: removeEmptyLines`
      import { ${this.state.frame} } from 'semiotic';
        
      <${this.state.frame}
      ${titleTypeLabelHash[this.state.title]}
      size={[ 700,500 ]}
      ${this.state.frame === "ResponsiveXYFrame"
        ? "responsiveWidth={true}"
        : ""}
      ${this.state.annotations === "on" ? annotationSource : ""}
      ${dataTypeSource[this.state.dataType]}
      ${this.state.fixedExtent === "none"
        ? ""
        : `yExtent={${fixedExtentLabelHash[this.state.fixedExtent]}}`}
      ${this.state.matte === "off" ? "" : "matte={true}"}
      xAccessor={"px"}
      yAccessor={"py"}
      ${this.state.margin === "none"
        ? ""
        : `margin={${JSON.stringify(marginHash[this.state.margin])}}`}
      ${this.state.axes === "none"
        ? ""
        : `axes={${axesLabelHash[this.state.axes]}}`}
      ${this.state.hoverAnnotation === "off" ? "" : "hoverAnnotation={true}"}
      ${this.state.canvasRender === "none"
        ? ""
        : `${canvasRenderNameHash[
            this.state.dataType
          ]}={${canvasRenderLabelHash[this.state.canvasRender]}}`}
      ${this.state.backgroundGraphics === "off"
        ? ""
        : 'backgroundGraphics={<text x={300} y={350} style={{ opacity: 0.25, fontWeight: 900, fontSize: "36px" }}>backgroundGraphics</text>}'}
      ${this.state.foregroundGraphics === "off"
        ? ""
        : 'foregroundGraphics={<text x={300} y={400} style={{ fill: "white", stroke: "black", fontWeight: 900, fontSize: "36px" }}>foregroundGraphics</text>}'}
      ${this.state.dataType === "line" && this.state.legend === "on"
        ? "legend={true}"
        : ""}
      ${this.state.frame === "MinimapXYFrame"
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
          ${this.state.annotations === "on"
            ? "annotations: badgeAnnotations"
            : ""}
          }`
        : ""}
      />`
    });

    const lineButtons = [
      <span key="button-1">
        <SelectField
          floatingLabelText="lineType"
          value={this.state.lineType}
          onChange={(e, i, value) =>
            this.setState({
              lineType: value
            })}
        >
          {options}
        </SelectField>
      </span>,
      this.state.lineType === "none" ? null : (
        <span key="button-2">
          <SelectField
            floatingLabelText="lineType.curve"
            value={this.state.curve}
            onChange={(e, i, value) => this.setState({ curve: value })}
          >
            {curveOptions}
          </SelectField>
        </span>
      ),
      <span key="button-6">
        <SelectField
          floatingLabelText="defined"
          value={this.state.defined}
          onChange={(e, i, value) => this.setState({ defined: value })}
        >
          {definedOptions}
        </SelectField>
      </span>,
      <span key="button-6-3-6-2">
        <SelectField
          floatingLabelText="legend"
          value={this.state.legend}
          onChange={(e, i, value) => this.setState({ legend: value })}
        >
          {legendOptions}
        </SelectField>
      </span>
    ];

    const pointButtons = [
      <span key="button-1">
        <SelectField
          floatingLabelText="customPointMark"
          value={this.state.customPoint}
          onChange={(e, i, value) =>
            this.setState({
              customPoint: value
            })}
        >
          {customPointOptions}
        </SelectField>
      </span>
    ];

    const areaButtons = [
      <span key="button-1">
        <SelectField
          floatingLabelText="areaType"
          value={this.state.areaType}
          onChange={(e, i, value) =>
            this.setState({
              areaType: value === "none" ? undefined : value
            })}
        >
          {areaTypeOptions}
        </SelectField>
      </span>,
      <span key="button-3-0-0">
        <SelectField
          floatingLabelText="showPoints"
          value={this.state.showPoints}
          onChange={(e, i, value) => this.setState({ showPoints: value })}
        >
          {showPointOptions}
        </SelectField>
      </span>
    ];

    const annotationButtons = [
      <span key="button-3-0-0">
        <SelectField
          floatingLabelText="annotations"
          value={this.state.annotations}
          onChange={(e, i, value) => this.setState({ annotations: value })}
        >
          {annotationOptions}
        </SelectField>
      </span>,
      <div key="button-3-2-0">
        <span>
          <SelectField
            floatingLabelText="annotationSettings"
            value={this.state.annotationSettings}
            onChange={(e, i, value) =>
              this.setState({ annotationSettings: value })}
          >
            {annotationSettingOptions}
          </SelectField>
        </span>
      </div>
    ];

    const graphicsButtons = [
      <div key="button-g-1-0">
        <span>
          <SelectField
            floatingLabelText="backgroundGraphics"
            value={this.state.backgroundGraphics}
            onChange={(e, i, value) =>
              this.setState({ backgroundGraphics: value })}
          >
            {backgroundGraphicsOptions}
          </SelectField>
        </span>
      </div>,
      <span key="button-g-2-0">
        <SelectField
          floatingLabelText="foregroundGraphics"
          value={this.state.foregroundGraphics}
          onChange={(e, i, value) =>
            this.setState({ foregroundGraphics: value })}
        >
          {foregroundGraphicsOptions}
        </SelectField>
      </span>
    ];

    const buttons = [
      <span key="button-0">
        <SelectField
          floatingLabelText="Change Frame"
          value={this.state.frame}
          onChange={(e, i, value) => this.setState({ frame: value })}
        >
          {frameOptions}
        </SelectField>
      </span>,
      <span key="button-0-1-0">
        <SelectField
          floatingLabelText="title"
          value={this.state.title}
          onChange={(e, i, value) => this.setState({ title: value })}
        >
          {titleOptions}
        </SelectField>
      </span>,
      <span key="button-0-1">
        <SelectField
          floatingLabelText="Data Type"
          value={this.state.dataType}
          onChange={(e, i, value) => this.setState({ dataType: value })}
        >
          {dataTypeOptions}
        </SelectField>
      </span>,
      this.state.dataType === "line" ? lineButtons : null,
      this.state.dataType === "point" ? pointButtons : null,
      this.state.dataType === "area" ? areaButtons : null,
      annotationButtons,
      <span key="button-3-0">
        <SelectField
          floatingLabelText="fixedExtent"
          value={this.state.fixedExtent}
          onChange={(e, i, value) => this.setState({ fixedExtent: value })}
        >
          {fixedExtentOptions}
        </SelectField>
      </span>,
      <span key="button-3-1">
        <SelectField
          floatingLabelText="matte"
          value={this.state.matte}
          onChange={(e, i, value) => this.setState({ matte: value })}
        >
          {matteOptions}
        </SelectField>
      </span>,
      <span key="button-3">
        <SelectField
          floatingLabelText="margin"
          value={this.state.margin}
          onChange={(e, i, value) => this.setState({ margin: value })}
        >
          {marginOptions}
        </SelectField>
      </span>,
      <span key="button-4">
        <SelectField
          floatingLabelText="axes"
          value={this.state.axes}
          onChange={(e, i, value) => this.setState({ axes: value })}
        >
          {axesOptions}
        </SelectField>
      </span>,
      this.state.axes === "hover" ? (
        <div key="button-3-1-0">
          <span>
            <SelectField
              floatingLabelText="axisAnnotatable"
              value={this.state.axisAnnotatable}
              onChange={(e, i, value) =>
                this.setState({ axisAnnotatable: value })}
            >
              {axisAnnotationableOptions}
            </SelectField>
          </span>
        </div>
      ) : null,
      <span key="button-5">
        <SelectField
          floatingLabelText="Render Mode"
          value={this.state.renderMode}
          onChange={(e, i, value) => this.setState({ renderMode: value })}
        >
          {renderOptions}
        </SelectField>
      </span>,
      <span key="button-7">
        <SelectField
          floatingLabelText="hoverAnnotation"
          value={this.state.hoverAnnotation}
          onChange={(e, i, value) => this.setState({ hoverAnnotation: value })}
        >
          {hoverAnnotationOptions}
        </SelectField>
      </span>,
      <span key="button-8">
        <SelectField
          floatingLabelText="Canvas Rendering"
          value={this.state.canvasRender}
          onChange={(e, i, value) => this.setState({ canvasRender: value })}
        >
          {canvasRenderOptions}
        </SelectField>
      </span>,
      <span key="button-9">
        <SelectField
          floatingLabelText="Custom Scale"
          value={this.state.customScale}
          onChange={(e, i, value) => this.setState({ customScale: value })}
        >
          {customScaleOptions}
        </SelectField>
      </span>,
      graphicsButtons
    ];

    return (
      <DocumentComponent
        name="XYFrame"
        api="https://github.com/emeeks/semiotic/wiki/XYFrame"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          The XYFrame lets you create scatterplots, line charts and area
          visualizations like contours. You can experiment with the settings to
          see the code necessary to deploy that chart in your app.
        </p>
        <p>
          For instance, adjust the lineType property to see different variations
          of the line chart, such as a bump chart or stacked area chart.
        </p>
        <p>
          Or turn on annotations to see how semiotic automatically processes
          annotations.
        </p>
      </DocumentComponent>
    );
  }
}

XYFrameDocs.title = "XYFrame";

XYFrameDocs.icon = <Icon />;
