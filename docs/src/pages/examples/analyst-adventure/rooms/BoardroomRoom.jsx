import React from "react"
import { FlowMap } from "semiotic/geo"
import { SankeyDiagram } from "semiotic/network"
import { BarChart } from "semiotic/ordinal"
import { fromConfig } from "semiotic/utils"
import { LineChart } from "semiotic/xy"
import { MAIN_EVIDENCE_IDS } from "../roomRegistry"

const PORTABLE_CHARTS = {
  LineChart,
  BarChart,
  FlowMap,
  SankeyDiagram,
}

const SNAPSHOT_MARGINS = {
  LineChart: { top: 6, right: 8, bottom: 24, left: 30 },
  BarChart: { top: 6, right: 8, bottom: 22, left: 78 },
  FlowMap: { top: 5, right: 5, bottom: 5, left: 5 },
  SankeyDiagram: { top: 8, right: 8, bottom: 8, left: 8 },
}

function FallbackSnapshotGlyph({ artifact }) {
  const frame = artifact.frame
  if (frame === "StreamXYFrame") {
    return (
      <svg viewBox="0 0 160 76" role="img" aria-label="Rehydrated badge and elevator time-scope snapshot">
        <path d="M8 58 38 48 68 54 96 28 126 30 152 12" fill="none" stroke="#ff4fd8" strokeWidth="3" />
        <path d="M8 60 38 52 68 24 96 58 126 58" fill="none" stroke="#55f6ff" strokeWidth="3" />
        <rect x="101" y="5" width="51" height="58" fill="#ff4fd8" opacity="0.12" />
        <circle cx="126" cy="30" r="5" fill="#ffd166" stroke="#fff" />
      </svg>
    )
  }
  if (frame === "StreamOrdinalFrame") {
    return (
      <svg viewBox="0 0 160 76" role="img" aria-label="Rehydrated cancellation-rate snapshot">
        {[22, 35, 58, 132].map((bar, index) => (
          <rect key={bar} x="10" y={7 + index * 17} width={bar} height="10" fill={index === 3 ? "#ff4fd8" : "#55f6ff"} />
        ))}
      </svg>
    )
  }
  if (frame === "StreamGeoFrame") {
    return (
      <svg viewBox="0 0 160 76" role="img" aria-label="Rehydrated packet-origin route snapshot">
        <path d="M12 60 C48 15 91 64 148 18" fill="none" stroke="#ff4fd8" strokeWidth="6" />
        {[12, 58, 108, 148].map((x, index) => <circle key={x} cx={x} cy={[60, 35, 47, 18][index]} r="6" fill="#55f6ff" stroke="#fff" />)}
        <path d="m92 44 13 3-8 10" fill="#ffd166" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 160 76" role="img" aria-label="Rehydrated presentation-lineage snapshot">
      <path d="M10 12 H58 M10 38 H58 M10 64 H58 M70 38 H116 M122 64 V44" stroke="#55f6ff" strokeWidth="5" />
      <path d="M92 65 C104 62 107 49 120 40" stroke="#ff4fd8" strokeWidth="4" strokeDasharray="5 3" fill="none" />
      <rect x="58" y="29" width="14" height="20" fill="#55f6ff" />
      <rect x="116" y="25" width="14" height="28" fill="#ffd166" />
      <circle cx="92" cy="65" r="6" fill="#ff4fd8" />
    </svg>
  )
}

function PortableSnapshot({ artifact }) {
  let restored
  try {
    restored = artifact.chartConfig ? fromConfig(artifact.chartConfig) : null
  } catch {
    restored = null
  }
  const Chart = restored ? PORTABLE_CHARTS[restored.componentName] : null
  if (!Chart) return <FallbackSnapshotGlyph artifact={artifact} />

  const restoredFrameProps = restored.props.frameProps ?? {}
  return (
    <div
      className="analyst-adventure__snapshot-chart"
      data-component={restored.componentName}
      aria-label={`${artifact.label} restored ${restored.componentName} snapshot`}
    >
      <Chart
        {...restored.props}
        width={220}
        height={116}
        margin={SNAPSHOT_MARGINS[restored.componentName]}
        title=""
        description={artifact.claim}
        summary={artifact.scope}
        accessibleTable={false}
        enableHover={false}
        showLegend={false}
        showLabels={false}
        showParticles={false}
        frameProps={{
          ...restoredFrameProps,
          background: "#071014",
          animate: false,
        }}
      />
    </div>
  )
}

export default function BoardroomRoom({ room, state, onReopenEvidence }) {
  const evidenceById = new Map(state.evidence.map((artifact) => [artifact.id, artifact]))
  const missing = MAIN_EVIDENCE_IDS.filter((id) => !evidenceById.has(id))

  return (
    <section className="analyst-adventure__boardroom" aria-labelledby="analyst-boardroom-title">
      <header>
        <span>THE BIG PRESENTATION // CORRECTION BUFFER</span>
        <h2 id="analyst-boardroom-title">Four claims, each with its analytical baggage intact</h2>
        <p>
          The montage restores each artifact&apos;s original frame family, scope, denominator,
          and marked feature. It does not redraw a convenient new story for the board.
        </p>
      </header>
      <div className="analyst-adventure__montage">
        {MAIN_EVIDENCE_IDS.map((id, index) => {
          const artifact = evidenceById.get(id)
          if (!artifact) {
            return (
              <article key={id} className="analyst-adventure__snapshot is-missing">
                <div className="analyst-adventure__snapshot-empty" aria-hidden="true">?</div>
                <span>DISK {index + 1}</span>
                <h3>UNRESOLVED EVIDENCE SLOT</h3>
                <p>Return to the case map before claiming a complete account.</p>
              </article>
            )
          }
          return (
            <article key={id} className="analyst-adventure__snapshot">
              <PortableSnapshot artifact={artifact} />
              <span>{artifact.frame} · {artifact.scope}</span>
              <h3>{artifact.label}</h3>
              <p>{artifact.claim}</p>
              {artifact.denominator ? <small>Denominator: {artifact.denominator}</small> : null}
              <button type="button" onClick={() => onReopenEvidence?.(artifact)}>
                REOPEN SERIALIZED VIEW
              </button>
              <details>
                <summary>Portable chart config</summary>
                <pre>{JSON.stringify(artifact.chartConfig, null, 2)}</pre>
              </details>
            </article>
          )
        })}
      </div>
      <p className="analyst-adventure__boardroom-status" role="status">
        {missing.length === 0
          ? "ALL FOUR DEFENSIBLE CLAIMS MOUNTED. CORRECTED PRESENTATION AVAILABLE."
          : `${missing.length} EVIDENCE SLOT${missing.length === 1 ? "" : "S"} MISSING. A COMPLETE CLAIM IS NOT YET SUPPORTED.`}
      </p>
      <div className="analyst-adventure__final-inference">
        <h3>SUPPORTED INFERENCE</h3>
        <ul>
          <li>The apparent roof movement was a replayed cache.</li>
          <li>A raw count hid the B2 calendar signal.</li>
          <li>The displayed bunker was a routed endpoint, not an origin.</li>
          <li>PresentationDaemon injected ten unsupported confidence units.</li>
          <li>Mort went to B2 to stop the automated presentation system.</li>
        </ul>
      </div>
    </section>
  )
}
