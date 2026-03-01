import * as React from "react"

import { scaleLinear } from "d3-scale"

import { min, max } from "d3-array"

import {
  TitleType
} from "../svg/frameFunctions"

import { pointOnArcAtAngle } from "../svg/pieceDrawing"

import { NetworkPipelineCache } from "../data/networkPipelineCache"

import {
  drawNodes,
  drawEdges,
  softStack,
  areaLink,
  ribbonLink,
  circularAreaLink,
  radialLabelGenerator
} from "../svg/networkDrawing"

import { hierarchy } from "d3-hierarchy"

import {
  NetworkFrameProps,
  NetworkFrameState,
  NetworkSettingsType,
  NodeType
} from "../types/networkTypes"

import { NetworkLayoutMap } from "./layouts/types"

import { baseNodeProps, baseNetworkSettings, baseGraphSettings, emptyArray } from "./networkDefaults"
import { determineNodeIcon, determineEdgeIcon, basicMiddle, edgePointHash, hierarchicalProjectable, radialProjectable } from "./networkLayoutHelpers"
import { hierarchicalTypeHash } from "./layouts/hierarchyLayout"
import { recursiveIDAccessor, defaultHierarchicalIDAccessor, nodesEdgesFromHierarchy } from "./hierarchyUtils"

export { nodesEdgesFromHierarchy } from "./hierarchyUtils"

