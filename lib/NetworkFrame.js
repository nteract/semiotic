"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _class, _temp;
//import louvain from 'graphology-communities-louvain'


/*
const customEdgeHashProject = {
  offset: glyphProject.offset,
  parallel: glyphProject.parallel
}

const customEdgeHashMutate = {
  particle: glyphMutate.particle
}
*/

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _d3Force = require("d3-force");

var _d3BboxCollide = require("d3-bboxCollide");

var _d3Scale = require("d3-scale");

var _d3Array = require("d3-array");

var _jsx = require("./constants/jsx");

var _Annotation = require("./Annotation");

var _Annotation2 = _interopRequireDefault(_Annotation);

var _d3Hierarchy = require("d3-hierarchy");

var _reactAnnotation = require("react-annotation");

var _Frame = require("./Frame");

var _Frame2 = _interopRequireDefault(_Frame);

var _semioticMark = require("semiotic-mark");

var _DownloadButton = require("./DownloadButton");

var _DownloadButton2 = _interopRequireDefault(_DownloadButton);

var _frameFunctions = require("./svg/frameFunctions");

var _networkDrawing = require("./svg/networkDrawing");

var _dataFunctions = require("./data/dataFunctions");

var _downloadDataMapping = require("./downloadDataMapping");

var _graphology = require("graphology");

var _graphology2 = _interopRequireDefault(_graphology);

var _graphologyComponents = require("graphology-components");

var _d3Sankey = require("d3-sankey");

var _d3Interpolate = require("d3-interpolate");

var _d3Chord = require("d3-chord");

var _d3Shape = require("d3-shape");

var _propTypes = require("prop-types");

var _propTypes2 = _interopRequireDefault(_propTypes);

var _frame_props = require("./constants/frame_props");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var projectedCoordinateNames = { y: "y", x: "x" };

function recursiveIDAccessor(idAccessor, node, accessorString) {
  if (node.parent) {
    accessorString = accessorString + "-" + recursiveIDAccessor(idAccessor, node.parent, accessorString);
  }
  return accessorString + "-" + idAccessor(node.data);
}

var sankeyOrientHash = {
  left: _d3Sankey.sankeyLeft,
  right: _d3Sankey.sankeyRight,
  center: _d3Sankey.sankeyCenter,
  justify: _d3Sankey.sankeyJustify
};

var xScale = (0, _d3Scale.scaleIdentity)();
var yScale = (0, _d3Scale.scaleIdentity)();

var curvature = 0.5;

var areaLink = function areaLink(d) {
  var x0 = d.source.x1,
      x1 = d.target.x0,
      xi = (0, _d3Interpolate.interpolateNumber)(x0, x1),
      x2 = xi(curvature),
      x3 = xi(1 - curvature),
      y0 = d.y0 - d.sankeyWidth / 2,
      y1 = d.y1 - d.sankeyWidth / 2,
      y2 = d.y1 + d.sankeyWidth / 2,
      y3 = d.y0 + d.sankeyWidth / 2;

  if (y3 - y0 < 30000) {
    return "M" + x0 + "," + y0 + "C" + x2 + "," + y0 + " " + x3 + "," + y1 + " " + x1 + "," + y1 + "L" + x1 + "," + y2 + "C" + x3 + "," + y2 + " " + x2 + "," + y3 + " " + x0 + "," + y3 + "Z";
  } else {
    var offset = (x1 - x0) / 4;
    return "M" + x0 + "," + y0 + "C" + x2 + "," + y0 + " " + x3 + "," + y1 + " " + (x1 - offset) + "," + (y1 + 0) + "L" + (x1 - 6) + "," + (y2 + y1) / 2 + "L" + (x1 - offset) + "," + (y2 + 0) + "C" + x3 + "," + y2 + " " + x2 + "," + y3 + " " + x0 + "," + y3 + "Z";
  }
};

var matrixify = function matrixify(_ref) {
  var edgeHash = _ref.edgeHash,
      nodes = _ref.nodes,
      edges = _ref.edges,
      edgeWidthAccessor = _ref.edgeWidthAccessor,
      nodeIDAccessor = _ref.nodeIDAccessor;

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
      } else {
        sourceRow.push(0);
      }
    });
  });
  return matrix;
};

