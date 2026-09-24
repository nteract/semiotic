import * as React from "react"
import { useNetworkLOD } from "semiotic/network/zoom"
import { cardWidth, cardHeight, thresholds, formatRows, type PipelineNode } from "./data"

export const ExplorerContext = React.createContext({
  selected: "step-0",
  select: (_id: string) => {},
  notes: {} as Record<string, string>,
  saveNote: (_id: string, _value: string) => {},
})

function Skeleton({ color }: { color: string }) {
  return (
    <div className="pipeline-skeleton" aria-hidden="true">
      {[78, 55, 88, 66].map((width, i) => (
        <div key={i}>
          <i style={{ background: color }} />
          <span style={{ width: `${width}%` }} />
        </div>
      ))}
    </div>
  )
}

export function PipelineCard({ node }: { node: PipelineNode }) {
  const { selected, select, notes, saveNote } = React.useContext(ExplorerContext)
  const [focused, setFocused] = React.useState(false)
  const { level, width } = useNetworkLOD(cardWidth, cardHeight, {
    breakpoints: thresholds,
    hysteresis: 8,
    keepDetail: focused,
  })
  return (
    <article
      className="pipeline-card"
      data-lod={level}
      data-selected={selected === node.id}
      data-displayed-width={width.toFixed(1)}
      aria-label={node.label}
      style={{ "--step-color": node.color } as React.CSSProperties}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
      }}
    >
      {level === 0 ? (
        <div className="pipeline-silhouette" aria-hidden="true" />
      ) : level === 1 ? (
        <>
          <div className="pipeline-skeleton-title" aria-hidden="true" />
          <Skeleton color={node.color} />
        </>
      ) : (
        <>
          <div className="pipeline-card-stage">
            {level === 3 ? node.stage : `0${node.stageIndex + 1}`}
            <span>{node.status === "Healthy" ? "●" : "!"}</span>
          </div>
          <button
            type="button"
            className="pipeline-card-title"
            aria-label={`Inspect ${node.label}`}
            aria-pressed={selected === node.id}
            onClick={() => select(node.id)}
            style={level === 2 ? { fontSize: Math.min(28, (15 * cardWidth) / width) } : undefined}
          >
            {node.pipeline}
          </button>
          {level === 3 ? (
            <>
              <dl className="pipeline-card-metrics">
                <div>
                  <dt>Output rows</dt>
                  <dd>{formatRows(node.rows)}</dd>
                </div>
                <div>
                  <dt>Batch latency</dt>
                  <dd>{node.latency} ms</dd>
                </div>
              </dl>
              <label className="pipeline-card-note">
                Note
                <input
                  aria-label={`Note for ${node.label}`}
                  placeholder="Add a note…"
                  value={notes[node.id] ?? ""}
                  onChange={(event) => saveNote(node.id, event.target.value)}
                />
              </label>
            </>
          ) : (
            <>
              <div className="pipeline-card-summary">{(node.rows / 1000).toFixed(1)}k rows</div>
              <Skeleton color={node.color} />
            </>
          )}
        </>
      )}
    </article>
  )
}
