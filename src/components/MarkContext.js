'use strict';

// modules
import React from 'react'

// components

let PropTypes = React.PropTypes;

class MarkContext extends React.Component {
    constructor(props){
        super(props);
        this.mapElements = this.mapElements.bind(this);
        this.shouldComponentUpdate = this.shouldComponentUpdate.bind(this);
        this.updateContext = this.updateContext.bind(this);
        this.state = { context: {} };
    }

    mapElements(element) {

        if (!element) return null

        const props = {
        };

        if (typeof element.type !== "string") {
            props.context = this.state.context
            props.updateContext = this.updateContext
        }
        if (Array.isArray(element)) return element.map(this.mapElements)

        return React.cloneElement(element, props);
    }

    shouldComponentUpdate(nextProps) {
        if (this.props.xyFrameChildren && this.props.renderNumber === nextProps.renderNumber) {
            return false
        }
        return true
    }

    updateContext(prop, value) {
        const currentContext = this.state.context;
        currentContext[prop] = value;
        this.setState({ context: currentContext });
    }

    render(){
        let elements = null;

        if (Array.isArray(this.props.children)) elements = this.props.children.map(this.mapElements)
        else if (typeof this.props.children === "object") elements = this.mapElements(this.props.children)

        let transform = [ 0, 0 ]

        transform[0] = this.props.position ? this.props.position[0] : 0
        transform[1] = this.props.position ? this.props.position[1] : 0

        return <g transform={"translate(" + transform.toString() + ")"} >
            {elements}
        </g>
    }
}

MarkContext.propTypes = {
//    name: PropTypes.string,
    position: PropTypes.array
//    size: PropTypes.array.isRequired,
//    viewport: PropTypes.array,
//    padding: PropTypes.object,
//    scene: PropTypes.object,
//    data: PropTypes.array,
//    scales: PropTypes.object,
//    axes: PropTypes.array,
//    legends: PropTypes.array,
//    marks: PropTypes.array,
//    signals: PropTypes.array
};
export default MarkContext;
