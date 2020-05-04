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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var React = __importStar(require("react"));
var d3_force_1 = require("d3-force");
var d3_scale_1 = require("d3-scale");
var d3_array_1 = require("d3-array");
var AnnotationLabel_1 = __importDefault(require("react-annotation/lib/Types/AnnotationLabel"));
var frameFunctions_1 = require("../svg/frameFunctions");
var pieceDrawing_1 = require("../svg/pieceDrawing");
var svg_path_bounding_box_1 = __importDefault(require("svg-path-bounding-box"));
var dataFunctions_1 = require("../data/dataFunctions");
var networkDrawing_1 = require("../svg/networkDrawing");
var d3_sankey_circular_1 = require("d3-sankey-circular");
var d3_chord_1 = require("d3-chord");
var d3_shape_1 = require("d3-shape");
var d3_hierarchy_1 = require("d3-hierarchy");
var functions_1 = require("../generic_utilities/functions");
function determineNodeIcon(baseCustomNodeIcon, networkSettings, size, nodes) {
    if (baseCustomNodeIcon)
        return baseCustomNodeIcon;
    var center = [size[0] / 2, size[1] / 2];
    switch (networkSettings.type) {
        case "sankey":
            return networkDrawing_1.sankeyNodeGenerator;
        case "partition":
            return networkSettings.projection === "radial"
                ? networkDrawing_1.radialRectNodeGenerator(size, center, networkSettings)
                : networkDrawing_1.hierarchicalRectNodeGenerator;
        case "treemap":
            return networkSettings.projection === "radial"
                ? networkDrawing_1.radialRectNodeGenerator(size, center, networkSettings)
                : networkDrawing_1.hierarchicalRectNodeGenerator;
        case "circlepack":
            return networkDrawing_1.circleNodeGenerator;
        case "chord":
            return networkDrawing_1.chordNodeGenerator(size);
        case "dagre":
            return networkDrawing_1.hierarchicalRectNodeGenerator;
        case "matrix":
            return networkDrawing_1.matrixNodeGenerator(size, nodes);
    }
    return networkDrawing_1.circleNodeGenerator;
}
function determineEdgeIcon(_a) {
    var baseCustomEdgeIcon = _a.baseCustomEdgeIcon, networkSettings = _a.networkSettings, size = _a.size, graph = _a.graph, nodes = _a.nodes;
    if (baseCustomEdgeIcon)
        return baseCustomEdgeIcon;
    switch (networkSettings.type) {
        case "partition":
            return function () { return null; };
        case "treemap":
            return function () { return null; };
        case "circlepack":
            return function () { return null; };
        case "chord":
            return networkDrawing_1.chordEdgeGenerator(size);
        case "matrix":
            return networkDrawing_1.matrixEdgeGenerator(size, nodes);
        case "arc":
            return networkDrawing_1.arcEdgeGenerator(size);
        case "dagre":
            if (graph)
                return networkDrawing_1.dagreEdgeGenerator(graph.graph().rankdir);
    }
    return undefined;
}
var basicMiddle = function (d) { return ({
    edge: d,
    x: (d.source.x + d.target.x) / 2,
    y: (d.source.y + d.target.y) / 2
}); };
var edgePointHash = {
    sankey: function (d) { return ({
        edge: d,
        x: (d.source.x1 + d.target.x0) / 2,
        y: d.circularPathData
            ? d.circularPathData.verticalFullExtent
            : ((d.y0 + d.y1) / 2 + (d.y0 + d.y1) / 2) / 2
    }); },
    force: basicMiddle,
    tree: basicMiddle,
    cluster: basicMiddle
};
var hierarchicalTypeHash = {
    dendrogram: d3_hierarchy_1.tree,
    tree: d3_hierarchy_1.tree,
    circlepack: d3_hierarchy_1.pack,
    cluster: d3_hierarchy_1.cluster,
    treemap: d3_hierarchy_1.treemap,
    partition: d3_hierarchy_1.partition
};
var hierarchicalProjectable = {
    partition: true,
    cluster: true,
    tree: true,
    dendrogram: true
};
var radialProjectable = {
    partition: true,
    cluster: true,
    tree: true,
    dendrogram: true
};
var sankeyOrientHash = {
    left: d3_sankey_circular_1.sankeyLeft,
    right: d3_sankey_circular_1.sankeyRight,
    center: d3_sankey_circular_1.sankeyCenter,
    justify: d3_sankey_circular_1.sankeyJustify
};
function breadthFirstCompontents(baseNodes, hash) {
    var componentHash = {
        "0": { componentNodes: [], componentEdges: [] }
    };
    var components = [componentHash["0"]];
    var componentID = 0;
    traverseNodesBF(baseNodes, true);
    function traverseNodesBF(nodes, top) {
        nodes.forEach(function (node) {
            var _a;
            var hashNode = hash.get(node);
            if (!hashNode) {
                componentHash["0"].componentNodes.push(node);
            }
            else if (hashNode.component === -99) {
                if (top === true) {
                    componentID++;
                    componentHash[componentID] = {
                        componentNodes: [],
                        componentEdges: []
                    };
                    components.push(componentHash[componentID]);
                }
                hashNode.component = componentID;
                componentHash[componentID].componentNodes.push(node);
                (_a = componentHash[componentID].componentEdges).push.apply(_a, __spread(hashNode.edges));
                var traversibleNodes = __spread(hashNode.connectedNodes);
                traverseNodesBF(traversibleNodes, hash);
            }
        });
    }
    return components.sort(function (a, b) { return b.componentNodes.length - a.componentNodes.length; });
}
var matrixify = function (_a) {
    var edgeHash = _a.edgeHash, nodes = _a.nodes, edgeWidthAccessor = _a.edgeWidthAccessor, nodeIDAccessor = _a.nodeIDAccessor;
    var matrix = [];
    nodes.forEach(function (nodeSource) {
        var nodeSourceID = nodeIDAccessor(nodeSource);
        var sourceRow = [];
        matrix.push(sourceRow);
        nodes.forEach(function (nodeTarget) {
            var nodeTargetID = nodeIDAccessor(nodeTarget);
            var theEdge = edgeHash.get(nodeSourceID + "|" + nodeTargetID);
            if (theEdge) {
                sourceRow.push(edgeWidthAccessor(theEdge));
            }
            else {
                sourceRow.push(0);
            }
        });
    });
    return matrix;
};
var emptyArray = [];
var baseNodeProps = {
    id: undefined,
    degree: 0,
    inDegree: 0,
    outDegree: 0,
    x: 0,
    y: 0,
    x1: 0,
    x0: 0,
    y1: 0,
    y0: 0,
    height: 0,
    width: 0,
    radius: 0,
    r: 0,
    direction: undefined,
    textHeight: 0,
    textWidth: 0,
    fontSize: 0,
    scale: 1,
    nodeSize: 0,
    component: -99,
    shapeNode: false
};
var baseNetworkSettings = {
    iterations: 500,
    hierarchicalNetwork: false
};
var baseGraphSettings = {
    nodeHash: new Map(),
    edgeHash: new Map(),
    nodes: [],
    edges: [],
    hierarchicalNetwork: false,
    type: "force"
};
function recursiveIDAccessor(idAccessor, node, accessorString) {
    if (node.parent) {
        accessorString = accessorString + "-" + recursiveIDAccessor(idAccessor, __assign(__assign({}, node.parent), node.parent.data), accessorString);
    }
    return accessorString + "-" + idAccessor(__assign(__assign({}, node), node.data));
}
exports.nodesEdgesFromHierarchy = function (baseRootNode, idAccessor) {
    if (idAccessor === void 0) { idAccessor = function (d) { return d.id || d.descendantIndex; }; }
    var edges = [];
    var nodes = [];
    var rootNode = baseRootNode.descendants
        ? baseRootNode
        : d3_hierarchy_1.hierarchy(baseRootNode);
    var descendants = rootNode.descendants();
    descendants.forEach(function (d, i) {
        d.descendantIndex = i;
    });
    descendants.forEach(function (node, i) {
        var generatedID = idAccessor(__assign(__assign({}, node), node.data)) + "-" + ((node.parent &&
            recursiveIDAccessor(idAccessor, __assign(__assign({}, node.parent), node.parent.data), "")) ||
            "root");
        var dataD = Object.assign(node, node.data || {}, {
            hierarchicalID: generatedID
        });
        nodes.push(dataD);
        if (node.parent !== null) {
            var dataParent = Object.assign(node.parent, node.parent.data || {});
            edges.push({
                source: dataParent,
                target: dataD,
                depth: node.depth,
                weight: 1,
                value: 1,
                _NWFEdgeKey: generatedID
            });
        }
    });
    return { edges: edges, nodes: nodes };
};
exports.calculateNetworkFrame = function (currentProps, prevState) {
    var graph = currentProps.graph, _a = currentProps.nodes, nodes = _a === void 0 ? Array.isArray(graph) || typeof graph === "function"
        ? emptyArray
        : (graph && graph.nodes) || emptyArray : _a, _b = currentProps.edges, edges = _b === void 0 ? typeof graph === "function"
        ? emptyArray
        : Array.isArray(graph)
            ? graph
            : (graph && graph.edges) || emptyArray : _b, networkType = currentProps.networkType, size = currentProps.size, nodeStyle = currentProps.nodeStyle, nodeClass = currentProps.nodeClass, canvasNodes = currentProps.canvasNodes, edgeStyle = currentProps.edgeStyle, edgeClass = currentProps.edgeClass, canvasEdges = currentProps.canvasEdges, nodeRenderMode = currentProps.nodeRenderMode, edgeRenderMode = currentProps.edgeRenderMode, nodeLabels = currentProps.nodeLabels, baseTitle = currentProps.title, baseMargin = currentProps.margin, hoverAnnotation = currentProps.hoverAnnotation, baseCustomNodeIcon = currentProps.customNodeIcon, baseCustomEdgeIcon = currentProps.customEdgeIcon, filterRenderedNodes = currentProps.filterRenderedNodes;
    var edgeType = currentProps.edgeType;
    var networkSettings;
    var nodeHierarchicalIDFill = {};
    var networkSettingsKeys = ["type"];
    if (typeof networkType === "string") {
        networkSettings = __assign(__assign({ type: networkType }, baseNetworkSettings), { graphSettings: baseGraphSettings });
    }
    else {
        if (networkType)
            networkSettingsKeys = Object.keys(networkType);
        networkSettings = __assign(__assign(__assign({ type: "force" }, baseNetworkSettings), networkType), { graphSettings: baseGraphSettings });
    }
    if (networkSettings.projection === "vertical" &&
        networkSettings.type === "sankey") {
        networkSettings.direction = "down";
    }
    networkSettingsKeys.push("height", "width");
    var title = typeof baseTitle === "object" &&
        !React.isValidElement(baseTitle) &&
        baseTitle !== null
        ? baseTitle
        : { title: baseTitle, orient: "top" };
    var margin = frameFunctions_1.calculateMargin({
        margin: baseMargin,
        title: title,
        size: size
    });
    var _c = frameFunctions_1.adjustedPositionSize({
        size: size,
        margin: margin
    }), adjustedPosition = _c.adjustedPosition, adjustedSize = _c.adjustedSize;
    networkSettings.graphSettings.nodes = nodes;
    networkSettings.graphSettings.edges = edges;
    var _d = networkSettings.graphSettings, edgeHash = _d.edgeHash, nodeHash = _d.nodeHash;
    var createPointLayer = networkSettings.type === "treemap" ||
        networkSettings.type === "partition" ||
        networkSettings.type === "sankey";
    var nodeIDAccessor = dataFunctions_1.stringToFn(currentProps.nodeIDAccessor, function (d) { return d.id; });
    var sourceAccessor = dataFunctions_1.stringToFn(currentProps.sourceAccessor, function (d) { return d.source; });
    var targetAccessor = dataFunctions_1.stringToFn(currentProps.targetAccessor, function (d) { return d.target; });
    var nodeSizeAccessor = typeof currentProps.nodeSizeAccessor === "number"
        ? functions_1.genericFunction(currentProps.nodeSizeAccessor)
        : dataFunctions_1.stringToFn(currentProps.nodeSizeAccessor, function (d) { return d.r || 5; });
    var edgeWidthAccessor = dataFunctions_1.stringToFn(currentProps.edgeWidthAccessor, function (d) { return d.weight || 1; });
    var nodeStyleFn = dataFunctions_1.stringToFn(nodeStyle, function () { return ({}); }, true);
    var nodeClassFn = dataFunctions_1.stringToFn(nodeClass, function () { return ""; }, true);
    var nodeRenderModeFn = dataFunctions_1.stringToFn(nodeRenderMode, undefined, true);
    var nodeCanvasRenderFn = canvasNodes && dataFunctions_1.stringToFn(canvasNodes, undefined, true);
    var projectedNodes = prevState.projectedNodes, projectedEdges = prevState.projectedEdges;
    var isHierarchical = typeof networkSettings.type === "string" &&
        hierarchicalTypeHash[networkSettings.type];
    var changedData = !prevState.projectedNodes ||
        !prevState.projectedEdges ||
        prevState.graphSettings.nodes !== nodes ||
        prevState.graphSettings.edges !== edges ||
        isHierarchical;
    if (networkSettings.type === "dagre") {
        var dagreGraph_1 = graph;
        var dagreNodeHash_1 = {};
        projectedNodes = dagreGraph_1.nodes().map(function (n) {
            var baseNode = dagreGraph_1.node(n);
            dagreNodeHash_1[n] = __assign(__assign({}, baseNode), { x0: baseNode.x - baseNode.width / 2, x1: baseNode.x + baseNode.width / 2, y0: baseNode.y - baseNode.height / 2, y1: baseNode.y + baseNode.height / 2, id: n, shapeNode: true, sourceLinks: [], targetLinks: [] });
            return dagreNodeHash_1[n];
        });
        projectedEdges = dagreGraph_1.edges().map(function (e) {
            var dagreEdge = dagreGraph_1.edge(e);
            var baseEdge = __assign(__assign({}, dagreEdge), { points: dagreEdge.points.map(function (d) { return (__assign({}, d)); }) });
            baseEdge.source = projectedNodes.find(function (p) { return p.id === e.v; });
            baseEdge.target = projectedNodes.find(function (p) { return p.id === e.w; });
            baseEdge.points.unshift({ x: baseEdge.source.x, y: baseEdge.source.y });
            baseEdge.points.push({ x: baseEdge.target.x, y: baseEdge.target.y });
            dagreNodeHash_1[e.v].targetLinks.push(baseEdge);
            dagreNodeHash_1[e.w].sourceLinks.push(baseEdge);
            return baseEdge;
        });
    }
    else if (changedData) {
        var previousNodes_1 = projectedNodes;
        edgeHash = new Map();
        nodeHash = new Map();
        networkSettings.graphSettings.edgeHash = edgeHash;
        networkSettings.graphSettings.nodeHash = nodeHash;
        projectedNodes = [];
        projectedEdges = [];
        var fixFunction_1 = typeof networkSettings.fixExistingNodes === "function" ? networkSettings.fixExistingNodes : networkSettings.fixExistingNodes ? function () { return true; } : false;
        nodes.forEach(function (node) {
            var projectedNode = __assign({}, node);
            var id = nodeIDAccessor(projectedNode);
            var existingNode = previousNodes_1.find(function (prevNode) { return prevNode.id === id; });
            var equivalentOldNode = existingNode || { x: undefined, y: undefined };
            nodeHash.set(id, projectedNode);
            nodeHash.set(node, projectedNode);
            projectedNodes.push(projectedNode);
            projectedNode.id = id;
            projectedNode.inDegree = 0;
            projectedNode.outDegree = 0;
            projectedNode.degree = 0;
            projectedNode.x = equivalentOldNode.x;
            projectedNode.y = equivalentOldNode.y;
            if (existingNode && fixFunction_1 && fixFunction_1(existingNode)) {
                projectedNode.fx = existingNode.x;
                projectedNode.fy = existingNode.y;
            }
        });
        var operationalEdges = edges;
        var baseEdges = edges;
        if (isHierarchical && Array.isArray(edges)) {
            var createdHierarchicalData = networkDrawing_1.softStack(edges, nodes, sourceAccessor, targetAccessor, nodeIDAccessor);
            if (createdHierarchicalData.isHierarchical) {
                baseEdges = createdHierarchicalData.hierarchy;
                projectedNodes = [];
            }
            else {
                console.error("You've sent an edge list that is not strictly hierarchical (there are nodes with multiple parents) defaulting to force-directed network layout");
                networkSettings.type = "force";
            }
        }
        if (!Array.isArray(baseEdges)) {
            networkSettings.hierarchicalNetwork = true;
            var rootNode = d3_hierarchy_1.hierarchy(baseEdges, networkSettings.hierarchyChildren);
            rootNode.sum(networkSettings.hierarchySum || (function (d) { return d.value; }));
            if (isHierarchical) {
                var layout = networkSettings.layout || isHierarchical;
                var hierarchicalLayout_1 = layout();
                var networkSettingKeys = Object.keys(networkSettings);
                if ((networkSettings.type === "dendrogram" ||
                    networkSettings.type === "tree" ||
                    networkSettings.type === "cluster") &&
                    hierarchicalLayout_1.separation) {
                    hierarchicalLayout_1.separation(function (a, b) {
                        return (nodeSizeAccessor(__assign(__assign({}, a), a.data)) || 1) +
                            (networkSettings.nodePadding || 0) +
                            (nodeSizeAccessor(__assign(__assign({}, b), b.data)) || 1);
                    });
                }
                networkSettingKeys.forEach(function (key) {
                    if (hierarchicalLayout_1[key]) {
                        hierarchicalLayout_1[key](networkSettings[key]);
                    }
                });
                var layoutSize = networkSettings.projection === "horizontal" && isHierarchical
                    ? [adjustedSize[1], adjustedSize[0]]
                    : adjustedSize;
                if (!networkSettings.nodeSize && hierarchicalLayout_1.size) {
                    hierarchicalLayout_1.size(layoutSize);
                }
                hierarchicalLayout_1(rootNode);
            }
            operationalEdges = exports.nodesEdgesFromHierarchy(rootNode, nodeIDAccessor)
                .edges;
        }
        baseNodeProps.shapeNode = createPointLayer;
        if (Array.isArray(operationalEdges)) {
            operationalEdges.forEach(function (edge) {
                var source = sourceAccessor(edge);
                var target = targetAccessor(edge);
                var sourceTarget = [source, target];
                sourceTarget.forEach(function (nodeDirection) {
                    if (!nodeHash.get(nodeDirection)) {
                        var nodeObject = typeof nodeDirection === "object"
                            ? __assign(__assign({}, baseNodeProps), nodeDirection) : __assign(__assign({}, baseNodeProps), { id: nodeDirection, createdByFrame: true });
                        var nodeIDValue = nodeObject.id || nodeIDAccessor(nodeObject);
                        nodeHierarchicalIDFill[nodeIDValue]
                            ? (nodeHierarchicalIDFill[nodeIDValue] += 1)
                            : (nodeHierarchicalIDFill[nodeIDValue] = 1);
                        if (!nodeObject.id) {
                            var nodeSuffix = nodeHierarchicalIDFill[nodeIDValue] === 1
                                ? ""
                                : "-" + nodeHierarchicalIDFill[nodeIDValue];
                            nodeObject.id = "" + nodeIDValue + nodeSuffix;
                        }
                        nodeHash.set(nodeDirection, nodeObject);
                        projectedNodes.push(nodeObject);
                    }
                });
                var edgeWeight = edge.weight || 1;
                var sourceNode = nodeHash.get(source);
                var targetNode = nodeHash.get(target);
                targetNode.inDegree += edgeWeight;
                sourceNode.outDegree += edgeWeight;
                targetNode.degree += edgeWeight;
                sourceNode.degree += edgeWeight;
                var edgeKey = (nodeIDAccessor(sourceNode) ||
                    source) + "|" + (nodeIDAccessor(targetNode) || target);
                var newEdge = Object.assign({}, edge, {
                    source: nodeHash.get(source),
                    target: nodeHash.get(target)
                });
                edgeHash.set(edgeKey, newEdge);
                projectedEdges.push(newEdge);
            });
        }
    }
    else {
        edgeHash = new Map();
        networkSettings.graphSettings.edgeHash = edgeHash;
        projectedEdges.forEach(function (edge) {
            var edgeSource = typeof edge.source === "string"
                ? edge.source
                : nodeIDAccessor(edge.source);
            var edgeTarget = typeof edge.target === "string"
                ? edge.target
                : nodeIDAccessor(edge.target);
            var edgeKey = edgeSource + "|" + edgeTarget;
            edgeHash.set(edgeKey, edge);
        });
    }
    var customNodeIcon = determineNodeIcon(baseCustomNodeIcon, networkSettings, adjustedSize, projectedNodes);
    var customEdgeIcon = determineEdgeIcon({
        baseCustomEdgeIcon: baseCustomEdgeIcon,
        networkSettings: networkSettings,
        size: adjustedSize,
        nodes: projectedNodes,
        graph: graph
    });
    if ((networkSettings.type === "sankey" ||
        networkSettings.type === "flowchart") &&
        networkDrawing_1.topologicalSort(projectedNodes, projectedEdges) === null) {
        networkSettings.customSankey = d3_sankey_circular_1.sankeyCircular;
    }
    networkSettings.width = size[0];
    networkSettings.height = size[1];
    var networkSettingsChanged = false;
    networkSettingsKeys.forEach(function (key) {
        if (key !== "edgeType" &&
            key !== "graphSettings" &&
            networkSettings[key] !== prevState.graphSettings[key]) {
            networkSettingsChanged = true;
        }
    });
    //Support bubble chart with circle pack and with force
    if (networkSettings.type === "sankey") {
        edgeType = function (d) {
            return d.circular
                ? networkDrawing_1.circularAreaLink(d)
                : edgeType === "angled"
                    ? networkDrawing_1.ribbonLink(d)
                    : networkDrawing_1.areaLink(d);
        };
    }
    else if (isHierarchical) {
        projectedNodes.forEach(function (node) {
            if (createPointLayer) {
                node.x = (node.x0 + node.x1) / 2;
                node.y = (node.y0 + node.y1) / 2;
            }
            if (typeof networkSettings.type === "string" &&
                hierarchicalProjectable[networkSettings.type] &&
                networkSettings.projection === "horizontal") {
                var ox = node.x;
                node.x = node.y;
                node.y = ox;
                if (createPointLayer) {
                    var ox0 = node.x0;
                    var ox1 = node.x1;
                    node.x0 = node.y0;
                    node.x1 = node.y1;
                    node.y0 = ox0;
                    node.y1 = ox1;
                }
            }
            else if (typeof networkSettings.type === "string" &&
                radialProjectable[networkSettings.type] &&
                networkSettings.projection === "radial") {
                var radialPoint = node.depth === 0
                    ? [adjustedSize[0] / 2, adjustedSize[1] / 2]
                    : pieceDrawing_1.pointOnArcAtAngle([adjustedSize[0] / 2, adjustedSize[1] / 2], node.x / adjustedSize[0], node.y / 2);
                node.x = radialPoint[0];
                node.y = radialPoint[1];
            }
            else {
                node.x = node.x;
                node.y = node.y;
                if (createPointLayer) {
                    node.x0 = node.x0;
                    node.x1 = node.x1;
                    node.y0 = node.y0;
                    node.y1 = node.y1;
                }
            }
        });
    }
    if (networkSettings.type !== "static" &&
        (changedData || networkSettingsChanged)) {
        var components = [
            {
                componentNodes: projectedNodes,
                componentEdges: projectedEdges
            }
        ];
        if (networkSettings.type === "chord") {
            var radius = adjustedSize[1] / 2;
            var _e = networkSettings.groupWidth, groupWidth = _e === void 0 ? 20 : _e, _f = networkSettings.padAngle, padAngle = _f === void 0 ? 0.01 : _f, sortGroups = networkSettings.sortGroups;
            var arcGenerator_1 = d3_shape_1.arc()
                .innerRadius(radius - groupWidth)
                .outerRadius(radius);
            var ribbonGenerator_1 = d3_chord_1.ribbon().radius(radius - groupWidth);
            var matrixifiedNetwork = matrixify({
                edgeHash: edgeHash,
                nodes: projectedNodes,
                edgeWidthAccessor: edgeWidthAccessor,
                nodeIDAccessor: nodeIDAccessor
            });
            var chordLayout = d3_chord_1.chord().padAngle(padAngle);
            if (sortGroups) {
                chordLayout.sortGroups(sortGroups);
            }
            var chords = chordLayout(matrixifiedNetwork);
            var groups = chords.groups;
            groups.forEach(function (group) {
                var groupCentroid = arcGenerator_1.centroid(group);
                var groupD = arcGenerator_1(group);
                var groupNode = projectedNodes[group.index];
                groupNode.d = groupD;
                groupNode.index = group.index;
                groupNode.x = groupCentroid[0] + adjustedSize[0] / 2;
                groupNode.y = groupCentroid[1] + adjustedSize[1] / 2;
            });
            chords.forEach(function (generatedChord) {
                var chordD = ribbonGenerator_1(generatedChord);
                //this is incorrect should use edgeHash
                var nodeSourceID = nodeIDAccessor(projectedNodes[generatedChord.source.index]);
                var nodeTargetID = nodeIDAccessor(projectedNodes[generatedChord.target.index]);
                var chordEdge = edgeHash.get(nodeSourceID + "|" + nodeTargetID);
                chordEdge.d = chordD;
                var chordBounds = svg_path_bounding_box_1.default(chordD);
                chordEdge.x =
                    adjustedSize[0] / 2 + (chordBounds.x1 + chordBounds.x2) / 2;
                chordEdge.y =
                    adjustedSize[1] / 2 + (chordBounds.y1 + chordBounds.y2) / 2;
            });
        }
        else if (networkSettings.type === "sankey" ||
            networkSettings.type === "flowchart") {
            var _g = networkSettings.orient, orient = _g === void 0 ? "center" : _g, _h = networkSettings.iterations, iterations = _h === void 0 ? 100 : _h, nodePadding = networkSettings.nodePadding, _j = networkSettings.nodePaddingRatio, nodePaddingRatio = _j === void 0 ? nodePadding ? undefined : 0.5 : _j, _k = networkSettings.nodeWidth, nodeWidth = _k === void 0 ? networkSettings.type === "flowchart" ? 2 : 24 : _k, customSankey = networkSettings.customSankey, _l = networkSettings.direction, direction_1 = _l === void 0 ? "right" : _l;
            var sankeyOrient = sankeyOrientHash[orient];
            var actualSankey = customSankey || d3_sankey_circular_1.sankeyCircular;
            var frameExtent = [[0, 0], adjustedSize];
            if (networkSettings.direction === "up" ||
                networkSettings.direction === "down") {
                frameExtent = [[0, 0], [adjustedSize[1], adjustedSize[0]]];
            }
            var frameSankey = actualSankey()
                .extent(frameExtent)
                .links(projectedEdges)
                .nodes(projectedNodes)
                .nodeAlign(sankeyOrient)
                .nodeId(nodeIDAccessor)
                .nodeWidth(nodeWidth)
                .iterations(iterations);
            if (frameSankey.nodePaddingRatio && nodePaddingRatio) {
                frameSankey.nodePaddingRatio(nodePaddingRatio);
            }
            else if (nodePadding) {
                frameSankey.nodePadding(nodePadding);
            }
            frameSankey();
            projectedNodes.forEach(function (d) {
                d.height = d.y1 - d.y0;
                d.width = d.x1 - d.x0;
                d.x = d.x0 + d.width / 2;
                d.y = d.y0 + d.height / 2;
                d.radius = d.height / 2;
                d.direction = direction_1;
            });
            projectedEdges.forEach(function (d) {
                d.sankeyWidth = d.width;
                d.direction = direction_1;
                d.width = undefined;
            });
        }
        else if (networkSettings.type === "force") {
            var _m = networkSettings.iterations, iterations = _m === void 0 ? 500 : _m, _o = networkSettings.edgeStrength, edgeStrength_1 = _o === void 0 ? 0.1 : _o, _p = networkSettings.distanceMax, distanceMax = _p === void 0 ? Infinity : _p, edgeDistance = networkSettings.edgeDistance, _q = networkSettings.forceManyBody, nsForceMB = _q === void 0 ? (function (d) { return -25 * nodeSizeAccessor(d); }) : _q;
            var linkForce = d3_force_1.forceLink().strength(function (d) {
                return Math.min(2.5, d.weight ? d.weight * edgeStrength_1 : edgeStrength_1);
            });
            if (edgeDistance) {
                linkForce.distance(edgeDistance);
            }
            var simulation = networkSettings.simulation ||
                d3_force_1.forceSimulation().force("charge", d3_force_1.forceManyBody()
                    .distanceMax(distanceMax)
                    .strength(nsForceMB));
            //        simulation.force("link", linkForce).nodes(projectedNodes)
            simulation.nodes(projectedNodes);
            var forceMod = adjustedSize[1] / adjustedSize[0];
            if (!simulation.force("x")) {
                simulation.force("x", d3_force_1.forceX(adjustedSize[0] / 2).strength(forceMod * 0.1));
            }
            if (!simulation.force("y")) {
                simulation.force("y", d3_force_1.forceY(adjustedSize[1] / 2).strength(0.1));
            }
            if (projectedEdges.length !== 0 && !simulation.force("link")) {
                simulation.force("link", linkForce);
                simulation.force("link").links(projectedEdges);
            }
            //reset alpha if it's too cold
            if (simulation.alpha() < 0.1) {
                simulation.alpha(1);
            }
            simulation.stop();
            for (var i = 0; i < iterations; ++i) {
                simulation.tick();
            }
        }
        else if (networkSettings.type === "motifs") {
            var componentHash_1 = new Map();
            projectedEdges.forEach(function (edge) {
                ;
                [edge.source, edge.target].forEach(function (node) {
                    if (!componentHash_1.get(node)) {
                        componentHash_1.set(node, {
                            node: node,
                            component: -99,
                            connectedNodes: [],
                            edges: []
                        });
                    }
                });
                componentHash_1.get(edge.source).connectedNodes.push(edge.target);
                componentHash_1.get(edge.target).connectedNodes.push(edge.source);
                componentHash_1.get(edge.source).edges.push(edge);
            });
            components = breadthFirstCompontents(projectedNodes, componentHash_1);
            var largestComponent_1 = Math.max(projectedNodes.length / 3, components[0].componentNodes.length);
            var layoutSize_1 = size[0] > size[1] ? size[1] : size[0];
            var layoutDirection_1 = size[0] > size[1] ? "horizontal" : "vertical";
            var _r = networkSettings.iterations, iterations_1 = _r === void 0 ? 500 : _r, _s = networkSettings.edgeStrength, edgeStrength_2 = _s === void 0 ? 0.1 : _s, edgeDistance_1 = networkSettings.edgeDistance, _t = networkSettings.padding, padding_1 = _t === void 0 ? 0 : _t;
            var currentX_1 = padding_1;
            var currentY_1 = padding_1;
            components.forEach(function (_a) {
                var componentNodes = _a.componentNodes, componentEdges = _a.componentEdges;
                var linkForce = d3_force_1.forceLink().strength(function (d) {
                    return Math.min(2.5, d.weight ? d.weight * edgeStrength_2 : edgeStrength_2);
                });
                if (edgeDistance_1) {
                    linkForce.distance(edgeDistance_1);
                }
                var componentLayoutSize = Math.max(componentNodes.length / largestComponent_1, 0.2) * layoutSize_1;
                var xBound = componentLayoutSize + currentX_1;
                var yBound = componentLayoutSize + currentY_1;
                if (layoutDirection_1 === "horizontal") {
                    if (yBound > size[1]) {
                        currentX_1 = componentLayoutSize + currentX_1 + padding_1;
                        currentY_1 = componentLayoutSize + padding_1;
                    }
                    else {
                        currentY_1 = componentLayoutSize + currentY_1 + padding_1;
                    }
                }
                else {
                    if (xBound > size[0]) {
                        currentY_1 = componentLayoutSize + currentY_1 + padding_1;
                        currentX_1 = componentLayoutSize + padding_1;
                    }
                    else {
                        currentX_1 = componentLayoutSize + currentX_1 + padding_1;
                    }
                }
                var xCenter = currentX_1 - componentLayoutSize / 2;
                var yCenter = currentY_1 - componentLayoutSize / 2;
                var simulation = d3_force_1.forceSimulation()
                    .force("charge", d3_force_1.forceManyBody().strength(networkSettings.forceManyBody ||
                    (function (d) { return -25 * nodeSizeAccessor(d); })))
                    .force("link", linkForce);
                simulation
                    .force("x", d3_force_1.forceX(xCenter))
                    .force("y", d3_force_1.forceY(yCenter))
                    .nodes(componentNodes);
                simulation.force("link").links(componentEdges);
                simulation.stop();
                for (var i = 0; i < iterations_1; ++i)
                    simulation.tick();
                var maxX = d3_array_1.max(componentNodes.map(function (d) { return d.x; }));
                var maxY = d3_array_1.max(componentNodes.map(function (d) { return d.y; }));
                var minX = d3_array_1.min(componentNodes.map(function (d) { return d.x; }));
                var minY = d3_array_1.min(componentNodes.map(function (d) { return d.y; }));
                var resetX = d3_scale_1.scaleLinear()
                    .domain([minX, maxX])
                    .range([currentX_1 - componentLayoutSize, currentX_1 - 20]);
                var resetY = d3_scale_1.scaleLinear()
                    .domain([minY, maxY])
                    .range([currentY_1 - componentLayoutSize, currentY_1 - 20]);
                componentNodes.forEach(function (node) {
                    node.x = resetX(node.x);
                    node.y = resetY(node.y);
                });
            });
        }
        else if (networkSettings.type === "matrix") {
            if (networkSettings.sort) {
                projectedNodes = projectedNodes.sort(networkSettings.sort);
            }
            var gridSize = Math.min.apply(Math, __spread(adjustedSize));
            var stepSize_1 = gridSize / (projectedNodes.length + 1);
            projectedNodes.forEach(function (node, index) {
                node.x = 0;
                node.y = (index + 1) * stepSize_1;
            });
        }
        else if (networkSettings.type === "arc") {
            if (networkSettings.sort) {
                projectedNodes = projectedNodes.sort(networkSettings.sort);
            }
            var stepSize_2 = adjustedSize[0] / (projectedNodes.length + 2);
            projectedNodes.forEach(function (node, index) {
                node.x = (index + 1) * stepSize_2;
                node.y = adjustedSize[1] / 2;
            });
        }
        else if (typeof networkSettings.type === "function") {
            networkSettings.type({
                nodes: projectedNodes,
                edges: projectedEdges
            });
        }
        else {
            projectedNodes.forEach(function (node) {
                node.x = node.x === undefined ? (node.x0 + node.x1) / 2 : node.x;
                node.y = node.y === undefined ? node.y0 : node.y;
            });
        }
        prevState.graphSettings.nodes = currentProps.nodes;
        prevState.graphSettings.edges = currentProps.edges;
    }
    //filter out user-defined nodes
    projectedNodes = projectedNodes.filter(filterRenderedNodes);
    projectedEdges = projectedEdges.filter(function (d) {
        return projectedNodes.indexOf(d.target) !== -1 &&
            projectedNodes.indexOf(d.source) !== -1;
    });
    if (networkSettings.direction === "flip") {
        projectedNodes.forEach(function (node) {
            // const ox = node.x
            // const oy = node.y
            node.x = adjustedSize[0] - node.x;
            node.y = adjustedSize[1] - node.y;
        });
    }
    else if (networkSettings.direction === "up" ||
        networkSettings.direction === "down") {
        var mod_1 = networkSettings.direction === "up"
            ? function (value) { return adjustedSize[1] - value; }
            : function (value) { return value; };
        projectedNodes.forEach(function (node) {
            var ox = node.x;
            var ox0 = node.x0;
            var ox1 = node.x1;
            node.x = mod_1(node.y);
            node.x0 = mod_1(node.y0);
            node.x1 = mod_1(node.y1);
            node.y = ox;
            node.y0 = ox0;
            node.y1 = ox1;
        });
    }
    else if (networkSettings.direction === "left") {
        projectedNodes.forEach(function (node) {
            node.x = adjustedSize[0] - node.x;
            node.x0 = adjustedSize[0] - node.x0;
            node.x1 = adjustedSize[0] - node.x1;
        });
    }
    if (typeof networkSettings.zoom === "function") {
        networkSettings.zoom(projectedNodes, adjustedSize);
    }
    else if (networkSettings.zoom !== false &&
        networkSettings.type !== "matrix" &&
        networkSettings.type !== "chord" &&
        networkSettings.type !== "sankey" &&
        networkSettings.type !== "partition" &&
        networkSettings.type !== "treemap" &&
        networkSettings.type !== "circlepack" &&
        networkSettings.type !== "dagre") {
        // ZOOM SHOULD MAINTAIN ASPECT RATIO, ADD "stretch" to fill whole area
        var xMin = d3_array_1.min(projectedNodes.map(function (p) { return p.x - nodeSizeAccessor(p); }));
        var xMax = d3_array_1.max(projectedNodes.map(function (p) { return p.x + nodeSizeAccessor(p); }));
        var yMin = d3_array_1.min(projectedNodes.map(function (p) { return p.y - nodeSizeAccessor(p); }));
        var yMax = d3_array_1.max(projectedNodes.map(function (p) { return p.y + nodeSizeAccessor(p); }));
        var xSize = Math.abs(xMax - xMin);
        var ySize = Math.abs(yMax - yMin);
        var networkAspectRatio = xSize / ySize;
        var baseAspectRatio = adjustedSize[0] / adjustedSize[1];
        var yMod = void 0, xMod = void 0;
        if (networkSettings.zoom === "stretch") {
            yMod = 0;
            xMod = 0;
        }
        else if (xSize > ySize) {
            if (networkAspectRatio > baseAspectRatio) {
                xMod = 0;
                yMod = (adjustedSize[1] - (adjustedSize[0] / xSize) * ySize) / 2;
            }
            else {
                yMod = 0;
                xMod = (adjustedSize[0] - (adjustedSize[1] / ySize) * xSize) / 2;
            }
        }
        else {
            if (networkAspectRatio > baseAspectRatio) {
                xMod = 0;
                yMod = (adjustedSize[1] - (adjustedSize[0] / xSize) * ySize) / 2;
            }
            else {
                yMod = 0;
                xMod = (adjustedSize[0] - (adjustedSize[1] / ySize) * xSize) / 2;
            }
        }
        var projectionScaleX_1 = d3_scale_1.scaleLinear()
            .domain([xMin, xMax])
            .range([xMod, adjustedSize[0] - xMod]);
        var projectionScaleY_1 = d3_scale_1.scaleLinear()
            .domain([yMin, yMax])
            .range([yMod, adjustedSize[1] - yMod]);
        projectedNodes.forEach(function (node) {
            node.x = projectionScaleX_1(node.x);
            node.y = projectionScaleY_1(node.y);
        });
    }
    else if (networkSettings.zoom !== false &&
        networkSettings.projection !== "radial" &&
        (networkSettings.type === "partition" ||
            networkSettings.type === "treemap" ||
            networkSettings.type === "dagre")) {
        var xMin = d3_array_1.min(projectedNodes.map(function (p) { return p.x0; }));
        var xMax = d3_array_1.max(projectedNodes.map(function (p) { return p.x1; }));
        var yMin = d3_array_1.min(projectedNodes.map(function (p) { return p.y0; }));
        var yMax = d3_array_1.max(projectedNodes.map(function (p) { return p.y1; }));
        var projectionScaleX_2 = d3_scale_1.scaleLinear()
            .domain([xMin, xMax])
            .range([margin.left, adjustedSize[0] - margin.right]);
        var projectionScaleY_2 = d3_scale_1.scaleLinear()
            .domain([yMin, yMax])
            .range([margin.top, adjustedSize[1] - margin.bottom]);
        projectedNodes.forEach(function (node) {
            node.x = projectionScaleX_2(node.x);
            node.y = projectionScaleY_2(node.y);
            node.x0 = projectionScaleX_2(node.x0);
            node.y0 = projectionScaleY_2(node.y0);
            node.x1 = projectionScaleX_2(node.x1);
            node.y1 = projectionScaleY_2(node.y1);
            node.zoomedHeight = node.y1 - node.y0;
            node.zoomedWidth = node.x1 - node.x0;
        });
        projectedEdges.forEach(function (edge) {
            if (edge.points) {
                edge.points.forEach(function (p) {
                    p.x = projectionScaleX_2(p.x);
                    p.y = projectionScaleY_2(p.y);
                });
            }
        });
    }
    projectedNodes.forEach(function (node) {
        node.nodeSize = nodeSizeAccessor(node);
    });
    projectedEdges.forEach(function (edge) {
        edge.width = edgeWidthAccessor(edge);
    });
    var legendSettings;
    if (currentProps.legend) {
        legendSettings = currentProps.legend;
        if (!legendSettings.legendGroups) {
            ///Something auto for networks
            var legendGroups = [
                {
                    styleFn: currentProps.nodeStyle,
                    type: "fill",
                    items: []
                }
            ];
            legendSettings.legendGroups = legendGroups;
        }
    }
    var networkFrameRender = {
        edges: {
            accessibleTransform: function (data, i) {
                var edgeX = (data[i].source.x + data[i].target.x) / 2;
                var edgeY = (data[i].source.y + data[i].target.y) / 2;
                return __assign(__assign({ type: "frame-hover" }, data[i]), { x: edgeX, y: edgeY });
            },
            data: projectedEdges,
            styleFn: dataFunctions_1.stringToFn(edgeStyle, function () { return ({}); }, true),
            classFn: dataFunctions_1.stringToFn(edgeClass, function () { return ""; }, true),
            renderMode: dataFunctions_1.stringToFn(edgeRenderMode, undefined, true),
            canvasRenderFn: canvasEdges && dataFunctions_1.stringToFn(canvasEdges, undefined, true),
            renderKeyFn: currentProps.edgeRenderKey
                ? currentProps.edgeRenderKey
                : function (d) { return d._NWFEdgeKey || d.source.id + "-" + d.target.id; },
            behavior: networkDrawing_1.drawEdges,
            projection: networkSettings.projection,
            type: edgeType,
            customMark: customEdgeIcon,
            networkSettings: networkSettings
        },
        nodes: {
            accessibleTransform: function (data, i) { return (__assign(__assign({ type: "frame-hover" }, data[i]), (data[i].data || {}))); },
            data: projectedNodes,
            styleFn: nodeStyleFn,
            classFn: nodeClassFn,
            renderMode: nodeRenderModeFn,
            canvasRenderFn: nodeCanvasRenderFn,
            customMark: customNodeIcon,
            behavior: networkDrawing_1.drawNodes,
            renderKeyFn: currentProps.nodeRenderKey
        }
    };
    var nodeLabelAnnotations = [];
    if (currentProps.nodeLabels && projectedNodes) {
        projectedNodes.forEach(function (node, nodei) {
            var feasibleLabel = nodeLabels && nodeLabels !== true && nodeLabels(node);
            if (nodeLabels === true || feasibleLabel) {
                var actualLabel = networkSettings.projection === "radial" && node.depth !== 0
                    ? networkDrawing_1.radialLabelGenerator(node, nodei, nodeLabels === true ? nodeIDAccessor : nodeLabels, adjustedSize)
                    : nodeLabels === true
                        ? nodeIDAccessor(node, nodei)
                        : feasibleLabel;
                var nodeLabel = void 0;
                if (React.isValidElement(actualLabel)) {
                    nodeLabel = {
                        key: "node-label-" + nodei,
                        type: "basic-node-label",
                        x: node.x,
                        y: node.y,
                        element: actualLabel
                    };
                }
                else {
                    nodeLabel = {
                        key: "node-label-" + nodei,
                        className: "node-label",
                        dx: 0,
                        dy: 0,
                        x: node.x,
                        y: node.y,
                        note: { label: actualLabel },
                        connector: { end: "none" },
                        type: AnnotationLabel_1.default,
                        subject: { radius: nodeSizeAccessor(node) + 2 }
                    };
                }
                nodeLabelAnnotations.push(nodeLabel);
            }
        });
    }
    var projectedXYPoints;
    var overlay = [];
    var areaBasedTypes = ["circlepack", "treemap", "partition", "chord"];
    if ((hoverAnnotation &&
        areaBasedTypes.find(function (d) { return d === networkSettings.type; })) ||
        hoverAnnotation === "area") {
        if (hoverAnnotation !== "edge") {
            var renderedNodeOverlays = projectedNodes.map(function (d, i) { return (__assign({ overlayData: d }, customNodeIcon({
                d: d,
                i: i,
                transform: "translate(" + d.x + "," + d.y + ")",
                styleFn: function () { return ({ opacity: 0 }); }
            }).props)); });
            overlay.push.apply(overlay, __spread(renderedNodeOverlays));
        }
        if (hoverAnnotation !== "node") {
            projectedEdges.forEach(function (d, i) {
                var generatedIcon = customEdgeIcon({
                    d: d,
                    i: i,
                    transform: "translate(" + d.x + "," + d.y + ")",
                    styleFn: function () { return ({ opacity: 0 }); }
                });
                if (generatedIcon) {
                    overlay.push(__assign({ overlayData: __assign(__assign({}, d), { x: d.x || (d.source.x + d.target.x) / 2, y: d.y || (d.source.y + d.target.y) / 2, edge: true }) }, generatedIcon.props));
                }
            });
        }
    }
    else if (hoverAnnotation === "edge" &&
        typeof networkSettings.type === "string" &&
        edgePointHash[networkSettings.type]) {
        projectedXYPoints = projectedEdges.map(edgePointHash[networkSettings.type]);
    }
    else if (Array.isArray(hoverAnnotation) ||
        hoverAnnotation === true ||
        hoverAnnotation === "node") {
        projectedXYPoints = projectedNodes;
        if (changedData || networkSettingsChanged)
            projectedXYPoints = __spread(projectedNodes);
    }
    else if (hoverAnnotation === "all" &&
        typeof networkSettings.type === "string") {
        projectedXYPoints = __spread(projectedEdges.map(edgePointHash[networkSettings.type]), projectedNodes);
    }
    return {
        adjustedPosition: adjustedPosition,
        adjustedSize: adjustedSize,
        backgroundGraphics: currentProps.backgroundGraphics,
        foregroundGraphics: currentProps.foregroundGraphics,
        title: title,
        renderNumber: prevState.renderNumber + 1,
        projectedNodes: projectedNodes,
        projectedEdges: projectedEdges,
        projectedXYPoints: projectedXYPoints,
        overlay: overlay,
        nodeIDAccessor: nodeIDAccessor,
        sourceAccessor: sourceAccessor,
        targetAccessor: targetAccessor,
        nodeSizeAccessor: nodeSizeAccessor,
        edgeWidthAccessor: edgeWidthAccessor,
        margin: margin,
        legendSettings: legendSettings,
        networkFrameRender: networkFrameRender,
        nodeLabelAnnotations: nodeLabelAnnotations,
        graphSettings: __assign(__assign({}, networkSettings.graphSettings), networkSettings),
        props: currentProps
    };
};
//# sourceMappingURL=network.js.map