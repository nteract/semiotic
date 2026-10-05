import type { ChartConfig, ServerChartData } from "./serverChartConfigShared"
import { networkCustomChart } from "./serverChartConfigsCustom"
import { physicsCustomChart } from "./serverChartConfigsPhysics"
import { motifBraidChartProps } from "../recipes/atlas/motifBraidChartProps"
import { dependencyForestChartProps } from "../recipes/atlas/dependencyForestChartProps"
import { flowCircuitChartProps, flowCircuitNetworkChartProps } from "../recipes/atlas/flowCircuitChartProps"
import { resolveNetworkPerspective } from "../stream/networkPerspective"
import { renderNetworkFrame } from "./staticNetwork"
import { renderPhysicsFrame } from "./staticPhysics"

/** Delegate to the same prepared reader props and custom layouts as React. */
function atlasConfig<P>(
  host: ChartConfig,
  map: (props: P) => Record<string, unknown>,
  margin?: { top: number; right: number; bottom: number; left: number }
): ChartConfig {
  return {
    frameType: host.frameType,
    layout: {
      ...host.layout,
      ...(margin && { margin })
    },
    buildProps: (_data, colorBy, colorScheme, common, rest) => {
      const [width, height] = common.size as [number, number]
      const props = map({ ...rest, ...common, width, height, colorScheme } as P)
      return host.buildProps(
        props.data as ServerChartData,
        colorBy,
        colorScheme,
        {
          ...common,
          ...props.frameProps as Record<string, unknown>,
          title: props.title,
          description: props.description,
          summary: props.summary,
          accessibleTable: props.accessibleTable
        },
        { ...rest, ...props }
      )
    }
  }
}

export const motifBraidChart = atlasConfig(
  networkCustomChart,
  motifBraidChartProps
)
export const dependencyForestChart = atlasConfig(
  networkCustomChart,
  dependencyForestChartProps,
  { top: 12, right: 24, bottom: 12, left: 12 }
)
const flatFlowCircuit = atlasConfig(
  physicsCustomChart,
  flowCircuitChartProps
)
const projectedFlowCircuit = atlasConfig(networkCustomChart, flowCircuitNetworkChartProps)
export const flowCircuitChart: ChartConfig = {
  ...flatFlowCircuit,
  resolveFrameType: (props) => props._projectedCircuit ? "network" : "physics",
  buildProps: (...args) => {
    const projected = resolveNetworkPerspective(args[4].perspective)
    return { ...(projected ? projectedFlowCircuit : flatFlowCircuit).buildProps(...args), _projectedCircuit: Boolean(projected) }
  },
  renderStatic: (props, sink) => props._projectedCircuit
    ? renderNetworkFrame(props as Parameters<typeof renderNetworkFrame>[0], sink)
    : renderPhysicsFrame(props as Parameters<typeof renderPhysicsFrame>[0], sink)
}
