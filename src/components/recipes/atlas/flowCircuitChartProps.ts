import {
  flowCircuitLayout,
  type FlowCircuitLayoutConfig
} from "./flowCircuitLayout"

export type FlowCircuitChartProps = FlowCircuitLayoutConfig & {
  width?: number
  height?: number
  title?: string
  onSelectNode?: (id: string) => void
}

export function flowCircuitChartProps({
  width = 980,
  height = 860,
  title,
  onSelectNode: _onSelectNode,
  ...config
}: FlowCircuitChartProps) {
  return {
    // Fixed bodies must follow projection geometry. Tape state is external.
    key: JSON.stringify([
      config.circuit.atlas.analysisRevision,
      config.circuit.order,
      config.circuit.backboneEdgeIds,
      width,
      height
    ]),
    data: config.circuit.modules.map((module) => ({ id: module.nodeId })),
    layout: flowCircuitLayout,
    layoutConfig: config,
    width,
    height,
    paused: true,
    title: title ?? config.edition.label,
    description: `${config.edition.label}. ${config.edition.kind} aggregate interval tape at ${config.reading.observedAt} seconds. Pipe widths encode transferred volume per second in their labeled units; module readouts separate completions, capacity and queue stock. Individual timings are unavailable.`,
    summary: config.edition.assumptions.join(" "),
    accessibleTable: true,
    tooltip: false as const
  }
}
