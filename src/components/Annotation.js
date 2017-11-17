import React from "react";
import { AnnotationLabel } from "react-annotation";

import PropTypes from "prop-types";

class Annotation extends React.Component {
  render() {
    const noteData = this.props.noteData;

    noteData.type =
      typeof noteData.type === "function" ? noteData.type : AnnotationLabel;

    //TODO come back and implement event listeners

    const eventListeners = this.props.noteData.eventListeners || {};
    // return <g {...eventListeners} ref={node => (this.node = node)} />;
    return <noteData.type events={eventListeners} {...noteData} />;
  }
}

Annotation.propTypes = {
  noteData: PropTypes.object
};

export default Annotation;
