import { FLOW_CIRCUIT_CHART_SIZE } from "../../charts/shared/chartSizeDefaultsAtlas"
import {
  flowCircuitLayout,
  flowCircuitNetworkLayout,
  type FlowCircuitLayoutConfig
} from "./flowCircuitLayout"
import { atlasLinkedHover, type AtlasChartOptions } from "./atlasChartOptions"
import type { PhysicsCustomChartProps } from "../../charts/physics/PhysicsCustomChart"
import { circuitModuleDatum } from "./flowCircuitSemantics"
import type { BaseChartProps } from "../../charts/shared/types"
import type { NetworkCustomChartProps } from "../../charts/custom/NetworkCustomChart"

const noTooltip = () => null

export type FlowCircuitChartProps = FlowCircuitLayoutConfig &
  AtlasChartOptions & {
    width?: number
    height?: number
    annotations?: PhysicsCustomChartProps["annotations"]
    /** Physics frame options for the flat view. */
    frameProps?: PhysicsCustomChartProps["frameProps"]
    /** Network frame options for a projected view, including zoom and SVG rendering. */
    networkFrameProps?: NetworkCustomChartProps["frameProps"]
    /** Project the fixed circuit apparatus through the network renderer. */
    perspective?: NetworkCustomChartProps["perspective"]
    /** Named linked-view selection, separate from the local graph selection. */
    linkedSelection?: Pick<NonNullable<BaseChartProps["selection"]>, "name">
    onSelectNode?: (id: string) => void
  }

export function flowCircuitChartProps({
  width = FLOW_CIRCUIT_CHART_SIZE.width,
  height = FLOW_CIRCUIT_CHART_SIZE.height,
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
  perspective: _perspective,
  networkFrameProps: _networkFrameProps,
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

/** Network rendering uses the same tape, layout geometry and semantic datums. */
export function flowCircuitNetworkChartProps(props: FlowCircuitChartProps) {
  const { key: _key, data, layout: _layout, paused: _paused, frameProps: _frameProps, ...common } = flowCircuitChartProps(props)
  return {
    ...common,
    nodes: data,
    edges: props.circuit.atlas.source.edges,
    layout: flowCircuitNetworkLayout,
    perspective: props.perspective,
    margin: 0,
    frameProps: {
      ...(props.frameProps && {
        background: props.frameProps.background,
        backgroundGraphics: props.frameProps.backgroundGraphics,
        foregroundGraphics: props.frameProps.foregroundGraphics
      }),
      ...props.networkFrameProps
    },
    tooltip: (datum: Record<string, unknown>) => `${datum.label ?? datum.id ?? "Circuit"}: ${datum.kind === "circuit-pipe" ? `${datum.perSecond ?? "unmeasured"} ${datum.unit}/s` : `${datum.completions ?? "unmeasured"} ${datum.unit ?? "units"}/s completed; queue ${datum.queued ?? "unmeasured"}`}`
  }
}
