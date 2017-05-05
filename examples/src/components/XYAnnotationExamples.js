import React from 'react'
import { XYFrame } from 'semiotic';
import { curveCardinal } from 'd3-shape'

const testData = [
    { id: "linedata-1", color: "#00a2ce", data: [ { y: 5, x: 1 }, { y: 7, x: 2 }, { y: 7, x: 3 }, { y: 4, x: 4 }, { y: 2, x: 5 }, { y: 3, x: 6 }, { y: 5, x: 7 } ] },
    { id: "linedata-2", color: "#4d430c", data: [ { y: 1, x: 1 }, { y: 6, x: 2 }, { y: 8, x: 3 }, { y: 6, x: 4 }, { y: 4, x: 5 }, { y: 2, x: 6 }, { y: 0, x: 7 } ] },
    { id: "linedata-3", color: "#b3331d", data: [ { y: 10, x: 1 }, { y: 8, x: 2 }, { y: 2, x: 3 }, { y: 3, x: 4 }, { y: 3, x: 5 }, { y: 4, x: 6 }, { y: 4, x: 7 } ] },
    { id: "linedata-4", color: "#b6a756", data: [ { y: 6, x: 1 }, { y: 3, x: 2 }, { y: 3, x: 3 }, { y: 5, x: 4 }, { y: 6, x: 5 }, { y: 6, x: 6 }, { y: 6, x: 7 } ] }
]

class NameForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = { value: '', type: "x" };
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
    //You could also mutate the existing annotation
    //this.props.updateAnnotations(Object.assign(this.props.dataPoint, { type: "x", label: this.state.value }))
    this.props.updateAnnotations(Object.assign({}, this.props.dataPoint, { type: this.state.type, label: this.state.value }))
  }

  render() {
    return <form style={{ background: "#DDDDDD" }} onSubmit={this.handleSubmit}>
        <p>{this.props.dataPoint.x},{this.props.dataPoint.y}</p>
        <p>Name:</p>
        <input type="text" value={this.state.value} onChange={this.handleChange} />
        <select value={this.state.type} onChange={this.changeType}>
            <option label="x" value="x">X</option>
            <option label="y" value="y">Y</option>
            <option label="xy" value="xy">XY</option>
        </select>
        <input type="submit" value="Submit" />
      </form>
  }
}


class XYFrameExamples extends React.Component {
    constructor(props){
        super(props);
        this.clickPoint = this.clickPoint.bind(this)
        this.customHTMLRules = this.customHTMLRules.bind(this)
        this.updateAnnotations = this.updateAnnotations.bind(this)
        this.changeLineType = this.changeLineType.bind(this);

        this.state = { annotations: [], lineType: "bumparea", axisAnnotation: { type: "y", y: 0, label: "click on axis to add an annotation" } }
    }

    changeLineType() {
        this.setState({ lineType: this.state.lineType === "bumparea" ? "line" : "bumparea" });
    }

    clickPoint(d) {
        const formlessAnnotations = this.state.annotations.filter(p => p.type !== "form")
        const formAnnotation = Object.assign({ type: "form" }, d)
        formlessAnnotations.push(formAnnotation)
        this.setState({ annotations: formlessAnnotations })
    }

    customHTMLRules({ screenCoordinates, d }) {
        if (d.type === "form") {
            return <div style={{ pointerEvents: "all", position: "absolute", left: screenCoordinates[0], top: screenCoordinates[1] }}>
                <NameForm updateAnnotations={this.updateAnnotations} dataPoint={d} />
            </div>
        }
        //If you don't return null, it will suppress the rest of your HTML rules
        return null
    }

    updateAnnotations(newAnnotation) {
        const formlessAnnotations = this.state.annotations.filter(d => d.type !== "form")
        formlessAnnotations.push(newAnnotation)
        this.setState({ annotations: formlessAnnotations })
    }

    render() {
       const frameHeight = 200

       let displayData = testData

       const exampleAnnotations = [
        { x: 3, y: 3, type: "xy", label: "xy" },
        { x: 4, id: "linedata-222", type: "xy", label: "xy ID" },
        { x: 4, id: "linedata-3", type: "xy", label: "xy ID" },
        { type: "enclose", rp: "top", rd: 25, coordinates: [ { x: 6, id: "linedata-3" }, { x: 6, id: "linedata-4" } ], label: "enclose ID" },
        { x: 3, y: 90, dy: -30, type: "x", label: "x" },
        { x: { lineID: "line-1", pointID: "point-17" }, y: 90, dy: -30, type: "x", label: "x" },
        { x: 240, y: 3, type: "y", label: "y" },
        { type: "enclose", rp: "top", rd: 25, coordinates: [ { x: 1, y: 5 }, { x: 2, y: 8 }, { x: 2, y: 10 } ], label: "enclose" }
       ]

      const axes = [
        { key: "yAxis", orient: "left", className: "yscale", name: "CountAxis", tickFormat: (d) => d + "%" },
        { key: "xAxis", orient: "bottom", className: "xscale", name: "TimeAxis", tickValues: [ 1, 2, 3, 4, 5, 6, 7 ], tickFormat: d => d + " day" }
      ]

       const allAnnotations = [ ...exampleAnnotations, ...this.state.annotations ]

        return <div>
            <button onClick={this.changeLineType}>Change Type Line</button>
            <XYFrame
            size={[ 500,frameHeight ]}
            lines={displayData}
            lineDataAccessor={d => d.data}
            xAccessor={d => d.x}
            yAccessor={d => d.y}
            lineStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color })}
            hoverAnnotation={true}
            customClickBehavior={this.clickPoint}
            annotations={allAnnotations}
            htmlAnnotationRules={this.customHTMLRules}
            customLineType={{ type: this.state.lineType, interpolator: curveCardinal, sort: null }}
            margin={10}
            />
            <XYFrame
            title="axisAnnotationFunction sends { type, value }"
            size={[ 500,400 ]}
            lines={testData}
            lineDataAccessor={d => d.data}
            xAccessor={d => d.x}
            yAccessor={d => d.y}
            lineStyle={d => ({ fill: d.color, fillOpacity: 0.5, stroke: d.color })}
            hoverAnnotation={true}
            customLineType={"line"}
            axes={axes}
            axisAnnotationFunction={d => this.setState({ axisAnnotation: { type: d.type, [d.type]: d.value, label: "clicked annotation" } })}
            margin={ 50 }
            annotations={[ this.state.axisAnnotation ]}
            />
            </div>
    }
}

module.exports = XYFrameExamples;
