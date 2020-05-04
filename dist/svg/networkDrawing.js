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
Object.defineProperty(exports, "__esModule", { value: true });
var React = __importStar(require("react"));
var semiotic_mark_1 = require("semiotic-mark");
var d3_glyphedge_1 = require("d3-glyphedge");
var d3_shape_1 = require("d3-shape");
var SvgHelper_1 = require("./SvgHelper");
var d3_interpolate_1 = require("d3-interpolate");
var d3_scale_1 = require("d3-scale");
var SvgHelper_2 = require("./SvgHelper");
var horizontalDagreLineGenerator = d3_shape_1.line()
    .curve(d3_shape_1.curveMonotoneX)
    .x(function (d) { return d.x; })
    .y(function (d) { return d.y; });
var verticalDagreLineGenerator = d3_shape_1.line()
    .curve(d3_shape_1.curveMonotoneY)
    .x(function (d) { return d.x; })
    .y(function (d) { return d.y; });
function sankeyEdgeSort(a, b, direction) {
    if (a.circular && !b.circular)
        return -1;
    if (b.circular && !a.circular)
        return 1;
    var first = direction === "down" ? "y" : "x";
    var second = direction === "down" ? "x" : "y";
    return a.source[first] === b.source[first]
        ? a.sankeyWidth === b.sankeyWidth
            ? a.source[second] - b.source[second]
            : b.sankeyWidth - a.sankeyWidth
        : a.source[first] - b.source[first];
}
var sigmoidLinks = {
    horizontal: d3_shape_1.linkHorizontal()
        .x(function (d) { return d.x; })
        .y(function (d) { return d.y; }),
    vertical: d3_shape_1.linkVertical()
        .x(function (d) { return d.x; })
        .y(function (d) { return d.y; }),
    radial: d3_glyphedge_1.d.lineArc
};
var customEdgeHashD = {
    curve: function (d, projection) {
        if (projection === void 0) { projection = "vertical"; }
        return sigmoidLinks[projection](d);
    },
    linearc: function (d) { return d3_glyphedge_1.d.lineArc(d); },
    ribbon: function (d) { return d3_glyphedge_1.d.ribbon(d, d.width); },
    arrowhead: function (d) {
        return d3_glyphedge_1.d.arrowHead(d, d.target.nodeSize, d.width, d.width * 1.5);
    },
    halfarrow: function (d) {
        return d3_glyphedge_1.d.halfArrow(d, d.target.nodeSize, d.width, d.width * 1.5);
    },
    nail: function (d) { return d3_glyphedge_1.d.nail(d, d.source.nodeSize); },
    comet: function (d) { return d3_glyphedge_1.d.comet(d, d.target.nodeSize); },
    taffy: function (d) {
        return d3_glyphedge_1.d.taffy(d, d.source.nodeSize / 2, d.target.nodeSize / 2, (d.source.nodeSize + d.target.nodeSize) / 4);
    }
};
exports.radialCurveGenerator = function (size) {
    var radialCurve = d3_shape_1.linkRadial()
        .angle(function (d) { return (d.x / size[0]) * Math.PI * 2; })
        .radius(function (d) { return d.y; });
    return function (_a) {
        var d = _a.d, i = _a.i, styleFn = _a.styleFn, renderMode = _a.renderMode, key = _a.key, className = _a.className, baseMarkProps = _a.baseMarkProps;
        return (React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { key: key, transform: "translate(" + 50 + "," + (size[1] / 2 - 50) + ")", markType: "path", d: radialCurve(d), style: styleFn(d, i), renderMode: renderMode ? renderMode(d, i) : undefined, className: className, "aria-label": "Node " + d.id, tabIndex: -1 })));
    };
};
exports.circleNodeGenerator = function (_a) {
    //this is repetitious
    var d = _a.d, i = _a.i, styleFn = _a.styleFn, renderMode = _a.renderMode, key = _a.key, className = _a.className, transform = _a.transform, baseMarkProps = _a.baseMarkProps;
    return (React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { key: key, transform: transform, markType: "rect", width: d.nodeSize * 2, height: d.nodeSize * 2, ry: d.nodeSize * 2, rx: d.nodeSize * 2, x: -d.nodeSize, y: -d.nodeSize, style: styleFn(d, i), renderMode: renderMode ? renderMode(d, i) : undefined, className: className, "aria-label": "Node " + d.id, tabIndex: -1 })));
};
exports.matrixEdgeGenerator = function (size, nodes) { return function (_a) {
    var d = _a.d, i = _a.i, styleFn = _a.styleFn, renderMode = _a.renderMode, key = _a.key, className = _a.className, baseMarkProps = _a.baseMarkProps;
    var gridSize = Math.min.apply(Math, __spread(size)) / nodes.length;
    return (React.createElement("g", { key: key },
        React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderMode ? renderMode(d, i) : undefined, key: key, className: className, simpleInterpolate: true, transform: "translate(" + d.source.y + "," + d.target.y + ")", markType: "rect", x: -gridSize / 2, y: -gridSize / 2, width: gridSize, height: gridSize, style: styleFn(d, i), "aria-label": "Connection from " + d.source.id + " to " + d.target.id, tabIndex: -1 })),
        React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderMode ? renderMode(d, i) : undefined, key: key + "-mirror", className: className, simpleInterpolate: true, transform: "translate(" + d.target.y + "," + d.source.y + ")", markType: "rect", x: -gridSize / 2, y: -gridSize / 2, width: gridSize, height: gridSize, style: styleFn(d, i), "aria-label": "Connection from " + d.source.id + " to " + d.target.id, tabIndex: -1 }))));
}; };
exports.arcEdgeGenerator = function (size) {
    var yAdjust = size[1] / size[0];
    function arcDiagramArc(d) {
        var draw = d3_shape_1.line().curve(d3_shape_1.curveBasis);
        var midX = (d.source.x + d.target.x) / 2;
        var midY = d.source.x - d.target.x;
        return draw([[d.source.x, 0], [midX, midY * yAdjust], [d.target.x, 0]]);
    }
    return function (_a) {
        var d = _a.d, i = _a.i, styleFn = _a.styleFn, renderMode = _a.renderMode, key = _a.key, className = _a.className, baseMarkProps = _a.baseMarkProps;
        return (React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderMode ? renderMode(d, i) : undefined, key: key, className: className, simpleInterpolate: true, markType: "path", transform: "translate(0," + size[1] / 2 + ")", d: arcDiagramArc(d), style: styleFn(d, i), "aria-label": "Connection from " + d.source.id + " to " + d.target.id, tabIndex: -1 })));
    };
};
exports.chordEdgeGenerator = function (size) { return function (_a) {
    var d = _a.d, i = _a.i, styleFn = _a.styleFn, renderMode = _a.renderMode, key = _a.key, className = _a.className, baseMarkProps = _a.baseMarkProps;
    return (React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderMode ? renderMode(d, i) : undefined, key: key, className: className, simpleInterpolate: true, transform: "translate(" + size[0] / 2 + "," + size[1] / 2 + ")", markType: "path", d: d.d, style: styleFn(d, i), "aria-label": "Connection from " + d.source.id + " to " + d.target.id, tabIndex: -1 })));
}; };
exports.dagreEdgeGenerator = function (direction) {
    var dagreLineGenerator = direction === "LR" || direction === "RL"
        ? horizontalDagreLineGenerator
        : verticalDagreLineGenerator;
    return function (_a) {
        var d = _a.d, i = _a.i, styleFn = _a.styleFn, renderMode = _a.renderMode, key = _a.key, className = _a.className, baseMarkProps = _a.baseMarkProps;
        if (d.ribbon || d.parallelEdges) {
            var ribbonGenerator = SvgHelper_1.linearRibbon();
            ribbonGenerator.x(function (p) { return p.x; });
            ribbonGenerator.y(function (p) { return p.y; });
            ribbonGenerator.r(function () { return d.weight || 1; });
            if (d.parallelEdges) {
                var sortedParallelEdges_1 = d.parallelEdges.sort(function (a, b) { return b.weight - a.weight; });
                return (React.createElement("g", { key: "" + key }, ribbonGenerator({
                    points: d.points,
                    multiple: d.parallelEdges
                }).map(function (ribbonD, ribbonI) { return (React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderMode ? renderMode(d, i) : undefined, key: key + "-" + ribbonI, className: className, simpleInterpolate: true, markType: "path", d: ribbonD, style: styleFn(sortedParallelEdges_1[ribbonI], i), "aria-label": "Connection from " + d.source.id + " to " + d.target.id, tabIndex: -1 }))); })));
            }
            return (React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderMode ? renderMode(d, i) : undefined, key: key, className: className, simpleInterpolate: true, markType: "path", d: ribbonGenerator(d.points), style: styleFn(d, i), "aria-label": "Connection from " + d.source.id + " to " + d.target.id, tabIndex: -1 })));
        }
        return (React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderMode ? renderMode(d, i) : undefined, key: key, className: className, simpleInterpolate: true, markType: "path", d: dagreLineGenerator(d.points), style: styleFn(d, i), "aria-label": "Connection from " + d.source.id + " to " + d.target.id, tabIndex: -1 })));
    };
};
exports.sankeyNodeGenerator = function (_a) {
    var d = _a.d, i = _a.i, styleFn = _a.styleFn, renderMode = _a.renderMode, key = _a.key, className = _a.className, transform = _a.transform, baseMarkProps = _a.baseMarkProps;
    var height = d.direction !== "down" ? d.height : d.width;
    var width = d.direction !== "down" ? d.width : d.height;
    return (React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderMode ? renderMode(d, i) : undefined, key: key, className: className, transform: transform, markType: "rect", height: height, width: width, x: -width / 2, y: -height / 2, rx: 0, ry: 0, style: styleFn(d), "aria-label": "Node " + d.id, tabIndex: -1 })));
};
exports.chordNodeGenerator = function (size) { return function (_a) {
    var d = _a.d, i = _a.i, styleFn = _a.styleFn, renderMode = _a.renderMode, key = _a.key, className = _a.className, baseMarkProps = _a.baseMarkProps;
    return (React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { renderMode: renderMode ? renderMode(d, i) : undefined, key: key, className: className, transform: "translate(" + size[0] / 2 + "," + size[1] / 2 + ")", markType: "path", d: d.d, style: styleFn(d, i), "aria-label": "Node " + d.id, tabIndex: -1 })));
}; };
exports.matrixNodeGenerator = function (size, nodes) {
    var gridSize = Math.min.apply(Math, __spread(size));
    var stepSize = gridSize / (nodes.length + 1);
    return function (_a) {
        var d = _a.d, i = _a.i, styleFn = _a.styleFn, renderMode = _a.renderMode, key = _a.key, className = _a.className, baseMarkProps = _a.baseMarkProps;
        var showText = stepSize > 6;
        var showLine = stepSize > 3;
        var showRect = stepSize > 0.5;
        var textProps = {
            textAnchor: "end",
            fontSize: stepSize / 2 + "px"
        };
        var style = styleFn(d, i);
        var renderModeValue = renderMode ? renderMode(d, i) : undefined;
        return (React.createElement("g", { key: key, className: className },
            showRect && (React.createElement(semiotic_mark_1.Mark, { markType: "rect", x: stepSize / 2, y: d.y - stepSize / 2, width: gridSize - stepSize, height: stepSize, style: __assign(__assign({}, style), { stroke: "none" }), renderMode: renderModeValue, forceUpdate: true, baseMarkProps: baseMarkProps })),
            showRect && (React.createElement(semiotic_mark_1.Mark, { markType: "rect", y: stepSize / 2, x: d.y - stepSize / 2, height: gridSize - stepSize, width: stepSize, style: __assign(__assign({}, style), { stroke: "none" }), renderMode: renderModeValue, forceUpdate: true, baseMarkProps: baseMarkProps })),
            showLine && (React.createElement(semiotic_mark_1.Mark, { markType: "line", stroke: "black", x1: 0, x2: gridSize - stepSize / 2, y1: d.y - stepSize / 2, y2: d.y - stepSize / 2, style: style, renderMode: renderModeValue, forceUpdate: true, baseMarkProps: baseMarkProps })),
            showLine && (React.createElement(semiotic_mark_1.Mark, { markType: "line", stroke: "black", y1: 0, y2: gridSize - stepSize / 2, x1: d.y - stepSize / 2, x2: d.y - stepSize / 2, style: style, renderMode: renderModeValue, forceUpdate: true, baseMarkProps: baseMarkProps })),
            showLine && i === nodes.length - 1 && (React.createElement(semiotic_mark_1.Mark, { markType: "line", stroke: "black", x1: 0, x2: gridSize - stepSize / 2, y1: d.y + stepSize / 2, y2: d.y + stepSize / 2, style: style, renderMode: renderModeValue, forceUpdate: true, baseMarkProps: baseMarkProps })),
            showLine && i === nodes.length - 1 && (React.createElement(semiotic_mark_1.Mark, { markType: "line", stroke: "black", y1: 0, y2: gridSize - stepSize / 2, x1: d.y + stepSize / 2, x2: d.y + stepSize / 2, style: style, renderMode: renderModeValue, forceUpdate: true, baseMarkProps: baseMarkProps })),
            showText && (React.createElement("text", __assign({ x: 0, y: d.y + stepSize / 5 }, textProps), d.id)),
            showText && (React.createElement("text", __assign({ transform: "translate(" + d.y + ") rotate(90) translate(0," + stepSize /
                    5 + ")" }, textProps, { y: 0 }), d.id))));
    };
};
exports.radialRectNodeGenerator = function (size, center, type) {
    var radialArc = d3_shape_1.arc();
    var _a = type.angleRange, angleRange = _a === void 0 ? [0, 360] : _a;
    var rangePct = angleRange.map(function (d) { return d / 360; });
    var rangeMod = rangePct[1] - rangePct[0];
    var adjustedPct = rangeMod < 1
        ? d3_scale_1.scaleLinear()
            .domain([0, 1])
            .range(rangePct)
        : function (d) { return d; };
    return function (_a) {
        var d = _a.d, i = _a.i, styleFn = _a.styleFn, renderMode = _a.renderMode, key = _a.key, className = _a.className, baseMarkProps = _a.baseMarkProps;
        radialArc.innerRadius(d.y0 / 2).outerRadius(d.y1 / 2);
        return (React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { key: key, transform: "translate(" + center + ")", markType: "path", d: radialArc({
                startAngle: adjustedPct(d.x0 / size[0]) * Math.PI * 2,
                endAngle: adjustedPct(d.x1 / size[0]) * Math.PI * 2
            }), customTween: {
                fn: SvgHelper_2.arcTweener,
                props: {
                    startAngle: adjustedPct(d.x0 / size[0]) * Math.PI * 2,
                    endAngle: adjustedPct(d.x1 / size[0]) * Math.PI * 2,
                    innerRadius: d.y0 / 2,
                    outerRadius: d.y1 / 2
                }
            }, style: styleFn(d, i), renderMode: renderMode ? renderMode(d, i) : undefined, className: className, "aria-label": "Node " + d.id, tabIndex: -1 })));
    };
};
exports.radialLabelGenerator = function (node, nodei, nodeIDAccessor, size) {
    var anglePct = (node.x1 + node.x0) / 2 / size[0];
    var nodeLabel = nodeIDAccessor(node, nodei);
    var labelRotate = anglePct > 0.5 ? anglePct * 360 + 90 : anglePct * 360 - 90;
    return (React.createElement("g", { transform: "rotate(" + labelRotate + ")" }, typeof nodeLabel === "string" ? (React.createElement("text", { textAnchor: "middle", y: 5 }, nodeLabel)) : (nodeLabel)));
};
exports.hierarchicalRectNodeGenerator = function (_a) {
    var d = _a.d, i = _a.i, styleFn = _a.styleFn, renderMode = _a.renderMode, key = _a.key, className = _a.className, baseMarkProps = _a.baseMarkProps;
    //this is repetitious
    return (React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { key: key, transform: "translate(0,0)", markType: "rect", width: d.x1 - d.x0, height: d.y1 - d.y0, x: d.x0, y: d.y0, rx: 0, ry: 0, style: styleFn(d, i), renderMode: renderMode ? renderMode(d, i) : undefined, className: className, "aria-label": "Node " + d.id, tabIndex: -1 })));
};
var genericLineGenerator = function (d) {
    return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
};
exports.drawNodes = function (_a) {
    var data = _a.data, renderKeyFn = _a.renderKeyFn, customMark = _a.customMark, styleFn = _a.styleFn, classFn = _a.classFn, renderMode = _a.renderMode, canvasDrawing = _a.canvasDrawing, canvasRenderFn = _a.canvasRenderFn, baseMarkProps = _a.baseMarkProps;
    var markGenerator = customMark;
    var renderedData = [];
    if (customMark && canvasRenderFn) {
        console.error("canvas rendering currently only supports generic circle nodes based on nodeSize");
    }
    data.forEach(function (d, i) {
        if (canvasRenderFn && canvasRenderFn(d, i) === true) {
            var canvasNode = {
                baseClass: "frame-piece",
                tx: d.x,
                ty: d.y,
                d: d,
                i: i,
                markProps: { markType: "circle", r: d.nodeSize },
                styleFn: styleFn,
                renderFn: renderMode,
                classFn: classFn
            };
            canvasDrawing.push(canvasNode);
        }
        else {
            // CUSTOM MARK IMPLEMENTATION
            renderedData.push(markGenerator({
                d: d,
                i: i,
                renderKeyFn: renderKeyFn,
                styleFn: styleFn,
                classFn: classFn,
                renderMode: renderMode,
                key: renderKeyFn ? renderKeyFn(d, i) : d.id || "node-" + i,
                className: "node " + classFn(d, i),
                transform: "translate(" + d.x + "," + d.y + ")",
                baseMarkProps: baseMarkProps
            }));
        }
    });
    return renderedData;
};
exports.drawEdges = function (_a) {
    var baseData = _a.data, renderKeyFn = _a.renderKeyFn, customMark = _a.customMark, styleFn = _a.styleFn, classFn = _a.classFn, renderMode = _a.renderMode, canvasRenderFn = _a.canvasRenderFn, canvasDrawing = _a.canvasDrawing, type = _a.type, baseMarkProps = _a.baseMarkProps, networkSettings = _a.networkSettings, projection = _a.projection;
    var networkType = networkSettings.type, direction = networkSettings.direction, _b = networkSettings.edgeSort, edgeSort = _b === void 0 ? sankeyEdgeSort : _b;
    var data = networkType === "sankey"
        ? baseData.sort(function (a, b) { return edgeSort(a, b, direction); })
        : baseData;
    var dGenerator = genericLineGenerator;
    var renderedData = [];
    if (customMark) {
        // CUSTOM MARK IMPLEMENTATION
        data.forEach(function (d, i) {
            var renderedCustomMark = customMark({
                d: d,
                i: i,
                renderKeyFn: renderKeyFn,
                styleFn: styleFn,
                classFn: classFn,
                renderMode: renderMode,
                key: renderKeyFn ? renderKeyFn(d, i) : "edge-" + i,
                className: classFn(d, i) + " edge",
                transform: "translate(" + d.x + "," + d.y + ")",
                baseMarkProps: baseMarkProps
            });
            if (renderedCustomMark &&
                renderedCustomMark.props &&
                (renderedCustomMark.props.markType !== "path" ||
                    renderedCustomMark.props.d)) {
                renderedData.push(renderedCustomMark);
            }
        });
    }
    else {
        if (type) {
            if (typeof type === "function") {
                dGenerator = type;
            }
            else if (customEdgeHashD[type]) {
                dGenerator = function (d) { return customEdgeHashD[type](d, projection); };
            }
        }
        data.forEach(function (d, i) {
            var renderedD = dGenerator(d);
            if (renderedD && canvasRenderFn && canvasRenderFn(d, i) === true) {
                var canvasEdge = {
                    baseClass: "frame-piece",
                    tx: d.x,
                    ty: d.y,
                    d: d,
                    i: i,
                    markProps: { markType: "path", d: renderedD },
                    styleFn: styleFn,
                    renderFn: renderMode,
                    classFn: classFn
                };
                canvasDrawing.push(canvasEdge);
            }
            else if (renderedD) {
                renderedData.push(React.createElement(semiotic_mark_1.Mark, __assign({}, baseMarkProps, { key: renderKeyFn ? renderKeyFn(d, i) : "edge-" + i, markType: "path", renderMode: renderMode ? renderMode(d, i) : undefined, className: classFn(d) + " edge", d: renderedD, style: styleFn(d, i), tabIndex: -1, role: "img", "aria-label": "connection from " + d.source.id + " to " + d.target.id })));
            }
        });
    }
    return renderedData;
};
function topologicalSort(nodesArray, edgesArray) {
    // adapted from https://simplapi.wordpress.com/2015/08/19/detect-graph-cycle-in-javascript/
    var nodes = [];
    var nodeHash = {};
    edgesArray.forEach(function (edge) {
        if (!edge.source.id || !edge.target.id) {
            return false;
        }
        if (!nodeHash[edge.source.id]) {
            nodeHash[edge.source.id] = { _id: edge.source.id, links: [] };
            nodes.push(nodeHash[edge.source.id]);
        }
        if (!nodeHash[edge.target.id]) {
            nodeHash[edge.target.id] = { _id: edge.target.id, links: [] };
            nodes.push(nodeHash[edge.target.id]);
        }
        nodeHash[edge.source.id].links.push(edge.target.id);
    });
    // Test if a node got any icoming edge
    function hasIncomingEdge(list, node) {
        for (var i = 0, l = list.length; i < l; ++i) {
            if (list[i].links.indexOf(node._id) !== -1) {
                return true;
            }
        }
        return false;
    }
    // Kahn Algorithm
    var L = [], S = nodes.filter(function (node) { return !hasIncomingEdge(nodes, node); });
    var n = null;
    while (S.length) {
        // Remove a node n from S
        n = S.pop();
        // Add n to tail of L
        L.push(n);
        var i = n.links.length;
        while (i--) {
            // Getting the node associated to the current stored id in links
            var m = nodes[nodes.map(function (d) { return d._id; }).indexOf(n.links[i])];
            // Remove edge e from the graph
            n.links.pop();
            if (!hasIncomingEdge(nodes, m)) {
                S.push(m);
            }
        }
    }
    // If any of them still got links, there is cycle somewhere
    var nodeWithEdge = nodes.find(function (node) { return node.links.length !== 0; });
    return nodeWithEdge ? null : L;
}
exports.topologicalSort = topologicalSort;
var curvature = 0.5;
exports.ribbonLink = function (d) {
    var diff = d.direction === "down"
        ? Math.abs(d.target.y - d.source.y)
        : Math.abs(d.source.x - d.target.x);
    // const halfWidth = d.width / 2
    var testCoordinates = d.direction === "down"
        ? [
            {
                x: d.y0,
                y: d.source.y
            },
            {
                x: d.y0,
                y: d.source.y + diff / 3
            },
            {
                x: d.y1,
                y: d.target.y - diff / 3
            },
            {
                x: d.y1,
                y: d.target.y
            }
        ]
        : [
            {
                x: d.source.x0,
                y: d.y0
            },
            {
                x: d.source.x0 + diff / 3,
                y: d.y0
            },
            {
                x: d.target.x0 - diff / 3,
                y: d.y1
            },
            {
                x: d.target.x0,
                y: d.y1
            }
        ];
    var linkGenerator = SvgHelper_1.linearRibbon();
    linkGenerator.x(function (d) { return d.x; });
    linkGenerator.y(function (d) { return d.y; });
    linkGenerator.r(function () { return d.sankeyWidth / 2; });
    return linkGenerator(testCoordinates);
};
exports.areaLink = function (d) {
    var x0, x1, x2, x3, y0, y1, xi, y2, y3;
    if (d.direction === "down") {
        x0 = d.y0 - d.sankeyWidth / 2;
        x1 = d.y1 - d.sankeyWidth / 2;
        x2 = d.y1 + d.sankeyWidth / 2;
        x3 = d.y0 + d.sankeyWidth / 2;
        y0 = d.source.y1;
        y1 = d.target.y0;
        xi = d3_interpolate_1.interpolateNumber(y0, y1);
        y2 = xi(curvature);
        y3 = xi(1 - curvature);
        return "M" + x0 + "," + y0 + "C" + x0 + "," + y2 + " " + x1 + "," + y3 + " " + x1 + "," + y1 + "L" + x2 + "," + y1 + "C" + x2 + "," + y3 + " " + x3 + "," + y2 + " " + x3 + "," + y0 + "Z";
    }
    ;
    (x0 = d.source.x1), // eslint-disable-line no-sequences
        (x1 = d.target.x0),
        (xi = d3_interpolate_1.interpolateNumber(x0, x1)),
        (x2 = xi(curvature)),
        (x3 = xi(1 - curvature)),
        (y0 = d.y0 - d.sankeyWidth / 2),
        (y1 = d.y1 - d.sankeyWidth / 2),
        (y2 = d.y1 + d.sankeyWidth / 2),
        (y3 = d.y0 + d.sankeyWidth / 2);
    return "M" + x0 + "," + y0 + "C" + x2 + "," + y0 + " " + x3 + "," + y1 + " " + x1 + "," + y1 + "L" + x1 + "," + y2 + "C" + x3 + "," + y2 + " " + x2 + "," + y3 + " " + x0 + "," + y3 + "Z";
};
function circularAreaLink(link) {
    var linkGenerator = SvgHelper_1.linearRibbon();
    linkGenerator.x(function (d) { return d.x; });
    linkGenerator.y(function (d) { return d.y; });
    linkGenerator.r(function () { return link.sankeyWidth / 2; });
    var xyForLink = link.direction === "down"
        ? [
            {
                x: link.circularPathData.sourceY,
                y: link.circularPathData.sourceX
            },
            {
                x: link.circularPathData.sourceY,
                y: link.circularPathData.leftFullExtent
            },
            {
                x: link.circularPathData.verticalFullExtent,
                y: link.circularPathData.leftFullExtent
            },
            {
                x: link.circularPathData.verticalFullExtent,
                y: link.circularPathData.rightFullExtent
            },
            {
                x: link.circularPathData.targetY,
                y: link.circularPathData.rightFullExtent
            },
            {
                x: link.circularPathData.targetY,
                y: link.circularPathData.targetX
            }
        ]
        : [
            {
                x: link.circularPathData.sourceX,
                y: link.circularPathData.sourceY
            },
            {
                x: link.circularPathData.leftFullExtent,
                y: link.circularPathData.sourceY
            },
            {
                x: link.circularPathData.leftFullExtent,
                y: link.circularPathData.verticalFullExtent
            },
            {
                x: link.circularPathData.rightFullExtent,
                y: link.circularPathData.verticalFullExtent
            },
            {
                x: link.circularPathData.rightFullExtent,
                y: link.circularPathData.targetY
            },
            {
                x: link.circularPathData.targetX,
                y: link.circularPathData.targetY
            }
        ];
    return linkGenerator(xyForLink);
}
exports.circularAreaLink = circularAreaLink;
var hierarchyDecorator = function (hierarchy, hashEntries, nodeIDAccessor, nodes) {
    if (hierarchy.children) {
        hierarchy.children.forEach(function (child) {
            var theseEntries = hashEntries.filter(function (entry) { return entry[1] === child.id; });
            theseEntries.forEach(function (entry) {
                var idNode = nodes.find(function (node) { return nodeIDAccessor(node) === entry[0]; }) || {};
                child.childHash[entry[0]] = __assign(__assign({ id: entry[0] }, idNode), { children: [], childHash: {} });
                child.children.push(child.childHash[entry[0]]);
            });
            if (child.children.length > 0) {
                hierarchyDecorator(child, hashEntries, nodeIDAccessor, nodes);
            }
        });
    }
};
exports.softStack = function (edges, nodes, sourceAccessor, targetAccessor, nodeIDAccessor) {
    var hierarchy = { id: "root-generated", children: [], childHash: {} };
    var discoveredHierarchyHash = {};
    var targetToSourceHash = {};
    var hasLogicalRoot = true;
    var isHierarchical = true;
    for (var i = 0; i < edges.length; i++) {
        var edge = edges[i];
        var source = sourceAccessor(edge);
        var target = targetAccessor(edge);
        var sourceID = typeof source === "object" ? nodeIDAccessor(source) : source;
        var targetID = typeof target === "object" ? nodeIDAccessor(target) : target;
        targetToSourceHash[targetID] = sourceID;
        if (!discoveredHierarchyHash[sourceID]) {
            discoveredHierarchyHash[sourceID] = targetID;
        }
        else {
            isHierarchical = false;
            break;
        }
    }
    if (isHierarchical) {
        var hashEntries = Object.entries(discoveredHierarchyHash);
        hashEntries.forEach(function (entry) {
            var target = entry[1];
            if (!discoveredHierarchyHash[target]) {
                discoveredHierarchyHash[target] = "root-generated";
                var idNode = nodes.find(function (node) { return nodeIDAccessor(node) === target; }) || {};
                hierarchy.childHash[target] = __assign(__assign({ id: target }, idNode), { children: [], childHash: {} });
                hierarchy.children.push(hierarchy.childHash[target]);
            }
        });
        hierarchyDecorator(hierarchy, hashEntries, nodeIDAccessor, nodes);
        nodes.forEach(function (node) {
            var nodeID = nodeIDAccessor(node);
            if (!discoveredHierarchyHash[nodeID] && !targetToSourceHash[nodeID]) {
                hierarchy.children.push(__assign(__assign({ id: nodeID }, node), { children: [], childHash: {} }));
            }
        });
        if (hierarchy.children.length === 1) {
            hierarchy = hierarchy.children[0];
            hasLogicalRoot = false;
        }
        return { hierarchy: hierarchy, isHierarchical: true, hasLogicalRoot: hasLogicalRoot };
    }
    return { hierarchy: {}, isHierarchical: false, hasLogicalRoot: false };
};
//# sourceMappingURL=networkDrawing.js.map