import React from "react";

import {
  /*forceCenter,*/ forceSimulation,
  forceX,
  forceY,
  /*forceCollide,*/ forceLink,
  forceManyBody
} from "d3-force";

import { bboxCollide } from "d3-bboxCollide";

import { scaleLinear, scaleIdentity } from "d3-scale";

import { min, max } from "d3-array";

import { filterDefs } from "./constants/jsx";
import Annotation from "./Annotation";

import { packEnclose, packSiblings } from "d3-hierarchy";
import {
  /*annotationXYThreshold,*/ AnnotationCalloutCircle,
  AnnotationLabel
} from "react-annotation";

import Frame from "./Frame";
import Mark from "./Mark";

import DownloadButton from "./DownloadButton";

import {
  calculateMargin,
  adjustedPositionSize,
  generateFrameTitle
} from "./svg/frameFunctions";

import { drawNodes, drawEdges } from "./svg/networkDrawing";

import { stringToFn } from "./data/dataFunctions";

import {
  networkNodeDownloadMapping,
  networkEdgeDownloadMapping
} from "./downloadDataMapping";

import Graph from "graphology";
//import louvain from 'graphology-communities-louvain'
import {
  connectedComponents,
  stronglyConnectedComponents
} from "graphology-components";

import {
  sankey,
  sankeyLeft,
  sankeyRight,
  sankeyCenter,
  sankeyJustify
} from "d3-sankey";
import { interpolateNumber } from "d3-interpolate";
import { chord, ribbon } from "d3-chord";
import { arc } from "d3-shape";
import { tree, hierarchy } from "d3-hierarchy";

import PropTypes from "prop-types";

/*
const customEdgeHashProject = {
  offset: glyphProject.offset,
  parallel: glyphProject.parallel
}

const customEdgeHashMutate = {
  particle: glyphMutate.particle
}
*/

import { networkFrameChangeProps } from "./constants/frame_props";

const projectedCoordinateNames = { y: "y", x: "x" };

function recursiveIDAccessor(idAccessor, node, accessorString) {
  if (node.parent) {
    accessorString = `${accessorString}-${recursiveIDAccessor(
      idAccessor,
      node.parent,
      accessorString
    )}`;
  }
  return `${accessorString}-${idAccessor(node.data)}`;
}

const sankeyOrientHash = {
  left: sankeyLeft,
  right: sankeyRight,
  center: sankeyCenter,
  justify: sankeyJustify
};

const xScale = scaleIdentity();
const yScale = scaleIdentity();

const curvature = 0.5;

const areaLink = d => {
  const x0 = d.source.x1,
    x1 = d.target.x0,
    xi = interpolateNumber(x0, x1),
    x2 = xi(curvature),
    x3 = xi(1 - curvature),
    y0 = d.y0 - d.sankeyWidth / 2,
    y1 = d.y1 - d.sankeyWidth / 2,
    y2 = d.y1 + d.sankeyWidth / 2,
    y3 = d.y0 + d.sankeyWidth / 2;

  if (y3 - y0 < 30000) {
    return (
      "M" +
      x0 +
      "," +
      y0 +
      "C" +
      x2 +
      "," +
      y0 +
      " " +
      x3 +
      "," +
      y1 +
      " " +
      x1 +
      "," +
      y1 +
      "L" +
      x1 +
      "," +
      y2 +
      "C" +
      x3 +
      "," +
      y2 +
      " " +
      x2 +
      "," +
      y3 +
      " " +
      x0 +
      "," +
      y3 +
      "Z"
    );
  } else {
    const offset = (x1 - x0) / 4;
    return (
      "M" +
      x0 +
      "," +
      y0 +
      "C" +
      x2 +
      "," +
      y0 +
      " " +
      x3 +
      "," +
      y1 +
      " " +
      (x1 - offset) +
      "," +
      (y1 + 0) +
      "L" +
      (x1 - 6) +
      "," +
      (y2 + y1) / 2 +
      "L" +
      (x1 - offset) +
      "," +
      (y2 + 0) +
      "C" +
      x3 +
      "," +
      y2 +
      " " +
      x2 +
      "," +
      y3 +
      " " +
      x0 +
      "," +
      y3 +
      "Z"
    );
  }
};

const matrixify = ({
  edgeHash,
  nodes,
  edges,
  edgeWidthAccessor,
  nodeIDAccessor
}) => {
  const matrix = [];
  nodes.forEach(nodeSource => {
    const nodeSourceID = nodeIDAccessor(nodeSource);
    const sourceRow = [];
    matrix.push(sourceRow);
    nodes.forEach(nodeTarget => {
      const nodeTargetID = nodeIDAccessor(nodeTarget);
      const theEdge = edgeHash.get(`${nodeSourceID}|${nodeTargetID}`);
      if (theEdge) {
        sourceRow.push(edgeWidthAccessor(theEdge));
      } else {
        sourceRow.push(0);
      }
    });
  });
  return matrix;
};

