'use strict';

// modules
import React from 'react'

// components

let PropTypes = React.PropTypes;

class AnnotationLayer extends React.Component {
    constructor(props){
        super(props);

        this.generateSVGAnnotations = this.generateSVGAnnotations.bind(this)
        this.generateHTMLAnnotations = this.generateHTMLAnnotations.bind(this)
    }

    generateSVGAnnotations() {
      let annotations = this.props.annotations
        .map((d,i) => this.props.svgAnnotationRule(d,i,this.props))
        .filter(d => d !== null && d !== undefined);

      return annotations;
    }
    generateHTMLAnnotations() {
      let annotations = this.props.annotations
        .map((d,i) => this.props.htmlAnnotationRule(d,i,this.props))
        .filter(d => d !== null && d !== undefined);

      return annotations;
    }

    render() {

      let svgAnnotations = [];
      let htmlAnnotations = [];

      if (this.props.svgAnnotationRule) {
        svgAnnotations = this.generateSVGAnnotations();
      }

      if (this.props.htmlAnnotationRule) {
        htmlAnnotations = this.generateHTMLAnnotations();
      }

      return <div className="xyframe-annotation-layer" style={{ position: "absolute", pointerEvents: "none", background: "none" }}>
        <div style={{ background: "none", pointerEvents: "none", position: "absolute", height: this.props.size[1] + "px", width: this.props.size[0] + "px" }}>
          {htmlAnnotations}
        </div>
        <svg height={this.props.size[1]} width={this.props.size[0]} style={{ background: "none", pointerEvents: "none" }}>
          {svgAnnotations}
        </svg>
      </div>

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

module.exports = AnnotationLayer;
