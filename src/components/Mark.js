import React from "react";
import { select } from "d3-selection";
import "d3-transition";

import { interpolate } from "flubber";

// Decorator stopped working why?
//import draggable from '../decorators/draggable'
import { generateSVG } from "./markBehavior/drawing";

import {
  attributeTransitionWhitelist,
  styleTransitionWhitelist,
  reactCSSNameStyleHash
} from "./constants/markTransition";

import PropTypes from "prop-types";

// components

function coordsOrPathstring(d) {
  const splitToMs = d
    .split("M")
    .filter(p => p !== "")
    .map(p => `M${p}`);
  return { length: splitToMs.length, coords: splitToMs };
}

//@draggable
class Mark extends React.Component {
  constructor(props) {
    super(props);
    this._mouseup = this._mouseup.bind(this);
    this._mousedown = this._mousedown.bind(this);
    this._mousemove = this._mousemove.bind(this);

    this.state = {
      translate: [0, 0],
      mouseOrigin: [],
      translateOrigin: [0, 0],
      dragging: false,
      uiUpdate: false
    };
  }

  shouldComponentUpdate(nextProps) {
    //data-driven transition time?
    if (
      this.props.markType !== nextProps.markType ||
      this.state.dragging ||
      this.props.forceUpdate ||
      nextProps.forceUpdate ||
      this.props.renderMode !== nextProps.renderMode ||
      this.props.className !== nextProps.className ||
      this.props.children !== nextProps.children
    ) {
      return true;
    }

    let node = this.node;

    const actualSVG = generateSVG(nextProps, nextProps.className);
    let cloneProps = actualSVG.props;

    if (!cloneProps) {
      return true;
    }

    attributeTransitionWhitelist.forEach(function(attr) {
      if (
        select(node).select("*").transition &&
        (attr !== "d" ||
          (this.props.d &&
            nextProps.d &&
            this.props.d.match(/NaN/g) === null &&
            nextProps.d.match(/NaN/g) === null &&
            ((this.props.d.match(/a/gi) === null &&
              nextProps.d.match(/a/gi) === null) ||
              (this.props.d.match(/a/gi) !== null &&
                nextProps.d.match(/a/gi) !== null))))
      ) {
        if (cloneProps[attr] !== this.props[attr]) {
          if (
            !this.props.simpleInterpolate &&
            !nextProps.simpleInterpolate &&
            attr === "d" &&
            this.props.markType === "path" &&
            nextProps.markType === "path" &&
            this.props.d.match(/a/gi) === null &&
            nextProps.d.match(/a/gi) === null
          ) {
            const prevD = coordsOrPathstring(this.props.d);
            const nextD = coordsOrPathstring(nextProps.d);
            const dummy = [[0, 0], [1, 1], [2, 2]];
            const interpolators = (nextD.length > prevD.length
              ? nextD
              : prevD).coords.map((c, i) => {
              return interpolate(
                prevD.coords[i] || dummy,
                nextD.coords[i] || dummy,
                { maxSegmentLength: this.props.flubberSegments || 10 }
              );
            });
            select(node)
              .select("*")
              .transition(attr)
              .duration(1000)
              .attrTween("d", () => {
                return t => {
                  const interps = interpolators.map(d => d(t)).join("");
                  return interps;
                };
              });
          } else {
            select(node)
              .select("*")
              .transition(attr)
              .duration(1000)
              //                .duration(cloneProps.transitions.attr.d.transform)
              .attr(attr, cloneProps[attr]);
            //                    .each('end', this.forceUpdate);
          }
        }
      } else {
        select(node)
          .select("*")
          .attr(attr, cloneProps[attr]);
      }
    }, this);

    if (cloneProps.style) {
      styleTransitionWhitelist.forEach(function(style) {
        if (cloneProps.style[style] !== this.props.style[style]) {
          let nextValue = cloneProps.style[style];

          if (reactCSSNameStyleHash[style]) {
            style = reactCSSNameStyleHash[style];
          }

          if (select(node).select("*").transition) {
            select(node)
              .select("*")
              .transition(style)
              .duration(1000)
              //                  .duration(nextProps.transitions.attr.d.transform)
              .style(style, nextValue);
            //                  .each('end', this.forceUpdate);
          } else {
            select(node)
              .select("*")
              .style(style, nextValue);
          }
        }
      }, this);
    }

    return false;
  }

  _mouseup() {
    document.onmousemove = null;

    let finalTranslate = [0, 0];
    if (!this.props.resetAfter) finalTranslate = this.state.translate;

    this.setState({
      dragging: false,
      translate: finalTranslate,
      uiUpdate: false
    });
    if (
      this.props.dropFunction &&
      this.props.context &&
      this.props.context.dragSource
    ) {
      this.props.dropFunction(this.props.context.dragSource.props, this.props);
      this.props.updateContext("dragSource", undefined);
    }
  }

  _mousedown(event) {
    this.setState({
      mouseOrigin: [event.pageX, event.pageY],
      translateOrigin: this.state.translate,
      dragging: true
    });
    document.onmouseup = this._mouseup;
    document.onmousemove = this._mousemove;
  }

  _mousemove(event) {
    let xAdjust = this.props.freezeX ? 0 : 1;
    let yAdjust = this.props.freezeY ? 0 : 1;

    let adjustedPosition = [
      event.pageX - this.state.mouseOrigin[0],
      event.pageY - this.state.mouseOrigin[1]
    ];
    let adjustedTranslate = [
      (adjustedPosition[0] + this.state.translateOrigin[0]) * xAdjust,
      (adjustedPosition[1] + this.state.translateOrigin[1]) * yAdjust
    ];
    if (this.props.dropFunction && this.state.uiUpdate === false) {
      this.props.updateContext("dragSource", this);
      this.setState({
        translate: adjustedTranslate,
        uiUpdate: true,
        dragging: true
      });
    } else {
      this.setState({ translate: adjustedTranslate });
    }
  }
  render() {
    //Currently children are being duplicated in the mark

    let className = this.props.className || "";

    let mouseIn = null;
    let mouseOut = null;

    const actualSVG = generateSVG(this.props, className);

    if (this.props.draggable) {
      return (
        <g
          ref={node => (this.node = node)}
          className={className}
          onMouseEnter={mouseIn}
          onMouseOut={mouseOut}
          onDoubleClick={this._doubleclick}
          style={{
            pointerEvents:
              this.props.dropFunction && this.state.dragging ? "none" : "all"
          }}
          onMouseDown={this._mousedown}
          onMouseUp={this._mouseup}
          transform={"translate(" + this.state.translate + ")"}
        >
          {actualSVG}
        </g>
      );
    } else {
      return (
        <g
          ref={node => (this.node = node)}
          className={className}
          onMouseEnter={mouseIn}
          onMouseOut={mouseOut}
        >
          {actualSVG}
        </g>
      );
    }
  }
}

Mark.propTypes = {
  markType: PropTypes.string.isRequired,
  forceUpdate: PropTypes.bool,
  renderMode: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  draggable: PropTypes.bool,
  dropFunction: PropTypes.func,
  resetAfter: PropTypes.bool,
  freezeX: PropTypes.bool,
  freezeY: PropTypes.bool,
  context: PropTypes.object,
  updateContext: PropTypes.func,
  className: PropTypes.string
};

export default Mark;
