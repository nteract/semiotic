import React, { useCallback, useMemo, useRef, useState } from "react"
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

const BIN_FILL = {
  DEFENSIBLE: "#55f6ff",
  "NEEDS CAVEAT": "#ffd166",
  "PURE EXECUTIVE WEATHER": "#ff4fd8",
  "MANUAL LINEAGE OVERRIDE": "#ffd166",
}

const BIN_STROKE = {
  DEFENSIBLE: "#083d46",
  "NEEDS CAVEAT": "#5c4508",
  "PURE EXECUTIVE WEATHER": "#4a0a3a",
  "MANUAL LINEAGE OVERRIDE": "#fff4b8",
}

const GATE_SPECS = [
  {
    id: "denominator-gate",
    label: "DENOMINATOR GATE",
    y: 78,
    property: "denominatorPresent",
    failNudge: 1,
  },
  {
    id: "freshness-gate",
    label: "FRESHNESS GATE",
    y: 132,
    property: "freshEvidence",
    failNudge: 1,
  },
  {
    id: "lineage-gate",
    label: "LINEAGE GATE",
    y: 186,
    property: "lineageComplete",
    failNudge: 1,
  },
]

/** Forecast bodies only — CEO is handled by the Mort Bin mini-game. */
const FORECAST_COUNT = 30
/** Mort arrives late so the player has a window after the forecast cascade. */
const MORT_SPAWN_AT = 2.65

const OUTCOME_COPY = {
  "error-no-catch": {
    title: "FATAL EXCEPTION 0x4D4F5254",
    lines: [
      "PROJECT ORACLE // 80286 REAL MODE",
      "A: LINEAGE.SYS",
      "B: MORT.BIN not mounted",
      "",
      "General Protection Fault at 0000:1984",
      "M.ZORK fell into a result bin like a common forecast.",
      "The CEO is not a scenario. Catch him next time.",
      "",
      "Press WATCH THEM FALL AGAIN to reboot the hopper.",
    ],
  },
  "error-wrong-catch": {
    title: "ABORT: MORT.BIN CONTAMINATED",
    lines: [
      "INT 13h  // disk / sensor mismatch",
      "MORT.BIN accepted a non-CEO body.",
      "",
      "Checksum fail on DATUM.KIND",
      "Expected: ceo",
      "Got: forecast scenario",
      "",
      "Deploy the Mort Bin only after the scenarios have",
      "cleared the gates — not while they are still falling.",
      "",
      "Press WATCH THEM FALL AGAIN to clear the sensor.",
    ],
  },
  success: {
    title: "LINEAGE OVERRIDE ARMED",
    lines: [
      "MORT.BIN locked // sensor OK",
      "M.ZORK held at manual override.",
      "Forecast piles remain uncontaminated.",
      "",
      "You may inspect the gold token or read the settled",
      "projection when you are done watching the cascade.",
    ],
  },
}

function scaledSettledPosition(body, width, height) {
  if (body.resultBin === "MANUAL LINEAGE OVERRIDE") {
    return {
      x: Math.max(18, Math.min(width - 18, (body.settledX / 600) * width)),
      y: Math.max(48, height * 0.42 + 17),
    }
  }
  const row = Math.max(0, Math.round((330 - body.settledY) / 18))
  const binFloor = height - 28
  return {
    x: Math.max(18, Math.min(width - 18, (body.settledX / 600) * width)),
    y: Math.max(48, binFloor - row * 14),
  }
}

function binCenterX(binLabel, width) {
  const index = BIN_ORDER.indexOf(binLabel)
  if (index < 0) return width * 0.65
  return (index + 0.5) * (width / 3)
}

/** Where Mort ends up if nobody deploys the Mort Bin — an ordinary PEW pile. */
function mortFailTarget(width, height) {
  return {
    x: binCenterX("PURE EXECUTIVE WEATHER", width),
    y: height - 28,
  }
}