var NetworkFrame = (_temp = _class = function (_React$Component) {
  _inherits(NetworkFrame, _React$Component);

  function NetworkFrame(props) {
    _classCallCheck(this, NetworkFrame);

    var _this = _possibleConstructorReturn(this, (NetworkFrame.__proto__ || Object.getPrototypeOf(NetworkFrame)).call(this, props));

    _this.calculateNetworkFrame = _this.calculateNetworkFrame.bind(_this);
    _this.defaultNetworkHTMLRule = _this.defaultNetworkHTMLRule.bind(_this);
    _this.defaultNetworkSVGRule = _this.defaultNetworkSVGRule.bind(_this);

    _this.renderBody = _this.renderBody.bind(_this);

    _this.graphSettings = {
      numberOfNodes: 0,
      numberOfEdges: 0,
      type: "empty-start"
    };
    _this.state = {
      nodeData: null,
      edgeData: null,
      adjustedPosition: null,
      adjustedSize: null,
      backgroundGraphics: null,
      foregroundGraphics: null,
      projectedNodes: undefined,
      projectedEdges: undefined,
      renderNumber: 0,
      voronoiHover: null,
      nodeLabelAnnotations: []
    };

    _this.oAccessor = null;
    _this.rAccessor = null;
    _this.oScale = null;
    _this.rScale = null;
    return _this;
  }

  _createClass(NetworkFrame, [{
    key: "componentWillMount",
    value: function componentWillMount() {
      this.calculateNetworkFrame(this.props);
    }
  }, {
    key: "componentWillReceiveProps",
    value: function componentWillReceiveProps(nextProps) {
      var _this2 = this;

      if (this.state.dataVersion && this.state.dataVersion !== nextProps.dataVersion || !this.state.projectedNodes && !this.state.projectedEdges) {
        this.calculateNetworkFrame(nextProps);
      } else if (this.props.size[0] !== nextProps.size[0] || this.props.size[1] !== nextProps.size[1] || !this.state.dataVersion && _frame_props.networkFrameChangeProps.find(function (d) {
        return _this2.props[d] !== nextProps[d];
      })) {
        this.calculateNetworkFrame(nextProps);
      }
    }
  }, {
    key: "onNodeClick",
    value: function onNodeClick(d, i) {
      if (this.props.onNodeClick) {
        this.props.onNodeClick(d, i);
      }
    }
  }, {
    key: "onNodeEnter",
    value: function onNodeEnter(d, i) {
      if (this.props.onNodeEnter) {
        this.props.onNodeEnter(d, i);
      }
    }
  }, {
    key: "onNodeOut",
    value: function onNodeOut(d, i) {
      if (this.props.onNodeOut) {
        this.props.onNodeOut(d, i);
      }
    }
  }, {
    key: "calculateNetworkFrame",
    value: function calculateNetworkFrame(currentProps) {
      var _this3 = this;

      var nodes = currentProps.nodes,
          edges = currentProps.edges,
          networkType = currentProps.networkType,
          size = currentProps.size,
          nodeStyle = currentProps.nodeStyle,
          nodeClass = currentProps.nodeClass,
          canvasNodes = currentProps.canvasNodes,
          edgeStyle = currentProps.edgeStyle,
          edgeClass = currentProps.edgeClass,
          canvasEdges = currentProps.canvasEdges,
          nodeRenderMode = currentProps.nodeRenderMode,
          edgeRenderMode = currentProps.edgeRenderMode,
          nodeLabels = currentProps.nodeLabels;
      //    const eventListenersGenerator = generatenetworkFrameEventListeners(customHoverBehavior, customClickBehavior)

      var edgeType = currentProps.edgeType,
          customNodeIcon = currentProps.customNodeIcon,
          customEdgeIcon = currentProps.customEdgeIcon;


      var networkSettings = void 0,
          rootNode = void 0,
          hierarchicalNetwork = void 0;

      if (typeof networkType === "string") {
        networkSettings = { type: networkType, iterations: 500 };
      } else {
        networkSettings = networkType;
      }

      if (!edgeType && networkSettings.type === "sankey") {
        edgeType = areaLink;
      }

      var nodeIDAccessor = (0, _dataFunctions.stringToFn)(currentProps.nodeIDAccessor, function (d) {
        return d.id;
      });
      var sourceAccessor = (0, _dataFunctions.stringToFn)(currentProps.sourceAccessor, function (d) {
        return d.source;
      });
      var targetAccessor = (0, _dataFunctions.stringToFn)(currentProps.targetAccessor, function (d) {
        return d.target;
      });
      var nodeSizeAccessor = typeof currentProps.nodeSizeAccessor === "number" ? function () {
        return currentProps.nodeSizeAccessor;
      } : (0, _dataFunctions.stringToFn)(currentProps.nodeSizeAccessor, function () {
        return 5;
      });
      var edgeWidthAccessor = (0, _dataFunctions.stringToFn)(currentProps.edgeWidthAccessor, function (d) {
        return d.weight || 1;
      });
      var nodeStyleFn = (0, _dataFunctions.stringToFn)(nodeStyle, function () {}, true);
      var nodeClassFn = (0, _dataFunctions.stringToFn)(nodeClass, function () {
        return "";
      }, true);
      var nodeRenderModeFn = (0, _dataFunctions.stringToFn)(nodeRenderMode, undefined, true);
      var nodeCanvasRenderFn = (0, _dataFunctions.stringToFn)(canvasNodes, undefined, true);

      var margin = (0, _frameFunctions.calculateMargin)(currentProps);

      var _adjustedPositionSize = (0, _frameFunctions.adjustedPositionSize)(currentProps),
          adjustedPosition = _adjustedPositionSize.adjustedPosition,
          adjustedSize = _adjustedPositionSize.adjustedSize;

      var title = (0, _frameFunctions.generateFrameTitle)(currentProps);

      var _state = this.state,
          projectedNodes = _state.projectedNodes,
          projectedEdges = _state.projectedEdges;


      var changedData = !this.state.projectedNodes || !this.state.projectedEdges || this.graphSettings.nodes !== currentProps.nodes || this.graphSettings.edges !== currentProps.edges || networkSettings.type === "dendrogram";

      if (changedData) {
        this.edgeHash = new Map();
        this.nodeHash = new Map();
        projectedNodes = [];
        projectedEdges = [];
        nodes.forEach(function (node) {
          var id = nodeIDAccessor(node);
          _this3.nodeHash.set(id, node);
          _this3.nodeHash.set(node, node);
          projectedNodes.push(node);
          node.inDegree = 0;
          node.outDegree = 0;
          node.degree = 0;
        });

        var operationalEdges = edges;

        if (!Array.isArray(edges)) {
          this.hierarchicalNetwork = true;
          var _rootNode = (0, _d3Hierarchy.hierarchy)(edges);

          if (networkSettings.type === "dendrogram") {
            var layout = networkSettings.layout || _d3Hierarchy.tree;
            var treeChart = layout();
            treeChart.size(size);

            treeChart(_rootNode);
          }

          operationalEdges = _rootNode.descendants().filter(function (d) {
            return d.parent !== null;
          }).map(function (d) {
            return {
              source: _extends(d.parent, d.parent.data),
              target: _extends(d, d.data),
              depth: d.depth,
              weight: 1,
              value: 1,
              _NWFEdgeKey: nodeIDAccessor(d.data) + "-" + recursiveIDAccessor(nodeIDAccessor, d.parent, "")
            };
          });
        }
        operationalEdges.forEach(function (edge) {
          var source = sourceAccessor(edge);
          var target = targetAccessor(edge);
          if (!_this3.nodeHash.get(source)) {
            var sourceNode = (typeof source === "undefined" ? "undefined" : _typeof(source)) === "object" ? _extends(source, {
              degree: 0,
              inDegree: 0,
              outDegree: 0
            }) : {
              id: source,
              inDegree: 0,
              outDegree: 0,
              degree: 0,
              createdByFrame: true
            };
            _this3.nodeHash.set(source, sourceNode);

            projectedNodes.push(sourceNode);
          }
          if (!_this3.nodeHash.get(target)) {
            var targetNode = (typeof target === "undefined" ? "undefined" : _typeof(target)) === "object" ? _extends(target, {
              degree: 0,
              inDegree: 0,
              outDegree: 0
            }) : {
              id: target,
              inDegree: 0,
              outDegree: 0,
              degree: 0,
              createdByFrame: true
            };
            _this3.nodeHash.set(target, targetNode);
            projectedNodes.push(targetNode);
          }
          var edgeWeight = edge.weight || 1;
          _this3.nodeHash.get(target).inDegree += edgeWeight;
          _this3.nodeHash.get(source).outDegree += edgeWeight;
          _this3.nodeHash.get(target).degree += edgeWeight;
          _this3.nodeHash.get(source).degree += edgeWeight;

          var edgeKey = (nodeIDAccessor(source) || source) + "|" + (nodeIDAccessor(target) || target);
          var newEdge = _extends({}, edge, {
            source: _this3.nodeHash.get(source),
            target: _this3.nodeHash.get(target)
          });
          _this3.edgeHash.set(edgeKey, newEdge);
          projectedEdges.push(newEdge);
        });
      } else {
        this.edgeHash = new Map();
        projectedEdges.forEach(function (edge) {
          var edgeKey = (nodeIDAccessor(edge.source) || edge.source) + "|" + (nodeIDAccessor(edge.target) || edge.target);
          _this3.edgeHash.set(edgeKey, edge);
        });
      }

      var networkSettingsKeys = Object.keys(networkSettings);
      var networkSettingsChanged = false;

      networkSettingsKeys.forEach(function (key) {
        if (key !== "edgeType" && networkSettings[key] !== _this3.graphSettings[key]) {
          networkSettingsChanged = true;
        }
      });
      //Support bubble chart with circle pack and with force
      if (networkSettings.type === "sankey") {
        var initCustomNodeIcon = customNodeIcon;

        customNodeIcon = function customNodeIcon(_ref2) {
          var d = _ref2.d,
              i = _ref2.i,
              renderKeyFn = _ref2.renderKeyFn,
              styleFn = _ref2.styleFn,
              classFn = _ref2.classFn,
              renderMode = _ref2.renderMode,
              key = _ref2.key,
              className = _ref2.className,
              transform = _ref2.transform;

          if (initCustomNodeIcon === undefined) {
            return _react2.default.createElement(_semioticMark.Mark, {
              renderMode: renderMode ? renderMode(d, i) : undefined,
              key: key,
              className: className,
              transform: transform,
              markType: "rect",
              height: d.height,
              width: d.width,
              x: -d.width / 2,
              y: -d.height / 2,
              rx: 0,
              ry: 0,
              style: nodeStyleFn(d)
            });
          } else {
            return initCustomNodeIcon({
              d: d,
              i: i,
              renderKeyFn: renderKeyFn,
              styleFn: styleFn,
              classFn: classFn,
              renderMode: renderMode,
              key: key,
              className: className,
              transform: transform
            });
          }
        };
      } else if (networkSettings.type === "chord") {
        customNodeIcon = function customNodeIcon(_ref3) {
          var d = _ref3.d,
              i = _ref3.i,
              renderKeyFn = _ref3.renderKeyFn,
              styleFn = _ref3.styleFn,
              classFn = _ref3.classFn,
              renderMode = _ref3.renderMode,
              key = _ref3.key,
              className = _ref3.className,
              transform = _ref3.transform;
          return _react2.default.createElement(_semioticMark.Mark, {
            renderMode: renderMode ? renderMode(d, i) : undefined,
            key: key,
            className: className,
            transform: "translate(" + size[0] / 2 + "," + size[1] / 2 + ")",
            markType: "path",
            d: d.d,
            style: styleFn(d, i)
          });
        };

        customEdgeIcon = function customEdgeIcon(_ref4) {
          var d = _ref4.d,
              i = _ref4.i,
              renderKeyFn = _ref4.renderKeyFn,
              styleFn = _ref4.styleFn,
              classFn = _ref4.classFn,
              renderMode = _ref4.renderMode,
              key = _ref4.key,
              className = _ref4.className,
              transform = _ref4.transform;
          return _react2.default.createElement(_semioticMark.Mark, {
            renderMode: renderMode ? renderMode(d, i) : undefined,
            key: key,
            className: className,
            simpleInterpolate: true,
            transform: "translate(" + size[0] / 2 + "," + size[1] / 2 + ")",
            markType: "path",
            d: d.d,
            style: styleFn(d, i)
          });
        };
      } else if (networkSettings.type === "wordcloud") {
        var _initCustomNodeIcon = customNodeIcon;
        customNodeIcon = function customNodeIcon(_ref5) {
          var d = _ref5.d,
              i = _ref5.i,
              styleFn = _ref5.styleFn,
              renderKeyFn = _ref5.renderKeyFn,
              key = _ref5.key,
              className = _ref5.className,
              transform = _ref5.transform;

          if (_initCustomNodeIcon) {
            return _initCustomNodeIcon({
              d: d,
              i: i,
              styleFn: styleFn,
              renderKeyFn: renderKeyFn,
              key: key,
              className: className,
              transform: transform
            });
          } else {
            var textStyle = styleFn(d, i);
            textStyle.fontSize = d.fontSize + "px";
            textStyle.fontWeight = d.fontWeight;
            textStyle.textAnchor = "middle";
            var textTransform = void 0,
                textY = void 0,
                textX = void 0;
            textTransform = "scale(" + d.scale + ")";

            if (!d.rotate) {
              textY = d.textHeight / 4;
              textTransform = "scale(" + d.scale + ")";
            } else {
              textTransform = "rotate(90) scale(" + d.scale + ")";
              textY = d.textHeight / 4;
            }

            return _react2.default.createElement(
              "g",
              { key: key, transform: transform },
              _react2.default.createElement(
                "text",
                {
                  style: textStyle,
                  y: textY,
                  x: textX,
                  transform: textTransform,
                  className: className + " wordcloud"
                },
                d._NWFText
              )
            );
          }
        };
      } else if (networkSettings.type === "dendrogram") {
        if (networkSettings.projection === "horizontal") {
          projectedNodes.forEach(function (node) {
            var ox = node.x;
            node.x = node.y;
            node.y = ox;
          });
        }
      }

      if (changedData || networkSettingsChanged) {
        var components = [{
          componentNodes: projectedNodes,
          componentEdges: projectedEdges
        }],
            strongComponents = projectedNodes;
        if (!this.hierarchicalNetwork) {
          var graph = new _graphology2.default({ multi: !!networkSettings.multi });
          var graphologyNodes = projectedNodes.map(function (d) {
            return {
              key: nodeIDAccessor(d),
              originalNode: d
            };
          });

          graph.import({
            attributes: { name: "Graph for Processing" },
            nodes: graphologyNodes,
            edges: projectedEdges.map(function (d) {
              return {
                source: d.source.id,
                target: d.target.id,
                originalEdge: d
              };
            })
          });
          components = (0, _graphologyComponents.connectedComponents)(graph).sort(function (a, b) {
            return b.length - a.length;
          }).map(function (c) {
            return {
              componentNodes: projectedNodes.filter(function (d) {
                return c.indexOf(d.id) !== -1;
              }),
              componentEdges: projectedEdges.filter(function (d) {
                return c.indexOf(d.source.id) !== -1 || c.indexOf(d.target.id) !== -1;
              })
            };
          });

          strongComponents = (0, _graphologyComponents.stronglyConnectedComponents)(graph).sort(function (a, b) {
            return b.length - a.length;
          });
        }

        //check for components first
        if (networkSettings.type === "sankey" && strongComponents.length !== projectedNodes.length) {
          console.error("Sankey diagram cannot display a network with cycles, defaulting to force-directed layout");
          networkSettings.type = "force";
        }
        if (networkSettings.type === "chord") {
          var radius = size[1] / 2;
          var _networkSettings = networkSettings,
              _networkSettings$grou = _networkSettings.groupWidth,
              groupWidth = _networkSettings$grou === undefined ? 20 : _networkSettings$grou,
              _networkSettings$padA = _networkSettings.padAngle,
              padAngle = _networkSettings$padA === undefined ? 0.01 : _networkSettings$padA;

          var arcGenerator = (0, _d3Shape.arc)().innerRadius(radius - groupWidth).outerRadius(radius);

          var ribbonGenerator = (0, _d3Chord.ribbon)().radius(radius - groupWidth);

          var matrixifiedNetwork = matrixify({
            edgeHash: this.edgeHash,
            nodes: projectedNodes,
            edges: projectedEdges,
            edgeWidthAccessor: edgeWidthAccessor,
            nodeIDAccessor: nodeIDAccessor
          });

          var chordLayout = (0, _d3Chord.chord)().padAngle(padAngle);
          //          .sortGroups((a,b) => a - b)

          var chords = chordLayout(matrixifiedNetwork);
          var groups = chords.groups;

          groups.forEach(function (group) {
            var groupCentroid = arcGenerator.centroid(group);
            var groupD = arcGenerator(group);
            var groupNode = projectedNodes[group.index];
            groupNode.d = groupD;
            groupNode.index = group.index;
            groupNode.x = groupCentroid[0] + size[0] / 2;
            groupNode.y = groupCentroid[1] + size[1] / 2;
          });

          chords.forEach(function (chord) {
            var chordD = ribbonGenerator(chord);
            //this is incorrect should use edgeHash
            var nodeSourceID = nodeIDAccessor(projectedNodes[chord.source.index]);
            var nodeTargetID = nodeIDAccessor(projectedNodes[chord.target.index]);
            var chordEdge = _this3.edgeHash.get(nodeSourceID + "|" + nodeTargetID);
            chordEdge.d = chordD;
          });
        } else if (networkSettings.type === "sankey") {
          var _networkSettings2 = networkSettings,
              _networkSettings2$ori = _networkSettings2.orient,
              orient = _networkSettings2$ori === undefined ? "center" : _networkSettings2$ori,
              _networkSettings2$ite = _networkSettings2.iterations,
              iterations = _networkSettings2$ite === undefined ? 100 : _networkSettings2$ite,
              _networkSettings2$nod = _networkSettings2.nodePadding,
              nodePadding = _networkSettings2$nod === undefined ? 8 : _networkSettings2$nod,
              _networkSettings2$nod2 = _networkSettings2.nodeWidth,
              nodeWidth = _networkSettings2$nod2 === undefined ? 24 : _networkSettings2$nod2;

          var sankeyOrient = sankeyOrientHash[orient];

          var frameSankey = (0, _d3Sankey.sankey)().extent([[margin.left, margin.top], [size[0] - margin.right, size[1] - margin.top]]).links(projectedEdges).nodes(projectedNodes).nodeAlign(sankeyOrient).nodeId(nodeIDAccessor).nodePadding(nodePadding).nodeWidth(nodeWidth).iterations(iterations);

          frameSankey();

          projectedNodes.forEach(function (d) {
            d.height = d.y1 - d.y0;
            d.width = d.x1 - d.x0;
            d.x = d.x0 + d.width / 2;
            d.y = d.y0 + d.height / 2;
            d.radius = d.height / 2;
          });

          projectedEdges.forEach(function (d) {
            d.sankeyWidth = d.width;
            d.width = undefined;
          });
        } else if (networkSettings.type === "wordcloud") {
          var _networkSettings3 = networkSettings,
              _networkSettings3$ite = _networkSettings3.iterations,
              _iterations = _networkSettings3$ite === undefined ? 500 : _networkSettings3$ite,
              _networkSettings3$fon = _networkSettings3.fontSize,
              fontSize = _networkSettings3$fon === undefined ? 18 : _networkSettings3$fon,
              rotate = _networkSettings3.rotate,
              _networkSettings3$fon2 = _networkSettings3.fontWeight,
              fontWeight = _networkSettings3$fon2 === undefined ? 300 : _networkSettings3$fon2,
              _networkSettings3$tex = _networkSettings3.textAccessor,
              textAccessor = _networkSettings3$tex === undefined ? function (d) {
            return d.text;
          } : _networkSettings3$tex;

          var fontWeightMod = (fontWeight / 300 - 1) / 5 + 1;
          var fontWidth = fontSize / 1.5 * fontWeightMod;

          nodes.forEach(function (d, i) {
            var size = nodeSizeAccessor(d);
            d._NWFText = textAccessor(d);
            var textWidth = fontWidth * d._NWFText.length * size * 1.4;
            var textHeight = fontSize * size;

            d.textHeight = textHeight + 4;
            d.textWidth = textWidth + 4;
            d.rotate = rotate ? rotate(d, i) : 0;
            d.fontSize = fontSize * size;
            d.fontWeight = fontWeight;
            d.radius = d.r = textWidth / 2;
          });

          nodes.sort(function (a, b) {
            return b.textWidth - a.textWidth;
          });

          //bubblepack for initial position
          (0, _d3Hierarchy.packSiblings)(nodes);

          //        if (rotate) {
          var collide = (0, _d3BboxCollide.bboxCollide)(function (d) {
            if (d.rotate) {
              return [[-d.textHeight / 2, -d.textWidth / 2], [d.textHeight / 2, d.textWidth / 2]];
            }
            return [[-d.textWidth / 2, -d.textHeight / 2], [d.textWidth / 2, d.textHeight / 2]];
          }).iterations(1);

          var xCenter = size[0] / 2;
          var yCenter = size[1] / 2;

          var simulation = (0, _d3Force.forceSimulation)(nodes).velocityDecay(0.6).force("x", (0, _d3Force.forceX)(xCenter).strength(1.2)).force("y", (0, _d3Force.forceY)(yCenter).strength(1.2)).force("collide", collide);

          simulation.stop();

          for (var i = 0; i < _iterations; ++i) {
            simulation.tick();
          } //      }

          var xMin = (0, _d3Array.min)(projectedNodes.map(function (p) {
            return p.x - (p.rotate ? p.textHeight / 2 : p.textWidth / 2);
          }));
          var xMax = (0, _d3Array.max)(projectedNodes.map(function (p) {
            return p.x + (p.rotate ? p.textHeight / 2 : p.textWidth / 2);
          }));
          var yMin = (0, _d3Array.min)(projectedNodes.map(function (p) {
            return p.y - (p.rotate ? p.textWidth / 2 : p.textHeight / 2);
          }));
          var yMax = (0, _d3Array.max)(projectedNodes.map(function (p) {
            return p.y + (p.rotate ? p.textWidth / 2 : p.textHeight / 2);
          }));
          var projectionScaleX = (0, _d3Scale.scaleLinear)().domain([xMin, xMax]).range([margin.left, size[0] - margin.right]);
          var projectionScaleY = (0, _d3Scale.scaleLinear)().domain([yMin, yMax]).range([margin.top, size[1] - margin.bottom]);
          var xMod = (size[0] - margin.right) / xMax;
          var yMod = (size[1] - margin.bottom) / yMax;

          var sizeMod = Math.min(xMod, yMod) * 1.2;
          projectedNodes.forEach(function (node) {
            node.x = projectionScaleX(node.x);
            node.y = projectionScaleY(node.y);
            node.fontSize = node.fontSize * sizeMod;
            node.scale = 1;
            node.radius = node.r = Math.max(node.textHeight / 4 * yMod, node.textWidth / 4 * xMod);
            //      node.textHeight = projectionScaleY(node.textHeight)
            //      node.textWidth = projectionScaleY(node.textWidth)
          });
        } else if (networkSettings.type === "force") {
          var _networkSettings4 = networkSettings,
              _networkSettings4$ite = _networkSettings4.iterations,
              _iterations2 = _networkSettings4$ite === undefined ? 500 : _networkSettings4$ite,
              _networkSettings4$edg = _networkSettings4.edgeStrength,
              edgeStrength = _networkSettings4$edg === undefined ? 0.1 : _networkSettings4$edg,
              _networkSettings4$dis = _networkSettings4.distanceMax,
              distanceMax = _networkSettings4$dis === undefined ? Infinity : _networkSettings4$dis;

          var linkForce = (0, _d3Force.forceLink)().strength(function (d) {
            return d.weight ? d.weight * edgeStrength : edgeStrength;
          });

          var _simulation = (0, _d3Force.forceSimulation)().force("charge", (0, _d3Force.forceManyBody)().distanceMax(distanceMax).strength(networkSettings.forceManyBody || function (d) {
            return -25 * nodeSizeAccessor(d);
          })).force("x", (0, _d3Force.forceX)(size[0] / 2)).force("y", (0, _d3Force.forceY)(size[1] / 2)).force("link", linkForce).nodes(projectedNodes);

          _simulation.force("link").links(projectedEdges);

          _simulation.stop();

          for (var _i = 0; _i < _iterations2; ++_i) {
            _simulation.tick();
          }
        } else if (networkSettings.type === "motifs") {
          var largestComponent = Math.max(projectedNodes.length / 3, components[0].componentNodes.length);

          var layoutSize = size[0] > size[1] ? size[1] : size[0];
          var layoutDirection = size[0] > size[1] ? "horizontal" : "vertical";

          //        louvain.assign(graph)

          var _networkSettings5 = networkSettings,
              _networkSettings5$ite = _networkSettings5.iterations,
              _iterations3 = _networkSettings5$ite === undefined ? 500 : _networkSettings5$ite,
              _networkSettings5$edg = _networkSettings5.edgeStrength,
              _edgeStrength = _networkSettings5$edg === undefined ? 0.1 : _networkSettings5$edg;

          var currentX = 0;
          var currentY = 0;

          components.forEach(function (_ref6) {
            var componentNodes = _ref6.componentNodes,
                componentEdges = _ref6.componentEdges;

            var linkForce = (0, _d3Force.forceLink)().strength(function (d) {
              return d.weight ? d.weight * _edgeStrength : _edgeStrength;
            });

            var componentLayoutSize = Math.max(componentNodes.length / largestComponent, 0.2) * layoutSize;

            var xBound = componentLayoutSize + currentX;
            var yBound = componentLayoutSize + currentY;

            if (layoutDirection === "horizontal") {
              if (yBound > size[1]) {
                currentX = componentLayoutSize + currentX;
                currentY = componentLayoutSize;
              } else {
                currentY = componentLayoutSize + currentY;
              }
            } else {
              if (xBound > size[0]) {
                currentY = componentLayoutSize + currentY;
                currentX = componentLayoutSize;
              } else {
                currentX = componentLayoutSize + currentX;
              }
            }

            var xCenter = currentX - componentLayoutSize / 2;
            var yCenter = currentY - componentLayoutSize / 2;

            var simulation = (0, _d3Force.forceSimulation)().force("charge", (0, _d3Force.forceManyBody)().strength(networkSettings.forceManyBody || function (d) {
              return -25 * nodeSizeAccessor(d);
            })).force("link", linkForce);

            simulation.force("x", (0, _d3Force.forceX)(xCenter)).force("y", (0, _d3Force.forceY)(yCenter)).nodes(componentNodes);

            simulation.force("link").links(componentEdges);

            simulation.stop();

            for (var _i2 = 0; _i2 < _iterations3; ++_i2) {
              simulation.tick();
            }var maxX = (0, _d3Array.max)(componentNodes.map(function (d) {
              return d.x;
            }));
            var maxY = (0, _d3Array.max)(componentNodes.map(function (d) {
              return d.y;
            }));
            var minX = (0, _d3Array.min)(componentNodes.map(function (d) {
              return d.x;
            }));
            var minY = (0, _d3Array.min)(componentNodes.map(function (d) {
              return d.y;
            }));

            var resetX = (0, _d3Scale.scaleLinear)().domain([minX, maxX]).range([currentX - componentLayoutSize, currentX - 20]);
            var resetY = (0, _d3Scale.scaleLinear)().domain([minY, maxY]).range([currentY - componentLayoutSize, currentY - 20]);

            componentNodes.forEach(function (node) {
              node.x = resetX(node.x);
              node.y = resetY(node.y);
            });
          });
        } else if (typeof networkSettings.type === "function") {
          var customProjectedGraph = networkSettings.type({
            nodes: projectedNodes,
            edges: projectedEdges
          });
        }

        this.graphSettings = networkSettings;
        this.graphSettings.nodes = currentProps.nodes;
        this.graphSettings.edges = currentProps.edges;
      }

      if (networkSettings.type !== "wordcloud" && networkSettings.type !== "chord" && networkSettings.type !== "sankey") {
        var _xMin = (0, _d3Array.min)(projectedNodes.map(function (p) {
          return p.x - nodeSizeAccessor(p);
        }));
        var _xMax = (0, _d3Array.max)(projectedNodes.map(function (p) {
          return p.x + nodeSizeAccessor(p);
        }));
        var _yMin = (0, _d3Array.min)(projectedNodes.map(function (p) {
          return p.y - nodeSizeAccessor(p);
        }));
        var _yMax = (0, _d3Array.max)(projectedNodes.map(function (p) {
          return p.y + nodeSizeAccessor(p);
        }));

        var _projectionScaleX = (0, _d3Scale.scaleLinear)().domain([_xMin, _xMax]).range([margin.left, size[0] - margin.right]);
        var _projectionScaleY = (0, _d3Scale.scaleLinear)().domain([_yMin, _yMax]).range([margin.top, size[1] - margin.bottom]);
        projectedNodes.forEach(function (node) {
          node.x = _projectionScaleX(node.x);
          node.y = _projectionScaleY(node.y);
        });
      }

      projectedNodes.forEach(function (node) {
        node.nodeSize = nodeSizeAccessor(node);
      });

      projectedEdges.forEach(function (edge) {
        edge.width = edgeWidthAccessor(edge);
      });

      var legendSettings = void 0;

      if (currentProps.legend) {
        legendSettings = currentProps.legend === true ? {} : currentProps.legend;
        if (!legendSettings.legendGroups) {
          ///Something auto for networks
          var legendGroups = [{
            styleFn: currentProps.nodeStyle,
            type: "fill",
            items: ["put", "nodes", "here"]
          }];
          legendSettings.legendGroups = legendGroups;
        }
      }
      var networkFrameRender = {
        edges: {
          data: projectedEdges,
          styleFn: (0, _dataFunctions.stringToFn)(edgeStyle, function () {}, true),
          classFn: (0, _dataFunctions.stringToFn)(edgeClass, function () {}, true),
          renderMode: (0, _dataFunctions.stringToFn)(edgeRenderMode, undefined, true),
          canvasRender: (0, _dataFunctions.stringToFn)(canvasEdges, undefined, true),
          renderKeyFn: currentProps.edgeRenderKey ? currentProps.edgeRenderKey : function (d) {
            return d._NWFEdgeKey || d.source.id + "-" + d.target.id;
          },
          behavior: _networkDrawing.drawEdges,
          type: edgeType,
          customMark: customEdgeIcon
        },
        nodes: {
          data: projectedNodes,
          styleFn: nodeStyleFn,
          classFn: nodeClassFn,
          renderMode: nodeRenderModeFn,
          canvasRender: nodeCanvasRenderFn,
          customMark: customNodeIcon,
          behavior: _networkDrawing.drawNodes
        }
      };

      var nodeLabelAnnotations = [];
      if (this.props.nodeLabels && projectedNodes) {
        projectedNodes.forEach(function (node, nodei) {
          if (nodeLabels === true || nodeLabels && nodeLabels(node, nodei)) {
            var actualLabel = nodeLabels === true ? nodeIDAccessor(node, nodei) : nodeLabels(node, nodei);
            var nodeLabel = {
              className: "node-label",
              dx: 0,
              dy: 0,
              x: node.x,
              y: node.y,
              note: { label: actualLabel },
              connector: { end: "none" },
              type: _reactAnnotation.AnnotationLabel,
              subject: { radius: nodeSizeAccessor(node) + 2 }
            };
            nodeLabelAnnotations.push(nodeLabel);
          }
        });
      }

      this.setState({
        voronoiHover: null,
        adjustedPosition: adjustedPosition,
        adjustedSize: adjustedSize,
        backgroundGraphics: currentProps.backgroundGraphics,
        foregroundGraphics: currentProps.foregroundGraphics,
        title: title,
        renderNumber: this.state.renderNumber + 1,
        nodeData: null,
        edgeData: null,
        projectedNodes: projectedNodes,
        projectedEdges: projectedEdges,
        nodeIDAccessor: nodeIDAccessor,
        sourceAccessor: sourceAccessor,
        targetAccessor: targetAccessor,
        nodeSizeAccessor: nodeSizeAccessor,
        edgeWidthAccessor: edgeWidthAccessor,
        margin: margin,
        legendSettings: legendSettings,
        networkFrameRender: networkFrameRender,
        nodeLabelAnnotations: nodeLabelAnnotations
      });
    }
  }, {
    key: "defaultNetworkSVGRule",
    value: function defaultNetworkSVGRule(_ref7) {
      var d = _ref7.d,
          i = _ref7.i;
      var _state2 = this.state,
          projectedNodes = _state2.projectedNodes,
          nodeIDAccessor = _state2.nodeIDAccessor,
          nodeSizeAccessor = _state2.nodeSizeAccessor;
      var svgAnnotationRules = this.props.svgAnnotationRules;


      if (svgAnnotationRules) {
        var customAnnotation = svgAnnotationRules({
          d: d,
          i: i,
          networkFrameProps: this.props,
          networkFrameState: this.state,
          nodes: this.state.projectedNodes,
          edges: this.state.projectedEdges
        });
        if (customAnnotation !== null) {
          return customAnnotation;
        }
      }
      if (d.type === "node") {
        var selectedNode = d.x && d.y ? d : projectedNodes.find(function (p) {
          return nodeIDAccessor(p) === d.id;
        });
        if (!selectedNode) {
          return null;
        }
        var noteData = _extends({
          dx: d.dx || -25,
          dy: d.dy || -25,
          x: selectedNode.x,
          y: selectedNode.y,
          note: { label: d.label },
          connector: { end: "arrow" }
        }, d, {
          type: _reactAnnotation.AnnotationCalloutCircle,
          subject: {
            radius: d.radius || selectedNode.radius || nodeSizeAccessor(d)
          }
        });
        return _react2.default.createElement(_Annotation2.default, { key: d.key || "annotation-" + i, noteData: noteData });
      } else if (d.type === "react-annotation" || typeof d.type === "function") {
        var _selectedNode = d.x && d.y ? d : projectedNodes.find(function (p) {
          return nodeIDAccessor(p) === d.id;
        });
        if (!_selectedNode) {
          return null;
        }
        var _noteData = _extends({
          dx: 0,
          dy: 0,
          x: _selectedNode.x,
          y: _selectedNode.y,
          note: { label: d.label },
          connector: { end: "arrow" }
        }, d, { type: typeof d.type === "function" ? d.type : undefined });
        return _react2.default.createElement(_Annotation2.default, { key: d.key || "annotation-" + i, noteData: _noteData });
      } else if (d.type === "enclose") {
        var selectedNodes = projectedNodes.filter(function (p) {
          return d.ids.indexOf(nodeIDAccessor(p)) !== -1;
        });
        if (selectedNodes.length === 0) {
          return null;
        }
        var circle = (0, _d3Hierarchy.packEnclose)(selectedNodes.map(function (p) {
          return { x: p.x, y: p.y, r: nodeSizeAccessor(p) };
        }));
        var _noteData2 = _extends({
          dx: d.dx || -25,
          dy: d.dy || -25,
          x: circle.x,
          y: circle.y,
          note: { label: d.label },
          connector: { end: "arrow" }
        }, d, {
          type: _reactAnnotation.AnnotationCalloutCircle,
          subject: {
            radius: circle.r,
            radiusPadding: 5 || d.radiusPadding
          }
        });

        if (_noteData2.rp) {
          switch (_noteData2.rp) {
            case "top":
              _noteData2.dx = 0;
              _noteData2.dy = -circle.r - _noteData2.rd;
              break;
            case "bottom":
              _noteData2.dx = 0;
              _noteData2.dy = circle.r + _noteData2.rd;
              break;
            case "left":
              _noteData2.dx = -circle.r - _noteData2.rd;
              _noteData2.dy = 0;
              break;
            default:
              _noteData2.dx = circle.r + _noteData2.rd;
              _noteData2.dy = 0;
          }
        }
        //TODO: Support .ra (setting angle)

        return _react2.default.createElement(_Annotation2.default, { key: d.key || "annotation-" + i, noteData: _noteData2 });
      }
      return null;
    }
  }, {
    key: "defaultNetworkHTMLRule",
    value: function defaultNetworkHTMLRule(_ref8) {
      var d = _ref8.d,
          i = _ref8.i;

      if (this.props.htmlAnnotationRules) {
        var customAnnotation = this.props.htmlAnnotationRules({
          d: d,
          i: i,
          networkFrameProps: this.props,
          networkFrameState: this.state,
          nodes: this.state.projectedNodes,
          edges: this.state.projectedEdges
        });
        if (customAnnotation !== null) {
          return customAnnotation;
        }
      }
      if (d.type === "frame-hover") {
        //To string because React gives a DOM error if it gets a date
        var content = _react2.default.createElement(
          "div",
          { className: "tooltip-content" },
          _react2.default.createElement(
            "p",
            { key: "html-annotation-content-1" },
            d.id
          ),
          _react2.default.createElement(
            "p",
            { key: "html-annotation-content-2" },
            "Degree: ",
            d.degree
          )
        );

        if (d.type === "frame-hover" && this.props.tooltipContent) {
          content = this.props.tooltipContent(d);
        }

        return _react2.default.createElement(
          "div",
          {
            key: "xylabel" + i,
            className: "annotation annotation-network-label " + (d.className || ""),
            style: {
              position: "absolute",
              bottom: this.props.size[1] - d.y + "px",
              left: d.x + "px"
            }
          },
          content
        );
      }
      return null;
    }
  }, {
    key: "render",
    value: function render() {
      return this.renderBody({});
    }
  }, {
    key: "renderBody",
    value: function renderBody(_ref9) {
      var afterElements = _ref9.afterElements;
      var _props = this.props,
          annotations = _props.annotations,
          annotationSettings = _props.annotationSettings,
          className = _props.className,
          customClickBehavior = _props.customClickBehavior,
          customDoubleClickBehavior = _props.customDoubleClickBehavior,
          customHoverBehavior = _props.customHoverBehavior,
          size = _props.size,
          matte = _props.matte,
          renderKey = _props.renderKey,
          hoverAnnotation = _props.hoverAnnotation,
          beforeElements = _props.beforeElements,
          interaction = _props.interaction,
          title = _props.title,
          disableContext = _props.disableContext;
      var _state3 = this.state,
          backgroundGraphics = _state3.backgroundGraphics,
          foregroundGraphics = _state3.foregroundGraphics,
          projectedNodes = _state3.projectedNodes,
          margin = _state3.margin,
          legendSettings = _state3.legendSettings,
          adjustedPosition = _state3.adjustedPosition,
          adjustedSize = _state3.adjustedSize,
          networkFrameRender = _state3.networkFrameRender,
          nodeLabelAnnotations = _state3.nodeLabelAnnotations;


      var downloadButton = [];

      if (this.props.download && this.state.projectedNodes.length > 0) {
        downloadButton.push(_react2.default.createElement(_DownloadButton2.default, {
          key: "network-download-nodes",
          csvName: (this.props.name || "networkframe") + "-" + new Date().toJSON(),
          width: this.props.size[0],
          label: "Download Node List",
          data: (0, _downloadDataMapping.networkNodeDownloadMapping)({
            data: this.state.projectedNodes,
            fields: this.props.downloadFields
          })
        }));
      }
      if (this.props.download && this.state.projectedEdges.length > 0) {
        downloadButton.push(_react2.default.createElement(_DownloadButton2.default, {
          key: "network-download-edges",
          csvName: (this.props.name || "networkframe") + "-" + new Date().toJSON(),
          width: this.props.size[0],
          label: "Download Edge List",
          data: (0, _downloadDataMapping.networkEdgeDownloadMapping)({
            data: this.state.projectedEdges,
            fields: this.props.downloadFields
          })
        }));
      }

      var finalFilterDefs = (0, _jsx.filterDefs)({
        key: "networkFrame",
        additionalDefs: this.props.additionalDefs
      });

      return _react2.default.createElement(_Frame2.default, {
        name: "networkframe",
        renderPipeline: networkFrameRender,
        adjustedPosition: adjustedPosition,
        adjustedSize: adjustedSize,
        size: size,
        xScale: xScale,
        yScale: yScale,
        title: title,
        matte: matte,
        className: className,
        finalFilterDefs: finalFilterDefs,
        frameKey: "none",
        renderKeyFn: renderKey,
        projectedCoordinateNames: projectedCoordinateNames,
        defaultSVGRule: this.defaultNetworkSVGRule.bind(this),
        defaultHTMLRule: this.defaultNetworkHTMLRule.bind(this),
        hoverAnnotation: hoverAnnotation,
        annotations: [].concat(_toConsumableArray(annotations), _toConsumableArray(nodeLabelAnnotations)),
        annotationSettings: annotationSettings,
        legendSettings: legendSettings,
        interaction: interaction,
        customClickBehavior: customClickBehavior,
        customHoverBehavior: customHoverBehavior,
        customDoubleClickBehavior: customDoubleClickBehavior,
        points: projectedNodes,
        margin: margin,
        backgroundGraphics: backgroundGraphics,
        foregroundGraphics: foregroundGraphics,
        beforeElements: beforeElements,
        afterElements: afterElements,
        downloadButton: downloadButton,
        disableContext: disableContext
      });
    }
  }]);

  return NetworkFrame;
}(_react2.default.Component), _class.defaultProps = {
  annotations: [],
  foregroundGraphics: [],
  annotationSettings: {},
  size: [500, 500],
  className: "",
  name: "networkframe",
  edges: [],
  nodes: [],
  networkType: { type: "force", iterations: 500 }
}, _temp);


