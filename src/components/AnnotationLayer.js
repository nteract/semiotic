// modules
import React from "react";
//import { load } from 'opentype.js'
import {
  basicVerticalSorting,
  bumpAnnotations
} from "./annotationLayerBehavior/annotationHandling";
import PropTypes from "prop-types";
import Legend from "./Legend";
import Annotation from "./Annotation";

function adjustedAnnotationKeyMapper(d) {
  return d.props.noteData.id || `${d.props.noteData.x}-${d.props.noteData.y}`;
}

function objectStringKey(object) {
  let finalKey = "";
  Object.keys(object).forEach(key => {
    finalKey +=
      !object[key] || !object[key].toString
        ? object[key]
        : object[key].toString();
  });

  return finalKey;
}

class AnnotationLayer extends React.Component {
  constructor(props) {
    super(props);

    this.generateSVGAnnotations = this.generateSVGAnnotations.bind(this);
    this.generateHTMLAnnotations = this.generateHTMLAnnotations.bind(this);

    this.state = {
      font: undefined,
      svgAnnotations: [],
      htmlAnnotations: [],
      adjustedAnnotations: 0,
      adjustedAnnotationsKey: "",
      adjustedAnnotationsDataVersion: ""
    };
  }

  /*    componentWillMount() {
      const fontLocation = this.props.fontLocation

      if (fontLocation) {
        load(fontLocation, function(err, font) {
            if (err) {
                return null
            } else {
                this.setState({ font });
            }
        });
      }
    } */

  generateSVGAnnotations(props, annotations) {
    const renderedAnnotations = annotations
      .map((d, i) => props.svgAnnotationRule(d, i, props))
      .filter(d => d !== null && d !== undefined);

    return renderedAnnotations;
  }

  generateHTMLAnnotations(props, annotations) {
    const renderedAnnotations = annotations
      .map((d, i) => props.htmlAnnotationRule(d, i, props))
      .filter(d => d !== null && d !== undefined);

    return renderedAnnotations;
  }

  processAnnotations(adjustableAnnotations, annotationProcessor, props) {
    if (annotationProcessor.type === false) {
      return adjustableAnnotations;
    }

    let {
      margin = { top: 0, bottom: 0, left: 0, right: 0 },
      size,
      axes
    } = props;

    margin =
      typeof margin === "number"
        ? { top: margin, left: margin, right: margin, bottom: margin }
        : margin;

    if (annotationProcessor.type === "bump") {
      const adjustedAnnotations = bumpAnnotations(adjustableAnnotations, props);
      return adjustedAnnotations;
    } else if (annotationProcessor.type === "marginalia") {
      adjustableAnnotations.sort(
        (a, b) => a.props.noteData.y - b.props.noteData.y
      );
      let adjustedAnnotations = [];
      if (annotationProcessor.orient === "nearest") {
        const adjustedAnnotationsLeft = basicVerticalSorting({
          annotationLayout: annotationProcessor.type,
          adjustableAnnotations: adjustableAnnotations.filter(
            d =>
              Math.abs(margin.left - d.props.noteData.x) <=
              Math.abs(size[0] - margin.right - d.props.noteData.x)
          ),
          margin,
          size,
          axes,
          orient: "left",
          textHeight: annotationProcessor.textHeight,
          textPadding: annotationProcessor.textPadding,
          textMargin: annotationProcessor.margin
        });

        const adjustedAnnotationsRight = basicVerticalSorting({
          annotationLayout: annotationProcessor.type,
          adjustableAnnotations: adjustableAnnotations.filter(
            d =>
              Math.abs(margin.left - d.props.noteData.x) >
              Math.abs(size[0] - margin.right - d.props.noteData.x)
          ),
          margin,
          size,
          axes,
          orient: "right",
          textHeight: annotationProcessor.textHeight,
          textPadding: annotationProcessor.textPadding,
          textMargin: annotationProcessor.margin
        });
        adjustedAnnotations = [
          ...adjustedAnnotationsLeft,
          ...adjustedAnnotationsRight
        ];
      } else {
        adjustedAnnotations = basicVerticalSorting({
          annotationLayout: annotationProcessor.type,
          adjustableAnnotations,
          margin,
          size,
          axes,
          orient: annotationProcessor.orient,
          textHeight: annotationProcessor.textHeight,
          textPadding: annotationProcessor.textPadding,
          textMargin: annotationProcessor.margin
        });
      }
      return adjustedAnnotations;
    }

    console.error(
      "Unknown annotation handling function: Must be of a string 'bump' or 'marginalia' or a an object with type of those strings or a function that takes adjustable annotations and returns adjusted annotations"
    );
  }

