"use strict";
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var React = __importStar(require("react"));
var coordinateNames_1 = require("../constants/coordinateNames");
var d3_array_1 = require("d3-array");
var d3_voronoi_1 = require("d3-voronoi");
var semiotic_mark_1 = require("semiotic-mark");
var constructDataObject = function (d, points) {
    if (d === undefined)
        return d;
    return d && d.data ? __assign(__assign({ points: points }, d.data), d) : __assign({ points: points }, d);
};
exports.changeVoronoi = function (voronoiHover, d, customHoverTypes, customHoverBehavior, points) {
    //Until semiotic 2
    var dataObject = constructDataObject(d, points);
    if (customHoverBehavior)
        customHoverBehavior(dataObject);
    if (!d)
        voronoiHover(null);
    else if (customHoverTypes === true) {
        var vorD = Object.assign({}, dataObject);
        vorD.type = vorD.type === "column-hover" ? "column-hover" : "frame-hover";
        voronoiHover(vorD);
    }
    else if (customHoverTypes) {
        var arrayWrappedHoverTypes = Array.isArray(customHoverTypes)
            ? customHoverTypes
            : [customHoverTypes];
        var mappedHoverTypes = arrayWrappedHoverTypes
            .map(function (c) {
            var finalC = typeof c === "function" ? c(dataObject) : c;
            if (!finalC)
                return undefined;
            return Object.assign({}, dataObject, finalC);
        })
            .filter(function (d) { return d; });
        voronoiHover(mappedHoverTypes);
    }
};
exports.clickVoronoi = function (d, customClickBehavior, points) {
    //Until semiotic 2
    var dataObject = constructDataObject(d, points);
    if (customClickBehavior)
        customClickBehavior(dataObject);
};
exports.doubleclickVoronoi = function (d, customDoubleClickBehavior, points) {
    //Until semiotic 2
    var dataObject = constructDataObject(d, points);
    if (customDoubleClickBehavior)
        customDoubleClickBehavior(dataObject);
};
exports.brushStart = function (e, columnName, data, columnData, interaction) {
    if (interaction && interaction.start)
        interaction.start(e, columnName, data, columnData);
};
exports.brushing = function (e, columnName, data, columnData, interaction) {
    if (interaction && interaction.during)
        interaction.during(e, columnName, data, columnData);
};
exports.brushEnd = function (e, columnName, data, columnData, interaction) {
    if (interaction && interaction.end)
        interaction.end(e, columnName, data, columnData);
};
exports.calculateOverlay = function (props) {
    var voronoiPaths = [];
    var xScale = props.xScale, yScale = props.yScale, points = props.points, projectedX = props.projectedX, showLinePoints = props.showLinePoints, size = props.size, overlay = props.overlay, _a = props.interactionOverflow, interactionOverflow = _a === void 0 ? { top: 0, bottom: 0, left: 0, right: 0 } : _a, customClickBehavior = props.customClickBehavior, customDoubleClickBehavior = props.customDoubleClickBehavior, customHoverBehavior = props.customHoverBehavior, hoverAnnotation = props.hoverAnnotation, voronoiHover = props.voronoiHover, margin = props.margin, _b = props.advancedSettings, advancedSettings = _b === void 0 ? {} : _b;
    var whichPoints = {
        top: coordinateNames_1.projectedYTop,
        bottom: coordinateNames_1.projectedYBottom
    };
    var pointerStyle = customClickBehavior || customDoubleClickBehavior
        ? { cursor: "pointer" }
        : {};
    if (points && hoverAnnotation && !overlay) {
        var _c = advancedSettings.voronoiFilter, voronoiFilter_1 = _c === void 0 ? function () { return true; } : _c;
        var voronoiDataset_1 = [];
        var voronoiUniqueHash_1 = {};
        points.filter(function (d) { return voronoiFilter_1(__assign(__assign({}, d), d.data)); }).forEach(function (d) {
            var xValue = Math.floor(xScale(d[projectedX]));
            var yValue = Math.floor(yScale(showLinePoints && d[whichPoints[showLinePoints]] !== undefined
                ? d[whichPoints[showLinePoints]]
                : d[coordinateNames_1.projectedYMiddle] !== undefined
                    ? d[coordinateNames_1.projectedYMiddle]
                    : d[coordinateNames_1.projectedY]));
            if (xValue >= (0 - margin.left) &&
                xValue <= (size[0] + margin.right) &&
                yValue >= (0 - margin.top) &&
                yValue <= (size[1] + margin.bottom) &&
                xValue !== undefined &&
                yValue !== undefined &&
                isNaN(xValue) === false &&
                isNaN(yValue) === false) {
                var pointKey = xValue + "," + yValue;
                if (!voronoiUniqueHash_1[pointKey]) {
                    var voronoiPoint = __assign(__assign({}, d), { coincidentPoints: [d], voronoiX: xValue, voronoiY: yValue });
                    voronoiDataset_1.push(voronoiPoint);
                    voronoiUniqueHash_1[pointKey] = voronoiPoint;
                }
                else
                    voronoiUniqueHash_1[pointKey].coincidentPoints.push(d);
            }
        });
        var voronoiXExtent = d3_array_1.extent(voronoiDataset_1.map(function (d) { return d.voronoiX; }));
        var voronoiYExtent = d3_array_1.extent(voronoiDataset_1.map(function (d) { return d.voronoiY; }));
        var voronoiExtent = [
            [
                Math.min(voronoiXExtent[0] - 5, -interactionOverflow.left),
                Math.min(voronoiYExtent[0] - 5, -interactionOverflow.top)
            ],
            [
                Math.max(voronoiXExtent[1] + 5, size[0] + interactionOverflow.right),
                Math.max(voronoiYExtent[1] + 5, size[1] + interactionOverflow.bottom)
            ]
        ];
        var voronoiDiagram = d3_voronoi_1.voronoi()
            .extent(voronoiExtent)
            .x(function (d) { return d.voronoiX; })
            .y(function (d) { return d.voronoiY; });
        var voronoiData = voronoiDiagram.polygons(voronoiDataset_1);
        voronoiPaths = voronoiData.map(function (d, i) {
            var clipPath = null;
            if (advancedSettings.voronoiClipping) {
                var circleSize = advancedSettings.voronoiClipping === true ? 50 : advancedSettings.voronoiClipping;
                var correspondingD = voronoiDataset_1[i];
                clipPath = React.createElement("clipPath", { id: "voronoi-" + i },
                    React.createElement("circle", { r: circleSize, cx: correspondingD.voronoiX, cy: correspondingD.voronoiY }));
            }
            return (React.createElement("g", { key: "voronoi-" + i },
                React.createElement("path", { onClick: function () {
                        exports.clickVoronoi(voronoiDataset_1[i], customClickBehavior, points);
                    }, onDoubleClick: function () {
                        exports.doubleclickVoronoi(voronoiDataset_1[i], customDoubleClickBehavior, points);
                    }, onMouseEnter: function () {
                        exports.changeVoronoi(voronoiHover, voronoiDataset_1[i], hoverAnnotation, customHoverBehavior, points);
                    }, onMouseLeave: function () {
                        exports.changeVoronoi(voronoiHover, undefined, undefined, customHoverBehavior);
                    }, key: "interactionVoronoi" + i, d: "M" + d.join("L") + "Z", style: __assign({ fillOpacity: 0 }, pointerStyle), clipPath: "url(#voronoi-" + i + ")" }),
                clipPath));
        }, _this);
        return voronoiPaths;
    }
    else if (overlay) {
        var renderedOverlay = overlay.map(function (overlayRegion, i) {
            var overlayData = overlayRegion.overlayData, rest = __rest(overlayRegion, ["overlayData"]);
            var overlayProps = {
                key: "overlay-" + i,
                onMouseEnter: function () {
                    exports.changeVoronoi(voronoiHover, overlayData, props.hoverAnnotation, customHoverBehavior, points);
                },
                onMouseLeave: function () {
                    exports.changeVoronoi(voronoiHover, undefined, undefined, customHoverBehavior);
                },
                onClick: function () {
                    exports.clickVoronoi(overlayData, customClickBehavior, points);
                },
                onDoubleClick: function () {
                    exports.doubleclickVoronoi(overlayData, customDoubleClickBehavior, points);
                },
                style: __assign({ opacity: 0 }, pointerStyle)
            };
            if (React.isValidElement(overlayRegion.renderElement)) {
                return React.cloneElement(overlayRegion.renderElement, overlayProps);
            }
            else {
                return (React.createElement(semiotic_mark_1.Mark, __assign({ forceUpdate: true }, rest, { key: "overlay-" + i }, overlayProps)));
            }
        });
        return renderedOverlay;
    }
};
//# sourceMappingURL=InteractionItems.js.map