function mortBinRect(width, height, deployed) {
  if (deployed) {
    return {
      x: width * 0.58,
      y: height * 0.42,
      width: width * 0.14,
      height: 34,
      cx: width * 0.65,
      cy: height * 0.42 + 17,
    }
  }
  // Stowed: top-right parking bay, out of the fall path.
  const w = Math.max(72, width * 0.15)
  const h = 36
  return {
    x: width - w - 8,
    y: 10,
    width: w,
    height: h,
    cx: width - w / 2 - 8,
    cy: 10 + h / 2,
  }
}

function pointInMortBin(body, rect, pad = 4) {
  return (
    body.x >= rect.x - pad &&
    body.x <= rect.x + rect.width + pad &&
    body.y >= rect.y - pad &&
    body.y <= rect.y + rect.height + pad
  )
}

function processChrome(width, height, mortBinDeployed) {
  const binWidth = width / 3
  const corridorTop = 210
  const mort = mortBinRect(width, height, mortBinDeployed)
  return (
    <g className="analyst-adventure__physics-chrome" aria-hidden="true">
      <rect x="0" y="0" width={width} height={height} fill="#071014" />
      {GATE_SPECS.map((gate, index) => (
        <g key={gate.id}>
          <line
            x1={width * 0.1}
            x2={width * 0.9}
            y1={gate.y}
            y2={gate.y}
            stroke={index === 2 ? "#ff4fd8" : "#55f6ff"}
            strokeWidth="3"
            strokeDasharray="10 7"
          />
          <text x={10} y={gate.y - 7} fill="#f7fbff" fontSize="10" fontWeight="700">
            {gate.label}
          </text>
        </g>
      ))}
      {[1, 2].map((index) => (
        <line
          key={`guide-${index}`}
          x1={(width / 3) * index}
          x2={(width / 3) * index}
          y1={corridorTop}
          y2={height - 66}
          stroke="rgba(247,251,255,0.12)"
          strokeWidth="2"
          strokeDasharray="4 6"
        />
      ))}
      {/* Mort Bin chrome — click target is the HTML button overlaid on top. */}
      <rect
        x={mort.x}
        y={mort.y}
        width={mort.width}
        height={mort.height}
        fill={mortBinDeployed ? "rgba(255,209,102,0.14)" : "rgba(255,209,102,0.06)"}
        stroke="#ffd166"
        strokeWidth="2"
        strokeDasharray={mortBinDeployed ? undefined : "5 4"}
      />
      <text
        x={mort.cx}
        y={mort.cy - 2}
        textAnchor="middle"
        fill="#ffd166"
        fontSize="9"
        fontWeight="700"
      >
        MORT BIN
      </text>
      <text
        x={mort.cx}
        y={mort.cy + 10}
        textAnchor="middle"
        fill="#ffd166"
        fontSize="8"
      >
        {mortBinDeployed ? "DEPLOYED" : "STOWED"}
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

/** Gate kick: fail drifts right toward Pure Executive Weather; pass holds lane. */
function gateImpulse(body, gate, width) {
  const datum = body.datum
  if (!datum || datum.kind === "ceo") {
    // Mort rides with the pack until the Mort Bin is deployed under him.
    return { x: width * 0.015, y: 4 }
  }
  const passed = Boolean(datum[gate.property])
  if (passed) {
    return { x: -width * 0.035, y: 4 }
  }
  return { x: width * (0.06 + gate.failNudge * 0.04), y: 10 }
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
  onSecretCalendarWarp: _onSecretCalendarWarp,
}) {
  const fixture = useMemo(forecastData, [])
  const chartWidth = Math.max(300, width)
  const chartHeight = chartWidth < 480 ? 360 : 390
  const [fallRunId, setFallRunId] = useState(0)
  const [forceFalling, setForceFalling] = useState(false)
  const [mortBinDeployed, setMortBinDeployed] = useState(false)
  const [runOutcome, setRunOutcome] = useState(null)
  /** React state so the janitor annotation can mount once Mort is in the bin. */
  const [mortCaught, setMortCaught] = useState(false)
  const mortCaughtRef = useRef(false)
  const outcomeLockedRef = useRef(false)
  const mortBinDeployedRef = useRef(false)

  const settledShown =
    reducedMotion ||
    (!forceFalling && Boolean(state.flags.settledProjectionShown))
  const activated = state.activatedAnnotationIds.includes("vault-janitor")
  const playActive = !settledShown && !reducedMotion
  // Settled projection parks Mort in the override bay; live play only after a catch.
  const mortInBin = settledShown || mortCaught

  const markMortCaught = useCallback(() => {
    if (mortCaughtRef.current) return
    mortCaughtRef.current = true
    setMortCaught(true)
  }, [])

  const showSettledProjection = useCallback(() => {
    setForceFalling(false)
    setMortBinDeployed(false)
    mortBinDeployedRef.current = false
    setRunOutcome(null)
    outcomeLockedRef.current = false
    mortCaughtRef.current = false
    setMortCaught(false)
    onShowSettledProjection?.()
  }, [onShowSettledProjection])

  const watchThemFallAgain = useCallback(() => {
    if (reducedMotion) return
    setForceFalling(true)
    setMortBinDeployed(false)
    mortBinDeployedRef.current = false
    setRunOutcome(null)
    outcomeLockedRef.current = false
    mortCaughtRef.current = false
    setMortCaught(false)
    setFallRunId((run) => run + 1)
  }, [reducedMotion])

  const deployMortBin = useCallback(() => {
    if (!playActive || outcomeLockedRef.current || mortBinDeployedRef.current) return
    mortBinDeployedRef.current = true
    setMortBinDeployed(true)
  }, [playActive])

  const spawns = useMemo(
    () =>
      fixture.settled.map((body, index) => {
        const final = scaledSettledPosition(body, chartWidth, chartHeight)
        const hopperX = chartWidth * 0.5 + ((index % 9) - 4) * 9
        const isCeo = body.kind === "ceo"
        return {
          id: body.id,
          x: settledShown ? final.x : hopperX,
          y: settledShown ? final.y : 12 + (index % 5) * 4,
          vx: settledShown ? 0 : ((index % 5) - 2) * 10,
          vy: settledShown ? 0 : 18 + (index % 3) * 8,
          mass: isCeo ? 2.4 : 1,
          // Forecasts cascade first; Mort is delayed so the deploy window is real.
          spawnAt: settledShown ? 0 : isCeo ? MORT_SPAWN_AT : index * 0.05,
          shape: { type: "circle", radius: isCeo ? 9 : 6 },
          datum: body,
        }
      }),
    [chartHeight, chartWidth, fixture.settled, settledShown],
  )

  const chrome = useMemo(
    () => processChrome(chartWidth, chartHeight, settledShown || mortBinDeployed),
    [chartHeight, chartWidth, mortBinDeployed, settledShown],
  )

  const mortRect = useMemo(
    () => mortBinRect(chartWidth, chartHeight, settledShown || mortBinDeployed),
    [chartHeight, chartWidth, mortBinDeployed, settledShown],
  )

  const bodyForces = useCallback(
    ({ body }) => {
      if (settledShown) return null
      const datum = body.datum
      if (!datum) return null

      if (datum.kind === "ceo") {
        if (mortBinDeployedRef.current) {
          const target = mortBinRect(chartWidth, chartHeight, true)
          const dx = target.cx - body.x
          const dy = target.cy - body.y
          return {
            x: dx * 12 - body.vx * 1.5,
            y: dy * 10 - body.vy * 1.2,
          }
        }
        // No bin: Mort falls into Pure Executive Weather with the failures.
        const fail = mortFailTarget(chartWidth, chartHeight)
        const dx = fail.x - body.x
        const afterLineage = Math.max(0, Math.min(1, (body.y - 170) / (chartHeight - 220)))
        const strength = 1.2 + afterLineage * 12
        return {
          x: dx * strength - body.vx * (0.3 + afterLineage * 0.8),
          y: 0,
        }
      }

      const target = scaledSettledPosition(datum, chartWidth, chartHeight)
      const dx = target.x - body.x
      const dy = target.y - body.y
      const afterLineage = Math.max(0, Math.min(1, (body.y - 170) / (chartHeight - 220)))
      const strength = 1.6 + afterLineage * 16
      return {
        x: dx * strength - body.vx * (0.35 + afterLineage * 0.9),
        y: afterLineage > 0.75 ? Math.min(0, dy * 2) : 0,
      }
    },
    [chartHeight, chartWidth, settledShown],
  )

  const regionEffects = useMemo(() => {
    if (settledShown) return []
    const gateWidth = chartWidth * 0.82
    const gateX = chartWidth / 2
    const gates = GATE_SPECS.map((gate) => ({
      id: gate.id,
      kind: "charge-gate",
      label: gate.label,
      description: `${gate.label} checks one requirement on every forecast body.`,
      shape: {
        type: "aabb",
        x: gateX,
        y: gate.y,
        width: gateWidth,
        height: 18,
      },
      charge: ({ body }) =>
        body.datum?.kind === "ceo"
          ? "ceo"
          : body.datum?.[gate.property]
            ? "pass"
            : "fail",
      impulseOnEnter: ({ body }) => gateImpulse(body, gate, chartWidth),
      damping: 0.04,
      bodyStyle: (_body, ctx) => {
        const charge = ctx.regionState?.charges?.[gate.id]
        if (charge === "fail") {
          return { stroke: "#ff4fd8", strokeWidth: 2.5, opacity: 1 }
        }
        if (charge === "pass") {
          return { stroke: "#55f6ff", strokeWidth: 2, opacity: 1 }
        }
        return undefined
      },
      semanticItem: false,
    }))

    const binAttractors = BIN_ORDER.map((label, index) => ({
      id: `bin-attractor-${index}`,
      kind: "force-field",
      label: `${label} attractor`,
      shape: {
        type: "aabb",
        x: binCenterX(label, chartWidth),
        y: chartHeight - 40,
        width: chartWidth / 3 - 12,
        height: 50,
      },
      bodyFilter: { property: "datum.resultBin", equals: label },
      force: ({ body }) => {
        const targetX = binCenterX(label, chartWidth)
        return {
          x: (targetX - body.x) * 6 - body.vx * 0.8,
          y: 8,
        }
      },
      damping: 0.12,
      semanticItem: false,
    }))

    if (!mortBinDeployed) {
      return [...gates, ...binAttractors]
    }

    const deployed = mortBinRect(chartWidth, chartHeight, true)
    const mortCatch = {
      id: "mort-bin-catch",
      kind: "force-field",
      label: "Mort Bin",
      description: "Deployed Mort Bin — holds the CEO token only.",
      shape: {
        type: "aabb",
        x: deployed.cx,
        y: deployed.cy,
        width: deployed.width,
        height: deployed.height,
      },
      // Force only the CEO; contamination is detected in onTick for any body
      // that intersects the bay (including forecasts that slip in).
      force: ({ body }) => {
        if (body.datum?.kind !== "ceo") return null
        return {
          x: (deployed.cx - body.x) * 14 - body.vx * 2,
          y: (deployed.cy - body.y) * 12 - body.vy * 2,
        }
      },
      damping: 0.08,
      impulseOnEnter: ({ body }) =>
        body.datum?.kind === "ceo" ? { x: 0, y: -24 } : { x: 0, y: 0 },
      bodyStyle: (body) =>
        body.datum?.kind === "ceo"
          ? { fill: "#ffd166", stroke: "#fff4b8", strokeWidth: 3, opacity: 1 }
          : { stroke: "#ff707f", strokeWidth: 2.5, opacity: 1 },
      semanticItem: false,
    }

    return [...gates, mortCatch, ...binAttractors]
  }, [chartHeight, chartWidth, mortBinDeployed, settledShown])

  const lockOutcome = useCallback((next) => {
    if (outcomeLockedRef.current) return
    outcomeLockedRef.current = true
    setRunOutcome(next)
  }, [])

  const dismissOutcomeBanner = useCallback(() => {
    // Keep the run result locked so onTick does not re-open the panel; only hide UI.
    setRunOutcome(null)
  }, [])

  const handleTick = useCallback(
    (result, controls) => {
      if (settledShown || outcomeLockedRef.current) return
      const bodies = controls.readBodies()
      if (!bodies.length) return

      const deployed = mortBinDeployedRef.current
      const catchRect = mortBinRect(chartWidth, chartHeight, true)

      if (deployed) {
        for (const body of bodies) {
          if (!pointInMortBin(body, catchRect, 6)) continue
          if (body.datum?.kind === "ceo" || body.id === "mort-zork") {
            markMortCaught()
          } else {
            lockOutcome("error-wrong-catch")
            return
          }
        }
      }

      // Continuous bodyForces keep the sim "awake", so do not wait for allSleeping.
      // Resolve the run once the cascade has finished its story beat:
      // forecasts piled, Mort either caught or sitting in a result bin.
      const forecasts = bodies.filter((body) => body.datum?.kind !== "ceo")
      const mort = bodies.find((body) => body.id === "mort-zork" || body.datum?.kind === "ceo")
      if (forecasts.length < FORECAST_COUNT || !mort) return

      const nearFloor = (body) => body.y >= chartHeight * 0.68
      const forecastsDown = forecasts.every(nearFloor)
      if (!forecastsDown) return

      if (deployed && pointInMortBin(mort, catchRect, 10)) {
        markMortCaught()
      }

      const mortDown = nearFloor(mort) || mortCaughtRef.current
      // Give Mort time to spawn and fall after the delayed spawnAt.
      if (!mortDown || result.elapsedSeconds < MORT_SPAWN_AT + 1.15) return

      if (mortCaughtRef.current) {
        lockOutcome("success")
      } else {
        lockOutcome("error-no-catch")
      }
    },
    [chartHeight, chartWidth, lockOutcome, markMortCaught, settledShown],
  )

  const annotations = useMemo(() => {
    // Secret janitor note only exists when Mort is sitting in the Mort Bin.
    if (!mortInBin) return []
    const bin = mortBinRect(chartWidth, chartHeight, true)
    return [
      {
        id: "vault-janitor",
        stableId: "vault-janitor",
        type: "widget",
        px: bin.cx,
        py: bin.cy,
        label: "JANITOR annotation on the Mort Bin",
        navigationLabel: "JANITOR comment on the Mort Bin holding M. Zork",
        width: 44,
        height: 44,
        content: (
          <AdventureAnnotation
            label="Activate the janitor annotation on the Mort Bin"
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
    ]
  }, [activated, chartHeight, chartWidth, mortInBin])

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
        id: "mort-bin",
        label: mortBinDeployed || settledShown ? "Mort Bin (deployed)" : "Mort Bin (stowed)",
        description: settledShown
          ? "Mort Bin holds the CEO intervention token at the lineage override."
          : mortBinDeployed
            ? "Mort Bin is deployed under the cascade to catch M. Zork only."
            : "Click to deploy the Mort Bin into the cascade path before Mort falls.",
        x: mortRect.cx,
        y: mortRect.cy,
        width: mortRect.width,
        height: mortRect.height,
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
    [
      chartHeight,
      chartWidth,
      fixture.counts,
      mortBinDeployed,
      mortRect,
      settledShown,
    ],
  )

  const config = useMemo(
    () => ({
      kernel: {
        seed: 1984,
        gravity: settledShown ? { x: 0, y: 0 } : { x: 0, y: 240 },
        restitution: 0.1,
        friction: 0.72,
        velocityDamping: 0.99,
        collisionIterations: 5,
        sleepSpeed: 4,
        sleepAfter: 0.45,
        maxVelocity: 320,
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
            thickness: 10,
          },
        },
        ...[1, 2].map((index) => ({
          id: `bin-divider-${index}`,
          shape: {
            type: "segment",
            x1: (chartWidth / 3) * index,
            y1: 210,
            x2: (chartWidth / 3) * index,
            y2: chartHeight - 4,
            thickness: 7,
          },
        })),
        // Shelf only when the Mort Bin is in the cascade (or settled snapshot).
        ...((settledShown || mortBinDeployed)
          ? [
              {
                id: "mort-bin-shelf",
                bodyFilter: { property: "datum.kind", equals: "ceo" },
                shape: {
                  type: "segment",
                  x1: chartWidth * 0.58,
                  y1: chartHeight * 0.42 + 34,
                  x2: chartWidth * 0.72,
                  y2: chartHeight * 0.42 + 34,
                  thickness: 8,
                },
              },
            ]
          : []),
      ],
      fixedDt: 1 / 60,
      maxSubsteps: 8,
      settleStepLimit: 2400,
      timeScale: 1.15,
      observation: { chartId: `analyst-adventure-${room.id}`, chartType: "StreamPhysicsFrame" },
    }),
    [chartHeight, chartWidth, mortBinDeployed, room.id, settledShown],
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
        "Thirty forecast bodies pass three gates into result bins. Deploy the Mort Bin after the scenarios clear and before gold M. Zork falls, or the CEO lands in a result bin like weather.",
      summary: `${fixture.counts.DEFENSIBLE ?? 0} defensible; ${fixture.counts["NEEDS CAVEAT"] ?? 0} need a caveat; ${fixture.counts["PURE EXECUTIVE WEATHER"] ?? 0} pure executive weather. Mort Bin mini-game: click to deploy.`,
      annotations: annotations.map(({ content: _content, ...annotation }) => annotation),
    }),
    [annotations, config, fixture.counts, fixture.settled, settledShown],
  )

  const outcomeBanner = runOutcome ? OUTCOME_COPY[runOutcome] : null
  const statusLine = reducedMotion
    ? "REDUCED MOTION: FINAL STATE"
    : settledShown
      ? "BINS PARKED"
      : runOutcome === "success"
        ? "MORT CAUGHT · LINEAGE OK"
        : runOutcome === "error-no-catch"
          ? "FAULT · MORT LOST TO BINS"
          : runOutcome === "error-wrong-catch"
            ? "FAULT · MORT.BIN CONTAMINATED"
            : mortBinDeployed
              ? `MORT BIN DEPLOYED · RUN ${fallRunId + 1}`
              : `FALLING · CLICK MORT BIN · RUN ${fallRunId + 1}`

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
        hintAnnotation={
          mortInBin
            ? {
                type: "callout",
                px: mortRect.cx,
                py: mortRect.cy,
                label: "Janitor note on the Mort Bin",
                dx: -48,
                dy: -36,
                color: "#ffd166",
              }
            : undefined
        }
        intent={["flow", "distribution"]}
        summary="PROCESS CLAIM: THREE GATES · deploy Mort Bin to catch the CEO"
        chartHeight={chartHeight + 72}
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
          <div className="analyst-adventure__chart-with-controls analyst-adventure__chart-with-controls--physics">
            <div className="analyst-adventure__physics-controls">
              <button
                type="button"
                aria-pressed={settledShown}
                onClick={showSettledProjection}
              >
                {settledShown ? "SETTLED PROJECTION SHOWN" : "SHOW SETTLED PROJECTION"}
              </button>
              <button
                type="button"
                disabled={reducedMotion}
                onClick={watchThemFallAgain}
                title={
                  reducedMotion
                    ? "Falling motion is disabled when prefer-reduced-motion is on"
                    : "Restart the cascade; Mort Bin returns to the top-right stow"
                }
              >
                WATCH THEM FALL AGAIN
              </button>
              <span>
                PROJECT ORACLE // <span>{statusLine}</span>
              </span>
            </div>
            <div
              className="analyst-adventure__vault-stage"
              style={{ width: chartWidth, height: chartHeight }}
            >
              <StreamPhysicsFrame
                key={`${settledShown ? "settled" : "falling"}-${chartWidth}-${fallRunId}`}
                size={[chartWidth, chartHeight]}
                config={config}
                initialSpawns={spawns}
                seed={1984}
                paused={settledShown}
                continuous={!settledShown}
                suspendWhenHidden
                background="#071014"
                backgroundGraphics={chrome}
                regionEffects={regionEffects}
                bodyForces={bodyForces}
                onTick={playActive ? handleTick : undefined}
                bodyStyle={(body) => {
                  const selected =
                    !activeSelection?.isActive ||
                    activeSelection.predicate(body.datum ?? {})
                  const bin = body.datum?.resultBin
                  const fill =
                    body.datum?.kind === "ceo"
                      ? "#ffd166"
                      : (BIN_FILL[bin] ?? "#55f6ff")
                  const stroke =
                    body.datum?.kind === "ceo"
                      ? "#fff4b8"
                      : (BIN_STROKE[bin] ?? "#083d46")
                  return {
                    fill,
                    stroke,
                    strokeWidth: body.datum?.kind === "ceo" ? 3 : 1.4,
                    opacity: selected ? 0.96 : 0.3,
                  }
                }}
                selectedBodyStyle={{ fill: "#f7fbff", stroke: "#ff4fd8", strokeWidth: 3 }}
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
                    <span>
                      gates{" "}
                      {[
                        hover.data?.denominatorPresent ? "denom" : "—",
                        hover.data?.freshEvidence ? "fresh" : "—",
                        hover.data?.lineageComplete ? "lineage" : "—",
                      ].join(" · ")}
                    </span>
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
                  if (id === "mort-bin" && playActive && !mortBinDeployed) {
                    deployMortBin()
                    return
                  }
                  if (id) inspect?.(String(id), "keyboard")
                }}
                onSemanticItemActivate={(item) => {
                  const id = item.bodyId ?? item.id
                  if (id === "mort-bin" && playActive && !mortBinDeployed) {
                    deployMortBin()
                    return
                  }
                  if (id) inspect?.(String(id), "activate")
                  if (id === "mort-zork") onChoose?.("vault-release-mort")
                  if (id === "mort-bin" && mortInBin) {
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
              {playActive && !mortBinDeployed ? (
                <button
                  type="button"
                  className="analyst-adventure__mort-bin-hit"
                  style={{
                    left: mortRect.x,
                    top: mortRect.y,
                    width: mortRect.width,
                    height: mortRect.height,
                  }}
                  onClick={deployMortBin}
                  aria-label="Deploy Mort Bin into the cascade path"
                >
                  <span className="analyst-adventure__mort-bin-hit-label">MORT BIN</span>
                </button>
              ) : null}
              {outcomeBanner ? (
                <div
                  className={`analyst-adventure__c64-fault analyst-adventure__c64-fault--${runOutcome}`}
                  role="alert"
                  aria-live="assertive"
                >
                  <div className="analyst-adventure__c64-fault-bar">
                    <span>{runOutcome === "success" ? "READY." : "BREAK"}</span>
                    <button
                      type="button"
                      className="analyst-adventure__c64-fault-close"
                      onClick={dismissOutcomeBanner}
                      aria-label="Close message"
                      title="Close"
                    >
                      ×
                    </button>
                  </div>
                  <h3>{outcomeBanner.title}</h3>
                  {outcomeBanner.lines.map((line, index) =>
                    line ? (
                      <p key={`line-${index}`}>{line}</p>
                    ) : (
                      <p key={`blank-${index}`} className="analyst-adventure__c64-fault-blank">
                        &nbsp;
                      </p>
                    ),
                  )}
                  {runOutcome !== "success" ? (
                    <button type="button" onClick={watchThemFallAgain}>
                      REBOOT HOPPER
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        )}
      />
      <table className="analyst-adventure__settled-ledger">
        <caption>Deterministic settled projection · 30 forecast scenarios</caption>
        <thead>
          <tr>
            <th scope="col">Result bin</th>
            <th scope="col">Count</th>
          </tr>
        </thead>
        <tbody>
          {BIN_ORDER.map((label) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{fixture.counts[label] ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <AnchoredChat
        open={activated && state.currentRoomId === "forecast-vault"}
        title="JANITOR"
        anchorLabel="Mort Bin"
        messages={["I keep telling them gravity is not a KPI."]}
        onClose={() => onActivateAnnotation("vault-janitor", { closeOnly: true })}
      />
    </>
  )
}
