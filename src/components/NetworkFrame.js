// @flow

import React from "react"

import {
  /*forceCenter,*/ forceSimulation,
  forceX,
  forceY,
  /*forceCollide,*/ forceLink,
  forceManyBody
} from "d3-force"

import { bboxCollide } from "d3-bboxCollide"

import { scaleLinear, scaleIdentity } from "d3-scale"

import { min, max } from "d3-array"

import AnnotationLabel from "react-annotation/lib/Types/AnnotationLabel"

import Frame from "./Frame"

import DownloadButton from "./DownloadButton"

import { calculateMargin, adjustedPositionSize } from "./svg/frameFunctions"
import { pointOnArcAtAngle } from "./svg/pieceDrawing"

import { softStack } from "./svg/networkDrawing"

import {
  drawNodes,
  drawEdges,
  topologicalSort,
  hierarchicalRectNodeGenerator,
  matrixNodeGenerator,
  radialRectNodeGenerator,
  chordNodeGenerator,
  chordEdgeGenerator,
  matrixEdgeGenerator,
  arcEdgeGenerator,
  sankeyNodeGenerator,
  wordcloudNodeGenerator,
  circleNodeGenerator,
  areaLink,
  ribbonLink,
  circularAreaLink,
  radialLabelGenerator,
  dagreEdgeGenerator
} from "./svg/networkDrawing"

import { stringToFn } from "./data/dataFunctions"

import {
  networkNodeDownloadMapping,
  networkEdgeDownloadMapping
} from "./downloadDataMapping"

import {
  sankeyLeft,
  sankeyRight,
  sankeyCenter,
  sankeyJustify,
  sankeyCircular
} from "d3-sankey-circular"

import { chord, ribbon } from "d3-chord"
import { arc } from "d3-shape"
import {
  tree,
  hierarchy,
  pack,
  cluster,
  treemap,
  partition,
  packSiblings
} from "d3-hierarchy"

import {
  networkFrameChangeProps,
  xyframeproptypes,
  ordinalframeproptypes,
  networkframeproptypes
} from "./constants/frame_props"

import {
  htmlFrameHoverRule,
  svgNodeRule,
  svgReactAnnotationRule,
  svgEncloseRule,
  svgRectEncloseRule,
  svgHullEncloseRule,
  svgHighlightRule
} from "./annotationRules/networkframeRules"

import { desaturationLayer } from "./annotationRules/baseRules"

import { genericFunction } from "./untyped_utilities/functions"
import pathBounds from "svg-path-bounding-box"

const emptyArray = []

const baseNodeProps = {
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
}

const baseNetworkSettings = {
  iterations: 500,
  hierarchicalNetwork: false
}

const baseGraphSettings = {
  nodeHash: new Map(),
  edgeHash: new Map(),
  nodes: [],
  edges: [],
  hierarchicalNetwork: false
}

const basicMiddle = d => ({
  edge: d,
  x: (d.source.x + d.target.x) / 2,
  y: (d.source.y + d.target.y) / 2
})

const edgePointHash = {
  sankey: d => ({
    edge: d,
    x: (d.source.x1 + d.target.x0) / 2,
    y: d.circularPathData
      ? d.circularPathData.verticalFullExtent
      : ((d.y0 + d.y1) / 2 + (d.y0 + d.y1) / 2) / 2
  }),
  force: basicMiddle,
  tree: basicMiddle,
  cluster: basicMiddle
}

const hierarchicalTypeHash = {
  dendrogram: tree,
  tree,
  circlepack: pack,
  cluster,
  treemap,
  partition
}

const hierarchicalProjectable = {
  partition: true,
  cluster: true,
  tree: true,
  dendrogram: true
}

const radialProjectable = {
  partition: true,
  cluster: true,
  tree: true,
  dendrogram: true
}

/*
const customEdgeHashProject = {
  offset: glyphProject.offset,
  parallel: glyphProject.parallel
}

const customEdgeHashMutate = {
  particle: glyphMutate.particle
}
*/

function determineNodeIcon(baseCustomNodeIcon, networkSettings, size, nodes) {
  if (baseCustomNodeIcon) return baseCustomNodeIcon

  const center = [size[0] / 2, size[1] / 2]

  switch (networkSettings.type) {
    case "sankey":
      return sankeyNodeGenerator
    case "partition":
      return networkSettings.projection === "radial"
        ? radialRectNodeGenerator(size, center, networkSettings)
        : hierarchicalRectNodeGenerator
    case "treemap":
      return networkSettings.projection === "radial"
        ? radialRectNodeGenerator(size, center, networkSettings)
        : hierarchicalRectNodeGenerator
    case "circlepack":
      return circleNodeGenerator
    case "wordcloud":
      return wordcloudNodeGenerator
    case "chord":
      return chordNodeGenerator(size)
    case "dagre":
      return hierarchicalRectNodeGenerator
      case "matrix":
      return matrixNodeGenerator(size, nodes, networkSettings)
  }

  return circleNodeGenerator
}

function determineEdgeIcon({ baseCustomEdgeIcon, networkSettings, size, graph, nodes }) {
  if (baseCustomEdgeIcon) return baseCustomEdgeIcon
  switch (networkSettings.type) {
    case "partition":
      return () => null
    case "treemap":
      return () => null
    case "circlepack":
      return () => null
    case "wordcloud":
      return () => null
    case "chord":
      return chordEdgeGenerator(size)
    case "matrix":
      return matrixEdgeGenerator(size, nodes)
    case "arc":
      return arcEdgeGenerator(size)
    case "dagre":
      if (graph) return dagreEdgeGenerator(graph.graph().rankdir)
  }
  return undefined
}

function breadthFirstCompontents(baseNodes, hash) {
  const componentHash = {
    "0": { componentNodes: [], componentEdges: [] }
  }
  const components = [componentHash["0"]]

  let componentID = 0

  traverseNodesBF(baseNodes, true)

  function traverseNodesBF(nodes, top) {
    nodes.forEach(node => {
      const hashNode = hash.get(node)
      if (!hashNode) {
        componentHash["0"].componentNodes.push(node)
      } else if (hashNode.component === -99) {
        if (top === true) {
          componentID++
          componentHash[componentID] = {
            componentNodes: [],
            componentEdges: []
          }
          components.push(componentHash[componentID])
        }

        hashNode.component = componentID
        componentHash[componentID].componentNodes.push(node)
        componentHash[componentID].componentEdges.push(...hashNode.edges)
        const traversibleNodes = [...hashNode.connectedNodes]
        traverseNodesBF(traversibleNodes)
      }
    })
  }

  return components.sort(
    (a, b) => b.componentNodes.length - a.componentNodes.length
  )
}

const projectedCoordinateNames = { y: "y", x: "x" }

function recursiveIDAccessor(idAccessor, node, accessorString) {
  if (node.parent) {
    accessorString = `${accessorString}-${recursiveIDAccessor(
      idAccessor,
      node.parent,
      accessorString
    )}`
  }
  return `${accessorString}-${idAccessor(node.data)}`
}

const sankeyOrientHash = {
  left: sankeyLeft,
  right: sankeyRight,
  center: sankeyCenter,
  justify: sankeyJustify
}

