import React from "react";
import { select } from "d3-selection";
import { annotation } from "d3-svg-annotation";

import PropTypes from "prop-types";

class Annotation extends React.Component {
  constructor(props) {
    super(props);
    this.createAnnotation = this.createAnnotation.bind(this);
  }

  componentDidMount() {
    this.createAnnotation();
  }

  componentDidUpdate() {
    this.createAnnotation();
  }

  createAnnotation() {
    const node = this.node;
    const noteData = this.props.noteData;

    noteData.type =
      typeof noteData.type === "function" ? noteData.type : undefined;

    const makeAnnotations = annotation().annotations([noteData]);

    select(node)
      .selectAll("*")
      .remove();

    select(node).call(makeAnnotations);
  }

  render() {
    const eventListeners = this.props.noteData.eventListeners || {};
    return <g {...eventListeners} ref={node => (this.node = node)} />;
  }
}

Annotation.propTypes = {
  noteData: PropTypes.object
};

export default Annotation;
