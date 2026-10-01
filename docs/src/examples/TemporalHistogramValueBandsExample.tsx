import React from "react"
import { TemporalHistogram } from "semiotic/realtime"

// Concurrent jobs per minute against a soft limit of 5 and a hard limit of 10.
const data = [3, 6, 4, 9, 12, 7, 5, 11, 8, 2].map((value, minute) => ({
  time: minute * 60_000,
  value,
}))

const overSoftLimit = { type: "hatch", background: "#fef3c7", stroke: "#b45309", spacing: 5, angle: -45 } as const
const overHardLimit = { type: "hatch", background: "#fee2e2", stroke: "#b91c1c", spacing: 5, angle: -45 } as const

export default function TemporalHistogramValueBandsExample() {
  return (
    <TemporalHistogram
      data={data}
      binSize={60_000}
      timeExtent={[0, 600_000]}
      valueExtent={[0, 14]}
      tickFormatTime={(ms) => `${ms / 60_000}m`}
      valueBands={[
        { upTo: 5, fill: "#2563eb" },
        { upTo: 10, fill: overSoftLimit },
        { fill: overHardLimit },
      ]}
      annotations={[
        { type: "y-threshold", value: 5, label: "Soft limit", color: "#b45309" },
        { type: "y-threshold", value: 10, label: "Hard limit", color: "#b91c1c" },
      ]}
      gap={4}
      responsiveWidth
      height={300}
      background="transparent"
      title="Concurrent jobs per minute"
      description="Each bar is solid up to the soft limit, amber-hatched up to the hard limit, and red-hatched above it."
      summary="Minutes 4 and 7 run past the hard limit of 10 jobs."
    />
  )
}

export const temporalHistogramValueBandsCode = `import React from "react"
import { TemporalHistogram } from "semiotic/realtime"

// Concurrent jobs per minute against a soft limit of 5 and a hard limit of 10.
const data = [3, 6, 4, 9, 12, 7, 5, 11, 8, 2].map((value, minute) => ({
  time: minute * 60_000,
  value,
}))

const overSoftLimit = { type: "hatch", background: "#fef3c7", stroke: "#b45309", spacing: 5, angle: -45 } as const
const overHardLimit = { type: "hatch", background: "#fee2e2", stroke: "#b91c1c", spacing: 5, angle: -45 } as const

export default function TemporalHistogramValueBandsExample() {
  return (
    <TemporalHistogram
      data={data}
      binSize={60_000}
      timeExtent={[0, 600_000]}
      valueExtent={[0, 14]}
      tickFormatTime={(ms) => \`\${ms / 60_000}m\`}
      valueBands={[
        { upTo: 5, fill: "#2563eb" },
        { upTo: 10, fill: overSoftLimit },
        { fill: overHardLimit },
      ]}
      annotations={[
        { type: "y-threshold", value: 5, label: "Soft limit", color: "#b45309" },
        { type: "y-threshold", value: 10, label: "Hard limit", color: "#b91c1c" },
      ]}
      gap={4}
      responsiveWidth
      height={300}
      background="transparent"
      title="Concurrent jobs per minute"
      description="Each bar is solid up to the soft limit, amber-hatched up to the hard limit, and red-hatched above it."
      summary="Minutes 4 and 7 run past the hard limit of 10 jobs."
    />
  )
}
`
