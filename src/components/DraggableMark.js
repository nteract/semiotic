import React from "react";

import Mark from "./Mark";

import PropTypes from "prop-types";

class DraggableMark extends React.Component {
  render() {
    return (
      <Mark
        draggable={true}
        resetAfter={true}
        droppable={true}
        {...this.props}
      />
    );
  }
}

DraggableMark.propTypes = {
  draggable: PropTypes.bool,
  resetAfter: PropTypes.bool,
  droppable: PropTypes.bool
};

export default DraggableMark;
