import React, { useMemo } from "react"
import { StreamPhysicsFrame } from "semiotic/physics"
import {
  forecastBodies,
  forecastFacts,
  settleForecastBodies,
} from "../data/forecastPhysics"
import AdventureAnnotation from "../components/AdventureAnnotation"
import AnchoredChat from "../components/AnchoredChat"
import AnalyticalRoom from "../components/AnalyticalRoom"
import { annotationCabalDiscovery } from "../storySeed1984"

function forecastData() {
  const bodies = forecastBodies
  const settled = forecastFacts.settledBodies ?? settleForecastBodies(bodies)
  const counts = forecastFacts.settledCounts
  return { bodies, settled, counts }
}

const BIN_ORDER = ["DEFENSIBLE", "NEEDS CAVEAT", "PURE EXECUTIVE WEATHER"]

function scaledSettledPosition(body, width, height) {
  return {
    x: Math.max(18, Math.min(width - 18, (body.settledX / 600) * width)),
    y: Math.max(22, Math.min(height - 18, (body.settledY / 380) * height)),
  }
}

function processChrome(width, height) {
  const gateYs = [78, 132, 186]
  const labels = ["DENOMINATOR GATE", "FRESHNESS GATE", "LINEAGE GATE"]
  const binWidth = width / 3
  return (
    <g className="analyst-adventure__physics-chrome" aria-hidden="true">
      <rect x="0" y="0" width={width} height={height} fill="#071014" />
      {gateYs.map((y, index) => (
        <g key={labels[index]}>
          <line
            x1={width * 0.13}
            x2={width * 0.87}
            y1={y}
            y2={y}
            stroke={index === 2 ? "#ff4fd8" : "#55f6ff"}
            strokeWidth="3"
            strokeDasharray="10 7"
          />
          <text x={10} y={y - 7} fill="#f7fbff" fontSize="10" fontWeight="700">
            {labels[index]}
          </text>
        </g>
      ))}
      <rect
        x={width * 0.58}
        y={height * 0.42}
        width={width * 0.14}
        height="34"
        fill="none"
        stroke="#ffd166"
        strokeWidth="2"
      />
      <text x={width * 0.65} y={height * 0.42 + 14} textAnchor="middle" fill="#ffd166" fontSize="9">
        MANUAL
      </text>
      <text x={width * 0.65} y={height * 0.42 + 26} textAnchor="middle" fill="#ffd166" fontSize="9">
        OVERRIDE
      </text>
      {BIN_ORDER.map((label, index) => (
        <g key={label}>
          <rect
            x={index * binWidth + 3}
            y={height - 66}
            width={binWidth - 6}
            height="63"
            fill={index === 0 ? "#092b2f" : index === 1 ? "#282408" : "#2c0c28"}
            stroke={index === 2 ? "#ff4fd8" : index === 1 ? "#ffd166" : "#55f6ff"}
            strokeWidth="2"
          />
          <text
            x={index * binWidth + binWidth / 2}
            y={height - 48}
            textAnchor="middle"
            fill="#f7fbff"
            fontSize={width < 440 ? "8" : "10"}
            fontWeight="700"
          >
            {label}
          </text>
        </g>
      ))}
    </g>
  )
}

