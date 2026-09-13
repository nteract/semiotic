import type { ChartConfig, ServerChartData } from "./serverChartConfigShared"
import { networkCustomChart } from "./serverChartConfigsCustom"
import { physicsCustomChart } from "./serverChartConfigsPhysics"
import { motifBraidChartProps } from "../recipes/atlas/motifBraidChartProps"
import { dependencyForestChartProps } from "../recipes/atlas/dependencyForestChartProps"
import { flowCircuitChartProps } from "../recipes/atlas/flowCircuitChartProps"

/** Delegate to the same prepared reader props and custom layouts as React. */
function atlasConfig<P>(
  host: ChartConfig,
  map: (props: P) => Record<string, unknown>,
  primarySize: [number, number],
  margin?: { top: number; right: number; bottom: number; left: number }
): ChartConfig {
  return {
    frameType: host.frameType,
    layout: {
      ...host.layout,
      primarySize: { width: primarySize[0], height: primarySize[1] },
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
  motifBraidChartProps,
  [600, 400]
)
export const dependencyForestChart = atlasConfig(
  networkCustomChart,
  dependencyForestChartProps,
  [920, 440],
  { top: 12, right: 24, bottom: 12, left: 12 }
)
export const flowCircuitChart = atlasConfig(
  physicsCustomChart,
  flowCircuitChartProps,
  [980, 860]
)
