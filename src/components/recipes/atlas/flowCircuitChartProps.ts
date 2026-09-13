import {
  flowCircuitLayout,
  type FlowCircuitLayoutConfig
} from "./flowCircuitLayout"
import { atlasLinkedHover, type AtlasChartOptions } from "./atlasChartOptions"
import type { PhysicsCustomChartProps } from "../../charts/physics/PhysicsCustomChart"
import { circuitModuleDatum } from "./flowCircuitSemantics"
import type { BaseChartProps } from "../../charts/shared/types"

const noTooltip = () => null

export type FlowCircuitChartProps = FlowCircuitLayoutConfig &
  AtlasChartOptions & {
    width?: number
    height?: number
    annotations?: PhysicsCustomChartProps["annotations"]
    frameProps?: PhysicsCustomChartProps["frameProps"]
    /** Named linked-view selection, separate from the local graph selection. */
    linkedSelection?: Pick<NonNullable<BaseChartProps["selection"]>, "name">
    onSelectNode?: (id: string) => void
  }

export function flowCircuitChartProps({
  width = 980,
  height = 860,
  title,
  description,
  summary,
  accessibleTable = true,
  chartId,
  className,
  onObservation,
  linkedHover,
  annotations,
  frameProps,
  linkedSelection: _linkedSelection,
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
    data: config.circuit.modules.map((module) =>
      circuitModuleDatum(config.circuit, config.edition, config.reading, module)
    ),
    layout: flowCircuitLayout,
    layoutConfig: config,
    width,
    height,
    chartId,
    className,
    onObservation,
    linkedHover: atlasLinkedHover(linkedHover),
    annotations,
    frameProps,
    paused: true,
    title: title ?? config.edition.label,
    description:
      description ??
      `${config.edition.label}. ${config.edition.kind} aggregate interval tape at ${config.reading.observedAt} seconds. Pipe widths encode transferred volume per second in their labeled units; module readouts separate completions, capacity and queue stock. Individual timings are unavailable.`,
    summary: summary ?? config.edition.assumptions.join(" "),
    accessibleTable,
    tooltip:
      chartId || linkedHover || onObservation ? noTooltip : (false as const)
  }
}
