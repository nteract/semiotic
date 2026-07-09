/**
 * Pure realtime encoding passes for network scene graphs:
 * pulse, decay, topology-diff highlight, threshold alerts.
 */
import { computeDecayOpacity } from "./pipelineDecay"
import type {
  NetworkSceneEdge,
  NetworkSceneNode,
  RealtimeNode
} from "./networkTypes"
import type { DecayConfig, PulseConfig } from "./types"
import type { NetworkPipelineConfig } from "./networkTypes"

export type NetworkTimestampMap = Map<string, number>

export function applyNetworkPulse(options: {
  sceneNodes: NetworkSceneNode[]
  sceneEdges: NetworkSceneEdge[]
  nodeTimestamps: NetworkTimestampMap
  edgeTimestamps: NetworkTimestampMap
  pulse: PulseConfig | undefined
  now: number
}): void {
  const pulse = options.pulse
  if (!pulse) return

  const duration = pulse.duration ?? 500
  const pulseColor = pulse.color ?? "rgba(255,255,255,0.6)"
  const glowRadius = pulse.glowRadius ?? 4
  const { now } = options

  for (const node of options.sceneNodes) {
    const nodeId = node.id
    if (!nodeId) continue
    const ts = options.nodeTimestamps.get(nodeId)
    if (!ts) continue
    const age = now - ts
    if (age >= duration) continue
    const intensity = 1 - age / duration
    node._pulseIntensity = intensity
    node._pulseColor = pulseColor
    node._pulseGlowRadius = glowRadius
  }

  for (const edge of options.sceneEdges) {
    const edgeDatum = edge.datum
    if (!edgeDatum) continue
    const sourceId =
      typeof edgeDatum.source === "object"
        ? edgeDatum.source?.id
        : edgeDatum.source
    const targetId =
      typeof edgeDatum.target === "object"
        ? edgeDatum.target?.id
        : edgeDatum.target
    if (!sourceId || !targetId) continue
    const key = `${sourceId}\0${targetId}`
    const ts = options.edgeTimestamps.get(key)
    if (!ts) continue
    const age = now - ts
    if (age >= duration) continue
    const intensity = 1 - age / duration
    edge._pulseIntensity = intensity
    edge._pulseColor = pulseColor
  }
}

export interface NetworkDecayCache {
  sortedNodes: [string, number][] | null
  ageMap: Map<string, number> | null
}

export function applyNetworkDecay(options: {
  sceneNodes: NetworkSceneNode[]
  nodeTimestamps: NetworkTimestampMap
  decay: DecayConfig | undefined
  cache: NetworkDecayCache
}): void {
  const decay = options.decay
  if (!decay) return

  const nodeCount = options.nodeTimestamps.size
  if (nodeCount <= 1) return

  if (!options.cache.sortedNodes) {
    options.cache.sortedNodes = Array.from(
      options.nodeTimestamps.entries()
    ).sort((a, b) => a[1] - b[1])
    const ageMap = new Map<string, number>()
    for (let i = 0; i < options.cache.sortedNodes.length; i++) {
      ageMap.set(options.cache.sortedNodes[i][0], i)
    }
    options.cache.ageMap = ageMap
  }
  const nodeAgeMap = options.cache.ageMap!

  for (const node of options.sceneNodes) {
    const nodeId = node.id
    if (!nodeId) continue
    const ageIndex = nodeAgeMap.get(nodeId)
    if (ageIndex === undefined) continue

    const opacity = computeDecayOpacity(decay, ageIndex, nodeCount)
    const baseOpacity = node.style?.opacity ?? 1
    node.style = { ...node.style, opacity: baseOpacity * opacity }
  }
}

const TOPOLOGY_PULSE_COLOR = "rgba(34, 197, 94, 0.7)"
const TOPOLOGY_PULSE_DURATION_MS = 2000

export function applyNetworkTopologyDiff(options: {
  sceneNodes: NetworkSceneNode[]
  addedNodes: Set<string>
  lastTopologyChangeTime: number
  now: number
}): void {
  // Clear prior topology pulse before deciding whether the window is active.
  for (const sceneNode of options.sceneNodes) {
    if (sceneNode._pulseColor !== TOPOLOGY_PULSE_COLOR) continue
    sceneNode._pulseIntensity = 0
    sceneNode._pulseColor = undefined
    sceneNode._pulseGlowRadius = undefined
  }

  if (options.addedNodes.size === 0) return

  const age = options.now - options.lastTopologyChangeTime
  if (age >= TOPOLOGY_PULSE_DURATION_MS) return

  const intensity = 1 - age / TOPOLOGY_PULSE_DURATION_MS

  for (const sceneNode of options.sceneNodes) {
    const nodeId = sceneNode.id
    if (!nodeId || !options.addedNodes.has(nodeId)) continue
    sceneNode._pulseIntensity = Math.max(
      sceneNode._pulseIntensity ?? 0,
      intensity
    )
    sceneNode._pulseColor = TOPOLOGY_PULSE_COLOR
    sceneNode._pulseGlowRadius = 8
  }
}

export function hasActiveNetworkTopologyDiff(
  addedNodes: Set<string>,
  lastTopologyChangeTime: number,
  now: number = typeof performance !== "undefined"
    ? performance.now()
    : Date.now()
): boolean {
  if (addedNodes.size === 0) return false
  return now - lastTopologyChangeTime < TOPOLOGY_PULSE_DURATION_MS
}

export function applyNetworkThresholds(options: {
  sceneNodes: NetworkSceneNode[]
  nodes: Map<string, RealtimeNode>
  thresholds: NetworkPipelineConfig["thresholds"]
  now: number
}): void {
  const thresholds = options.thresholds
  if (!thresholds) return

  const warningColor = thresholds.warningColor ?? "#f59e0b"
  const criticalColor = thresholds.criticalColor ?? "#ef4444"
  const shouldPulse = thresholds.pulse !== false

  for (const sceneNode of options.sceneNodes) {
    const nodeId = sceneNode.id
    if (!nodeId) continue
    const realtimeNode = options.nodes.get(nodeId)
    if (!realtimeNode) continue

    const value = thresholds.metric(realtimeNode)
    let alertColor: string | null = null

    if (thresholds.critical !== undefined && value >= thresholds.critical) {
      alertColor = criticalColor
    } else if (
      thresholds.warning !== undefined &&
      value >= thresholds.warning
    ) {
      alertColor = warningColor
    }

    if (alertColor) {
      sceneNode.style = { ...sceneNode.style, fill: alertColor }
      if (shouldPulse) {
        sceneNode._pulseIntensity = 0.6 + 0.4 * Math.sin(options.now / 300)
        sceneNode._pulseColor = alertColor
        sceneNode._pulseGlowRadius = 6
      }
    }
  }
}

export function hasActiveNetworkThresholds(
  nodes: Iterable<RealtimeNode>,
  thresholds: NetworkPipelineConfig["thresholds"]
): boolean {
  if (!thresholds) return false
  for (const node of nodes) {
    const value = thresholds.metric(node)
    if (
      (thresholds.warning !== undefined && value >= thresholds.warning) ||
      (thresholds.critical !== undefined && value >= thresholds.critical)
    ) {
      return true
    }
  }
  return false
}

export function hasActiveNetworkPulses(options: {
  pulse: PulseConfig | undefined
  lastIngestTime: number
  now?: number
}): boolean {
  const pulse = options.pulse
  if (!pulse || options.lastIngestTime === 0) return false
  const now =
    options.now ??
    (typeof performance !== "undefined" ? performance.now() : Date.now())
  const duration = pulse.duration ?? 500
  return now - options.lastIngestTime < duration
}
