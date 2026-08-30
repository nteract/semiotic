import * as React from "react"
import type { NetworkCustomLayout } from "../stream/networkCustomLayout"
import type {
  NetworkCurvedEdge,
  NetworkLabel,
  NetworkRectNode
} from "../stream/networkTypes"
import {
  adjacencyFlowAggregateEdges,
  allocateAdjacencyFlowPorts,
  allocateAdjacencyFlowWidths,
  arrowPath,
  rawDatum,
  roundedOrthogonalPath,
  truncateLabel,
  type AdjacencyFlowConfig,
  type PlacedNode
} from "./adjacencyFlowGeometry"
import { readField } from "./recipeUtils"

export type { AdjacencyFlowConfig } from "./adjacencyFlowGeometry"

/**
 * Adjacency-flow ("Sankey Matrix") layout: ordered nodes sit on the diagonal,
 * forward routes occupy the upper-right cells, reverse routes the lower-left,
 * and weighted orthogonal links expose both adjacency and aggregate flow.
 *
 * Parallel edges are summed per matrix cell. Pair with
 * `aggregateAdjacencyFlow` for collapsible group summaries.
 */
export const adjacencyFlowLayout: NetworkCustomLayout<AdjacencyFlowConfig> = (
  ctx
) => {
  const config = ctx.config ?? {}
  const plot = ctx.dimensions.plot
  const inputNodes = ctx.nodes.map((wrapper, inputIndex) => ({
    id: wrapper.id,
    datum: rawDatum(wrapper),
    inputIndex
  }))
  const inputIndexById = new Map(
    inputNodes.map((node) => [node.id, node.inputIndex])
  )
  const explicitOrder = new Map(
    (config.order ?? []).map((id, index) => [String(id), index])
  )
  inputNodes.sort((a, b) => {
    const aOrder = explicitOrder.get(a.id)
    const bOrder = explicitOrder.get(b.id)
    if (aOrder != null && bOrder != null) return aOrder - bOrder
    if (aOrder != null) return -1
    if (bOrder != null) return 1
    return (inputIndexById.get(a.id) ?? 0) - (inputIndexById.get(b.id) ?? 0)
  })

  if (inputNodes.length === 0)
    return { sceneNodes: [], sceneEdges: [], labels: [] }

  const padding = Math.max(0, config.padding ?? 18)
  const availableSide = Math.max(
    1,
    Math.min(plot.width, plot.height) - padding * 2
  )
  const cellSize = Math.min(
    Math.max(1, config.maxCellSize ?? 120),
    availableSide / inputNodes.length
  )
  const matrixSide = cellSize * inputNodes.length
  const originX = plot.x + (plot.width - matrixSide) / 2
  const originY = plot.y + (plot.height - matrixSide) / 2
  const nodeSize = Math.max(
    4,
    Math.min(cellSize * 0.76, config.nodeSize ?? cellSize * 0.56)
  )
  const halfNode = nodeSize / 2

  const placedNodes: PlacedNode[] = inputNodes.map((node, index) => {
    const label =
      typeof config.labelAccessor === "function"
        ? config.labelAccessor(node.datum)
        : String(
            readField(node.datum, config.labelAccessor ?? "label", node.id)
          )
    return {
      id: node.id,
      label,
      datum: node.datum,
      index,
      cx: originX + (index + 0.5) * cellSize,
      cy: originY + (index + 0.5) * cellSize
    }
  })
  const nodesById = new Map(placedNodes.map((node) => [node.id, node]))
  const indexById = new Map(placedNodes.map((node) => [node.id, node.index]))
  const flows = adjacencyFlowAggregateEdges(ctx.edges, indexById, config)
  const groups = allocateAdjacencyFlowWidths(flows, nodeSize, config)
  const ports = allocateAdjacencyFlowPorts(groups, nodesById, nodeSize, config)

  const singleFlowColor =
    ctx.theme.semantic.info ??
    ctx.theme.semantic.primary ??
    ctx.resolveColor("adjacency-flow")
  const textColor =
    ctx.theme.semantic.text ?? "var(--semiotic-text, currentColor)"
  const surfaceColor = ctx.theme.semantic.surface ?? "var(--semiotic-bg, white)"
  const borderColor =
    ctx.theme.semantic.border ?? "var(--semiotic-border, currentColor)"
  const gridColor = ctx.theme.semantic.grid ?? borderColor
  const nodeFillDefault =
    ctx.theme.semantic.primary ?? ctx.resolveColor("adjacency-flow-node")
  const valueFormat =
    config.valueFormat ??
    ((value: number) => String(Math.round(value * 100) / 100))
  const radius = Math.max(
    0,
    Math.min(config.cornerRadius ?? 10, cellSize * 0.22)
  )

  const outgoing = new Map(placedNodes.map((node) => [node.id, 0]))
  const incoming = new Map(placedNodes.map((node) => [node.id, 0]))
  const arrowElements: React.ReactNode[] = []
  const valueLabels: NetworkLabel[] = []
  const sceneEdges: NetworkCurvedEdge[] = []

  for (const flow of flows) {
    const source = nodesById.get(flow.source)
    const target = nodesById.get(flow.target)
    if (!source || !target) continue
    outgoing.set(source.id, (outgoing.get(source.id) ?? 0) + flow.value)
    incoming.set(target.id, (incoming.get(target.id) ?? 0) + flow.value)

    const mode = config.colorMode ?? "single"
    const callbackColor =
      typeof config.edgeColor === "function"
        ? config.edgeColor(flow.datum)
        : undefined
    flow.color =
      callbackColor ??
      (typeof config.edgeColor === "string" ? config.edgeColor : undefined) ??
      (mode === "source"
        ? ctx.resolveColor(flow.source)
        : mode === "target"
          ? ctx.resolveColor(flow.target)
          : mode === "edge"
            ? ctx.resolveColor(`${flow.source}→${flow.target}`)
            : singleFlowColor)

    const sourcePort = ports.get(`${flow.key}:source`) ?? source.cy
    const targetPort = ports.get(`${flow.key}:target`) ?? target.cx
    let points: Array<[number, number]>
    let arrowX: number
    let arrowY: number
    let arrowAngle: number
    let labelX: number
    let labelY: number
    let labelAnchor: NetworkLabel["anchor"]

    if (flow.sourceIndex < flow.targetIndex) {
      const start: [number, number] = [source.cx + halfNode, sourcePort]
      const end: [number, number] = [targetPort, target.cy - halfNode]
      points = [start, [end[0], start[1]], end]
      arrowX = end[0]
      arrowY = start[1] + (end[1] - start[1]) * 0.68
      arrowAngle = Math.PI / 2
      labelX = end[0] - radius - 4
      labelY = start[1] - flow.width / 2 - 3
      labelAnchor = "end"
    } else if (flow.sourceIndex > flow.targetIndex) {
      const start: [number, number] = [source.cx - halfNode, sourcePort]
      const end: [number, number] = [targetPort, target.cy + halfNode]
      points = [start, [end[0], start[1]], end]
      arrowX = end[0]
      arrowY = start[1] + (end[1] - start[1]) * 0.68
      arrowAngle = -Math.PI / 2
      labelX = end[0] + radius + 4
      labelY = start[1] + flow.width / 2 + (config.valueFontSize ?? 10)
      labelAnchor = "start"
    } else {
      const cellRight = originX + (source.index + 1) * cellSize
      const cellBottom = originY + (source.index + 1) * cellSize
      const inset = Math.max(2, Math.min(6, cellSize * 0.07))
      const outerX = Math.max(source.cx + halfNode + 2, cellRight - inset)
      const outerY = Math.max(source.cy + halfNode + 2, cellBottom - inset)
      const start: [number, number] = [source.cx + halfNode, sourcePort]
      const end: [number, number] = [targetPort, target.cy + halfNode]
      points = [
        start,
        [outerX, start[1]],
        [outerX, outerY],
        [end[0], outerY],
        end
      ]
      arrowX = (outerX + end[0]) / 2
      arrowY = outerY
      arrowAngle = Math.PI
      labelX = outerX - 3
      labelY = outerY - flow.width / 2 - 3
      labelAnchor = "end"
    }

    const pathD = roundedOrthogonalPath(points, radius)
    sceneEdges.push({
      type: "curved",
      id: `adjacency-flow-${flow.key}`,
      label: `${source.label} to ${target.label}: ${valueFormat(flow.value, flow.datum)}`,
      pathD,
      style: {
        fill: "none",
        stroke: flow.color,
        strokeWidth: flow.width,
        opacity: 0.82,
        cursor: "pointer"
      },
      datum: flow.datum,
      accessibleDatum: flow.datum,
      accessibility: {
        label: `${source.label} to ${target.label}, ${valueFormat(flow.value, flow.datum)}`,
        tableFields: {
          source: source.label,
          target: target.label,
          value: flow.value,
          edges: flow.edgeCount
        }
      }
    })

    if (config.showValues ?? true) {
      valueLabels.push({
        x: labelX,
        y: labelY,
        text: valueFormat(flow.value, flow.datum),
        anchor: labelAnchor,
        fontSize:
          config.valueFontSize ?? Math.max(7, Math.min(10, cellSize * 0.14)),
        fontWeight: 650,
        fill: textColor,
        stroke: surfaceColor,
        strokeWidth: 3,
        paintOrder: "stroke"
      })
    }

    if (config.showArrows ?? true) {
      // Keep the full triangle inside the route stroke. A one-pixel inset on
      // either side avoids antialiasing against the edge boundary; arrows too
      // narrow to retain a useful interior shape are omitted.
      const arrowWidth = Math.min(
        Math.max(0, config.arrowSize ?? 14),
        Math.max(0, flow.width - 2)
      )
      if (arrowWidth <= 2) continue
      const arrowLength = Math.max(3, arrowWidth * 1.08)
      arrowElements.push(
        React.createElement("path", {
          key: `arrow-${flow.key}`,
          className: "semiotic-adjacency-flow-arrow",
          d: arrowPath(arrowX, arrowY, arrowAngle, arrowLength, arrowWidth),
          fill:
            config.arrowColor ??
            "var(--semiotic-adjacency-flow-arrow-fill, rgba(255, 255, 255, 0.72))",
          stroke: "none",
          "data-edge-width": flow.width,
          "data-arrow-width": arrowWidth,
          "aria-hidden": true,
          focusable: false,
          pointerEvents: "none",
          opacity: 1
        })
      )
    }
  }

  const sceneNodes: NetworkRectNode[] = placedNodes.map((node) => {
    const callbackColor =
      typeof config.nodeColor === "function"
        ? config.nodeColor(node.datum, node.index)
        : undefined
    const fill =
      callbackColor ??
      (typeof config.nodeColor === "string"
        ? config.nodeColor
        : (config.colorMode ?? "single") === "source"
          ? ctx.resolveColor(node.id)
          : nodeFillDefault)
    return {
      type: "rect",
      id: node.id,
      label: node.label,
      x: node.cx - halfNode,
      y: node.cy - halfNode,
      w: nodeSize,
      h: nodeSize,
      style: {
        fill,
        stroke: config.nodeStroke ?? borderColor,
        strokeWidth: 1.25,
        cursor: "pointer"
      },
      datum: node.datum,
      accessibleDatum: node.datum,
      accessibility: {
        label: `${node.label}, step ${node.index + 1}`,
        tableFields: {
          step: node.index + 1,
          node: node.label,
          incoming: incoming.get(node.id) ?? 0,
          outgoing: outgoing.get(node.id) ?? 0
        }
      }
    }
  })

  const maxLabelLength = Math.max(2, config.maxLabelLength ?? 14)
  const nodeLabels: NetworkLabel[] = placedNodes.map((node) => ({
    x: node.cx,
    y: node.cy,
    text: truncateLabel(node.label, maxLabelLength),
    anchor: "middle",
    baseline: "middle",
    fontSize:
      config.labelFontSize ??
      Math.max(
        6,
        Math.min(
          15,
          nodeSize * 0.34,
          nodeSize / Math.max(1.8, node.label.length * 0.62)
        )
      ),
    fontWeight: 750,
    fill: config.nodeTextColor ?? surfaceColor
  }))

  let backgrounds: React.ReactNode = null
  if (config.showGrid ?? true) {
    const grid: React.ReactNode[] = []
    for (let index = 0; index <= placedNodes.length; index += 1) {
      const x = originX + index * cellSize
      const y = originY + index * cellSize
      grid.push(
        React.createElement("line", {
          key: `grid-v-${index}`,
          x1: x,
          y1: originY,
          x2: x,
          y2: originY + matrixSide,
          stroke: gridColor,
          strokeWidth: 0.75,
          strokeDasharray: "2 5",
          opacity: 0.5,
          pointerEvents: "none"
        }),
        React.createElement("line", {
          key: `grid-h-${index}`,
          x1: originX,
          y1: y,
          x2: originX + matrixSide,
          y2: y,
          stroke: gridColor,
          strokeWidth: 0.75,
          strokeDasharray: "2 5",
          opacity: 0.5,
          pointerEvents: "none"
        })
      )
    }
    backgrounds = React.createElement(React.Fragment, null, ...grid)
  }

  return {
    sceneEdges,
    sceneNodes,
    labels: [...valueLabels, ...nodeLabels],
    backgrounds,
    overlays: React.createElement(React.Fragment, null, ...arrowElements)
  }
}
