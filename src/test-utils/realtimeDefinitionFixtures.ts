const data = [
  { time: 0, value: 2 },
  { time: 10, value: 5 },
  { time: 20, value: 3 }
]

export const realtimeDefinitionFixtures = {
  RealtimeLineChart: { data },
  RealtimeHistogram: { data, binSize: 10 },
  TemporalHistogram: { data, binSize: 10 },
  RealtimeSwarmChart: { data },
  RealtimeWaterfallChart: { data },
  RealtimeHeatmap: { data }
}