const xScale = scaleIdentity()
const yScale = scaleIdentity()

const matrixify = ({ edgeHash, nodes, edgeWidthAccessor, nodeIDAccessor }) => {
  const matrix = []
  nodes.forEach(nodeSource => {
    const nodeSourceID = nodeIDAccessor(nodeSource)
    const sourceRow = []
    matrix.push(sourceRow)
    nodes.forEach(nodeTarget => {
      const nodeTargetID = nodeIDAccessor(nodeTarget)
      const theEdge = edgeHash.get(`${nodeSourceID}|${nodeTargetID}`)
      if (theEdge) {
        sourceRow.push(edgeWidthAccessor(theEdge))
      } else {
        sourceRow.push(0)
      }
    })
  })
  return matrix
}

import type { Node } from "react"

import type { CanvasPostProcessTypes } from "./types/generalTypes"

import type { AnnotationHandling } from "./types/annotationTypes"

type NodeType = {
  degree: number,
  inDegree: number,
  outDegree: number,
  id?: string,
  createdByFrame?: boolean,
  x: number,
  y: number,
  x1: number,
  x0: number,
  y1: number,
  y0: number,
  height: number,
  width: number,
  radius: number,
  direction: string,
  textHeight: number,
  textWidth: number,
  fontSize: number,
  scale: number,
  r: number,
  nodeSize: 0,
  component: number,
  shapeNode: boolean
}

type NetworkSettingsType = {
  type: string,
  hierarchyChildren?: Function,
  nodes?: Array<Object>,
  edges?: Array<Object>,
  iterations?: number,
  width?: number,
  height?: number,
  projection?: "horizontal" | "radial" | "vertical",
  customSankey?: Function,
  groupWidth?: number,
  padAngle?: number,
  orient?: string,
  nodePadding?: number,
  nodePaddingRatio?: number,
  nodeWidth?: number,
  direction?: string,
  fontSize?: number,
  rotate?: Function,
  fontWeight?: number,
  textAccessor?: Function,
  edgeStrength?: number,
  distanceMax?: number,
  edgeDistance?: number,
  forceManyBody?: Function | number,
  hierarchicalNetwork: boolean,
  graphSettings: Object,
  sortGroups?: Function
}

type State = {
  dataVersion?: string,
  adjustedPosition: Array<number>,
  adjustedSize: Array<number>,
  backgroundGraphics?: Node | Function,
  foregroundGraphics?: Node | Function,
  title: Object,
  renderNumber: number,
  nodeData: Array<Object>,
  edgeData: Array<Object>,
  projectedNodes: Array<Object>,
  projectedEdges: Array<Object>,
  projectedXYPoints: Array<Object>,
  overlay: Array<Object>,
  nodeIDAccessor: Function,
  sourceAccessor: Function,
  targetAccessor: Function,
  nodeSizeAccessor: Function,
  edgeWidthAccessor: Function,
  margin: Object,
  legendSettings: Object,
  nodeLabelAnnotations: Array<Object>,
  graphSettings: Object,
  networkFrameRender: Object
}

type Props = {
  dataVersion?: string,
  name: string,
  graph?: Object,
  nodes?: Array<Object>,
  edges?: Array<Object> | Object,
  networkType?: string | Object,
  size: Array<number>,
  nodeStyle?: Object | Function,
  nodeClass?: string | Function,
  canvasNodes?: boolean | Function,
  edgeStyle?: Object | Function,
  edgeClass?: string | Function,
  canvasEdges?: boolean | Function,
  nodeRenderMode?: string | Function,
  edgeRenderMode?: string | Function,
  nodeLabels?: boolean | Function,
  title?: Node,
  legend?: Object,
  edgeRenderKey?: Function,
  nodeRenderKey?: Function,
  foregroundGraphics?: Node,
  backgroundGraphics?: Node,
  additionalDefs?: Node,
  svgAnnotationRules?: Function,
  htmlAnnotationRules?: Function,
  tooltipContent?: Function,
  annotations: Array<Object>,
  annotationSettings?: AnnotationHandling,
  className?: string,
  customClickBehavior?: Function,
  customDoubleClickBehavior?: Function,
  customHoverBehavior?: Function,
  matte?: Object,
  useSpans?: boolean,
  beforeElements?: Node,
  afterElements?: Node,
  interaction?: Object,
  hoverAnnotation?: boolean | string | Array<Object | Function>,
  download?: boolean,
  downloadFields?: Array<string>,
  baseMarkProps?: Object,
  canvasPostProcess?: CanvasPostProcessTypes,
  disableContext?: boolean,
  edgeWidthAccessor?: string | Function,
  nodeSizeAccessor?: number | string | Function,
  targetAccessor?: string | Function,
  sourceAccessor?: string | Function,
  nodeIDAccessor?: string | Function,
  edgeType?: string | Function,
  customNodeIcon?: Function,
  customEdgeIcon?: Function,
  margin?: number | Object,
  onNodeOut?: Function,
  onNodeClick?: Function,
  onNodeEnter?: Function,
  renderOrder?: $ReadOnlyArray<"edges" | "nodes">,
  filterRenderedNodes: Function
}

class NetworkFrame extends React.Component<Props, State> {
  static defaultProps = {
    annotations: [],
    foregroundGraphics: [],
    annotationSettings: {},
    size: [500, 500],
    className: "",
    name: "networkframe",
    networkType: { type: "force", iterations: 500 },
    filterRenderedNodes: d => d.id !== "root-generated"
  }

  static displayName = "NetworkFrame"

  constructor(props: Props) {
    super(props)

    this.state = {
      dataVersion: undefined,
      nodeData: [],
      edgeData: [],
      adjustedPosition: [],
      adjustedSize: [],
      backgroundGraphics: null,
      foregroundGraphics: null,
      projectedNodes: [],
      projectedEdges: [],
      renderNumber: 0,
      nodeLabelAnnotations: [],
      graphSettings: {
        type: "empty-start",
        nodes: [],
        edges: [],
        nodeHash: new Map(),
        edgeHash: new Map(),
        hierarchicalNetwork: false
      },
      edgeWidthAccessor: stringToFn("weight"),
      legendSettings: {},
      margin: { top: 0, left: 0, right: 0, bottom: 0 },
      networkFrameRender: {},
      nodeIDAccessor: stringToFn("id"),
      nodeSizeAccessor: genericFunction(5),
      overlay: [],
      projectedXYPoints: [],
      sourceAccessor: stringToFn("source"),
      targetAccessor: stringToFn("target"),
      title: { title: undefined }
    }
  }

  componentWillMount() {
    Object.keys(this.props).forEach(d => {
      if (!networkframeproptypes[d]) {
        if (xyframeproptypes[d]) {
          console.error(
            `${d} is an XYFrame prop are you sure you're using the right frame?`
          )
        } else if (ordinalframeproptypes[d]) {
          console.error(
            `${d} is an OrdinalFrame prop are you sure you're using the right frame?`
          )
        } else {
          console.error(`${d} is not a valid NetworkFrame prop`)
        }
      }
    })
    this.calculateNetworkFrame(this.props)
  }