NetworkFrame.propTypes = {
  name: _propTypes2.default.string,
  nodes: _propTypes2.default.array,
  edges: _propTypes2.default.oneOfType([_propTypes2.default.array, _propTypes2.default.object]),
  title: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.object]),
  margin: _propTypes2.default.oneOfType([_propTypes2.default.number, _propTypes2.default.object]),
  size: _propTypes2.default.array,
  position: _propTypes2.default.array,
  nodeIDAccessor: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.func]),
  sourceAccessor: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.func]),
  targetAccessor: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.func]),
  nodeSizeAccessor: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.number, _propTypes2.default.func]),
  nodeLabels: _propTypes2.default.oneOfType([_propTypes2.default.bool, _propTypes2.default.func]),
  edgeWidthAccessor: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.func]),
  annotations: _propTypes2.default.array,
  customHoverBehavior: _propTypes2.default.func,
  customClickBehavior: _propTypes2.default.func,
  customDoubleClickBehavior: _propTypes2.default.func,
  htmlAnnotationRules: _propTypes2.default.func,
  networkType: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.object]),
  tooltipContent: _propTypes2.default.func,
  className: _propTypes2.default.string,
  additionalDefs: _propTypes2.default.oneOfType([_propTypes2.default.array, _propTypes2.default.object]),
  interaction: _propTypes2.default.object,
  renderFn: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.func]),
  nodeStyle: _propTypes2.default.oneOfType([_propTypes2.default.object, _propTypes2.default.func]),
  edgeStyle: _propTypes2.default.oneOfType([_propTypes2.default.object, _propTypes2.default.func]),
  hoverAnnotation: _propTypes2.default.oneOfType([_propTypes2.default.object, _propTypes2.default.array, _propTypes2.default.func, _propTypes2.default.bool]),
  backgroundGraphics: _propTypes2.default.oneOfType([_propTypes2.default.object, _propTypes2.default.array]),
  foregroundGraphics: _propTypes2.default.oneOfType([_propTypes2.default.object, _propTypes2.default.array]),
  customNodeIcon: _propTypes2.default.func,
  edgeType: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.func])
};

exports.default = NetworkFrame;
module.exports = exports['default'];