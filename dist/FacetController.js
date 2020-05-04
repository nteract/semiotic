"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var React = __importStar(require("react"));
var memoize_one_1 = __importDefault(require("memoize-one"));
var frame_props_1 = require("./constants/frame_props");
var framePropHash = {
    NetworkFrame: frame_props_1.networkframeproptypes,
    XYFrame: frame_props_1.xyframeproptypes,
    OrdinalFrame: frame_props_1.ordinalframeproptypes,
    ResponsiveNetworkFrame: __assign(__assign({}, frame_props_1.networkframeproptypes), frame_props_1.responsiveprops),
    ResponsiveXYFrame: __assign(__assign({}, frame_props_1.xyframeproptypes), frame_props_1.responsiveprops),
    ResponsiveOrdinalFrame: __assign(__assign({}, frame_props_1.ordinalframeproptypes), frame_props_1.responsiveprops),
    SparkNetworkFrame: __assign({}, frame_props_1.networkframeproptypes),
    SparkXYFrame: __assign({}, frame_props_1.xyframeproptypes),
    SparkOrdinalFrame: __assign({}, frame_props_1.ordinalframeproptypes)
};
var invertKeys = {
    rExtent: "invertR",
    xExtent: "invertX",
    yExtent: "invertY",
};
var buildNewState = function (prevState, extentValue, extentType, extentPosition, invertedExtent) {
    var _a, _b;
    var oldExtents = prevState.rawExtents[extentType] || {};
    oldExtents[extentPosition] = extentValue;
    var extentMinMaxValues = Object.values(oldExtents)
        .flat()
        .filter(function (d) { return d !== undefined && d !== null && !isNaN(d); });
    var baseExtent = [Math.min.apply(Math, __spread(extentMinMaxValues)), Math.max.apply(Math, __spread(extentMinMaxValues))];
    if (invertedExtent) {
        baseExtent = baseExtent.reverse();
    }
    return {
        extents: __assign(__assign({}, prevState.extents), (_a = {}, _a[extentType] = extentMinMaxValues.length === 0
            ? undefined
            : baseExtent, _a)),
        rawExtents: __assign(__assign({}, prevState.rawExtents), (_b = {}, _b[extentType] = oldExtents, _b))
    };
};
function validFrameProps(originalProps, frameType) {
    var newProps = {};
    var frameProps = framePropHash[frameType];
    Object.keys(originalProps).forEach(function (key) {
        if (frameProps[key]) {
            newProps[key] = originalProps[key];
        }
    });
    return newProps;
}
var FacetController = /** @class */ (function (_super) {
    __extends(FacetController, _super);
    function FacetController() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.state = {
            extents: {},
            rawExtents: {},
            facetHover: undefined
        };
        /**
         * Helper for creating extent if we have a  min/max value
         * use that else use the onChange version so we can in return
         * normalize all of the facets to have the same extents
         */
        _this.createExtent = function (extentType, state, index) {
            return state.extents && state.extents[extentType]
                ? {
                    onChange: _this.extentHandler(extentType, index),
                    extent: state.extents[extentType]
                }
                : { onChange: _this.extentHandler(extentType, index) };
        };
        /**
         * Whenever the extent changes, create the min/max values for each extentType
         * so this could be rExtent for OrdinalFrame or x/yExtent for the XYFrame
         */
        _this.extentHandler = function (extentType, extentPosition) {
            var invertedExtent = _this.props[invertKeys[extentType]] || false;
            return function (extentValue) {
                _this.setState(function (prevState) {
                    return buildNewState(prevState, extentValue, extentType, extentPosition, invertedExtent);
                });
                return extentValue;
            };
        };
        /**
         * Remove and add required annotation props for specific annotation types.
         */
        _this.generateChildAnnotations = function (_a) {
            var originalAnnotations = _a.originalAnnotations, state = _a.state;
            var annotationBase = state.facetHoverAnnotations;
            var _b = _this.props, hoverAnnotation = _b.hoverAnnotation, pieceHoverAnnotation = _b.pieceHoverAnnotation;
            var annotationSettings = hoverAnnotation || pieceHoverAnnotation;
            if (!annotationSettings || !annotationBase) {
                return originalAnnotations;
            }
            if (state.facetHover) {
                var annotations = __spread(originalAnnotations);
                if (annotationSettings === true) {
                    annotationBase = [__assign({}, state.facetHover)];
                }
                else {
                    var annotationMap = annotationSettings;
                    annotationBase = annotationMap.map(function (annotation) {
                        var decoratedAnnotation = typeof annotation === "function"
                            ? annotation(state.facetHover)
                            : __assign(__assign({}, state.facetHover), annotation);
                        return decoratedAnnotation;
                    });
                }
                if (Array.isArray(annotationBase)) {
                    annotationBase.forEach(function (annotation) {
                        if (typeof annotation !== "function") {
                            if (annotation.type === "column-hover") {
                                annotation.facetColumn = annotation.column.name;
                                annotation.column = undefined;
                            }
                            else {
                                if (!annotation.type) {
                                    annotation.type = "frame-hover";
                                }
                                annotation.y = undefined;
                                annotation.yBottom = undefined;
                                annotation.yMiddle = undefined;
                                annotation.yTop = undefined;
                            }
                        }
                    });
                    annotations.push.apply(annotations, __spread(annotationBase));
                }
                return annotations;
            }
            return originalAnnotations;
        };
        /**
         * Map hover annotations and extent to child. Initially the extent is an object with
         * an onChange handler however once each of those resolve we then create an
         * extent that matches between all of them. This logic can be found in createExtent and also
         * extentHandler
         */
        _this.mapChildrenWithAppropriateProps = function (_a) {
            var child = _a.child, index = _a.index, originalAnnotations = _a.originalAnnotations, props = _a.props, state = _a.state;
            var childType = child.type;
            var frameType = childType.displayName;
            var annotations = _this.generateChildAnnotations({
                state: state,
                originalAnnotations: originalAnnotations
            });
            var customProps = __assign(__assign({}, props), { annotations: annotations });
            if (!framePropHash[frameType]) {
                return React.cloneElement(child, { facetprops: customProps });
            }
            // pieceHoverAnnotation could be an object, so we need to be explicit in checking for true
            if (props.hoverAnnotation || props.pieceHoverAnnotation) {
                customProps.customHoverBehavior = function (d) {
                    _this.setState({
                        facetHover: d,
                        facetHoverAnnotations: props.hoverAnnotation || props.pieceHoverAnnotation
                    });
                };
            }
            if ((frameType === "OrdinalFrame" ||
                frameType === "ResponsiveOrdinalFrame" ||
                frameType === "SparkOrdinalFrame") &&
                props.sharedRExtent === true) {
                var invertedExtent_1 = customProps[invertKeys["rExtent"]] || false;
                customProps.rExtent = _this.createExtent("rExtent", state, index);
                customProps.onUnmount = function () {
                    _this.setState(function (prevState) {
                        return buildNewState(prevState, [], "rExtent", index, invertedExtent_1);
                    });
                };
            }
            if ((frameType === "XYFrame" ||
                frameType === "ResponsiveXYFrame" ||
                frameType === "SparkXYFrame") &&
                props.sharedXExtent === true) {
                var invertedExtent_2 = customProps[invertKeys["xExtent"]] || false;
                customProps.xExtent = _this.createExtent("xExtent", state, index);
                customProps.onUnmount = function () {
                    _this.setState(function (prevState) {
                        return buildNewState(prevState, [], "xExtent", index, invertedExtent_2);
                    });
                };
            }
            if ((frameType === "XYFrame" ||
                frameType === "ResponsiveXYFrame" ||
                frameType === "SparkXYFrame") &&
                props.sharedYExtent === true) {
                var invertedExtent_3 = customProps[invertKeys["yExtent"]] || false;
                customProps.yExtent = _this.createExtent("yExtent", state, index);
                customProps.onUnmount = function () {
                    _this.setState(function (prevState) {
                        return buildNewState(prevState, [], "yExtent", index, invertedExtent_3);
                    });
                };
            }
            if (customProps.pieceHoverAnnotation) {
                customProps.pieceHoverAnnotation = [];
            }
            else if (customProps.hoverAnnotation) {
                customProps.hoverAnnotation = [];
            }
            return React.cloneElement(child, validFrameProps(customProps, frameType));
        };
        /**
         * Memoize the mapping to prevent unecessary updates and not have
         * to use the lifecycle methods.
         */
        _this.processFacetController = memoize_one_1.default(function (props, state) {
            return React.Children.map(props.children, function (child, index) {
                if (!child)
                    return null;
                return _this.mapChildrenWithAppropriateProps({
                    child: child,
                    index: index,
                    originalAnnotations: child.props.annotations || [],
                    props: props,
                    state: state
                });
            });
        });
        return _this;
    }
    FacetController.prototype.render = function () {
        return (React.createElement(React.Fragment, null, this.processFacetController(this.props, this.state)));
    };
    return FacetController;
}(React.Component));
exports.default = FacetController;
//# sourceMappingURL=FacetController.js.map