  componentWillReceiveProps(nextProps: Props) {
    if (
      (this.state.dataVersion &&
        this.state.dataVersion !== nextProps.dataVersion) ||
      (!this.state.projectedNodes && !this.state.projectedEdges)
    ) {
      this.calculateNetworkFrame(nextProps)
    } else if (
      this.props.size[0] !== nextProps.size[0] ||
      this.props.size[1] !== nextProps.size[1] ||
      (!this.state.dataVersion &&
        networkFrameChangeProps.find(d => {
          return this.props[d] !== nextProps[d]
        }))
    ) {
      this.calculateNetworkFrame(nextProps)
    }
  }

  onNodeClick(d: Object, i: number) {
    if (this.props.onNodeClick) {
      this.props.onNodeClick(d, i)
    }
  }

  onNodeEnter(d: Object, i: number) {
    if (this.props.onNodeEnter) {
      this.props.onNodeEnter(d, i)
    }
  }

  onNodeOut(d: Object, i: number) {
    if (this.props.onNodeOut) {
      this.props.onNodeOut(d, i)
    }
  }

  calculateNetworkFrame(currentProps: Props) {
    const {
      graph,
      nodes = (graph && graph.nodes) || emptyArray,
      edges = (graph && graph.edges) || graph || emptyArray,
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
      nodeLabels,
      title: baseTitle,
      margin: baseMargin,
      hoverAnnotation,
      customNodeIcon: baseCustomNodeIcon,
      customEdgeIcon: baseCustomEdgeIcon,
      filterRenderedNodes
    } = currentProps

    let { edgeType } = currentProps

    let networkSettings: NetworkSettingsType

    const nodeHierarchicalIDFill = {}
    let networkSettingsKeys = ["type"]

    if (typeof networkType === "string") {
      networkSettings = {
        type: networkType,
        ...baseNetworkSettings,
        graphSettings: baseGraphSettings
      }
    } else {
      if (networkType) networkSettingsKeys = Object.keys(networkType)

      networkSettings = {
        type: "force",
        ...baseNetworkSettings,
        ...networkType,
        graphSettings: baseGraphSettings
      }
    }

    networkSettingsKeys.push("height", "width")

    const title =
      typeof baseTitle === "object" &&
      !React.isValidElement(baseTitle) &&
      baseTitle !== null
        ? baseTitle
        : { title: baseTitle, orient: "top" }

    const margin = calculateMargin({
      margin: baseMargin,
      title
    })

    const { adjustedPosition, adjustedSize } = adjustedPositionSize({
      size,
      margin
    })

    networkSettings.graphSettings.nodes = nodes
    networkSettings.graphSettings.edges = edges

    let { edgeHash, nodeHash } = networkSettings.graphSettings

    const createPointLayer =
      ["treemap", "partition", "sankey"].indexOf(networkSettings.type) !== -1

    const nodeIDAccessor = stringToFn(currentProps.nodeIDAccessor, d => d.id)
    const sourceAccessor = stringToFn(
      currentProps.sourceAccessor,
      d => d.source
    )
    const targetAccessor = stringToFn(
      currentProps.targetAccessor,
      d => d.target
    )
    // $FlowFixMe
    const nodeSizeAccessor: Function =
      typeof currentProps.nodeSizeAccessor === "number"
        ? genericFunction(currentProps.nodeSizeAccessor)
        : stringToFn(currentProps.nodeSizeAccessor, d => d.r || 5)
    const edgeWidthAccessor = stringToFn(
      currentProps.edgeWidthAccessor,
      d => d.weight || 1
    )
    const nodeStyleFn = stringToFn(nodeStyle, () => ({}), true)
    const nodeClassFn = stringToFn(nodeClass, () => "", true)
    const nodeRenderModeFn = stringToFn(nodeRenderMode, undefined, true)
    const nodeCanvasRenderFn =
      canvasNodes && stringToFn(canvasNodes, undefined, true)

    let { projectedNodes, projectedEdges } = this.state

    const changedData =
      !this.state.projectedNodes ||
      !this.state.projectedEdges ||
      this.state.graphSettings.nodes !== nodes ||
      this.state.graphSettings.edges !== edges ||
      hierarchicalTypeHash[networkSettings.type]

    if (networkSettings.type === "dagre" && graph) {
      const dagreGraph = graph
      const dagreNodeHash = {}
      projectedNodes = dagreGraph.nodes().map(n => {
        const baseNode = dagreGraph.node(n)
        dagreNodeHash[n] = {
          ...baseNode,
          x0: baseNode.x - baseNode.width / 2,
          x1: baseNode.x + baseNode.width / 2,
          y0: baseNode.y - baseNode.height / 2,
          y1: baseNode.y + baseNode.height / 2,
          id: n,
          shapeNode: true,
          sourceLinks: [],
          targetLinks: []
        }
        return dagreNodeHash[n]
      })
      projectedEdges = dagreGraph.edges().map(e => {
        const dagreEdge = dagreGraph.edge(e)
        const baseEdge = { ...dagreEdge, points: dagreEdge.points.map(d => ({ ...d })) }
        baseEdge.source = projectedNodes.find(p => p.id === e.v)
        baseEdge.target = projectedNodes.find(p => p.id === e.w)
        baseEdge.points.unshift({ x: baseEdge.source.x, y: baseEdge.source.y })
        baseEdge.points.push({ x: baseEdge.target.x, y: baseEdge.target.y })
        dagreNodeHash[e.v].targetLinks.push(baseEdge)
        dagreNodeHash[e.w].sourceLinks.push(baseEdge)
        return baseEdge
      })
    } else if (changedData) {
      edgeHash = new Map()
      nodeHash = new Map()
      networkSettings.graphSettings.edgeHash = edgeHash
      networkSettings.graphSettings.nodeHash = nodeHash
      projectedNodes = []
      projectedEdges = []
      nodes.forEach(node => {
        const id = nodeIDAccessor(node)
        nodeHash.set(id, node)
        nodeHash.set(node, node)
        projectedNodes.push(node)
        node.id = id
        node.inDegree = 0
        node.outDegree = 0
        node.degree = 0
      })

      let operationalEdges = edges
      let baseEdges = edges

      if (hierarchicalTypeHash[networkSettings.type] && Array.isArray(edges)) {
        const createdHierarchicalData = softStack(edges, nodes, sourceAccessor, targetAccessor, nodeIDAccessor)

        if (createdHierarchicalData.isHierarchical) {
          baseEdges = createdHierarchicalData.hierarchy
          projectedNodes = []
        }
        else {
          console.error("You've sent an edge list that is not strictly hierarchical (there are nodes with multiple parents) defaulting to force-directed network layout")
          networkSettings.type = "force"
        }
      }

      if (!Array.isArray(baseEdges)) {
        networkSettings.hierarchicalNetwork = true
        const rootNode = hierarchy(baseEdges, networkSettings.hierarchyChildren)

        rootNode.sum(networkSettings.hierarchySum || (d => d.value))

        if (hierarchicalTypeHash[networkSettings.type]) {
          const layout =
            networkSettings.layout || hierarchicalTypeHash[networkSettings.type]
          const hierarchicalLayout = layout()
          const networkSettingKeys = Object.keys(networkSettings)
          if (
            ["dendrogram", "tree", "cluster"].indexOf(networkSettings.type) !==
            -1
          ) {
            hierarchicalLayout.separation(
              (a, b) =>
                (nodeSizeAccessor({ ...a, ...a.data }) || 1) +
                (networkSettings.nodePadding || 0) +
                (nodeSizeAccessor({ ...b, ...b.data }) || 1)
            )
          }

          networkSettingKeys.forEach(key => {
            if (hierarchicalLayout[key]) {
              hierarchicalLayout[key](networkSettings[key])
            }
          })
          const layoutSize =
            networkSettings.projection === "horizontal" &&
            hierarchicalProjectable[networkSettings.type]
              ? [adjustedSize[1], adjustedSize[0]]
              : adjustedSize
          if (!networkSettings.nodeSize) {
            hierarchicalLayout.size(layoutSize)
          }
          hierarchicalLayout(rootNode)
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
          }))
      }