export const calculateNetworkFrame = (
  currentProps: NetworkFrameProps,
  prevState: NetworkFrameState,
  cache: NetworkPipelineCache,
  layoutMap?: NetworkLayoutMap
) => {
  const {
    graph,
    nodes = Array.isArray(graph) || typeof graph === "function"
      ? emptyArray
      : (graph && graph.nodes) || emptyArray,
    edges = typeof graph === "function"
      ? emptyArray
      : Array.isArray(graph)
      ? graph
      : (graph && graph.edges) || emptyArray,
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

  if (
    networkSettings.projection === "vertical" &&
    networkSettings.type === "sankey"
  ) {
    networkSettings.direction = "down"
  }

  networkSettingsKeys.push("height", "width")

  const title =
    typeof baseTitle === "object" &&
    !React.isValidElement(baseTitle) &&
    baseTitle !== null
      ? (baseTitle as TitleType)
      : ({ title: baseTitle, orient: "top" } as TitleType)

  const { margin, adjustedPosition, adjustedSize } = cache.marginCalc(baseMargin, title, size)

  networkSettings.graphSettings.nodes = nodes
  networkSettings.graphSettings.edges = edges
  networkSettings.graphSettings.filterRenderedNodes = filterRenderedNodes

  let { edgeHash, nodeHash } = networkSettings.graphSettings

  const createPointLayer =
    networkSettings.type === "treemap" ||
    networkSettings.type === "partition" ||
    networkSettings.type === "sankey"

  const cachedAccessors = cache.accessorConversions(
    currentProps.nodeIDAccessor,
    currentProps.sourceAccessor,
    currentProps.targetAccessor,
    currentProps.nodeSizeAccessor,
    currentProps.edgeWidthAccessor
  )

  const nodeIDAccessor = cachedAccessors.nodeIDAccessor
  const sourceAccessor = cachedAccessors.sourceAccessor
  const targetAccessor = cachedAccessors.targetAccessor
  const nodeSizeAccessor: (args?: Record<string, any>) => number = cachedAccessors.nodeSizeAccessor as (args?: Record<string, any>) => number
  const edgeWidthAccessor = cachedAccessors.edgeWidthAccessor
  const { nodeStyleFn, nodeClassFn, nodeRenderModeFn, nodeCanvasRenderFn } = cache.nodeStyleFns(
    nodeStyle, nodeClass, nodeRenderMode, canvasNodes
  )

  let { projectedNodes, projectedEdges } = prevState

  const isHierarchical =
    typeof networkSettings.type === "string" &&
    hierarchicalTypeHash[networkSettings.type]

  const changedData =
    !prevState.projectedNodes ||
    !prevState.projectedEdges ||
    prevState.graphSettings.nodes !== nodes ||
    prevState.graphSettings.edges !== edges ||
    isHierarchical ||
    prevState.graphSettings.filterRenderedNodes !== filterRenderedNodes

  if (networkSettings.type === "dagre") {
    const dagreGraph = graph as {
      nodes: Function
      edges: Function
      node: Function
      edge: Function
    }
    const dagreNodeMap = new Map()
    projectedNodes = dagreGraph.nodes().map((n) => {
      const baseNode = dagreGraph.node(n)
      const dagreNode = {
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
      dagreNodeMap.set(n, dagreNode)
      return dagreNode
    })
    projectedEdges = dagreGraph.edges().map((e) => {
      const dagreEdge = dagreGraph.edge(e)
      const baseEdge = {
        ...dagreEdge,
        points: dagreEdge.points.map((d) => ({ ...d }))
      }
      baseEdge.source = projectedNodes.find((p) => p.id === e.v)
      baseEdge.target = projectedNodes.find((p) => p.id === e.w)
      baseEdge.points.unshift({ x: baseEdge.source.x, y: baseEdge.source.y })
      baseEdge.points.push({ x: baseEdge.target.x, y: baseEdge.target.y })
      dagreNodeMap.get(e.v).targetLinks.push(baseEdge)
      dagreNodeMap.get(e.w).sourceLinks.push(baseEdge)
      return baseEdge
    })
  } else if (changedData) {
    const previousNodes = projectedNodes
    edgeHash = new Map()
    nodeHash = new Map()
    networkSettings.graphSettings.edgeHash = edgeHash
    networkSettings.graphSettings.nodeHash = nodeHash
    projectedNodes = []
    projectedEdges = []
    const fixFunction =
      typeof networkSettings.fixExistingNodes === "function"
        ? networkSettings.fixExistingNodes
        : networkSettings.fixExistingNodes
        ? () => true
        : false
    nodes.forEach((node) => {
      const projectedNode = { ...node }
      const id = nodeIDAccessor(projectedNode)
      const existingNode = previousNodes.find((prevNode) => prevNode.id === id)

      const equivalentOldNode = existingNode || { x: undefined, y: undefined }
      nodeHash.set(id, projectedNode)
      nodeHash.set(node, projectedNode)
      projectedNodes.push(projectedNode)
      projectedNode.id = id
      projectedNode.inDegree = 0
      projectedNode.outDegree = 0
      projectedNode.degree = 0
      projectedNode.x = equivalentOldNode.x
      projectedNode.y = equivalentOldNode.y
      if (existingNode && fixFunction && fixFunction(existingNode)) {
        projectedNode.fx = existingNode.x
        projectedNode.fy = existingNode.y
      }
    })

    let operationalEdges = edges
    let baseEdges = edges

    if (isHierarchical && Array.isArray(edges)) {
      const createdHierarchicalData = softStack(
        edges,
        nodes,
        sourceAccessor,
        targetAccessor,
        nodeIDAccessor
      )

      if (createdHierarchicalData.isHierarchical) {
        baseEdges = createdHierarchicalData.hierarchy
        projectedNodes = []
      } else {
        console.error(
          "You've sent an edge list that is not strictly hierarchical (there are nodes with multiple parents) defaulting to force-directed network layout"
        )
        networkSettings.type = "force"
      }
    }

    if (!Array.isArray(baseEdges)) {
      networkSettings.hierarchicalNetwork = true
      const rootNode = hierarchy(baseEdges, networkSettings.hierarchyChildren)

      rootNode.sum(networkSettings.hierarchySum || ((d) => d.value))

      if (isHierarchical) {
        const layout = networkSettings.layout || isHierarchical
        const hierarchicalLayout = layout()
        const networkSettingKeys = Object.keys(networkSettings)
        if (
          (networkSettings.type === "dendrogram" ||
            networkSettings.type === "tree" ||
            networkSettings.type === "cluster") &&
          hierarchicalLayout.separation
        ) {
          hierarchicalLayout.separation(
            (a, b) =>
              (nodeSizeAccessor({ ...a, ...a.data }) || 1) +
              (networkSettings.nodePadding || 0) +
              (nodeSizeAccessor({ ...b, ...b.data }) || 1)
          )
        }

        networkSettingKeys.forEach((key) => {
          if (hierarchicalLayout[key]) {
            hierarchicalLayout[key](networkSettings[key])
          }
        })
        const layoutSize =
          networkSettings.projection === "horizontal" && isHierarchical
            ? [adjustedSize[1], adjustedSize[0]]
            : adjustedSize
        if (!networkSettings.nodeSize && hierarchicalLayout.size) {
          hierarchicalLayout.size(layoutSize)
        }

        hierarchicalLayout(rootNode)
      }

      operationalEdges = nodesEdgesFromHierarchy(rootNode, nodeIDAccessor).edges
    }

    baseNodeProps.shapeNode = createPointLayer
    if (Array.isArray(operationalEdges)) {
      operationalEdges.forEach((edge) => {
        const source = sourceAccessor(edge)
        const target = targetAccessor(edge)
        const sourceTarget = [source, target]
        sourceTarget.forEach((nodeDirection) => {
          if (!nodeHash.get(nodeDirection)) {
            const nodeObject: NodeType =
              typeof nodeDirection === "object"
                ? {
                    ...baseNodeProps,
                    ...nodeDirection
                  }
                : {
                    ...baseNodeProps,
                    id: nodeDirection,
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

        const sourceNode = nodeHash.get(source)
        const targetNode = nodeHash.get(target)

        targetNode.inDegree += edgeWeight
        sourceNode.outDegree += edgeWeight
        targetNode.degree += edgeWeight
        sourceNode.degree += edgeWeight

        const edgeKey = `${nodeIDAccessor(sourceNode) || source}|${
          nodeIDAccessor(targetNode) || target
        }`
        const newEdge = Object.assign({}, edge, {
          source: nodeHash.get(source),
          target: nodeHash.get(target)
        })
        edgeHash.set(edgeKey, newEdge)
        projectedEdges.push(newEdge)
        if (networkSettings.type === "matrix") {
          projectedEdges.push({
            ...newEdge,
            source: newEdge.target,
            target: newEdge.source
          })
        }
      })
    }
  } else {
    edgeHash = new Map()
    networkSettings.graphSettings.edgeHash = edgeHash
    projectedEdges.forEach((edge) => {
      const edgeSource =
        typeof edge.source === "string"
          ? edge.source
          : nodeIDAccessor(edge.source)
      const edgeTarget =
        typeof edge.target === "string"
          ? edge.target
          : nodeIDAccessor(edge.target)

      const edgeKey = `${edgeSource}|${edgeTarget}`
      edgeHash.set(edgeKey, edge)
    })
  }

  const customNodeIcon = determineNodeIcon(
    baseCustomNodeIcon,
    networkSettings,
    adjustedSize,
    projectedNodes
  )

  const customEdgeIcon = determineEdgeIcon({
    baseCustomEdgeIcon,
    networkSettings,
    size: adjustedSize,
    nodes: projectedNodes,
    graph
  })

  networkSettings.width = size[0]
  networkSettings.height = size[1]

  let networkSettingsChanged = false

  networkSettingsKeys.forEach((key) => {
    if (
      key !== "edgeType" &&
      key !== "graphSettings" &&
      networkSettings[key] !== prevState.graphSettings[key]
    ) {
      networkSettingsChanged = true
    }
  })

  //Support bubble chart with circle pack and with force
  if (networkSettings.type === "sankey") {
    edgeType = (d) =>
      d.circular
        ? circularAreaLink(d)
        : edgeType === "angled"
        ? ribbonLink(d)
        : areaLink(d)
  } else if (isHierarchical) {
    projectedNodes.forEach((node) => {
      if (createPointLayer) {
        node.x = (node.x0 + node.x1) / 2
        node.y = (node.y0 + node.y1) / 2
      }
      if (
        typeof networkSettings.type === "string" &&
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
        typeof networkSettings.type === "string" &&
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

    const layoutType = typeof networkSettings.type === "string" ? networkSettings.type : "custom"
    const handler = layoutMap?.[layoutType]

    if (handler) {
      const result = handler({
        projectedNodes,
        projectedEdges,
        networkSettings,
        adjustedSize,
        edgeHash,
        nodeIDAccessor,
        edgeWidthAccessor,
        nodeSizeAccessor,
        size
      })
      projectedNodes = result.projectedNodes
      projectedEdges = result.projectedEdges
      if (result.components) components = result.components
    } else if (typeof networkSettings.type === "function") {
      networkSettings.type({
        nodes: projectedNodes,
        edges: projectedEdges
      })
    } else {
      projectedNodes.forEach((node) => {
        node.x = node.x === undefined ? (node.x0 + node.x1) / 2 : node.x
        node.y = node.y === undefined ? node.y0 : node.y
      })
    }

    prevState.graphSettings.nodes = currentProps.nodes
    prevState.graphSettings.edges = currentProps.edges
  }

  //filter out user-defined nodes
  projectedNodes = projectedNodes.filter(filterRenderedNodes)

  projectedEdges = projectedEdges.filter(
    (d) =>
      projectedNodes.indexOf(d.target) !== -1 &&
      projectedNodes.indexOf(d.source) !== -1
  )

  if (networkSettings.direction === "flip") {
    projectedNodes.forEach((node) => {
      // const ox = node.x
      // const oy = node.y
      node.x = adjustedSize[0] - node.x
      node.y = adjustedSize[1] - node.y
    })
  } else if (
    networkSettings.direction === "up" ||
    networkSettings.direction === "down"
  ) {
    const mod =
      networkSettings.direction === "up"
        ? (value) => adjustedSize[1] - value
        : (value) => value
    projectedNodes.forEach((node) => {
      const ox = node.x
      const ox0 = node.x0
      const ox1 = node.x1
      node.x = mod(node.y)
      node.x0 = mod(node.y0)
      node.x1 = mod(node.y1)
      node.y = ox
      node.y0 = ox0
      node.y1 = ox1
    })
  } else if (networkSettings.direction === "left") {
    projectedNodes.forEach((node) => {
      node.x = adjustedSize[0] - node.x
      node.x0 = adjustedSize[0] - node.x0
      node.x1 = adjustedSize[0] - node.x1
    })
  }

  if (typeof networkSettings.zoom === "function") {
    networkSettings.zoom(projectedNodes, projectedEdges, adjustedSize)
  } else if (
    networkSettings.zoom !== false &&
    networkSettings.type !== "matrix" &&
    networkSettings.type !== "chord" &&
    networkSettings.type !== "sankey" &&
    networkSettings.type !== "partition" &&
    networkSettings.type !== "treemap" &&
    networkSettings.type !== "circlepack" &&
    networkSettings.type !== "dagre"
  ) {
    // ZOOM SHOULD MAINTAIN ASPECT RATIO, ADD "stretch" to fill whole area
    const xMin = min(projectedNodes.map((p) => p.x - nodeSizeAccessor(p)))
    const xMax = max(projectedNodes.map((p) => p.x + nodeSizeAccessor(p)))
    const yMin = min(projectedNodes.map((p) => p.y - nodeSizeAccessor(p)))
    const yMax = max(projectedNodes.map((p) => p.y + nodeSizeAccessor(p)))

    const xSize = Math.abs(xMax - xMin)
    const ySize = Math.abs(yMax - yMin)

    const networkAspectRatio = xSize / ySize
    const baseAspectRatio = adjustedSize[0] / adjustedSize[1]

    let yMod, xMod

    if (networkSettings.zoom === "stretch") {
      yMod = 0
      xMod = 0
    } else if (xSize > ySize) {
      if (networkAspectRatio > baseAspectRatio) {
        xMod = 0
        yMod = (adjustedSize[1] - (adjustedSize[0] / xSize) * ySize) / 2
      } else {
        yMod = 0
        xMod = (adjustedSize[0] - (adjustedSize[1] / ySize) * xSize) / 2
      }
    } else {
      if (networkAspectRatio > baseAspectRatio) {
        xMod = 0
        yMod = (adjustedSize[1] - (adjustedSize[0] / xSize) * ySize) / 2
      } else {
        yMod = 0
        xMod = (adjustedSize[0] - (adjustedSize[1] / ySize) * xSize) / 2
      }
    }

    const projectionScaleX = scaleLinear()
      .domain([xMin, xMax])
      .range([xMod, adjustedSize[0] - xMod])
    const projectionScaleY = scaleLinear()
      .domain([yMin, yMax])
      .range([yMod, adjustedSize[1] - yMod])
    projectedNodes.forEach((node) => {
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
    const xMin = min(projectedNodes.map((p) => p.x0))
    const xMax = max(projectedNodes.map((p) => p.x1))
    const yMin = min(projectedNodes.map((p) => p.y0))
    const yMax = max(projectedNodes.map((p) => p.y1))

    const projectionScaleX = scaleLinear()
      .domain([xMin, xMax])
      .range([margin.left, adjustedSize[0] - margin.right])
    const projectionScaleY = scaleLinear()
      .domain([yMin, yMax])
      .range([margin.top, adjustedSize[1] - margin.bottom])
    projectedNodes.forEach((node) => {
      node.x = projectionScaleX(node.x)
      node.y = projectionScaleY(node.y)
      node.x0 = projectionScaleX(node.x0)
      node.y0 = projectionScaleY(node.y0)
      node.x1 = projectionScaleX(node.x1)
      node.y1 = projectionScaleY(node.y1)
      node.zoomedHeight = node.y1 - node.y0
      node.zoomedWidth = node.x1 - node.x0
    })

    projectedEdges.forEach((edge) => {
      if (edge.points) {
        edge.points.forEach((p) => {
          p.x = projectionScaleX(p.x)
          p.y = projectionScaleY(p.y)
        })
      }
    })
  } else if (
    networkSettings.zoom !== false &&
    networkSettings.type === "sankey" &&
    projectedEdges.some((e) => e.circular)
  ) {
    const circularLinks = projectedEdges.filter((e) => e.circular)
    const xMinEdge =
      min(
        circularLinks,
        (e) => e.circularPathData.rightFullExtent - e.sankeyWidth / 2
      ) || Infinity
    const xMaxEdge =
      max(
        circularLinks,
        (e) => e.circularPathData.leftFullExtent + e.sankeyWidth / 2
      ) || -Infinity
    const yMinEdge =
      min(
        circularLinks,
        (e) => e.circularPathData.verticalFullExtent - e.sankeyWidth / 2
      ) || Infinity
    const yMaxEdge =
      max(
        circularLinks,
        (e) => e.circularPathData.verticalFullExtent + e.sankeyWidth / 2
      ) || -Infinity

    const yMinNode = min(projectedNodes, (node) => node.y0)
    const yMaxNode = max(projectedNodes, (node) => node.y1)
    const xMinNode = min(projectedNodes, (node) => node.x0)
    const xMaxNode = max(projectedNodes, (node) => node.x1)

    const sankeyMinX = Math.min(xMinEdge, xMinNode)
    const sankeyMaxX = Math.max(xMaxEdge, xMaxNode)
    const sankeyMinY = Math.min(yMinEdge, yMinNode)
    const sankeyMaxY = Math.max(yMaxEdge, yMaxNode)

    const projectionScaleX = scaleLinear()
      .domain([sankeyMinX, sankeyMaxX])
      .range([0, adjustedSize[0]])
    const projectionScaleY = scaleLinear()
      .domain([sankeyMinY, sankeyMaxY])
      .range([0, adjustedSize[1]])

    const widthFactor = adjustedSize[1] / (sankeyMaxY - sankeyMinY)

    for (const node of projectedNodes) {
      node.x = projectionScaleX(node.x)
      node.x0 = projectionScaleX(node.x0)
      node.x1 = projectionScaleX(node.x1)
      node.y = projectionScaleY(node.y)
      node.y0 = projectionScaleY(node.y0)
      node.y1 = projectionScaleY(node.y1)
      node.width = node.x1 - node.x0
      node.height = node.y1 - node.y0
    }

    for (const edge of projectedEdges) {
      if (edge.circular) {
        edge.circularPathData.sourceX = projectionScaleX(
          edge.circularPathData.sourceX
        )
        edge.circularPathData.sourceY = projectionScaleY(
          edge.circularPathData.sourceY
        )
        edge.circularPathData.leftFullExtent = projectionScaleX(
          edge.circularPathData.leftFullExtent
        )
        edge.circularPathData.verticalFullExtent = projectionScaleY(
          edge.circularPathData.verticalFullExtent
        )
        edge.circularPathData.rightFullExtent = projectionScaleX(
          edge.circularPathData.rightFullExtent
        )
        edge.circularPathData.targetX = projectionScaleX(
          edge.circularPathData.targetX
        )
        edge.circularPathData.targetY = projectionScaleY(
          edge.circularPathData.targetY
        )
      } else {
        edge.y0 = projectionScaleY(edge.y0)
        edge.y1 = projectionScaleY(edge.y1)
      }
      edge.sankeyWidth = edge.sankeyWidth * widthFactor
    }
  }

  projectedNodes.forEach((node) => {
    node.nodeSize = nodeSizeAccessor(node)
  })

  projectedEdges.forEach((edge) => {
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

  const cachedEdgeStyles = cache.edgeStyleFns(edgeStyle, edgeClass, edgeRenderMode, canvasEdges)

  const networkFrameRender = {
    edges: {
      accessibleTransform: (data, i) => {
        const edgeX = (data[i].source.x + data[i].target.x) / 2
        const edgeY = (data[i].source.y + data[i].target.y) / 2
        return { type: "frame-hover", ...data[i], x: edgeX, y: edgeY }
      },
      data: projectedEdges,
      styleFn: cachedEdgeStyles.edgeStyleFn,
      classFn: cachedEdgeStyles.edgeClassFn,
      renderMode: cachedEdgeStyles.edgeRenderModeFn,
      canvasRenderFn: cachedEdgeStyles.edgeCanvasRenderFn,
      renderKeyFn: currentProps.edgeRenderKey
        ? currentProps.edgeRenderKey
        : (d) => d._NWFEdgeKey || d.key || `${d.source.id}-${d.target.id}`,
      behavior: drawEdges,
      projection: networkSettings.projection,
      type: edgeType,
      customMark: customEdgeIcon,
      networkSettings,
      numberOfNodes: projectedNodes.length,
      size: adjustedSize
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
      renderKeyFn: currentProps.nodeRenderKey,
      networkSettings
    }
  }

  const nodeLabelAnnotations = []
  if (currentProps.nodeLabels && projectedNodes) {
    projectedNodes.forEach((node, nodei) => {
      const feasibleLabel =
        nodeLabels && nodeLabels !== true && nodeLabels(node)

      if (nodeLabels === true || feasibleLabel) {
        const actualLabel =
          networkSettings.projection === "radial" && node.depth !== 0
            ? radialLabelGenerator(
                node,
                nodei,
                nodeLabels === true ? nodeIDAccessor : nodeLabels,
                adjustedSize
              )
            : nodeLabels === true
            ? nodeIDAccessor(node, nodei)
            : feasibleLabel

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
            color: "currentColor",
            note: { label: actualLabel },
            connector: { end: "none" },
            type: "label",
            subject: { radius: nodeSizeAccessor(node) + 2 }
          }
        }

        nodeLabelAnnotations.push(nodeLabel)
      }
    })
  }

  let projectedXYPoints
  const overlay = []
  const areaBasedTypes = [
    "circlepack",
    "treemap",
    "partition",
    "chord"
    //    "matrix"
  ]
  if (
    (hoverAnnotation &&
      areaBasedTypes.find((d) => d === networkSettings.type)) ||
    hoverAnnotation === "area"
  ) {
    if (hoverAnnotation !== "edge") {
      const renderedNodeOverlays = projectedNodes.map((d, i) => ({
        overlayData: d,
        ...customNodeIcon({
          d,
          i,
          transform: `translate(${d.x},${d.y})`,
          styleFn: () => ({ opacity: 0 })
        }).props
      }))

      overlay.push(...renderedNodeOverlays)
    }
    if (hoverAnnotation !== "node") {
      projectedEdges.forEach((d, i) => {
        const generatedIcon = customEdgeIcon({
          d,
          i,
          transform: `translate(${d.x},${d.y})`,
          styleFn: () => ({ opacity: 0 })
        })
        if (generatedIcon) {
          overlay.push({
            overlayData: {
              ...d,
              x: d.x === undefined ? (d.source.x + d.target.x) / 2 : d.x,
              y: d.y === undefined ? (d.source.y + d.target.y) / 2 : d.y,
              edge: true
            },
            ...generatedIcon.props
          })
        }
      })
    }
  } else if (
    hoverAnnotation === "edge" &&
    typeof networkSettings.type === "string" &&
    edgePointHash[networkSettings.type]
  ) {
    projectedXYPoints = projectedEdges.map(edgePointHash[networkSettings.type])
  } else if (
    Array.isArray(hoverAnnotation) ||
    hoverAnnotation === true ||
    hoverAnnotation === "node"
  ) {
    projectedXYPoints = projectedNodes
    if (changedData || networkSettingsChanged)
      projectedXYPoints = [...projectedNodes]
  } else if (
    hoverAnnotation === "all" &&
    typeof networkSettings.type === "string"
  ) {
    projectedXYPoints = [
      ...projectedEdges.map(edgePointHash[networkSettings.type]),
      ...projectedNodes
    ]
  }

  return {
    adjustedPosition: adjustedPosition,
    adjustedSize: adjustedSize,
    backgroundGraphics: currentProps.backgroundGraphics,
    foregroundGraphics: currentProps.foregroundGraphics,
    title,
    renderNumber: prevState.renderNumber + 1,
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
    },
    props: currentProps
  }
}
