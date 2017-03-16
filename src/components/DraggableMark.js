import React from 'react'

import Mark from './Mark'

let PropTypes = React.PropTypes;

class DraggableMark extends React.Component {
    constructor(props){
        super(props);
    }
    render() {
        //Currently children are being duplicated in the mark

        return <Mark
            draggable={true}
            resetAfter={true}
            droppable={true}
            {...this.props} />
    }
}

DraggableMark.propTypes = {
    name: PropTypes.string,
    markType: PropTypes.string.isRequired,
    description: PropTypes.string,
    from: PropTypes.object,
    key: PropTypes.string,
    delay: PropTypes.number,
    ease: PropTypes.string,
    update: PropTypes.object,
    enter: PropTypes.object,
    exit: PropTypes.object,
    value: PropTypes.object,
    field: PropTypes.string,
    scale: PropTypes.object,
    renderMode: PropTypes.string,
    draggable: PropTypes.bool,
    droppable: PropTypes.bool
};

export default DraggableMark;