  createAnnotations(props) {
    let renderedSVGAnnotations = this.state.svgAnnotations,
      renderedHTMLAnnotations = [],
      adjustedAnnotations = this.state.adjustedAnnotations,
      adjustableAnnotationsKey = this.state.adjustedAnnotationsKey,
      adjustedAnnotationsKey = this.state.adjustedAnnotationsKey,
      adjustedAnnotationsDataVersion = this.state
        .adjustedAnnotationsDataVersion;

    const { annotations, annotationHandling = false } = props;
    const annotationProcessor =
      typeof annotationHandling !== "object"
        ? { type: annotationHandling }
        : annotationHandling;

    const { dataVersion = "" } = annotationProcessor;

    if (this.props.svgAnnotationRule) {
      const initialSVGAnnotations = this.generateSVGAnnotations(
        props,
        annotations
      );
      const adjustableAnnotations = initialSVGAnnotations.filter(
        d => d.props && d.props.noteData && !d.props.noteData.fixedPosition
      );
      const fixedAnnotations = initialSVGAnnotations.filter(
        d => !d.props || !d.props.noteData || d.props.noteData.fixedPosition
      );
      adjustableAnnotationsKey =
        adjustableAnnotations.map(adjustedAnnotationKeyMapper).join(",") +
        objectStringKey(
          Object.assign(annotationProcessor, {
            point: props.pointSizeFunction,
            label: props.labelSizeFunction
          })
        );

      if (annotationProcessor.type === false) {
        adjustedAnnotations = adjustableAnnotations;
      }

      if (
        adjustedAnnotations.length !== adjustableAnnotations.length ||
        adjustedAnnotationsKey !== adjustableAnnotationsKey ||
        adjustedAnnotationsDataVersion !== dataVersion
      ) {
        adjustedAnnotations = this.processAnnotations(
          adjustableAnnotations,
          annotationProcessor,
          props
        );
      } else {
        //Handle when style or other attributes change
        adjustedAnnotations = adjustedAnnotations.map((d, i) => {
          const newNoteData = Object.assign(
            adjustableAnnotations[i].props.noteData,
            { nx: d.props.noteData.nx, ny: d.props.noteData.ny }
          );
          return <Annotation key={d.key} noteData={newNoteData} />;
        });
      }

      renderedSVGAnnotations = [...adjustedAnnotations, ...fixedAnnotations];
    }

    if (this.props.htmlAnnotationRule) {
      renderedHTMLAnnotations = this.generateHTMLAnnotations(
        props,
        annotations
      );
    }

    this.setState({
      svgAnnotations: renderedSVGAnnotations,
      htmlAnnotations: renderedHTMLAnnotations,
      adjustedAnnotations: adjustedAnnotations,
      adjustedAnnotationsKey: adjustableAnnotationsKey,
      adjustedAnnotationsDataVersion: dataVersion
    });
  }

  componentWillMount() {
    this.createAnnotations(this.props);
  }

  componentWillReceiveProps(nextProps) {
    this.createAnnotations(nextProps);
  }

  render() {
    const { svgAnnotations, htmlAnnotations } = this.state;

    let renderedLegend;
    if (this.props.legendSettings) {
      const { width = 100 } = this.props.legendSettings;
      const positionHash = {
        left: [15, 15],
        right: [this.props.size[0] - width - 15, 15]
      };
      const {
        position = "right",
        title = "Legend"
      } = this.props.legendSettings;
      const legendPosition = positionHash[position] || position;
      renderedLegend = (
        <g transform={`translate(${legendPosition})`}>
          <Legend
            {...this.props.legendSettings}
            title={title}
            position={position}
          />
        </g>
      );
    }

    return (
      <div
        className="annotation-layer"
        style={{
          position: "absolute",
          pointerEvents: "none",
          background: "none"
        }}
      >
        <div
          className="annotation-layer-html"
          style={{
            background: "none",
            pointerEvents: "none",
            position: "absolute",
            height: this.props.size[1] + "px",
            width: this.props.size[0] + "px"
          }}
        >
          {htmlAnnotations}
        </div>
        <svg
          className="annotation-layer-svg"
          height={this.props.size[1]}
          width={this.props.size[0]}
          style={{ background: "none", pointerEvents: "none" }}
        >
          {renderedLegend}
          {svgAnnotations}
        </svg>
      </div>
    );
  }
}

AnnotationLayer.propTypes = {
  scale: PropTypes.func,
  orient: PropTypes.string,
  title: PropTypes.string,
  format: PropTypes.string,
  values: PropTypes.array,
  properties: PropTypes.object,
  position: PropTypes.array
};

export default AnnotationLayer;