      baseNodeProps.shapeNode = createPointLayer

      operationalEdges.forEach(edge => {
        const source = sourceAccessor(edge)
        const target = targetAccessor(edge)
        const sourceTarget = [source, target]
        sourceTarget.forEach(nodeDirection => {
          if (!nodeHash.get(nodeDirection)) {
            const nodeObject: NodeType =
              typeof nodeDirection === "object"
                ? {
                    ...baseNodeProps,
                    ...nodeDirection
                  }
                : {
                    id: nodeDirection,
                    ...baseNodeProps,
                    createdByFrame: true
                  }
            const nodeIDValue = nodeObject.id || nodeIDAccessor(nodeObject)
            nodeHierarchicalIDFill[nodeIDValue]
              ? (nodeHierarchicalIDFill[nodeIDValue] += 1)
              : (nodeHierarchicalIDFill[nodeIDValue] = 1)
            if (!nodeObject.id) {
              const nodeSuffix =
                nodeHierarchicalIDFill[nodeIDValue] === 1
                  ? ""
                  : `-${nodeHierarchicalIDFill[nodeIDValue]}`
              nodeObject.id = `${nodeIDValue}${nodeSuffix}`
            }

            nodeHash.set(nodeDirection, nodeObject)
            projectedNodes.push(nodeObject)
          }
        })

        const edgeWeight = edge.weight || 1

        // $FlowFixMe
        nodeHash.get(target).inDegree += edgeWeight
        // $FlowFixMe
        nodeHash.get(source).outDegree += edgeWeight
        // $FlowFixMe
        nodeHash.get(target).degree += edgeWeight
        // $FlowFixMe
        nodeHash.get(source).degree += edgeWeight

        const edgeKey = `${nodeIDAccessor(source) || source}|${nodeIDAccessor(
          target
        ) || target}`
        const newEdge = Object.assign({}, edge, {
          source: nodeHash.get(source),
          target: nodeHash.get(target)
        })
        edgeHash.set(edgeKey, newEdge)
        projectedEdges.push(newEdge)
      })
    } else {
      edgeHash = new Map()
      networkSettings.graphSettings.edgeHash = edgeHash
      projectedEdges.forEach(edge => {
        const edgeKey = `${nodeIDAccessor(edge.source) ||
          edge.source}|${nodeIDAccessor(edge.target) || edge.target}`
        edgeHash.set(edgeKey, edge)
      })
    }

    const customNodeIcon = determineNodeIcon(
      baseCustomNodeIcon,
      networkSettings,
      adjustedSize,
      projectedNodes
    )

    const customEdgeIcon = determineEdgeIcon(
      { baseCustomEdgeIcon,
      networkSettings,
      size: adjustedSize,
      nodes: projectedNodes,
      graph }
    )


    if (
      (networkSettings.type === "sankey" ||
        networkSettings.type === "flowchart") &&
      topologicalSort(projectedNodes, projectedEdges) === null
    ) {
      networkSettings.customSankey = sankeyCircular
    }
    networkSettings.width = size[0]
    networkSettings.height = size[1]

    let networkSettingsChanged = false

    networkSettingsKeys.forEach(key => {
      if (
        key !== "edgeType" &&
        key !== "graphSettings" &&
        networkSettings[key] !== this.state.graphSettings[key]
      ) {
        networkSettingsChanged = true
      }
    })

    //Support bubble chart with circle pack and with force
    if (networkSettings.type === "sankey") {
      edgeType = d =>
        d.circular
          ? circularAreaLink(d)
          : edgeType === "angled"
            ? ribbonLink(d)
            : areaLink(d)
    } else if (hierarchicalTypeHash[networkSettings.type]) {
      projectedNodes.forEach(node => {
        if (createPointLayer) {
          node.x = (node.x0 + node.x1) / 2
          node.y = (node.y0 + node.y1) / 2
        }
        if (
          hierarchicalProjectable[networkSettings.type] &&
          networkSettings.projection === "horizontal"
        ) {
          const ox = node.x
          node.x = node.y
          node.y = ox

          if (createPointLayer) {
            const ox0 = node.x0
            const ox1 = node.x1
            node.x0 = node.y0
            node.x1 = node.y1
            node.y0 = ox0
            node.y1 = ox1
          }
        } else if (
          radialProjectable[networkSettings.type] &&
          networkSettings.projection === "radial"
        ) {
          const radialPoint =
            node.depth === 0
              ? [adjustedSize[0] / 2, adjustedSize[1] / 2]
              : pointOnArcAtAngle(
                  [adjustedSize[0] / 2, adjustedSize[1] / 2],
                  node.x / adjustedSize[0],
                  node.y / 2
                )
          node.x = radialPoint[0]
          node.y = radialPoint[1]
        } else {
          node.x = node.x
          node.y = node.y
          if (createPointLayer) {
            node.x0 = node.x0
            node.x1 = node.x1
            node.y0 = node.y0
            node.y1 = node.y1
          }
        }
      })
    }

    if (
      networkSettings.type !== "static" &&
      (changedData || networkSettingsChanged)
    ) {
      let components = [
        {
          componentNodes: projectedNodes,
          componentEdges: projectedEdges
        }
      ]

      if (networkSettings.type === "chord") {
        const radius = size[1] / 2

        const { groupWidth = 20, padAngle = 0.01, sortGroups } = networkSettings
        const arcGenerator = arc()
          .innerRadius(radius - groupWidth)
          .outerRadius(radius)

        const ribbonGenerator = ribbon().radius(radius - groupWidth)

        const matrixifiedNetwork = matrixify({
          edgeHash: edgeHash,
          nodes: projectedNodes,
          edges: projectedEdges,
          edgeWidthAccessor,
          nodeIDAccessor
        })

        const chordLayout = chord().padAngle(padAngle)

        if (sortGroups) {
          chordLayout.sortGroups(sortGroups)
        }

        const chords = chordLayout(matrixifiedNetwork)
        const groups = chords.groups

        groups.forEach(group => {
          const groupCentroid = arcGenerator.centroid(group)
          const groupD = arcGenerator(group)
          const groupNode = projectedNodes[group.index]
          groupNode.d = groupD
          groupNode.index = group.index
          groupNode.x = groupCentroid[0] + size[0] / 2
          groupNode.y = groupCentroid[1] + size[1] / 2
        })

        chords.forEach(generatedChord => {
          const chordD = ribbonGenerator(generatedChord)

          //this is incorrect should use edgeHash
          const nodeSourceID = nodeIDAccessor(
            projectedNodes[generatedChord.source.index]
          )
          const nodeTargetID = nodeIDAccessor(
            projectedNodes[generatedChord.target.index]
          )
          const chordEdge = edgeHash.get(`${nodeSourceID}|${nodeTargetID}`)
          // $FlowFixMe
          chordEdge.d = chordD
          const chordBounds = pathBounds(chordD)
          // $FlowFixMe
          chordEdge.x = size[0] / 2 + (chordBounds.x1 + chordBounds.x2) / 2
          // $FlowFixMe
          chordEdge.y = size[1] / 2 + (chordBounds.y1 + chordBounds.y2) / 2
        })
      } else if (
        networkSettings.type === "sankey" ||
        networkSettings.type === "flowchart"
      ) {
        const {
          orient = "center",
          iterations = 100,
          nodePadding,
          nodePaddingRatio = nodePadding ? undefined : 0.5,
          nodeWidth = networkSettings.type === "flowchart" ? 2 : 24,
          customSankey,
          direction = "right"
        } = networkSettings
        const sankeyOrient = sankeyOrientHash[orient]

        const actualSankey = customSankey || sankeyCircular

        let frameExtent = [[0, 0], adjustedSize]

        if (
          networkSettings.direction === "up" ||
          networkSettings.direction === "down"
        ) {
          frameExtent = [[0, 0], [adjustedSize[1], adjustedSize[0]]]
        }

        const frameSankey = actualSankey()
          .extent(frameExtent)
          .links(projectedEdges)
          .nodes(projectedNodes)
          .nodeAlign(sankeyOrient)
          .nodeId(nodeIDAccessor)
          .nodeWidth(nodeWidth)
          .iterations(iterations)

        if (frameSankey.nodePaddingRatio && nodePaddingRatio) {
          frameSankey.nodePaddingRatio(nodePaddingRatio)
        } else if (nodePadding) {
          frameSankey.nodePadding(nodePadding)
        }

        frameSankey()

        projectedNodes.forEach(d => {
          d.height = d.y1 - d.y0
          d.width = d.x1 - d.x0
          d.x = d.x0 + d.width / 2
          d.y = d.y0 + d.height / 2
          d.radius = d.height / 2
          d.direction = direction
        })

        projectedEdges.forEach(d => {
          d.sankeyWidth = d.width
          d.direction = direction
          d.width = undefined
        })
      } else if (networkSettings.type === "wordcloud") {
        const {
          iterations = 500,
          fontSize = 18,
          rotate,
          fontWeight = 300,
          textAccessor = d => d.text
        } = networkSettings

        const fontWeightMod = (fontWeight / 300 - 1) / 5 + 1
        const fontWidth = (fontSize / 1.5) * fontWeightMod

        nodes.forEach((d, i) => {
          const calcualatedNodeSize = nodeSizeAccessor(d)
          d._NWFText = textAccessor(d)
          const textWidth =
            fontWidth * d._NWFText.length * calcualatedNodeSize * 1.4
          const textHeight = fontSize * calcualatedNodeSize

          d.textHeight = textHeight + 4
          d.textWidth = textWidth + 4
          d.rotate = rotate ? rotate(d, i) : 0
          d.fontSize = fontSize * calcualatedNodeSize
          d.fontWeight = fontWeight
          d.radius = d.r = textWidth / 2
        })

        nodes.sort((a, b) => b.textWidth - a.textWidth)

        //bubblepack for initial position
        packSiblings(nodes)

        //        if (rotate) {
        const collide = bboxCollide(d => {
          if (d.rotate) {
            return [
              [-d.textHeight / 2, -d.textWidth / 2],
              [d.textHeight / 2, d.textWidth / 2]
            ]
          }
          return [
            [-d.textWidth / 2, -d.textHeight / 2],
            [d.textWidth / 2, d.textHeight / 2]
          ]
        }).iterations(1)

        const xCenter = size[0] / 2
        const yCenter = size[1] / 2

        const simulation = forceSimulation(nodes)
          .velocityDecay(0.6)
          .force("x", forceX(xCenter).strength(1.2))
          .force("y", forceY(yCenter).strength(1.2))
          .force("collide", collide)

        simulation.stop()

        for (let i = 0; i < iterations; ++i) simulation.tick()
        //      }

        const xMin = min(
          projectedNodes.map(
            p => p.x - (p.rotate ? p.textHeight / 2 : p.textWidth / 2)
          )
        )
        const xMax = max(
          projectedNodes.map(
            p => p.x + (p.rotate ? p.textHeight / 2 : p.textWidth / 2)
          )
        )
        const yMin = min(
          projectedNodes.map(
            p => p.y - (p.rotate ? p.textWidth / 2 : p.textHeight / 2)
          )
        )
        const yMax = max(
          projectedNodes.map(
            p => p.y + (p.rotate ? p.textWidth / 2 : p.textHeight / 2)
          )
        )
        const projectionScaleX = scaleLinear()
          .domain([xMin, xMax])
          .range([0, adjustedSize[0]])
        const projectionScaleY = scaleLinear()
          .domain([yMin, yMax])
          .range([0, adjustedSize[1]])
        const xMod = adjustedSize[0] / xMax
        const yMod = adjustedSize[1] / yMax

        const sizeMod = Math.min(xMod, yMod) * 1.2
        projectedNodes.forEach(node => {
          node.x = projectionScaleX(node.x)
          node.y = projectionScaleY(node.y)
          node.fontSize = node.fontSize * sizeMod
          node.scale = 1
          node.radius = node.r = Math.max(
            (node.textHeight / 4) * yMod,
            (node.textWidth / 4) * xMod
          )
          //      node.textHeight = projectionScaleY(node.textHeight)
          //      node.textWidth = projectionScaleY(node.textWidth)
        })
      } else if (networkSettings.type === "force") {
        const {
          iterations = 500,
          edgeStrength = 0.1,
          distanceMax = Infinity,
          edgeDistance
        } = networkSettings

        const linkForce = forceLink().strength(d =>
          Math.min(2.5, d.weight ? d.weight * edgeStrength : edgeStrength)
        )

        if (edgeDistance) {
          linkForce.distance(edgeDistance)
        }

        const simulation =
          networkSettings.simulation ||
          forceSimulation().force(
            "charge",
            forceManyBody()
              .distanceMax(distanceMax)
              .strength(
                networkSettings.forceManyBody ||
                  (d => -25 * nodeSizeAccessor(d))
              )
          )

        //        simulation.force("link", linkForce).nodes(projectedNodes)

        simulation.nodes(projectedNodes)

        if (!simulation.force("x")) {
          simulation.force("x", forceX(size[0] / 2))
        }
        if (!simulation.force("y")) {
          simulation.force("y", forceY(size[1] / 2))
        }

        if (projectedEdges.length !== 0 && !simulation.force("link")) {
          simulation.force("link", linkForce)
          simulation.force("link").links(projectedEdges)
        }

        //reset alpha if it's too cold
        if (simulation.alpha() < 0.1) {
          simulation.alpha(1)
        }

        simulation.stop()

        for (let i = 0; i < iterations; ++i) simulation.tick()
      } else if (networkSettings.type === "motifs") {
        const componentHash = new Map()
        projectedEdges.forEach(edge => {
          ;[edge.source, edge.target].forEach(node => {
            if (!componentHash.get(node)) {
              componentHash.set(node, {
                node,
                component: -99,
                connectedNodes: [],
                edges: []
              })
            }
          })
          // $FlowFixMe
          componentHash.get(edge.source).connectedNodes.push(edge.target)
          // $FlowFixMe
          componentHash.get(edge.target).connectedNodes.push(edge.source)
          // $FlowFixMe
          componentHash.get(edge.source).edges.push(edge)
        })

        components = breadthFirstCompontents(projectedNodes, componentHash)

        const largestComponent = Math.max(
          projectedNodes.length / 3,
          components[0].componentNodes.length
        )

        const layoutSize = size[0] > size[1] ? size[1] : size[0]
        const layoutDirection = size[0] > size[1] ? "horizontal" : "vertical"

        const {
          iterations = 500,
          edgeStrength = 0.1,
          edgeDistance
        } = networkSettings

        let currentX = 0
        let currentY = 0

        components.forEach(({ componentNodes, componentEdges }) => {
          const linkForce = forceLink().strength(d =>
            Math.min(2.5, d.weight ? d.weight * edgeStrength : edgeStrength)
          )

          if (edgeDistance) {
            linkForce.distance(edgeDistance)
          }

          const componentLayoutSize =
            Math.max(componentNodes.length / largestComponent, 0.2) * layoutSize

          const xBound = componentLayoutSize + currentX
          const yBound = componentLayoutSize + currentY

          if (layoutDirection === "horizontal") {
            if (yBound > size[1]) {
              currentX = componentLayoutSize + currentX
              currentY = componentLayoutSize
            } else {
              currentY = componentLayoutSize + currentY
            }
          } else {
            if (xBound > size[0]) {
              currentY = componentLayoutSize + currentY
              currentX = componentLayoutSize
            } else {
              currentX = componentLayoutSize + currentX
            }
          }

          const xCenter = currentX - componentLayoutSize / 2
          const yCenter = currentY - componentLayoutSize / 2

          const simulation = forceSimulation()
            .force(
              "charge",
              forceManyBody().strength(
                networkSettings.forceManyBody ||
                  (d => -25 * nodeSizeAccessor(d))
              )
            )
            .force("link", linkForce)

          simulation
            .force("x", forceX(xCenter))
            .force("y", forceY(yCenter))
            .nodes(componentNodes)

          simulation.force("link").links(componentEdges)

          simulation.stop()

          for (let i = 0; i < iterations; ++i) simulation.tick()

          const maxX = max(componentNodes.map(d => d.x))
          const maxY = max(componentNodes.map(d => d.y))
          const minX = min(componentNodes.map(d => d.x))
          const minY = min(componentNodes.map(d => d.y))

          const resetX = scaleLinear()
            .domain([minX, maxX])
            .range([currentX - componentLayoutSize, currentX - 20])
          const resetY = scaleLinear()
            .domain([minY, maxY])
            .range([currentY - componentLayoutSize, currentY - 20])

          componentNodes.forEach(node => {
            node.x = resetX(node.x)
            node.y = resetY(node.y)
          })
        })
      } else if (networkSettings.type === "matrix") {

        if (networkSettings.sort) {
          projectedNodes = projectedNodes.sort(networkSettings.sort)
        }

        const gridSize = Math.min(...adjustedSize)

        const stepSize = gridSize / (projectedNodes.length + 1)

        projectedNodes.forEach((node, index) => {
          node.x = 0
          node.y = (index + 1)  * stepSize
        })

      }  else if (networkSettings.type === "arc") {

        if (networkSettings.sort) {
          projectedNodes = projectedNodes.sort(networkSettings.sort)
        }

        const stepSize = adjustedSize[0] / (projectedNodes.length + 2)

        projectedNodes.forEach((node, index) => {
          node.x = (index + 1) * stepSize
          node.y = adjustedSize[1] / 2
        })

      } else if (typeof networkSettings.type === "function") {
        networkSettings.type({
          nodes: projectedNodes,
          edges: projectedEdges
        })
      } else {
        projectedNodes.forEach(node => {
          node.x = node.x === undefined ? (node.x0 + node.x1) / 2 : node.x
          node.y = node.y === undefined ? node.y0 : node.y
        })
      }

      this.state.graphSettings.nodes = currentProps.nodes
      this.state.graphSettings.edges = currentProps.edges
    } 

    //filter out user-defined nodes
    projectedNodes = projectedNodes.filter(filterRenderedNodes)
    projectedEdges = projectedEdges.filter(
      d =>
        projectedNodes.indexOf(d.target) !== -1 &&
        projectedNodes.indexOf(d.source) !== -1
    )

    if (networkSettings.direction === "flip") {
      projectedNodes.forEach(node => {
        // const ox = node.x
        // const oy = node.y
        node.x = adjustedSize[0] - node.x
        node.y = adjustedSize[1] - node.y
      })
    } else if (networkSettings.direction === "up") {
      projectedNodes.forEach(node => {
        const ox = node.x
        node.x = node.y
        node.y = adjustedSize[1] - ox
      })
    } else if (networkSettings.direction === "down") {
      projectedNodes.forEach(node => {
        const ox = node.x
        const ox0 = node.x0
        const ox1 = node.x1
        node.x = node.y
        node.x0 = node.y0
        node.x1 = node.y1
        node.y = ox
        node.y0 = ox0
        node.y1 = ox1
      })
    } else if (networkSettings.direction === "left") {
      projectedNodes.forEach(node => {
        node.x = adjustedSize[0] - node.x
      })
    }
    if (
      networkSettings.zoom !== false &&
      networkSettings.type !== "matrix" &&
      networkSettings.type !== "wordcloud" &&
      networkSettings.type !== "chord" &&
      networkSettings.type !== "sankey" &&
      networkSettings.type !== "partition" &&
      networkSettings.type !== "treemap" &&
      networkSettings.type !== "circlepack" &&
      networkSettings.type !== "dagre"
    ) {
      const xMin = min(projectedNodes.map(p => p.x - nodeSizeAccessor(p)))
      const xMax = max(projectedNodes.map(p => p.x + nodeSizeAccessor(p)))
      const yMin = min(projectedNodes.map(p => p.y - nodeSizeAccessor(p)))
      const yMax = max(projectedNodes.map(p => p.y + nodeSizeAccessor(p)))

      const projectionScaleX = scaleLinear()
        .domain([xMin, xMax])
        .range([margin.left, adjustedSize[0] - margin.right])
      const projectionScaleY = scaleLinear()
        .domain([yMin, yMax])
        .range([margin.top, adjustedSize[1] - margin.bottom])
      projectedNodes.forEach(node => {
        node.x = projectionScaleX(node.x)
        node.y = projectionScaleY(node.y)
      })
    } else if (
      networkSettings.zoom !== false &&
      networkSettings.projection !== "radial" &&
      (networkSettings.type === "partition" ||
        networkSettings.type === "treemap" ||
        networkSettings.type === "dagre")
    ) {
      const xMin = min(projectedNodes.map(p => p.x0))
      const xMax = max(projectedNodes.map(p => p.x1))
      const yMin = min(projectedNodes.map(p => p.y0))
      const yMax = max(projectedNodes.map(p => p.y1))

      const projectionScaleX = scaleLinear()
        .domain([xMin, xMax])
        .range([margin.left, adjustedSize[0] - margin.right])
      const projectionScaleY = scaleLinear()
        .domain([yMin, yMax])
        .range([margin.top, adjustedSize[1] - margin.bottom])
      projectedNodes.forEach(node => {
        node.x = projectionScaleX(node.x)
        node.y = projectionScaleY(node.y)
        node.x0 = projectionScaleX(node.x0)
        node.y0 = projectionScaleY(node.y0)
        node.x1 = projectionScaleX(node.x1)
        node.y1 = projectionScaleY(node.y1)
      })

      projectedEdges.forEach(edge => {
        if (edge.points) {
          edge.points.forEach(p => {
            p.x = projectionScaleX(p.x)
            p.y = projectionScaleY(p.y)
          })
        }
      })
    }

    projectedNodes.forEach(node => {
      node.nodeSize = nodeSizeAccessor(node)
    })

    projectedEdges.forEach(edge => {
      edge.width = edgeWidthAccessor(edge)
    })

    let legendSettings

    if (currentProps.legend) {
      legendSettings = currentProps.legend
      if (!legendSettings.legendGroups) {
        ///Something auto for networks
        const legendGroups = [
          {
            styleFn: currentProps.nodeStyle,
            type: "fill",
            items: []
          }
        ]
        legendSettings.legendGroups = legendGroups
      }
    }

    const networkFrameRender = {
      edges: {
        accessibleTransform: (data, i) => {
          const edgeX = (data[i].source.x + data[i].target.x) / 2
          const edgeY = (data[i].source.y + data[i].target.y) / 2
          return { type: "frame-hover", ...data[i], x: edgeX, y: edgeY }
        },
        data: projectedEdges,
        styleFn: stringToFn(edgeStyle, () => ({}), true),
        classFn: stringToFn(edgeClass, () => "", true),
        renderMode: stringToFn(edgeRenderMode, undefined, true),
        canvasRenderFn: canvasEdges && stringToFn(canvasEdges, undefined, true),
        renderKeyFn: currentProps.edgeRenderKey
          ? currentProps.edgeRenderKey
          : d => d._NWFEdgeKey || `${d.source.id}-${d.target.id}`,
        behavior: drawEdges,
        projection: networkSettings.projection,
        type: edgeType,
        customMark: customEdgeIcon,
        networkType: networkSettings.type,
        direction: networkSettings.direction
      },
      nodes: {
        accessibleTransform: (data, i) => ({
          type: "frame-hover",
          ...data[i],
          ...(data[i].data || {})
        }),
        data: projectedNodes,
        styleFn: nodeStyleFn,
        classFn: nodeClassFn,
        renderMode: nodeRenderModeFn,
        canvasRenderFn: nodeCanvasRenderFn,
        customMark: customNodeIcon,
        behavior: drawNodes,
        renderKeyFn: currentProps.nodeRenderKey
      }
    }

    const nodeLabelAnnotations = []
    if (currentProps.nodeLabels && projectedNodes) {
      projectedNodes.forEach((node, nodei) => {
        if (nodeLabels === true || (nodeLabels && nodeLabels(node, nodei))) {
          const actualLabel =
            networkSettings.projection === "radial" && node.depth !== 0
              ? radialLabelGenerator(
                  node,
                  nodei,
                  nodeLabels === true ? nodeIDAccessor : nodeLabels,
                  adjustedSize,
                  networkSettings
                )
              : nodeLabels === true
                ? nodeIDAccessor(node, nodei)
                : nodeLabels(node, nodei)

          let nodeLabel

          if (React.isValidElement(actualLabel)) {
            nodeLabel = {
              key: `node-label-${nodei}`,
              type: "basic-node-label",
              x: node.x,
              y: node.y,
              element: actualLabel
            }
          } else {
            nodeLabel = {
              key: `node-label-${nodei}`,
              className: "node-label",
              dx: 0,
              dy: 0,
              x: node.x,
              y: node.y,
              note: { label: actualLabel },
              connector: { end: "none" },
              type: AnnotationLabel,
              subject: { radius: nodeSizeAccessor(node) + 2 }
            }
          }

          nodeLabelAnnotations.push(nodeLabel)
        }
      })
    }

    let projectedXYPoints
    const overlay = []
    const areaBasedTypes = ["circlepack", "treemap", "partition", "chord"]
    if (
      (hoverAnnotation &&
        areaBasedTypes.find(d => d === networkSettings.type)) ||
      hoverAnnotation === "area"
    ) {
      if (hoverAnnotation !== "edge") {
        const renderedNodeOverlays = projectedNodes.map((d, i) => ({
          overlayData: d,
          ...customNodeIcon({
            d,
            i,
            transform: `translate(${d.x},${d.y})`,
            styleFn: () => ({ fill: "pink", opacity: 0 })
          }).props
        }))

        overlay.push(...renderedNodeOverlays)
      }
      if (hoverAnnotation !== "node") {
        projectedEdges.forEach((d, i) => {
          // $FlowFixMe
          const generatedIcon = customEdgeIcon({
            d,
            i,
            transform: `translate(${d.x},${d.y})`,
            styleFn: () => ({ fill: "pink", opacity: 0 })
          })
          if (generatedIcon) {
            overlay.push({
              overlayData: {
                ...d,
                x: d.x || (d.source.x + d.target.x) / 2,
                y: d.y || (d.source.y + d.target.y) / 2,
                edge: true
              },
              ...generatedIcon.props
            })
          }
        })
      }
    } else if (
      hoverAnnotation === "edge" &&
      edgePointHash[networkSettings.type]
    ) {
      projectedXYPoints = projectedEdges.map(
        edgePointHash[networkSettings.type]
      )
    } else if (
      Array.isArray(hoverAnnotation) ||
      hoverAnnotation === true ||
      hoverAnnotation === "node"
    ) {
      projectedXYPoints = projectedNodes
      if (changedData || networkSettingsChanged)
        projectedXYPoints = [...projectedNodes]
    } else if (hoverAnnotation === "all") {
      projectedXYPoints = [
        ...projectedEdges.map(edgePointHash[networkSettings.type]),
        ...projectedNodes
      ]
    }

    this.setState({
      adjustedPosition: adjustedPosition,
      adjustedSize: adjustedSize,
      backgroundGraphics: currentProps.backgroundGraphics,
      foregroundGraphics: currentProps.foregroundGraphics,
      title,
      renderNumber: this.state.renderNumber + 1,
      projectedNodes,
      projectedEdges,
      projectedXYPoints,
      overlay,
      nodeIDAccessor,
      sourceAccessor,
      targetAccessor,
      nodeSizeAccessor,
      edgeWidthAccessor,
      margin,
      legendSettings,
      networkFrameRender,
      nodeLabelAnnotations,
      graphSettings: {
        ...networkSettings.graphSettings,
        ...networkSettings
      }
    })
  }

  defaultNetworkSVGRule = ({ d: baseD, i, annotationLayer }: { d: Object, i: number, annotationLayer: Object }) => {
    const {
      projectedNodes,
      projectedEdges,
      nodeIDAccessor,
      nodeSizeAccessor,
      networkFrameRender,
      adjustedSize
    } = this.state
    const { svgAnnotationRules } = this.props

    const d = baseD.ids
      ? baseD
      : baseD.edge
        ? {
            ...(projectedEdges.find(
              p =>
                nodeIDAccessor(p.source) === nodeIDAccessor(baseD.source) &&
                nodeIDAccessor(p.target) === nodeIDAccessor(baseD.target)
            ) || {}),
            ...baseD
          }
        : {
            ...(projectedNodes.find(p => nodeIDAccessor(p) === baseD.id) || {}),
            ...baseD
          }


    const { voronoiHover } = annotationLayer


    if (svgAnnotationRules) {
      const customAnnotation = svgAnnotationRules({
        d,
        i,
        networkFrameProps: this.props,
        networkFrameState: this.state,
        nodes: projectedNodes,
        edges: projectedEdges,
        voronoiHover
      })
      if (customAnnotation !== null) {
        return customAnnotation
      }
    }
    if (d.type === "node") {
      return svgNodeRule({
        d,
        i,
        projectedNodes,
        nodeIDAccessor,
        nodeSizeAccessor
      })
    } else if (d.type === "desaturation-layer") {
     return desaturationLayer({ style: d.style, size: adjustedSize, i, key: d.key })
    } else if (d.type === "basic-node-label") {
      return (
        <g key={d.key} transform={`translate(${d.x},${d.y})`}>
          {baseD.label}
        </g>
      )
    } else if (d.type === "react-annotation" || typeof d.type === "function") {
      return svgReactAnnotationRule({
        d,
        projectedNodes,
        nodeIDAccessor
      })
    } else if (d.type === "enclose") {
      return svgEncloseRule({
        d,
        i,
        projectedNodes,
        nodeIDAccessor,
        nodeSizeAccessor
      })
    } else if (d.type === "enclose-rect") {
      return svgRectEncloseRule({
        d,
        i,
        projectedNodes,
        nodeIDAccessor,
        nodeSizeAccessor
      })
    } else if (d.type === "enclose-hull") {
      return svgHullEncloseRule({
        d,
        i,
        projectedNodes,
        nodeIDAccessor,
        nodeSizeAccessor
      })
    } else if (d.type === "highlight") {
      return svgHighlightRule({
        d,
        i,
        nodeSizeAccessor,
        networkFrameRender
      })
    }
    return null
  }

  defaultNetworkHTMLRule = ({ d: baseD, i }: { d: Object, i: number }) => {
    const { tooltipContent, size, useSpans } = this.props
    const { projectedNodes, projectedEdges, nodeIDAccessor } = this.state

    const d = baseD.ids
      ? baseD
      : baseD.edge
        ? {
            ...(projectedEdges.find(
              p =>
                nodeIDAccessor(p.source) === nodeIDAccessor(baseD.source) &&
                nodeIDAccessor(p.target) === nodeIDAccessor(baseD.target)
            ) || {}),
            ...baseD
          }
        : {
            ...(projectedNodes.find(p => nodeIDAccessor(p) === baseD.id) || {}),
            ...baseD
          }

    if (this.props.htmlAnnotationRules) {
      const customAnnotation = this.props.htmlAnnotationRules({
        d,
        i,
        networkFrameProps: this.props,
        networkFrameState: this.state,
        nodes: projectedNodes,
        edges: projectedEdges
      })
      if (customAnnotation !== null) {
        return customAnnotation
      }
    }
    if (d.type === "frame-hover") {
      return htmlFrameHoverRule({
        d,
        i,
        tooltipContent,
        size,
        useSpans,
        nodes: projectedNodes,
        edges: projectedEdges,
        nodeIDAccessor
      })
    }
    return null
  }

  render() {
    const {
      annotations,
      annotationSettings,
      className,
      customClickBehavior,
      customDoubleClickBehavior,
      customHoverBehavior,
      size,
      matte,
      hoverAnnotation,
      beforeElements,
      afterElements,
      interaction,
      disableContext,
      canvasPostProcess,
      baseMarkProps,
      useSpans,
      canvasNodes,
      canvasEdges,
      name,
      downloadFields,
      download,
      additionalDefs,
      renderOrder = this.state.graphSettings && this.state.graphSettings.type === "matrix" ? [ "nodes", "edges" ] : ["edges", "nodes"]
    } = this.props
    const {
      backgroundGraphics,
      foregroundGraphics,
      projectedXYPoints,
      margin,
      legendSettings,
      adjustedPosition,
      adjustedSize,
      networkFrameRender,
      nodeLabelAnnotations,
      overlay,
      projectedNodes,
      projectedEdges,
      title
    } = this.state

    const downloadButton = []

    if (download && projectedNodes.length > 0) {
      downloadButton.push(
        <DownloadButton
          key="network-download-nodes"
          csvName={`${name}-${new Date().toJSON()}`}
          width={size[0]}
          label={"Download Node List"}
          data={networkNodeDownloadMapping({
            data: projectedNodes,
            fields: downloadFields
          })}
        />
      )
    }
    if (download && projectedEdges.length > 0) {
      downloadButton.push(
        <DownloadButton
          key="network-download-edges"
          csvName={`${name}-${new Date().toJSON()}`}
          width={size[0]}
          label={"Download Edge List"}
          data={networkEdgeDownloadMapping({
            data: projectedEdges,
            fields: downloadFields
          })}
        />
      )
    }

    let formattedOverlay

    if (overlay && overlay.length > 0) {
      formattedOverlay = overlay
    }

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
        additionalDefs={additionalDefs}
        frameKey={"none"}
        projectedCoordinateNames={projectedCoordinateNames}
        defaultSVGRule={this.defaultNetworkSVGRule}
        defaultHTMLRule={this.defaultNetworkHTMLRule}
        hoverAnnotation={
          Array.isArray(hoverAnnotation) ? hoverAnnotation : !!hoverAnnotation
        }
        annotations={[...annotations, ...nodeLabelAnnotations]}
        annotationSettings={annotationSettings}
        legendSettings={legendSettings}
        interaction={interaction}
        customClickBehavior={customClickBehavior}
        customHoverBehavior={customHoverBehavior}
        customDoubleClickBehavior={customDoubleClickBehavior}
        points={projectedXYPoints}
        margin={margin}
        overlay={formattedOverlay}
        backgroundGraphics={backgroundGraphics}
        foregroundGraphics={foregroundGraphics}
        beforeElements={beforeElements}
        afterElements={afterElements}
        downloadButton={downloadButton}
        disableContext={disableContext}
        canvasPostProcess={canvasPostProcess}
        baseMarkProps={baseMarkProps}
        useSpans={!!useSpans}
        canvasRendering={!!(canvasNodes || canvasEdges)}
        renderOrder={renderOrder}
        disableCanvasInteraction={true}
      />
    )
  }
}

export default NetworkFrame