class NetworkFrame extends React.Component {
  static defaultProps = {
    annotations: [],
    foregroundGraphics: [],
    annotationSettings: {},
    size: [500, 500],
    className: "",
    name: "networkframe",
    edges: [],
    nodes: [],
    networkType: { type: "force", iterations: 500 }
  };

  constructor(props) {
    super(props);

    this.calculateNetworkFrame = this.calculateNetworkFrame.bind(this);
    this.defaultNetworkHTMLRule = this.defaultNetworkHTMLRule.bind(this);
    this.defaultNetworkSVGRule = this.defaultNetworkSVGRule.bind(this);

    this.renderBody = this.renderBody.bind(this);

    this.graphSettings = {
      numberOfNodes: 0,
      numberOfEdges: 0,
      type: "empty-start"
    };
    this.state = {
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

    this.oAccessor = null;
    this.rAccessor = null;
    this.oScale = null;
    this.rScale = null;
  }

  componentWillMount() {
    this.calculateNetworkFrame(this.props);
  }

  componentWillReceiveProps(nextProps) {
    if (
      (this.state.dataVersion &&
        this.state.dataVersion !== nextProps.dataVersion) ||
      (!this.state.projectedNodes && !this.state.projectedEdges)
    ) {
      this.calculateNetworkFrame(nextProps);
    } else if (
      this.props.size[0] !== nextProps.size[0] ||
      this.props.size[1] !== nextProps.size[1] ||
      (!this.state.dataVersion &&
        networkFrameChangeProps.find(d => {
          return this.props[d] !== nextProps[d];
        }))
    ) {
      this.calculateNetworkFrame(nextProps);
    }
  }

  onNodeClick(d, i) {
    if (this.props.onNodeClick) {
      this.props.onNodeClick(d, i);
    }
  }

  onNodeEnter(d, i) {
    if (this.props.onNodeEnter) {
      this.props.onNodeEnter(d, i);
    }
  }

  onNodeOut(d, i) {
    if (this.props.onNodeOut) {
      this.props.onNodeOut(d, i);
    }
  }

  calculateNetworkFrame(currentProps) {
    const {
      nodes,
      edges,
      networkType,
      size,
      nodeStyle,
      nodeClass,
      canvasNodes,
      edgeStyle,
      edgeClass,
      canvasEdges,
      nodeRenderMode,
      edgeRenderMode,
      nodeLabels
      /*, customHoverBehavior, customClickBehavior, renderFn, nodeClass = (() => ''), edgeClass = (() => '')*/
    } = currentProps;
    //    const eventListenersGenerator = generatenetworkFrameEventListeners(customHoverBehavior, customClickBehavior)

    let { edgeType, customNodeIcon, customEdgeIcon } = currentProps;

    let networkSettings, rootNode, hierarchicalNetwork;

    if (typeof networkType === "string") {
      networkSettings = { type: networkType, iterations: 500 };
    } else {
      networkSettings = networkType;
    }

    if (!edgeType && networkSettings.type === "sankey") {
      edgeType = areaLink;
    }

    const nodeIDAccessor = stringToFn(currentProps.nodeIDAccessor, d => d.id);
    const sourceAccessor = stringToFn(
      currentProps.sourceAccessor,
      d => d.source
    );
    const targetAccessor = stringToFn(
      currentProps.targetAccessor,
      d => d.target
    );
    const nodeSizeAccessor =
      typeof currentProps.nodeSizeAccessor === "number"
        ? () => currentProps.nodeSizeAccessor
        : stringToFn(currentProps.nodeSizeAccessor, () => 5);
    const edgeWidthAccessor = stringToFn(
      currentProps.edgeWidthAccessor,
      d => d.weight || 1
    );
    const nodeStyleFn = stringToFn(nodeStyle, () => {}, true);
    const nodeClassFn = stringToFn(nodeClass, () => "", true);
    const nodeRenderModeFn = stringToFn(nodeRenderMode, undefined, true);
    const nodeCanvasRenderFn = stringToFn(canvasNodes, undefined, true);

    const margin = calculateMargin(currentProps);
    const { adjustedPosition, adjustedSize } = adjustedPositionSize(
      currentProps
    );
    const title = generateFrameTitle(currentProps);

    let { projectedNodes, projectedEdges } = this.state;

    const changedData =
      !this.state.projectedNodes ||
      !this.state.projectedEdges ||
      this.graphSettings.nodes !== currentProps.nodes ||
      this.graphSettings.edges !== currentProps.edges ||
      networkSettings.type === "dendrogram";

    if (changedData) {
      this.edgeHash = new Map();
      this.nodeHash = new Map();
      projectedNodes = [];
      projectedEdges = [];
      nodes.forEach(node => {
        const id = nodeIDAccessor(node);
        this.nodeHash.set(id, node);
        this.nodeHash.set(node, node);
        projectedNodes.push(node);
        node.inDegree = 0;
        node.outDegree = 0;
        node.degree = 0;
      });

      let operationalEdges = edges;

      if (!Array.isArray(edges)) {
        this.hierarchicalNetwork = true;
        let rootNode = hierarchy(edges);

        if (networkSettings.type === "dendrogram") {
          const layout = networkSettings.layout || tree;
          const treeChart = layout();
          treeChart.size(size);

          treeChart(rootNode);
        }

        operationalEdges = rootNode
          .descendants()
          .filter(d => d.parent !== null)
          .map(d => ({
            source: Object.assign(d.parent, d.parent.data),
            target: Object.assign(d, d.data),
            depth: d.depth,
            weight: 1,
            value: 1,
            _NWFEdgeKey: `${nodeIDAccessor(d.data)}-${recursiveIDAccessor(
              nodeIDAccessor,
              d.parent,
              ""
            )}`
          }));
      }
      operationalEdges.forEach(edge => {
        const source = sourceAccessor(edge);
        const target = targetAccessor(edge);
        if (!this.nodeHash.get(source)) {
          const sourceNode =
            typeof source === "object"
              ? Object.assign(source, {
                  degree: 0,
                  inDegree: 0,
                  outDegree: 0
                })
              : {
                  id: source,
                  inDegree: 0,
                  outDegree: 0,
                  degree: 0,
                  createdByFrame: true
                };
          this.nodeHash.set(source, sourceNode);

          projectedNodes.push(sourceNode);
        }
        if (!this.nodeHash.get(target)) {
          const targetNode =
            typeof target === "object"
              ? Object.assign(target, {
                  degree: 0,
                  inDegree: 0,
                  outDegree: 0
                })
              : {
                  id: target,
                  inDegree: 0,
                  outDegree: 0,
                  degree: 0,
                  createdByFrame: true
                };
          this.nodeHash.set(target, targetNode);
          projectedNodes.push(targetNode);
        }
        const edgeWeight = edge.weight || 1;
        this.nodeHash.get(target).inDegree += edgeWeight;
        this.nodeHash.get(source).outDegree += edgeWeight;
        this.nodeHash.get(target).degree += edgeWeight;
        this.nodeHash.get(source).degree += edgeWeight;

        const edgeKey = `${nodeIDAccessor(source) || source}|${nodeIDAccessor(
          target
        ) || target}`;
        const newEdge = Object.assign({}, edge, {
          source: this.nodeHash.get(source),
          target: this.nodeHash.get(target)
        });
        this.edgeHash.set(edgeKey, newEdge);
        projectedEdges.push(newEdge);
      });
    } else {
      this.edgeHash = new Map();
      projectedEdges.forEach(edge => {
        const edgeKey = `${nodeIDAccessor(edge.source) ||
          edge.source}|${nodeIDAccessor(edge.target) || edge.target}`;
        this.edgeHash.set(edgeKey, edge);
      });
    }

    const networkSettingsKeys = Object.keys(networkSettings);
    let networkSettingsChanged = false;

    networkSettingsKeys.forEach(key => {
      if (
        key !== "edgeType" &&
        networkSettings[key] !== this.graphSettings[key]
      ) {
        networkSettingsChanged = true;
      }
    });
    //Support bubble chart with circle pack and with force
    if (networkSettings.type === "sankey") {
      let initCustomNodeIcon = customNodeIcon;

      customNodeIcon = ({
        d,
        i,
        renderKeyFn,
        styleFn,
        classFn,
        renderMode,
        key,
        className,
        transform
      }) => {
        if (initCustomNodeIcon === undefined) {
          return (
            <Mark
              renderMode={renderMode ? renderMode(d, i) : undefined}
              key={key}
              className={className}
              transform={transform}
              markType="rect"
              height={d.height}
              width={d.width}
              x={-d.width / 2}
              y={-d.height / 2}
              rx={0}
              ry={0}
              style={nodeStyleFn(d)}
            />
          );
        } else {
          return initCustomNodeIcon({
            d,
            i,
            renderKeyFn,
            styleFn,
            classFn,
            renderMode,
            key,
            className,
            transform
          });
        }
      };
    } else if (networkSettings.type === "chord") {
      customNodeIcon = ({
        d,
        i,
        renderKeyFn,
        styleFn,
        classFn,
        renderMode,
        key,
        className,
        transform
      }) => (
        <Mark
          renderMode={renderMode ? renderMode(d, i) : undefined}
          key={key}
          className={className}
          transform={`translate(${size[0] / 2},${size[1] / 2})`}
          markType="path"
          d={d.d}
          style={styleFn(d, i)}
        />
      );

      customEdgeIcon = ({
        d,
        i,
        renderKeyFn,
        styleFn,
        classFn,
        renderMode,
        key,
        className,
        transform
      }) => (
        <Mark
          renderMode={renderMode ? renderMode(d, i) : undefined}
          key={key}
          className={className}
          simpleInterpolate={true}
          transform={`translate(${size[0] / 2},${size[1] / 2})`}
          markType="path"
          d={d.d}
          style={styleFn(d, i)}
        />
      );
    } else if (networkSettings.type === "wordcloud") {
      customNodeIcon = ({
        d,
        i,
        styleFn,
        renderKeyFn,
        key,
        className,
        transform
      }) => {
        const textStyle = styleFn(d, i);
        textStyle.fontSize = `${d.fontSize}px`;
        textStyle.fontWeight = d.fontWeight;
        textStyle.textAnchor = "middle";
        let textTransform, textY, textX;
        textTransform = `scale(${d.scale})`;

        if (!d.rotate) {
          textY = d.textHeight / 4;
          textTransform = `scale(${d.scale})`;
        } else {
          textTransform = `rotate(90) scale(${d.scale})`;
          textY = d.textHeight / 4;
        }

        return (
          <g key={key} transform={transform}>
            <text
              style={textStyle}
              y={textY}
              x={textX}
              transform={textTransform}
              className={`${className} wordcloud`}
            >
              {d._NWFText}
            </text>
          </g>
        );
      };
    } else if (networkSettings.type === "dendrogram") {
      if (networkSettings.projection === "horizontal") {
        projectedNodes.forEach(node => {
          const ox = node.x;
          node.x = node.y;
          node.y = ox;
        });
      }
    }

    if (changedData || networkSettingsChanged) {
      let components = [
          {
            componentNodes: projectedNodes,
            componentEdges: projectedEdges
          }
        ],
        strongComponents = projectedNodes;
      if (!this.hierarchicalNetwork) {
        const graph = new Graph({ multi: !!networkSettings.multi });
        const graphologyNodes = projectedNodes.map(d => ({
          key: nodeIDAccessor(d),
          originalNode: d
        }));

        graph.import({
          attributes: { name: "Graph for Processing" },
          nodes: graphologyNodes,
          edges: projectedEdges.map(d => ({
            source: d.source.id,
            target: d.target.id,
            originalEdge: d
          }))
        });
        components = connectedComponents(graph)
          .sort((a, b) => b.length - a.length)
          .map(c => ({
            componentNodes: projectedNodes.filter(d => c.indexOf(d.id) !== -1),
            componentEdges: projectedEdges.filter(
              d =>
                c.indexOf(d.source.id) !== -1 || c.indexOf(d.target.id) !== -1
            )
          }));

        strongComponents = stronglyConnectedComponents(graph).sort(
          (a, b) => b.length - a.length
        );
      }

      //check for components first
      if (
        networkSettings.type === "sankey" &&
        strongComponents.length !== projectedNodes.length
      ) {
        console.error(
          "Sankey diagram cannot display a network with cycles, defaulting to force-directed layout"
        );
        networkSettings.type = "force";
      }
      if (networkSettings.type === "chord") {
        const radius = size[1] / 2;
        const { groupWidth = 20, padAngle = 0.01 } = networkSettings;
        const arcGenerator = arc()
          .innerRadius(radius - groupWidth)
          .outerRadius(radius);

        const ribbonGenerator = ribbon().radius(radius - groupWidth);

        const matrixifiedNetwork = matrixify({
          edgeHash: this.edgeHash,
          nodes: projectedNodes,
          edges: projectedEdges,
          edgeWidthAccessor,
          nodeIDAccessor
        });

        const chordLayout = chord().padAngle(padAngle);
        //          .sortGroups((a,b) => a - b)

        const chords = chordLayout(matrixifiedNetwork);
        const groups = chords.groups;

        groups.forEach(group => {
          const groupCentroid = arcGenerator.centroid(group);
          const groupD = arcGenerator(group);
          const groupNode = projectedNodes[group.index];
          groupNode.d = groupD;
          groupNode.index = group.index;
          groupNode.x = groupCentroid[0] + size[0] / 2;
          groupNode.y = groupCentroid[1] + size[1] / 2;
        });

        chords.forEach(chord => {
          const chordD = ribbonGenerator(chord);
          //this is incorrect should use edgeHash
          const nodeSourceID = nodeIDAccessor(
            projectedNodes[chord.source.index]
          );
          const nodeTargetID = nodeIDAccessor(
            projectedNodes[chord.target.index]
          );
          const chordEdge = this.edgeHash.get(
            `${nodeSourceID}|${nodeTargetID}`
          );
          chordEdge.d = chordD;
        });
      } else if (networkSettings.type === "sankey") {
        const {
          orient = "center",
          iterations = 100,
          nodePadding = 8,
          nodeWidth = 24
        } = networkSettings;
        const sankeyOrient = sankeyOrientHash[orient];

        const frameSankey = sankey()
          .extent([
            [margin.left, margin.top],
            [size[0] - margin.right, size[1] - margin.top]
          ])
          .links(projectedEdges)
          .nodes(projectedNodes)
          .nodeAlign(sankeyOrient)
          .nodeId(nodeIDAccessor)
          .nodePadding(nodePadding)
          .nodeWidth(nodeWidth)
          .iterations(iterations);

        frameSankey();

        projectedNodes.forEach(d => {
          d.height = d.y1 - d.y0;
          d.width = d.x1 - d.x0;
          d.x = d.x0 + d.width / 2;
          d.y = d.y0 + d.height / 2;
          d.radius = d.height / 2;
        });

        projectedEdges.forEach(d => {
          d.sankeyWidth = d.width;
          d.width = undefined;
        });
      } else if (networkSettings.type === "wordcloud") {
        const {
          iterations = 500,
          fontSize = 18,
          rotate,
          fontWeight = 300,
          textAccessor = d => d.text
        } = networkSettings;

        const fontWeightMod = (fontWeight / 300 - 1) / 5 + 1;
        const fontWidth = fontSize / 1.5 * fontWeightMod;

        nodes.forEach((d, i) => {
          const size = nodeSizeAccessor(d);
          d._NWFText = textAccessor(d);
          const textWidth = fontWidth * d._NWFText.length * size * 1.4;
          const textHeight = fontSize * size;

          d.textHeight = textHeight + 4;
          d.textWidth = textWidth + 4;
          d.rotate = rotate ? rotate(d, i) : 0;
          d.fontSize = fontSize * size;
          d.fontWeight = fontWeight;
          d.radius = d.r = textWidth / 2;
        });

        nodes.sort((a, b) => b.textWidth - a.textWidth);

        //bubblepack for initial position
        packSiblings(nodes);

        //        if (rotate) {
        const collide = bboxCollide(d => {
          if (d.rotate) {
            return [
              [-d.textHeight / 2, -d.textWidth / 2],
              [d.textHeight / 2, d.textWidth / 2]
            ];
          }
          return [
            [-d.textWidth / 2, -d.textHeight / 2],
            [d.textWidth / 2, d.textHeight / 2]
          ];
        }).iterations(1);

        const xCenter = size[0] / 2;
        const yCenter = size[1] / 2;

        const simulation = forceSimulation(nodes)
          .velocityDecay(0.6)
          .force("x", forceX(xCenter).strength(1.2))
          .force("y", forceY(yCenter).strength(1.2))
          .force("collide", collide);

        simulation.stop();

        for (let i = 0; i < iterations; ++i) simulation.tick();
        //      }

        const xMin = min(
          projectedNodes.map(
            p => p.x - (p.rotate ? p.textHeight / 2 : p.textWidth / 2)
          )
        );
        const xMax = max(
          projectedNodes.map(
            p => p.x + (p.rotate ? p.textHeight / 2 : p.textWidth / 2)
          )
        );
        const yMin = min(
          projectedNodes.map(
            p => p.y - (p.rotate ? p.textWidth / 2 : p.textHeight / 2)
          )
        );
        const yMax = max(
          projectedNodes.map(
            p => p.y + (p.rotate ? p.textWidth / 2 : p.textHeight / 2)
          )
        );
        const projectionScaleX = scaleLinear()
          .domain([xMin, xMax])
          .range([margin.left, size[0] - margin.right]);
        const projectionScaleY = scaleLinear()
          .domain([yMin, yMax])
          .range([margin.top, size[1] - margin.bottom]);
        const xMod = (size[0] - margin.right) / xMax;
        const yMod = (size[1] - margin.bottom) / yMax;

        const sizeMod = Math.min(xMod, yMod) * 1.2;
        projectedNodes.forEach(node => {
          node.x = projectionScaleX(node.x);
          node.y = projectionScaleY(node.y);
          node.fontSize = node.fontSize * sizeMod;
          node.scale = 1;
          node.radius = node.r = Math.max(
            node.textHeight / 4 * yMod,
            node.textWidth / 4 * xMod
          );
          //      node.textHeight = projectionScaleY(node.textHeight)
          //      node.textWidth = projectionScaleY(node.textWidth)
        });
      } else if (networkSettings.type === "force") {
        const {
          iterations = 500,
          edgeStrength = 0.1,
          distanceMax = Infinity
        } = networkSettings;

        const linkForce = forceLink().strength(
          d => (d.weight ? d.weight * edgeStrength : edgeStrength)
        );

        const simulation = forceSimulation()
          .force(
            "charge",
            forceManyBody()
              .distanceMax(distanceMax)
              .strength(
                networkSettings.forceManyBody ||
                  (d => -25 * nodeSizeAccessor(d))
              )
          )
          .force("x", forceX(size[0] / 2))
          .force("y", forceY(size[1] / 2))
          .force("link", linkForce)
          .nodes(projectedNodes);

        simulation.force("link").links(projectedEdges);

        simulation.stop();

        for (let i = 0; i < iterations; ++i) simulation.tick();
      } else if (networkSettings.type === "motifs") {
        const largestComponent = Math.max(
          projectedNodes.length / 3,
          components[0].componentNodes.length
        );

        const layoutSize = size[0] > size[1] ? size[1] : size[0];
        const layoutDirection = size[0] > size[1] ? "horizontal" : "vertical";

        //        louvain.assign(graph)
        const { iterations = 500, edgeStrength = 0.1 } = networkSettings;

        let currentX = 0;
        let currentY = 0;

        components.forEach(({ componentNodes, componentEdges }) => {
          const linkForce = forceLink().strength(
            d => (d.weight ? d.weight * edgeStrength : edgeStrength)
          );

          const componentLayoutSize =
            Math.max(componentNodes.length / largestComponent, 0.2) *
            layoutSize;

          const xBound = componentLayoutSize + currentX;
          const yBound = componentLayoutSize + currentY;

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

          const xCenter = currentX - componentLayoutSize / 2;
          const yCenter = currentY - componentLayoutSize / 2;

          const simulation = forceSimulation()
            .force(
              "charge",
              forceManyBody().strength(
                networkSettings.forceManyBody ||
                  (d => -25 * nodeSizeAccessor(d))
              )
            )
            .force("link", linkForce);

          simulation
            .force("x", forceX(xCenter))
            .force("y", forceY(yCenter))
            .nodes(componentNodes);

          simulation.force("link").links(componentEdges);

          simulation.stop();

          for (let i = 0; i < iterations; ++i) simulation.tick();

          const maxX = max(componentNodes.map(d => d.x));
          const maxY = max(componentNodes.map(d => d.y));
          const minX = min(componentNodes.map(d => d.x));
          const minY = min(componentNodes.map(d => d.y));

          const resetX = scaleLinear()
            .domain([minX, maxX])
            .range([currentX - componentLayoutSize, currentX - 20]);
          const resetY = scaleLinear()
            .domain([minY, maxY])
            .range([currentY - componentLayoutSize, currentY - 20]);

          componentNodes.forEach(node => {
            node.x = resetX(node.x);
            node.y = resetY(node.y);
          });
        });
      } else if (typeof networkSettings.type === "function") {
        const customProjectedGraph = networkSettings.type({
          nodes: projectedNodes,
          edges: projectedEdges
        });
      }

      this.graphSettings = networkSettings;
      this.graphSettings.nodes = currentProps.nodes;
      this.graphSettings.edges = currentProps.edges;
    }

    if (
      networkSettings.type !== "wordcloud" &&
      networkSettings.type !== "chord" &&
      networkSettings.type !== "sankey"
    ) {
      const xMin = min(projectedNodes.map(p => p.x - nodeSizeAccessor(p)));
      const xMax = max(projectedNodes.map(p => p.x + nodeSizeAccessor(p)));
      const yMin = min(projectedNodes.map(p => p.y - nodeSizeAccessor(p)));
      const yMax = max(projectedNodes.map(p => p.y + nodeSizeAccessor(p)));

      const projectionScaleX = scaleLinear()
        .domain([xMin, xMax])
        .range([margin.left, size[0] - margin.right]);
      const projectionScaleY = scaleLinear()
        .domain([yMin, yMax])
        .range([margin.top, size[1] - margin.bottom]);
      projectedNodes.forEach(node => {
        node.x = projectionScaleX(node.x);
        node.y = projectionScaleY(node.y);
      });
    }

    projectedNodes.forEach(node => {
      node.nodeSize = nodeSizeAccessor(node);
    });

    projectedEdges.forEach(edge => {
      edge.width = edgeWidthAccessor(edge);
    });

    let legendSettings;

    if (currentProps.legend) {
      legendSettings = currentProps.legend === true ? {} : currentProps.legend;
      if (!legendSettings.legendGroups) {
        ///Something auto for networks
        const legendGroups = [
          {
            styleFn: currentProps.nodeStyle,
            type: "fill",
            items: ["put", "nodes", "here"]
          }
        ];
        legendSettings.legendGroups = legendGroups;
      }
    }
    const networkFrameRender = {
      edges: {
        data: projectedEdges,
        styleFn: stringToFn(edgeStyle, () => {}, true),
        classFn: stringToFn(edgeClass, () => {}, true),
        renderMode: stringToFn(edgeRenderMode, undefined, true),
        canvasRender: stringToFn(canvasEdges, undefined, true),
        renderKeyFn: currentProps.edgeRenderKey
          ? currentProps.edgeRenderKey
          : d => d._NWFEdgeKey || `${d.source.id}-${d.target.id}`,
        behavior: drawEdges,
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
        behavior: drawNodes
      }
    };

    let nodeLabelAnnotations = [];
    if (this.props.nodeLabels && projectedNodes) {
      projectedNodes.forEach((node, nodei) => {
        if (nodeLabels === true || (nodeLabels && nodeLabels(node, nodei))) {
          const actualLabel =
            nodeLabels === true
              ? nodeIDAccessor(node, nodei)
              : nodeLabels(node, nodei);
          const nodeLabel = {
            className: "node-label",
            dx: 0,
            dy: 0,
            x: node.x,
            y: node.y,
            note: { label: actualLabel },
            connector: { end: "none" },
            type: AnnotationLabel,
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
      title,
      renderNumber: this.state.renderNumber + 1,
      nodeData: null,
      edgeData: null,
      projectedNodes,
      projectedEdges,
      nodeIDAccessor,
      sourceAccessor,
      targetAccessor,
      nodeSizeAccessor,
      edgeWidthAccessor,
      margin,
      legendSettings,
      networkFrameRender,
      nodeLabelAnnotations
    });
  }

  defaultNetworkSVGRule({ d, i }) {
    const {
      projectedNodes /*, projectedEdges*/,
      nodeIDAccessor,
      nodeSizeAccessor
    } = this.state;
    const { svgAnnotationRules } = this.props;

    if (svgAnnotationRules) {
      const customAnnotation = svgAnnotationRules({
        d,
        i,
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
      const selectedNode =
        d.x && d.y ? d : projectedNodes.find(p => nodeIDAccessor(p) === d.id);
      if (!selectedNode) {
        return null;
      }
      const noteData = Object.assign(
        {
          dx: d.dx || -25,
          dy: d.dy || -25,
          x: selectedNode.x,
          y: selectedNode.y,
          note: { label: d.label },
          connector: { end: "arrow" }
        },
        d,
        {
          type: AnnotationCalloutCircle,
          subject: {
            radius: d.radius || selectedNode.radius || nodeSizeAccessor(d)
          }
        }
      );
      return (
        <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />
      );
    } else if (d.type === "react-annotation" || typeof d.type === "function") {
      const selectedNode =
        d.x && d.y ? d : projectedNodes.find(p => nodeIDAccessor(p) === d.id);
      if (!selectedNode) {
        return null;
      }
      const noteData = Object.assign(
        {
          dx: 0,
          dy: 0,
          x: selectedNode.x,
          y: selectedNode.y,
          note: { label: d.label },
          connector: { end: "arrow" }
        },
        d,
        { type: typeof d.type === "function" ? d.type : undefined }
      );
      return (
        <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />
      );
    } else if (d.type === "enclose") {
      const selectedNodes = projectedNodes.filter(
        p => d.ids.indexOf(nodeIDAccessor(p)) !== -1
      );
      if (selectedNodes.length === 0) {
        return null;
      }
      const circle = packEnclose(
        selectedNodes.map(p => ({ x: p.x, y: p.y, r: nodeSizeAccessor(p) }))
      );
      const noteData = Object.assign(
        {
          dx: d.dx || -25,
          dy: d.dy || -25,
          x: circle.x,
          y: circle.y,
          note: { label: d.label },
          connector: { end: "arrow" }
        },
        d,
        {
          type: AnnotationCalloutCircle,
          subject: {
            radius: circle.r,
            radiusPadding: 5 || d.radiusPadding
          }
        }
      );

      if (noteData.rp) {
        switch (noteData.rp) {
          case "top":
            noteData.dx = 0;
            noteData.dy = -circle.r - noteData.rd;
            break;
          case "bottom":
            noteData.dx = 0;
            noteData.dy = circle.r + noteData.rd;
            break;
          case "left":
            noteData.dx = -circle.r - noteData.rd;
            noteData.dy = 0;
            break;
          default:
            noteData.dx = circle.r + noteData.rd;
            noteData.dy = 0;
        }
      }
      //TODO: Support .ra (setting angle)

      return (
        <Annotation key={d.key || `annotation-${i}`} noteData={noteData} />
      );
    }
    return null;
  }

  defaultNetworkHTMLRule({ d, i }) {
    if (this.props.htmlAnnotationRules) {
      const customAnnotation = this.props.htmlAnnotationRules({
        d,
        i,
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
      let content = (
        <div className="tooltip-content">
          <p key="html-annotation-content-1">{d.id}</p>
          <p key="html-annotation-content-2">Degree: {d.degree}</p>
        </div>
      );

      if (d.type === "frame-hover" && this.props.tooltipContent) {
        content = this.props.tooltipContent(d);
      }

      return (
        <div
          key={"xylabel" + i}
          className={`annotation annotation-network-label ${d.className || ""}`}
          style={{
            position: "absolute",
            bottom: this.props.size[1] - d.y + "px",
            left: d.x + "px"
          }}
        >
          {content}
        </div>
      );
    }
    return null;
  }

  render() {
    return this.renderBody({});
  }

  renderBody({ afterElements }) {
    const {
      annotations,
      annotationSettings,
      className,
      customClickBehavior,
      customDoubleClickBehavior,
      customHoverBehavior,
      size,
      matte,
      renderKey,
      hoverAnnotation,
      beforeElements,
      interaction,
      title,
      disableContext
    } = this.props;
    const {
      backgroundGraphics,
      foregroundGraphics,
      projectedNodes,
      margin,
      legendSettings,
      adjustedPosition,
      adjustedSize,
      networkFrameRender,
      nodeLabelAnnotations
    } = this.state;

    let downloadButton = [];

    if (this.props.download && this.state.projectedNodes.length > 0) {
      downloadButton.push(
        <DownloadButton
          key="network-download-nodes"
          csvName={`${this.props.name ||
            "networkframe"}-${new Date().toJSON()}`}
          width={this.props.size[0]}
          label={"Download Node List"}
          data={networkNodeDownloadMapping({
            data: this.state.projectedNodes,
            fields: this.props.downloadFields
          })}
        />
      );
    }
    if (this.props.download && this.state.projectedEdges.length > 0) {
      downloadButton.push(
        <DownloadButton
          key="network-download-edges"
          csvName={`${this.props.name ||
            "networkframe"}-${new Date().toJSON()}`}
          width={this.props.size[0]}
          label={"Download Edge List"}
          data={networkEdgeDownloadMapping({
            data: this.state.projectedEdges,
            fields: this.props.downloadFields
          })}
        />
      );
    }

    const finalFilterDefs = filterDefs({
      key: "networkFrame",
      additionalDefs: this.props.additionalDefs
    });

    return (
      <Frame
        name="networkframe"
        renderPipeline={networkFrameRender}
        adjustedPosition={adjustedPosition}
        adjustedSize={adjustedSize}
        size={size}
        xScale={xScale}
        yScale={yScale}
        title={title}
        matte={matte}
        className={className}
        finalFilterDefs={finalFilterDefs}
        frameKey={"none"}
        renderKeyFn={renderKey}
        projectedCoordinateNames={projectedCoordinateNames}
        defaultSVGRule={this.defaultNetworkSVGRule.bind(this)}
        defaultHTMLRule={this.defaultNetworkHTMLRule.bind(this)}
        hoverAnnotation={hoverAnnotation}
        annotations={[...annotations, ...nodeLabelAnnotations]}
        annotationSettings={annotationSettings}
        legendSettings={legendSettings}
        interaction={interaction}
        customClickBehavior={customClickBehavior}
        customHoverBehavior={customHoverBehavior}
        customDoubleClickBehavior={customDoubleClickBehavior}
        points={projectedNodes}
        margin={margin}
        backgroundGraphics={backgroundGraphics}
        foregroundGraphics={foregroundGraphics}
        beforeElements={beforeElements}
        afterElements={afterElements}
        downloadButton={downloadButton}
        disableContext={disableContext}
      />
    );
  }
}

NetworkFrame.propTypes = {
  name: PropTypes.string,
  nodes: PropTypes.array,
  edges: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  margin: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
  size: PropTypes.array,
  position: PropTypes.array,
  nodeIDAccessor: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  sourceAccessor: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  targetAccessor: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  nodeSizeAccessor: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.func
  ]),
  nodeLabels: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
  edgeWidthAccessor: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  annotations: PropTypes.array,
  customHoverBehavior: PropTypes.func,
  customClickBehavior: PropTypes.func,
  customDoubleClickBehavior: PropTypes.func,
  htmlAnnotationRules: PropTypes.func,
  networkType: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  tooltipContent: PropTypes.func,
  className: PropTypes.string,
  additionalDefs: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  interaction: PropTypes.object,
  renderFn: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  nodeStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  edgeStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  hoverAnnotation: PropTypes.bool,
  backgroundGraphics: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  foregroundGraphics: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  customNodeIcon: PropTypes.func,
  edgeType: PropTypes.oneOfType([PropTypes.string, PropTypes.func])
};

export default NetworkFrame;
