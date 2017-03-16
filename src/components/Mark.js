'use strict';

// modules
import React from 'react'
import { select } from 'd3-selection'
import 'd3-transition'

import draggable from '../decorators/draggable'
import { generateSVG } from '../markBehavior/drawing'

import { attributeTransitionWhitelist, styleTransitionWhitelist, reactCSSNameStyleHash } from '../constants/markTransition'

// components


let PropTypes = React.PropTypes;

@draggable
class Mark extends React.Component {
    constructor(props){
        super(props);
        this._mouseup = this._mouseup.bind(this);
        this._mousedown = this._mousedown.bind(this);
        this._mousemove = this._mousemove.bind(this);

        this.state = { translate: [ 0,0 ], mouseOrigin: [], translateOrigin: [ 0,0 ], dragging: false, uiUpdate: false };

    }

    shouldComponentUpdate(nextProps) {
        //data-driven transition time?
        if (this.props.markType !== nextProps.markType ||
            this.state.dragging || this.props.forceUpdate || this.props.renderMode !== nextProps.renderMode || this.props.className !== nextProps.className || this.props.children !== nextProps.children) {
            return true;
        }

        let node = this.node

        const actualSVG = generateSVG(nextProps, nextProps.className)
        let cloneProps = actualSVG.props

        if (!cloneProps) {
            return true
        }

        attributeTransitionWhitelist.forEach(function (attr) {
            if (cloneProps[attr] !== this.props[attr]) {
                select(node)
                    .select("*")
                    .transition(attr)
                    .duration(500)
    //                .duration(cloneProps.transitions.attr.d.transform)
                    .attr(attr, cloneProps[attr])
//                    .each("end", this.forceUpdate);
            }
        }, this)

        if (cloneProps.style) {

        styleTransitionWhitelist.forEach(function (style) {
            if (cloneProps.style[style] !== this.props.style[style]) {

                let nextValue = cloneProps.style[style];

                if (reactCSSNameStyleHash[style]) {
                    style = reactCSSNameStyleHash[style];
                }

                select(node)
                    .select("*")
                    .transition(style)
                    .duration(500)
    //                .duration(nextProps.transitions.attr.d.transform)
                    .style(style, nextValue)
//                    .each("end", this.forceUpdate);
            }
        }, this)
    }

        return false;
    }

     _mouseup() {
        document.onmousemove = null;

        let finalTranslate = [ 0,0 ];
        if (!this.props.resetAfter) finalTranslate = this.state.translate;

        this.setState({ dragging: false, translate: finalTranslate, uiUpdate: false } );
        if (this.props.droppable && this.props.context && this.props.context.dragSource) {
            this.props.dropFunction(this.props.context.dragSource.props, this.props);
            this.props.updateContext("dragSource", undefined);
        }
    }

     _mousedown(event) {
        this.setState({ mouseOrigin: [ event.pageX, event.pageY ], translateOrigin: this.state.translate, dragging: true });
        document.onmouseup = this._mouseup;
        document.onmousemove = this._mousemove;
    }

     _mousemove(event) {
        let xAdjust = this.props.freezeX ? 0 : 1;
        let yAdjust = this.props.freezeY ? 0 : 1;

        let adjustedPosition = [ event.pageX - this.state.mouseOrigin[0], event.pageY - this.state.mouseOrigin[1] ];
        let adjustedTranslate = [ (adjustedPosition[0] + this.state.translateOrigin[0]) * xAdjust, (adjustedPosition[1] + this.state.translateOrigin[1]) * yAdjust ];
        if (this.props.droppable && this.state.uiUpdate === false) {
            this.props.updateContext("dragSource", this);
            this.setState({ translate: adjustedTranslate, uiUpdate: true, dragging: true })
        }
        else {
            this.setState({ translate: adjustedTranslate });
        }

    }
    render() {
        //Currently children are being duplicated in the mark

        let className = this.props.className || "";

        let mouseIn = null;
        let mouseOut = null;

        if (this.props.hoverBehavior) {
            mouseIn = () => {this.props.updateContext("hover", this.props.hoverBehavior())}
            mouseOut = () => {this.props.updateContext("hover", undefined)}

            if (this.props.context.hover === this.props.hoverBehavior()) {
                className += " hover"
            }
        }

        const actualSVG = generateSVG(this.props, className)

        if (this.props.draggable) {
            return <g ref={node => this.node = node} className={className} onMouseEnter={mouseIn} onMouseOut={mouseOut} onDoubleClick={this._doubleclick} style={{ pointerEvents: this.props.droppable && this.state.dragging ? "none" : "all" }} onMouseDown={this._mousedown} onMouseUp={this._mouseup} transform={"translate(" + this.state.translate + ")"} >{actualSVG}</g>;
        }
        else {
            return <g ref={node => this.node = node} className={className} onMouseEnter={mouseIn} onMouseOut={mouseOut} >{actualSVG}</g>;
        }


    }
}

Mark.propTypes = {
    name: PropTypes.string,
    markType: PropTypes.string.isRequired,
    description: PropTypes.string,
    from: PropTypes.object,
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

export default Mark;