export default function ForecastVaultRoom({
  room,
  state,
  width,
  reducedMotion,
  hintRequestToken,
  hintsRemaining,
  onHintUsed,
  onInspect,
  onAnalyticsReady,
  onActivateAnnotation,
  onShowSettledProjection,
  onChoose,
}) {
  const fixture = useMemo(forecastData, [])
  const chartWidth = Math.max(300, width)
  const chartHeight = chartWidth < 480 ? 360 : 390
  const settledShown = reducedMotion || Boolean(state.flags.settledProjectionShown)
  const activated = state.activatedAnnotationIds.includes("vault-janitor")
  const spawns = useMemo(
    () =>
      fixture.settled.map((body, index) => {
        const final = scaledSettledPosition(body, chartWidth, chartHeight)
        return {
          id: body.id,
          x: settledShown ? final.x : chartWidth * 0.5 + ((index % 7) - 3) * 11,
          y: settledShown ? final.y : 22 + Math.floor(index / 7) * 7,
          vx: settledShown ? 0 : ((index % 5) - 2) * 2,
          vy: 0,
          mass: body.kind === "ceo" ? 2.2 : 1,
          shape: { type: "circle", radius: body.kind === "ceo" ? 9 : 6 },
          datum: body,
        }
      }),
    [chartHeight, chartWidth, fixture.settled, settledShown],
  )
  const annotations = useMemo(
    () => [
      {
        id: "vault-janitor",
        stableId: "vault-janitor",
        type: "widget",
        px: chartWidth * 0.83,
        py: chartHeight - 88,
        label: "JANITOR annotation at Pure Executive Weather sensor",
        navigationLabel: "JANITOR comment on the Pure Executive Weather sensor",
        width: 44,
        height: 44,
        content: (
          <AdventureAnnotation
            label="Activate the janitor annotation at Pure Executive Weather"
            active={activated}
            tone="status"
          >
            JN
          </AdventureAnnotation>
        ),
        provenance: {
          author: "JANITOR",
          authorKind: "human",
          source: "user",
          stableId: "vault-janitor",
        },
        lifecycle: { status: activated ? "accepted" : "proposed", anchor: "fixed" },
      },
    ],
    [activated, chartHeight, chartWidth],
  )
  const semanticItems = useMemo(
    () => [
      ...[
        ["denominator-gate", "Denominator Gate", 78],
        ["freshness-gate", "Freshness Gate", 132],
        ["lineage-gate", "Lineage Gate", 186],
      ].map(([id, label, y]) => ({
        id,
        label,
        description: `${label} checks one requirement carried by every forecast body.`,
        x: chartWidth / 2,
        y,
        width: chartWidth * 0.74,
        height: 16,
        shape: "rect",
        group: "Forecast gates",
      })),
      {
        id: "manual-lineage-override",
        label: "Manual lineage override sensor",
        description: "Mort Zork is caught here because his lineage is incomplete.",
        x: chartWidth * 0.65,
        y: chartHeight * 0.42 + 17,
        width: chartWidth * 0.14,
        height: 34,
        shape: "rect",
        group: "Sensors",
      },
      ...BIN_ORDER.map((label, index) => ({
        id: `bin-${label.toLowerCase().replaceAll(" ", "-")}`,
        label: `${label} result bin`,
        description: `${fixture.counts[label] ?? 0} forecast scenarios in the deterministic settled projection.`,
        x: (index + 0.5) * (chartWidth / 3),
        y: chartHeight - 33,
        width: chartWidth / 3 - 8,
        height: 60,
        shape: "rect",
        group: "Settled result bins",
      })),
    ],
    [chartHeight, chartWidth, fixture.counts],
  )
  const config = useMemo(
    () => ({
      kernel: {
        seed: 1984,
        gravity: { x: 0, y: 210 },
        restitution: 0.12,
        friction: 0.6,
        velocityDamping: 0.992,
        collisionIterations: 4,
        sleepSpeed: 5,
        sleepAfter: 0.55,
        maxVelocity: 260,
      },
      colliders: [
        {
          id: "left-wall",
          shape: { type: "segment", x1: 4, y1: 0, x2: 4, y2: chartHeight, thickness: 8 },
        },
        {
          id: "right-wall",
          shape: {
            type: "segment",
            x1: chartWidth - 4,
            y1: 0,
            x2: chartWidth - 4,
            y2: chartHeight,
            thickness: 8,
          },
        },
        {
          id: "result-floor",
          shape: {
            type: "segment",
            x1: 0,
            y1: chartHeight - 4,
            x2: chartWidth,
            y2: chartHeight - 4,
            thickness: 8,
          },
        },
        ...[78, 132, 186].map((y, index) => ({
          id: `gate-sensor-${index}`,
          sensor: true,
          shape: {
            type: "segment",
            x1: chartWidth * 0.13,
            y1: y,
            x2: chartWidth * 0.87,
            y2: y,
            thickness: 5,
          },
        })),
      ],
      fixedDt: 1 / 60,
      maxSubsteps: 8,
      settleStepLimit: 2400,
      timeScale: 1.1,
      observation: { chartId: `analyst-adventure-${room.id}`, chartType: "StreamPhysicsFrame" },
    }),
    [chartHeight, chartWidth, room.id],
  )
  const chartProps = useMemo(
    () => ({
      data: fixture.settled,
      settledProjectionRows: BIN_ORDER.map((label) => ({
        id: label.toLowerCase().replaceAll(" ", "-"),
        label,
        count: fixture.counts[label] ?? 0,
      })),
      config,
      seed: 1984,
      paused: settledShown,
      accessibleTable: true,
      title: "The Room Where Forecasts Fall Down",
      description:
        "Thirty deterministic forecast bodies pass Denominator, Freshness, and Lineage gates into three result bins. Mort Zork is a separate gold body caught at the manual-lineage override sensor.",
      summary: `${fixture.counts.DEFENSIBLE ?? 0} defensible; ${fixture.counts["NEEDS CAVEAT"] ?? 0} need a caveat; ${fixture.counts["PURE EXECUTIVE WEATHER"] ?? 0} pure executive weather.`,
      annotations: annotations.map(({ content: _content, ...annotation }) => annotation),
    }),
    [annotations, config, fixture.counts, fixture.settled, settledShown],
  )

  return (
    <>
      {state.flags.annotationCabalFound ? (
        <section
          className="analyst-adventure__secret-discovery"
          aria-labelledby="analyst-adventure-annotation-cabal-title"
          aria-live="polite"
        >
          <span>{annotationCabalDiscovery.eyebrow}</span>
          <h2 id="analyst-adventure-annotation-cabal-title">
            {annotationCabalDiscovery.title}
          </h2>
          {annotationCabalDiscovery.narrative.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>
      ) : null}
      <AnalyticalRoom
        room={room}
        componentName="StreamPhysicsFrame"
        diagnosticComponentName="GauntletChart"
        chartProps={chartProps}
        data={fixture.settled}
        annotations={annotations}
        hintAnnotation={{
          type: "callout",
          bodyId: "mort-zork",
          label: "Gold token stopped at manual lineage override",
          dx: -58,
          dy: -34,
          color: "#ffd166",
        }}
        intent={["flow", "distribution"]}
        summary="PROCESS CLAIM: THREE GATES · stable settled projection available"
        chartHeight={chartHeight + 126}
        hintRequestToken={hintRequestToken}
        hintsRemaining={hintsRemaining}
        onHintUsed={onHintUsed}
        onInspect={onInspect}
        onAnalyticsReady={onAnalyticsReady}
        onActivateAnnotation={onActivateAnnotation}
        labelForDatum={(datum) =>
          `${datum.label}: ${datum.resultBin}; denominator ${datum.denominatorPresent ? "present" : "missing"}, evidence ${datum.freshEvidence ? "fresh" : "stale"}, lineage ${datum.lineageComplete ? "complete" : "incomplete"}`
        }
        renderChart={({
          annotations: mergedAnnotations,
          onInspect: inspect,
          onObservation,
          onAnnotationActivate,
          activeSelection,
        }) => (
          <div className="analyst-adventure__chart-with-controls">
            <div className="analyst-adventure__physics-controls">
              <button
                type="button"
                aria-pressed={settledShown}
                onClick={onShowSettledProjection}
              >
                {settledShown ? "SETTLED PROJECTION SHOWN" : "SHOW SETTLED PROJECTION"}
              </button>
              <span>
                PROJECT ORACLE // {" "}
                <span>{reducedMotion ? "REDUCED MOTION: FINAL STATE" : "SEED 1984"}</span>
              </span>
            </div>
            <StreamPhysicsFrame
              key={`${settledShown ? "settled" : "falling"}-${chartWidth}`}
              size={[chartWidth, chartHeight]}
              config={config}
              initialSpawns={spawns}
              seed={1984}
              paused={settledShown}
              suspendWhenHidden
              background="#071014"
              backgroundGraphics={() => processChrome(chartWidth, chartHeight)}
              bodyStyle={(body) => {
                const selected =
                  !activeSelection?.isActive ||
                  activeSelection.predicate(body.datum ?? {})
                return {
                  fill: body.datum?.kind === "ceo" ? "#ffd166" : "#55f6ff",
                  stroke: body.datum?.kind === "ceo" ? "#fff4b8" : "#083d46",
                  strokeWidth: body.datum?.kind === "ceo" ? 3 : 1.25,
                  opacity: selected ? 0.94 : 0.2,
                }
              }}
              selectedBodyStyle={{ fill: "#ff4fd8", stroke: "#f7fbff", strokeWidth: 3 }}
              selection={
                activeSelection?.isActive
                  ? {
                      isActive: true,
                      predicate: (body) => activeSelection.predicate(body.datum ?? {}),
                    }
                  : null
              }
              enableHover
              hoverRadius={20}
              tooltipContent={(hover) => (
                <div className="analyst-adventure__tooltip">
                  <strong>{hover.data?.label ?? hover.id}</strong>
                  <span>{hover.data?.resultBin ?? "in motion"}</span>
                  <span>growth claim {hover.data?.growthClaim ?? 0}%</span>
                </div>
              )}
              bodySemanticItemLimit={40}
              bodySemanticUpdateMs={settledShown ? 0 : 500}
              bodySemanticItems={(body) => ({
                label: body.datum?.label ?? body.id,
                description: `${body.datum?.resultBin ?? "in motion"}. Denominator ${body.datum?.denominatorPresent ? "present" : "missing"}; evidence ${body.datum?.freshEvidence ? "fresh" : "stale"}; lineage ${body.datum?.lineageComplete ? "complete" : "incomplete"}.`,
                group: body.datum?.kind === "ceo" ? "CEO intervention token" : "Forecast scenarios",
                datum: body.datum,
              })}
              semanticItems={semanticItems}
              onSemanticItemFocus={(item) => {
                const id = item?.bodyId ?? item?.id
                if (id) inspect?.(String(id), "keyboard")
              }}
              onSemanticItemActivate={(item) => {
                const id = item.bodyId ?? item.id
                if (id) inspect?.(String(id), "activate")
                if (id === "mort-zork") onChoose?.("vault-release-mort")
                if (id === "bin-pure-executive-weather") {
                  onActivateAnnotation("vault-janitor")
                }
              }}
              chartId={`analyst-adventure-${room.id}`}
              onObservation={onObservation}
              onAnnotationActivate={onAnnotationActivate}
              annotations={mergedAnnotations}
              accessibleTable
              description={chartProps.description}
              summary={chartProps.summary}
            />
            <table className="analyst-adventure__settled-ledger">
              <caption>Deterministic settled projection · 30 forecast scenarios</caption>
              <thead>
                <tr><th scope="col">Result bin</th><th scope="col">Count</th></tr>
              </thead>
              <tbody>
                {BIN_ORDER.map((label) => (
                  <tr key={label}><th scope="row">{label}</th><td>{fixture.counts[label] ?? 0}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      />
      <AnchoredChat
        open={activated && state.currentRoomId === "forecast-vault"}
        title="JANITOR"
        anchorLabel="Pure Executive Weather sensor"
        messages={["I keep telling them gravity is not a KPI."]}
        onClose={() => onActivateAnnotation("vault-janitor", { closeOnly: true })}
      />
    </>
  )
}
