import * as React from "react"
import { ObservationReadout } from "semiotic/ai"

/** A live example of the same observation feed an assistant or inspector reads. */
export function AtlasObservation({ chartId }: { chartId: string }) {
  return (
    <details>
      <summary>Read chart interactions</summary>
      <p>
        Focus a mark with the arrow keys and press Space, or click a module. This readout subscribes
        through <code>ObservationReadout</code> to the chart’s ID inside <code>LinkedCharts</code>.
        The observation carries the canonical vertex and analysis revision for linked views and
        inspectors.
      </p>
      <ObservationReadout chartId={chartId} types={["click"]} fallback="No mark activated yet.">
        {(datum) => (
          <output data-testid="atlas-observation">
            {String(datum.label ?? datum.nodeId ?? datum.id)}
            {datum.observedAt == null ? "" : ` at ${datum.observedAt}s`}
            {datum.completions == null ? "" : ` · ${datum.completions} ${datum.unit}/s completed`}
          </output>
        )}
      </ObservationReadout>
    </details>
  )
}
