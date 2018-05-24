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

import { filterDefs } from "./constants/jsx"

import AnnotationLabel from "react-annotation/lib/Types/AnnotationLabel"

import Frame from "./Frame"

import DownloadButton from "./DownloadButton"

import { calculateMargin, adjustedPositionSize } from "./svg/frameFunctions"
import { pointOnArcAtAngle } from "./svg/pieceDrawing"

import {
  drawNodes,
  drawEdges,
  topologicalSort,
  hierarchicalRectNodeGenerator,
  radialRectNodeGenerator,
  chordNodeGenerator,
  chordEdgeGenerator,
  sankeyNodeGenerator,
  wordcloudNodeGenerator,
  circleNodeGenerator,
  areaLink,
  ribbonLink,
  circularAreaLink
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

import { networkFrameChangeProps, xyframeproptypes, ordinalframeproptypes, networkframeproptypes } from "./constants/frame_props"

import {
  htmlFrameHoverRule,
  svgNodeRule,
  svgReactAnnotationRule,
  svgEncloseRule,
  svgRectEncloseRule
} from "./annotationRules/networkframeRules"

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

const hierarchicalCustomNodeHash = {
  partition: hierarchicalRectNodeGenerator,
  treemap: hierarchicalRectNodeGenerator,
  circlepack: circleNodeGenerator
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
      } else if (hashNode.component === null) {
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

class NetworkFrame extends React.Component {
  static defaultProps = {
    annotations: [],
    foregroundGraphics: [],
    annotationSettings: {},
    size: [500, 500],
    className: "",
    name: "networkframe",
    networkType: { type: "force", iterations: 500 }
  }

  constructor(props) {
    super(props)

    this.calculateNetworkFrame = this.calculateNetworkFrame.bind(this)
    this.defaultNetworkHTMLRule = this.defaultNetworkHTMLRule.bind(this)
    this.defaultNetworkSVGRule = this.defaultNetworkSVGRule.bind(this)

    this.graphSettings = {
      numberOfNodes: 0,
      numberOfEdges: 0,
      type: "empty-start"
    }
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
    }

    this.oAccessor = null
    this.rAccessor = null
    this.oScale = null
    this.rScale = null
  }

  componentWillMount() {
    Object.keys(this.props).forEach(d => {
      if (!networkframeproptypes[d]) {
        if (xyframeproptypes[d]) {
          console.error(`${d} is an XYFrame prop are you sure you're using the right frame?`)
        }
        else if (ordinalframeproptypes[d]) {
          console.error(`${d} is an OrdinalFrame prop are you sure you're using the right frame?`)
        }
        else {
          console.error(`${d} is not a valid NetworkFrame prop`)}
        }
    })
    this.calculateNetworkFrame(this.props)
  }

  componentWillReceiveProps(nextProps) {
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

  onNodeClick(d, i) {
    if (this.props.onNodeClick) {
      this.props.onNodeClick(d, i)
    }
  }

  onNodeEnter(d, i) {
    if (this.props.onNodeEnter) {
      this.props.onNodeEnter(d, i)
    }
  }

  onNodeOut(d, i) {
    if (this.props.onNodeOut) {
      this.props.onNodeOut(d, i)
    }
  }

  calculateNetworkFrame(currentProps) {
    const {
      graph,
      nodes = (graph && graph.nodes) || [],
      edges = (graph && graph.edges) || graph || [],
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
      title
      /*, customHoverBehavior, customClickBehavior, renderFn, nodeClass = (() => ''), edgeClass = (() => '')*/
    } = currentProps
    //    const eventListenersGenerator = generatenetworkFrameEventListeners(customHoverBehavior, customClickBehavior)

    let { edgeType, customNodeIcon, customEdgeIcon } = currentProps

    const { hoverAnnotation } = currentProps

    let networkSettings

    const nodeHierarchicalIDFill = {}

    if (typeof networkType === "string") {
      networkSettings = { type: networkType, iterations: 500 }
    } else {
      networkSettings = networkType
    }

    const nodeIDAccessor = stringToFn(currentProps.nodeIDAccessor, d => d.id)
    const sourceAccessor = stringToFn(
      currentProps.sourceAccessor,
      d => d.source
    )
    const targetAccessor = stringToFn(
      currentProps.targetAccessor,
      d => d.target
    )
    const nodeSizeAccessor =
      typeof currentProps.nodeSizeAccessor === "number"
        ? () => currentProps.nodeSizeAccessor
        : stringToFn(currentProps.nodeSizeAccessor, d => d.r || 5)
    const edgeWidthAccessor = stringToFn(
      currentProps.edgeWidthAccessor,
      d => d.weight || 1
    )
    const nodeStyleFn = stringToFn(nodeStyle, () => ({}), true)
    const nodeClassFn = stringToFn(nodeClass, () => "", true)
    const nodeRenderModeFn = stringToFn(nodeRenderMode, undefined, true)
    const nodeCanvasRenderFn = stringToFn(canvasNodes, undefined, true)

    const margin = calculateMargin(currentProps)
    const { adjustedPosition, adjustedSize } = adjustedPositionSize(
      currentProps
    )

    let { projectedNodes, projectedEdges } = this.state

    const changedData =
      !this.state.projectedNodes ||
      !this.state.projectedEdges ||
      this.graphSettings.nodes !== currentProps.nodes ||
      this.graphSettings.edges !== currentProps.edges ||
      hierarchicalTypeHash[networkSettings.type]

    if (changedData) {
      this.edgeHash = new Map()
      this.nodeHash = new Map()
      projectedNodes = []
      projectedEdges = []
      nodes.forEach(node => {
        const id = nodeIDAccessor(node)
        this.nodeHash.set(id, node)
        this.nodeHash.set(node, node)
        projectedNodes.push(node)
        node.id = id
        node.inDegree = 0
        node.outDegree = 0
        node.degree = 0
      })

      let operationalEdges = edges

      if (!Array.isArray(edges)) {
        this.hierarchicalNetwork = true
        const rootNode = hierarchy(edges, networkSettings.hierarchyChildren)

        rootNode.sum(networkSettings.hierarchySum || (d => d.value))

        if (hierarchicalTypeHash[networkSettings.type]) {
          const layout =
            networkSettings.layout || hierarchicalTypeHash[networkSettings.type]
          const hierarchicalLayout = layout()
          const networkSettingKeys = Object.keys(networkSettings)

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
      operationalEdges.forEach(edge => {
        const source = sourceAccessor(edge)
        const target = targetAccessor(edge)
        const sourceTarget = [source, target]
        sourceTarget.forEach(nodeDirection => {
          if (!this.nodeHash.get(nodeDirection)) {
            const nodeObject =
              typeof nodeDirection === "object"
                ? Object.assign(nodeDirection, {
                    degree: 0,
                    inDegree: 0,
                    outDegree: 0
                  })
                : {
                    id: nodeDirection,
                    inDegree: 0,
                    outDegree: 0,
                    degree: 0,
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

            this.nodeHash.set(nodeDirection, nodeObject)
            projectedNodes.push(nodeObject)
          }
        })

        const edgeWeight = edge.weight || 1
        this.nodeHash.get(target).inDegree += edgeWeight
        this.nodeHash.get(source).outDegree += edgeWeight
        this.nodeHash.get(target).degree += edgeWeight
        this.nodeHash.get(source).degree += edgeWeight

        const edgeKey = `${nodeIDAccessor(source) || source}|${nodeIDAccessor(
          target
        ) || target}`
        const newEdge = Object.assign({}, edge, {
          source: this.nodeHash.get(source),
          target: this.nodeHash.get(target)
        })
        this.edgeHash.set(edgeKey, newEdge)
        projectedEdges.push(newEdge)
      })
    } else {
      this.edgeHash = new Map()
      projectedEdges.forEach(edge => {
        const edgeKey = `${nodeIDAccessor(edge.source) ||
          edge.source}|${nodeIDAccessor(edge.target) || edge.target}`
        this.edgeHash.set(edgeKey, edge)
      })
    }

    if (
      (networkSettings.type === "sankey" ||
        networkSettings.type === "flowchart") &&
      topologicalSort(projectedNodes, projectedEdges) === null
    ) {
      networkSettings.customSankey = sankeyCircular
    }
    networkSettings.width = size[0]
    networkSettings.height = size[1]

    const networkSettingsKeys = Object.keys(networkSettings)
    let networkSettingsChanged = false

    networkSettingsKeys.forEach(key => {
      if (
        key !== "edgeType" &&
        networkSettings[key] !== this.graphSettings[key]
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

      customNodeIcon = customNodeIcon ? customNodeIcon : sankeyNodeGenerator
    } else if (networkSettings.type === "chord") {
      customNodeIcon = chordNodeGenerator(size)
      customEdgeIcon = chordEdgeGenerator(size)
    } else if (networkSettings.type === "wordcloud") {
      customNodeIcon = customNodeIcon ? customNodeIcon : wordcloudNodeGenerator
    } else if (hierarchicalTypeHash[networkSettings.type]) {
      if (hierarchicalCustomNodeHash[networkSettings.type]) {
        customNodeIcon = hierarchicalCustomNodeHash[networkSettings.type]
        customEdgeIcon = () => null
      }
      const radialSize = adjustedSize
      const radialCenter = [radialSize[0] / 2, radialSize[1] / 2]
      if (
        (networkSettings.type === "partition" ||
          networkSettings.type === "treemap") &&
        networkSettings.projection === "radial"
      ) {
        customNodeIcon = radialRectNodeGenerator(radialSize, radialCenter)
      }

      projectedNodes.forEach(node => {
        if (node.x0 !== undefined) {
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

          if (node.x0 !== undefined) {
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
          const radialPoint = pointOnArcAtAngle(
            radialCenter,
            node.x / radialSize[0],
            node.y / 2
          )
          node.x = radialPoint[0]
          node.y = radialPoint[1]
        } else {
          node.x = node.x
          node.y = node.y
          if (node.x0 !== undefined) {
            node.x0 = node.x0
            node.x1 = node.x1
            node.y0 = node.y0
            node.y1 = node.y1
          }
        }
      })
    }

    if (changedData || networkSettingsChanged) {
      let components = [
        {
          componentNodes: projectedNodes,
          componentEdges: projectedEdges
        }
      ]

      if (networkSettings.type === "chord") {
        const radius = size[1] / 2
        const { groupWidth = 20, padAngle = 0.01 } = networkSettings
        const arcGenerator = arc()
          .innerRadius(radius - groupWidth)
          .outerRadius(radius)

        const ribbonGenerator = ribbon().radius(radius - groupWidth)

        const matrixifiedNetwork = matrixify({
          edgeHash: this.edgeHash,
          nodes: projectedNodes,
          edges: projectedEdges,
          edgeWidthAccessor,
          nodeIDAccessor
        })

        const chordLayout = chord().padAngle(padAngle)

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
          const chordEdge = this.edgeHash.get(`${nodeSourceID}|${nodeTargetID}`)
          chordEdge.d = chordD
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

        //Temporary fix for when sankey-circular sets the size incorrectly
        const initialSettings = actualSankey()
          .extent(frameExtent)
          .links(projectedEdges)
          .nodes(projectedNodes)
          .nodeAlign(sankeyOrient)
          .nodeId(nodeIDAccessor)
          .nodePadding(nodePadding)
          .nodeWidth(nodeWidth)
          .iterations(1)

        if (nodePaddingRatio) {
          initialSettings.nodePaddingRatio(nodePaddingRatio)
        }

        initialSettings()

        const circularEdges = projectedEdges.filter(d => d.circular === true)

        if (circularEdges.length === 0) {
          frameExtent = [
            [0, -frameExtent[1][1]],
            [frameExtent[1][0], frameExtent[1][1]]
          ]
        } else if (!circularEdges.find(d => d.circularLinkType === "top")) {
          const bottomEdges = circularEdges.filter(
            d => d.circularLinkType === "bottom"
          )

          const offset = bottomEdges
            .map(d => d.circularPathData.leftLargeArcRadius)
            .reduce((p, c) => p + c)
          frameExtent = [
            [0, -frameExtent[1][1]],
            [frameExtent[1][0], frameExtent[1][1] - offset]
          ]
        }
        //End temporary

        const frameSankey = actualSankey()
          .extent(frameExtent)
          .links(projectedEdges)
          .nodes(projectedNodes)
          .nodeAlign(sankeyOrient)
          .nodeId(nodeIDAccessor)
          .nodePadding(nodePadding)
          .nodeWidth(nodeWidth)
          .iterations(iterations)
        if (nodePaddingRatio) {
          frameSankey.nodePaddingRatio(nodePaddingRatio)
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
        const fontWidth = fontSize / 1.5 * fontWeightMod

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
            node.textHeight / 4 * yMod,
            node.textWidth / 4 * xMod
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

        const linkForce = forceLink().strength(
          d => (d.weight ? d.weight * edgeStrength : edgeStrength)
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
                component: null,
                connectedNodes: [],
                edges: []
              })
            }
          })
          componentHash.get(edge.source).connectedNodes.push(edge.target)
          componentHash.get(edge.target).connectedNodes.push(edge.source)
          componentHash.get(edge.source).edges.push(edge)
        })

        components = breadthFirstCompontents(projectedNodes, componentHash)

        const largestComponent = Math.max(
          projectedNodes.length / 3,
          components[0].componentNodes.length
        )

        const layoutSize = size[0] > size[1] ? size[1] : size[0]
        const layoutDirection = size[0] > size[1] ? "horizontal" : "vertical"

        //        louvain.assign(graph)
        const {
          iterations = 500,
          edgeStrength = 0.1,
          edgeDistance
        } = networkSettings

        let currentX = 0
        let currentY = 0

        components.forEach(({ componentNodes, componentEdges }) => {
          const linkForce = forceLink().strength(
            d => (d.weight ? d.weight * edgeStrength : edgeStrength)
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

      this.graphSettings = networkSettings
      this.graphSettings.nodes = currentProps.nodes
      this.graphSettings.edges = currentProps.edges
    }

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
      networkSettings.type !== "wordcloud" &&
      networkSettings.type !== "chord" &&
      networkSettings.type !== "sankey" &&
      (hierarchicalTypeHash[networkSettings.type] === undefined ||
        networkSettings.nodeSize)
    ) {
      const xMin = min(projectedNodes.map(p => p.x - nodeSizeAccessor(p)))
      const xMax = max(projectedNodes.map(p => p.x + nodeSizeAccessor(p)))
      const yMin = min(projectedNodes.map(p => p.y - nodeSizeAccessor(p)))
      const yMax = max(projectedNodes.map(p => p.y + nodeSizeAccessor(p)))

      const projectionScaleX = scaleLinear()
        .domain([xMin, xMax])
        .range([0, adjustedSize[0]])
      const projectionScaleY = scaleLinear()
        .domain([yMin, yMax])
        .range([0, adjustedSize[1]])
      projectedNodes.forEach(node => {
        node.x = projectionScaleX(node.x)
        node.y = projectionScaleY(node.y)
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
      legendSettings = currentProps.legend === true ? {} : currentProps.legend
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

    customNodeIcon = customNodeIcon || circleNodeGenerator 

    const networkFrameRender = {
      edges: {
        accessibleTransform: (data, i) => ({ type: "frame-hover", ...data[i] }),
        data: projectedEdges,
        styleFn: stringToFn(edgeStyle, () => ({}), true),
        classFn: stringToFn(edgeClass, () => "", true),
        renderMode: stringToFn(edgeRenderMode, undefined, true),
        canvasRenderFn: stringToFn(canvasEdges, undefined, true),
        renderKeyFn: currentProps.edgeRenderKey
          ? currentProps.edgeRenderKey
          : d => d._NWFEdgeKey || `${d.source.id}-${d.target.id}`,
        behavior: drawEdges,
        type: edgeType,
        customMark: customEdgeIcon,
        networkType: networkSettings.type,
        direction: networkSettings.direction
      },
      nodes: {
        accessibleTransform: (data, i) => ({ type: "frame-hover", ...data[i] }),
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
    if (this.props.nodeLabels && projectedNodes) {
      projectedNodes.forEach((node, nodei) => {
        if (nodeLabels === true || (nodeLabels && nodeLabels(node, nodei))) {
          const actualLabel =
            nodeLabels === true
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
    const areaBasedTypes = [ "circlepack", "treemap", "partition" ]
    if ((hoverAnnotation && areaBasedTypes.find(d => d === networkType.type)) || hoverAnnotation === "area" ) {
      const renderedNodeOverlays = projectedNodes
        .map((d,i) => ({ 
          overlayData: d,
          ...customNodeIcon({ d, i, transform: `translate(${d.x},${d.y})`, styleFn: () => ({ fill: "pink", stroke: "pink", opacity: 0 }) }).props
      }))
      
      overlay.push(...renderedNodeOverlays)
    }
    else if (hoverAnnotation === "edge" && edgePointHash[networkSettings.type]) {
      projectedXYPoints = projectedEdges.map(
        edgePointHash[networkSettings.type]
      )
    } else if (hoverAnnotation === true || hoverAnnotation === "node") {
      projectedXYPoints = projectedNodes
    } else if (hoverAnnotation === "all") {
      projectedXYPoints = [
        ...projectedEdges.map(edgePointHash[networkSettings.type]),
        ...projectedNodes
      ]
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
      nodeLabelAnnotations
    })
  }

  defaultNetworkSVGRule({ d, i }) {
    const {
      projectedNodes /*, projectedEdges*/,
      nodeIDAccessor,
      nodeSizeAccessor
    } = this.state
    const { svgAnnotationRules } = this.props

    if (svgAnnotationRules) {
      const customAnnotation = svgAnnotationRules({
        d,
        i,
        networkFrameProps: this.props,
        networkFrameState: this.state,
        nodes: this.state.projectedNodes,
        edges: this.state.projectedEdges
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
    } else if (d.type === "basic-node-label") {
      return <g transform={`translate(${d.x},${d.y})`}>{d.element}</g>
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
    }
    return null
  }

  defaultNetworkHTMLRule({ d, i }) {
    const { tooltipContent, size, useSpans } = this.props
    if (this.props.htmlAnnotationRules) {
      const customAnnotation = this.props.htmlAnnotationRules({
        d,
        i,
        networkFrameProps: this.props,
        networkFrameState: this.state,
        nodes: this.state.projectedNodes,
        edges: this.state.projectedEdges
      })
      if (customAnnotation !== null) {
        return customAnnotation
      }
    }
    if (d.type === "frame-hover") {
      return htmlFrameHoverRule({ d, i, tooltipContent, size, useSpans })
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
      renderKey,
      hoverAnnotation,
      beforeElements,
      afterElements,
      interaction,
      title,
      disableContext,
      canvasPostProcess,
      baseMarkProps,
      useSpans,
      canvasNodes,
      canvasEdges
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
      overlay
    } = this.state

    const downloadButton = []

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
      )
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
      )
    }

    const finalFilterDefs = filterDefs({
      key: "networkFrame",
      additionalDefs: this.props.additionalDefs
    })

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
        hoverAnnotation={!!hoverAnnotation}
        annotations={[...annotations, ...nodeLabelAnnotations]}
        annotationSettings={annotationSettings}
        legendSettings={legendSettings}
        interaction={interaction}
        customClickBehavior={customClickBehavior}
        customHoverBehavior={customHoverBehavior}
        customDoubleClickBehavior={customDoubleClickBehavior}
        points={projectedXYPoints}
        margin={margin}
        overlay={overlay}
        backgroundGraphics={backgroundGraphics}
        foregroundGraphics={foregroundGraphics}
        beforeElements={beforeElements}
        afterElements={afterElements}
        downloadButton={downloadButton}
        disableContext={disableContext}
        canvasPostProcess={canvasPostProcess}
        baseMarkProps={baseMarkProps}
        useSpans={useSpans}
        canvasRendering={canvasNodes || canvasEdges}
      />
    )
  }
}

NetworkFrame.propTypes = {
  ...networkframeproptypes
}

export default NetworkFrame
