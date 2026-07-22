import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { StreamPhysicsFrame } from "semiotic/physics"
import { useReducedMotion } from "semiotic/utils"

import { paddedHull, tracePolygon } from "./cruciblePreviewUtils.js"

const frameSize = [760, 460]
const parcelKg = 5
const bodyRadius = 8

const phases = [
  { id: "charge", label: "Charge", duration: 1.6, metric: "Load 16 traced recipe parcels" },
  { id: "melt", label: "Melt", duration: 2.4, metric: "Homogenize the 80 kg sister heat" },
  { id: "treat", label: "Treat", duration: 2.6, metric: "Apply the recorded treatment route" },
  { id: "assay", label: "Assay", duration: 2.4, metric: "Post the observed laboratory panel" },
  { id: "route", label: "Cast / route", duration: 2.2, metric: "Enact the authored disposition" },
]

const phaseStarts = phases.map((_, index) =>
  phases.slice(0, index).reduce((total, phase) => total + phase.duration, 0),
)
const phaseEnds = phases.map((phase, index) => phaseStarts[index] + phase.duration)
const programDuration = phaseEnds.at(-1)

function timeInPhase(phaseId, progress) {
  const index = phases.findIndex((phase) => phase.id === phaseId)
  return phaseStarts[index] + phases[index].duration * progress
}

const eventTimes = {
  charged: timeInPhase("charge", 0.58),
  homogenized: timeInPhase("melt", 0.48),
  skimmed: timeInPhase("treat", 0.28),
  treated: timeInPhase("treat", 0.76),
  assayed: timeInPhase("assay", 0.58),
  routed: timeInPhase("route", 0.34),
  complete: programDuration,
}

const parcelCategories = [
  { id: "extrusion", label: "Clean extrusion return", code: "E", color: "#2563eb" },
  { id: "chips", label: "Machining briquette", code: "C", color: "#0f766e" },
  { id: "mixed", label: "Mixed remelt return", code: "M", color: "#d97706" },
  { id: "makeup", label: "Clean make-up metal", code: "A", color: "#7c3aed" },
  { id: "trim", label: "Mg-Si trim parcel", code: "T", color: "#db2777" },
]

const parcels = [
  ...Array.from({ length: 8 }, (_, index) => ({
    id: `EXT-${String(index + 1).padStart(2, "0")}`,
    category: "extrusion",
    sourceLot: index < 4 ? "EX-4407" : "EX-4412",
    note: "verified R-17 extrusion offcut",
  })),
  ...Array.from({ length: 3 }, (_, index) => ({
    id: `CHIP-${String(index + 1).padStart(2, "0")}`,
    category: "chips",
    sourceLot: "BR-118",
    note: index === 2 ? "oily fines fraction" : "washed and briquetted turnings",
  })),
  {
    id: "MIX-01",
    category: "mixed",
    sourceLot: "MR-882",
    note: "iron-bearing mixed return",
  },
  {
    id: "MIX-02",
    category: "mixed",
    sourceLot: "MR-886",
    note: "oxide-rich mixed return",
  },
  {
    id: "AL-01",
    category: "makeup",
    sourceLot: "AL-229",
    note: "clean make-up ingot",
  },
  {
    id: "AL-02",
    category: "makeup",
    sourceLot: "AL-229",
    note: "clean make-up ingot",
  },
  {
    id: "TRIM-01",
    category: "trim",
    sourceLot: "TR-064",
    note: "recorded chemistry trim",
  },
].map((parcel) => ({ ...parcel, kg: parcelKg }))

const categoryById = new Map(parcelCategories.map((category) => [category.id, category]))
const parcelById = new Map(parcels.map((parcel) => [parcel.id, parcel]))
const mainParcelIds = parcels
  .map((parcel) => parcel.id)
  .filter((id) => !["CHIP-03", "MIX-01", "MIX-02"].includes(id))

const moldCriteria = [
  {
    id: "magnesium",
    label: "Magnesium",
    mold: "0.80–1.10%",
    purpose: "R-17 chemistry window",
  },
  { id: "silicon", label: "Silicon", mold: "0.50–0.75%", purpose: "R-17 chemistry window" },
  { id: "iron", label: "Iron", mold: "≤ 0.40%", purpose: "plant remelt ceiling" },
  {
    id: "hydrogen",
    label: "Dissolved hydrogen",
    mold: "≤ 0.20 mL / 100 g",
    purpose: "porosity control",
  },
  {
    id: "inclusions",
    label: "Inclusion index",
    mold: "≤ 2.0 mm² / kg",
    purpose: "extrusion cleanliness",
  },
]

const sharedRoutes = Object.fromEntries([
  ...mainParcelIds.map((id) => [id, "main"]),
  ["MIX-01", "foundry"],
  ["CHIP-03", "dross"],
])

const treatmentRuns = [
  {
    id: "skim",
    heat: "Heat 24A",
    label: "Skim only",
    treatment: "Cover flux + hand skim; no degassing or inline filtration",
    mainRoute: "rework",
    disposition: "Rework: degas and filter before release",
    decisionReason: "Hydrogen and inclusion observations exceed the R-17 mold.",
    routes: { ...sharedRoutes, "MIX-02": "dross" },
    routeReasons: {
      main: "H₂ 0.29 and inclusion index 3.6 exceed the mold",
      foundry: "Fe-bearing parcel is segregated to foundry return",
      dross: "oily fines and oxide-rich return report to skim dross",
      filter: "no filter cake in this treatment route",
    },
    assay: {
      magnesium: { value: "0.91%", status: "pass" },
      silicon: { value: "0.63%", status: "pass" },
      iron: { value: "0.32%", status: "pass" },
      hydrogen: { value: "0.29 mL / 100 g", status: "exception" },
      inclusions: { value: "3.6 mm² / kg", status: "exception" },
    },
  },
  {
    id: "filtered",
    heat: "Heat 24B",
    label: "Degas + filter",
    treatment: "Rotary argon degas + 30 ppi ceramic-foam filter",
    mainRoute: "accepted",
    disposition: "Release: cast as R-17 extrusion billet",
    decisionReason: "Every posted chemistry and cleanliness observation is inside the mold.",
    routes: { ...sharedRoutes, "MIX-02": "filter" },
    routeReasons: {
      main: "all posted observations satisfy the R-17 mold",
      foundry: "Fe-bearing parcel is segregated to foundry return",
      dross: "oily fines report to skim dross",
      filter: "oxide-rich inclusions are retained in the filter cake",
    },
    assay: {
      magnesium: { value: "0.89%", status: "pass" },
      silicon: { value: "0.62%", status: "pass" },
      iron: { value: "0.33%", status: "pass" },
      hydrogen: { value: "0.14 mL / 100 g", status: "pass" },
      inclusions: { value: "1.4 mm² / kg", status: "pass" },
    },
  },
]

const runById = new Map(treatmentRuns.map((run) => [run.id, run]))

const paceOptions = [
  { value: 0.35, label: "Very slow · 0.35×" },
  { value: 0.65, label: "Slow · 0.65×" },
  { value: 1, label: "Normal · 1×" },
  { value: 1.35, label: "Fast · 1.35×" },
]

const autoReplayOptions = [
  { value: "off", delay: null, label: "Off" },
  { value: "1500", delay: 1500, label: "1,500 ms" },
  { value: "3000", delay: 3000, label: "3,000 ms" },
  { value: "6000", delay: 6000, label: "6,000 ms" },
]

const vesselCenter = { x: 380, y: 232 }
const vesselPath = "M 158 108 L 205 343 Q 380 398 555 343 L 602 108"
const destinationCenters = {
  accepted: { x: 380, y: 343 },
  rework: { x: 670, y: 190 },
  foundry: { x: 670, y: 315 },
  dross: { x: 82, y: 190 },
  filter: { x: 82, y: 292 },
}

const chargeSlots = parcels.map((_, index) => ({
  x: 278 + (index % 4) * 68,
  y: 154 + Math.floor(index / 4) * 47,
}))

const initialSpawns = parcels.map((parcel, index) => ({
  id: parcel.id,
  x: 245 + (index % 8) * 39,
  y: 91 + Math.floor(index / 8) * 13,
  vx: (index % 5) * 2.5 - 5,
  vy: 3,
  mass: 1,
  shape: { type: "circle", radius: bodyRadius },
  datum: { ...parcel, role: "trace-parcel", parcelId: parcel.id },
}))

function stateAt(elapsed) {
  const time = Math.max(0, Math.min(programDuration, Number(elapsed) || 0))
  const phaseIndex =
    time >= programDuration
      ? phases.length - 1
      : Math.max(
          0,
          phaseEnds.findIndex((end) => time < end),
        )

  return {
    time,
    phaseIndex,
    charged: time >= eventTimes.charged,
    homogenized: time >= eventTimes.homogenized,
    skimmed: time >= eventTimes.skimmed,
    treated: time >= eventTimes.treated,
    assayed: time >= eventTimes.assayed,
    routed: time >= eventTimes.routed,
    complete: time >= eventTimes.complete,
  }
}

function stateKey(state) {
  return [
    state.phaseIndex,
    state.charged,
    state.homogenized,
    state.skimmed,
    state.treated,
    state.assayed,
    state.routed,
    state.complete,
  ].join("|")
}

function normalizePace(value) {
  const numeric = Number(value)
  return paceOptions.some((option) => option.value === numeric) ? numeric : 0.65
}

function normalizeRerunDelay(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null
}

function destinationFor(parcel, state, run) {
  const route = run.routes[parcel.id]
  if ((route === "dross" || route === "filter") && state.skimmed) return route
  if (state.routed) return route === "main" ? run.mainRoute : route
  if (state.treated && route === "main") return "main"
  if (state.homogenized) return "melt"
  if (state.charged) return "charge"
  return "queue"
}

function routeReason(parcel, state, run) {
  const route = run.routes[parcel.id]
  if (route === "main") {
    if (!state.assayed) return "awaiting the observed assay panel"
    return run.routeReasons.main
  }
  if (route === "foundry") {
    return state.routed ? run.routeReasons.foundry : "awaiting post-assay segregation"
  }
  if (route === "dross") {
    return state.skimmed ? run.routeReasons.dross : "awaiting the recorded skim event"
  }
  return state.skimmed ? run.routeReasons.filter : "awaiting the recorded filtration event"
}

function destinationLabel(destination) {
  return (
    {
      queue: "Charge queue",
      charge: "Crucible charge",
      melt: "Homogenizing melt",
      main: "Main melt · assay pending",
      accepted: "R-17 billet release",
      rework: "Rework hold",
      foundry: "Foundry return",
      dross: "Skim dross",
      filter: "Filter cake",
    }[destination] || destination
  )
}

function parcelStatus(parcel, state, run) {
  const destination = destinationFor(parcel, state, run)
  if (destination === "queue") return "queued"
  if (destination === "charge") return "charged"
  if (destination === "melt") return "homogenizing"
  if (destination === "main") return "treated; awaiting assay disposition"
  if (destination === "accepted") return "released to R-17 billet"
  if (destination === "rework") return "held for rework"
  if (destination === "foundry") return "segregated as foundry return"
  if (destination === "dross") return "removed as skim dross"
  return "captured in filter cake"
}

function destinationMembers(destination, run) {
  return parcels.filter((parcel) => {
    const route = run.routes[parcel.id]
    if (destination === "accepted" || destination === "rework") {
      return route === "main" && run.mainRoute === destination
    }
    return route === destination
  })
}

function cohortOffset(index, count, spread = 36) {
  if (count <= 1) return { x: 0, y: 0 }
  if (count === 2) return { x: index === 0 ? -14 : 14, y: 0 }
  if (count <= 6) {
    const angle = -Math.PI / 2 + index * ((Math.PI * 2) / count)
    return { x: Math.cos(angle) * spread * 0.62, y: Math.sin(angle) * spread * 0.62 }
  }
  if (index === 0) return { x: 0, y: 0 }
  if (index <= 6) {
    const angle = -Math.PI / 2 + (index - 1) * (Math.PI / 3)
    return { x: Math.cos(angle) * spread * 0.56, y: Math.sin(angle) * spread * 0.56 }
  }
  const outerCount = count - 7
  const angle = -Math.PI / 2 + (index - 7) * ((Math.PI * 2) / Math.max(1, outerCount))
  return { x: Math.cos(angle) * spread, y: Math.sin(angle) * spread }
}

function targetInDestination(parcel, destination, run) {
  const members = destinationMembers(destination, run)
  const index = members.findIndex((member) => member.id === parcel.id)
  const offset = cohortOffset(index, members.length, destination === "rework" ? 43 : 39)
  const center = destinationCenters[destination]
  return { x: center.x + offset.x, y: center.y + offset.y }
}

function targetForParcel(parcel, state, run, elapsed) {
  const destination = destinationFor(parcel, state, run)

  if (["accepted", "rework", "foundry", "dross", "filter"].includes(destination)) {
    return targetInDestination(parcel, destination, run)
  }

  const index = parcels.findIndex((candidate) => candidate.id === parcel.id)
  if (destination === "queue") {
    return { x: initialSpawns[index].x, y: initialSpawns[index].y }
  }
  if (destination === "charge") return chargeSlots[index]

  if (destination === "main") {
    const mainIndex = mainParcelIds.indexOf(parcel.id)
    const offset = cohortOffset(mainIndex, mainParcelIds.length, 62)
    return { x: vesselCenter.x + offset.x, y: vesselCenter.y + 24 + offset.y * 0.78 }
  }

  const angle = elapsed * 2.15 + index * 1.17
  const orbit = 46 + (index % 4) * 9
  return {
    x: vesselCenter.x + Math.cos(angle) * orbit,
    y: vesselCenter.y + Math.sin(angle) * orbit * 0.72,
  }
}

function forceToTarget(body, target, stiffness = 21, damping = 5) {
  return {
    x: (target.x - body.x) * stiffness - body.vx * damping,
    y: (target.y - body.y) * stiffness - body.vy * damping,
  }
}

function bodyForce(body, state, run, elapsed) {
  const parcel = parcelById.get(body.id)
  if (!parcel) return null
  const destination = destinationFor(parcel, state, run)
  const stiffness = ["accepted", "rework", "foundry", "dross", "filter"].includes(destination)
    ? 31
    : destination === "main"
      ? 25
      : state.phaseIndex === 1 || state.phaseIndex === 2
        ? 16
        : 20
  const damping = destination === "melt" ? 3.4 : 5.8
  return forceToTarget(body, targetForParcel(parcel, state, run, elapsed), stiffness, damping)
}

function terminalSpawns(run) {
  const terminal = stateAt(programDuration)
  return initialSpawns.map((spawn) => {
    const parcel = parcelById.get(spawn.id)
    const target = targetForParcel(parcel, terminal, run, programDuration)
    return { ...spawn, ...target, vx: 0, vy: 0 }
  })
}

function massAtDestination(destination, state, run) {
  return parcels.reduce(
    (total, parcel) => total + (destinationFor(parcel, state, run) === destination ? parcel.kg : 0),
    0,
  )
}

function projectionFor(state, run) {
  return {
    input: state.charged ? 80 : 0,
    main: state.treated ? 65 : 0,
    accepted: state.routed ? massAtDestination("accepted", state, run) : null,
    rework: state.routed ? massAtDestination("rework", state, run) : null,
    foundry: state.routed ? massAtDestination("foundry", state, run) : null,
    dross: state.skimmed ? massAtDestination("dross", state, run) : null,
    filter: state.skimmed ? massAtDestination("filter", state, run) : null,
    balance: state.complete ? 80 : null,
  }
}

function configForPace(pace) {
  return {
    kernel: {
      seed: 20260721,
      gravity: { x: 0, y: 0 },
      restitution: 0.12,
      friction: 0.7,
      velocityDamping: 0.989,
      collisionIterations: 4,
      sleepSpeed: 1.4,
      sleepAfter: 0.5,
    },
    fixedDt: 1 / 60,
    maxSubsteps: 8,
    timeScale: pace,
    observation: {
      chartId: "crucible-chart-remelt-qualification-preview-docs",
      chartType: "StreamPhysicsFrame",
    },
  }
}

function backgroundGraphics(state) {
  const activeColor = ["#64748b", "#f97316", "#0f766e", "#2563eb", "#7c3aed"][state.phaseIndex]
  return () => (
    <svg
      aria-hidden="true"
      width={frameSize[0]}
      height={frameSize[1]}
      viewBox={`0 0 ${frameSize[0]} ${frameSize[1]}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <path
        d={`${vesselPath} Z`}
        fill={activeColor}
        fillOpacity={state.phaseIndex === 1 ? 0.14 : 0.07}
      />
      <ellipse
        cx={vesselCenter.x}
        cy={vesselCenter.y}
        rx="152"
        ry="110"
        fill={activeColor}
        fillOpacity={state.phaseIndex === 1 || state.phaseIndex === 2 ? 0.075 : 0.025}
      />
      <rect x="21" y="145" width="122" height="89" rx="8" fill="#fef3c7" stroke="#a16207" />
      <rect x="21" y="249" width="122" height="87" rx="8" fill="#e2e8f0" stroke="#64748b" />
      <rect x="608" y="126" width="132" height="132" rx="8" fill="#fff7ed" stroke="#c2410c" />
      <rect x="608" y="278" width="132" height="73" rx="8" fill="#f3e8ff" stroke="#7e22ce" />
      <rect x="247" y="309" width="266" height="119" rx="14" fill="#ecfdf5" stroke="#047857" />
    </svg>
  )
}

function displayedMass(value) {
  return value == null ? "—" : value
}

function foregroundGraphics(state, run) {
  const projection = projectionFor(state, run)
  const currentPhase = phases[state.phaseIndex]
  const railWidth = 716

  return () => (
    <svg
      aria-hidden="true"
      width={frameSize[0]}
      height={frameSize[1]}
      viewBox={`0 0 ${frameSize[0]} ${frameSize[1]}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {phases.map((phase, index) => {
        const width = (phase.duration / programDuration) * railWidth
        const x =
          22 +
          phases
            .slice(0, index)
            .reduce(
              (start, previous) => start + (previous.duration / programDuration) * railWidth,
              0,
            )
        const active = !state.complete && state.phaseIndex === index
        const complete = state.complete || state.phaseIndex > index
        return (
          <g key={phase.id}>
            <rect
              x={x}
              y="14"
              width={Math.max(0, width - 3)}
              height="28"
              rx="5"
              fill={
                active
                  ? "#1d4ed8"
                  : complete
                    ? "color-mix(in srgb, var(--surface-2) 74%, #2563eb)"
                    : "var(--surface-2, #e5e7eb)"
              }
              stroke={active ? "#1e40af" : "var(--surface-3, #cbd5e1)"}
            />
            <text
              x={x + (width - 3) / 2}
              y="32"
              textAnchor="middle"
              fill={active ? "#ffffff" : "var(--text-primary, #1f2937)"}
              fontSize="10"
              fontWeight="700"
            >
              {phase.label}
            </text>
          </g>
        )
      })}

      <text
        x="380"
        y="68"
        textAnchor="middle"
        fill="var(--text-primary, #334155)"
        fontSize="12"
        fontWeight="700"
      >
        {state.complete
          ? `${run.heat} disposition recorded`
          : `${currentPhase.label} · ${currentPhase.metric}`}
      </text>

      <path
        d={vesselPath}
        fill="none"
        stroke="var(--text-primary, #334155)"
        strokeWidth="7"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      <text x="82" y="162" textAnchor="middle" fill="#713f12" fontSize="11" fontWeight="700">
        Skim dross
      </text>
      <text x="82" y="179" textAnchor="middle" fill="#713f12" fontSize="10">
        {displayedMass(projection.dross)} kg
      </text>
      {state.skimmed ? (
        <text x="82" y="225" textAnchor="middle" fill="#713f12" fontSize="8.5">
          {run.id === "filtered" ? "oily fines oxidized" : "fines + oxide return"}
        </text>
      ) : null}
      <text x="82" y="266" textAnchor="middle" fill="#334155" fontSize="11" fontWeight="700">
        Filter cake
      </text>
      <text x="82" y="283" textAnchor="middle" fill="#334155" fontSize="10">
        {displayedMass(projection.filter)} kg
      </text>
      {state.skimmed && run.id === "filtered" ? (
        <text x="82" y="327" textAnchor="middle" fill="#334155" fontSize="8.5">
          inclusions captured
        </text>
      ) : null}
      <text x="674" y="145" textAnchor="middle" fill="#9a3412" fontSize="11" fontWeight="700">
        Rework hold
      </text>
      <text x="674" y="162" textAnchor="middle" fill="#9a3412" fontSize="10">
        {displayedMass(projection.rework)} kg
      </text>
      {state.assayed && run.mainRoute === "rework" ? (
        <text x="674" y="247" textAnchor="middle" fill="#9a3412" fontSize="8.5">
          H₂ + inclusions above mold
        </text>
      ) : null}
      <text x="674" y="296" textAnchor="middle" fill="#6b21a8" fontSize="11" fontWeight="700">
        Foundry return
      </text>
      <text x="674" y="313" textAnchor="middle" fill="#6b21a8" fontSize="10">
        {displayedMass(projection.foundry)} kg
      </text>
      {state.routed ? (
        <text x="674" y="342" textAnchor="middle" fill="#6b21a8" fontSize="8.5">
          Fe-bearing segregation
        </text>
      ) : null}
      <text x="380" y="408" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="700">
        R-17 billet release · {displayedMass(projection.accepted)} kg
      </text>
      <text x="380" y="423" textAnchor="middle" fill="#047857" fontSize="9">
        qualification well—not a force calculation
      </text>

      <g transform="translate(208 83)">
        {parcelCategories.map((category, index) => (
          <g key={category.id} transform={`translate(${index * 75} 0)`}>
            <circle r="5" fill={category.color} />
            <text x="8" y="3" fill="var(--text-secondary, #475569)" fontSize="8">
              {category.code} · {category.label.split(" ")[0]}
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}

function drawLineage(context, bodies, state, run) {
  if (!state.treated) return
  const members = mainParcelIds.map((id) => bodies.find((body) => body.id === id)).filter(Boolean)
  if (members.length < 3) return

  const revealedRoute = state.routed ? run.mainRoute : "pending"
  const stroke =
    revealedRoute === "accepted" ? "#047857" : revealedRoute === "rework" ? "#c2410c" : "#2563eb"

  context.save()
  tracePolygon(context, paddedHull(members, 17))
  context.fillStyle =
    revealedRoute === "accepted"
      ? "rgba(5, 150, 105, 0.14)"
      : revealedRoute === "rework"
        ? "rgba(234, 88, 12, 0.13)"
        : "rgba(37, 99, 235, 0.09)"
  context.strokeStyle = stroke
  context.globalAlpha = state.routed ? 0.88 : 0.58
  context.lineWidth = state.routed ? 2.3 : 1.7
  context.setLineDash(state.routed ? [] : [5, 4])
  context.fill()
  context.stroke()
  context.restore()

  context.save()
  context.strokeStyle = stroke
  context.globalAlpha = state.routed ? 0.62 : 0.32
  context.lineWidth = 1.2
  context.setLineDash(state.routed ? [] : [3, 4])
  for (let index = 0; index < members.length; index += 1) {
    const source = members[index]
    const target = members[(index + 1) % members.length]
    const dx = target.x - source.x
    const dy = target.y - source.y
    const distance = Math.hypot(dx, dy) || 1
    context.beginPath()
    context.moveTo(
      source.x + (dx / distance) * (bodyRadius + 1),
      source.y + (dy / distance) * (bodyRadius + 1),
    )
    context.lineTo(
      target.x - (dx / distance) * (bodyRadius + 1),
      target.y - (dy / distance) * (bodyRadius + 1),
    )
    context.stroke()
  }
  context.restore()
}

function drawParcelLabels(context, bodies, state, run) {
  context.save()
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.font = "700 7px system-ui, sans-serif"

  for (const body of bodies) {
    const parcel = parcelById.get(body.id)
    if (!parcel) continue
    const category = categoryById.get(parcel.category)
    context.fillStyle = "#ffffff"
    context.fillText(category.code, body.x, body.y + 0.5)

    const route = run.routes[parcel.id]
    const isException = state.skimmed && route !== "main"
    if (!isException) continue
    context.beginPath()
    context.arc(body.x + 7, body.y - 7, 4.5, 0, Math.PI * 2)
    context.fillStyle = route === "foundry" ? "#9333ea" : route === "filter" ? "#64748b" : "#b45309"
    context.fill()
    context.strokeStyle = "#ffffff"
    context.lineWidth = 1
    context.stroke()
    context.fillStyle = "#ffffff"
    context.font = "700 6px system-ui, sans-serif"
    context.fillText("!", body.x + 7, body.y - 6.5)
    context.font = "700 7px system-ui, sans-serif"
  }
  context.restore()
}

function semanticItems(state, run) {
  const projection = projectionFor(state, run)
  const phase = state.complete ? "complete" : phases[state.phaseIndex].label
  const items = [
    {
      id: "remelt-phase-rail",
      label: `Remelt qualification phase: ${phase}`,
      description: state.complete
        ? "All authored treatment, assay, and disposition events have been applied."
        : phases[state.phaseIndex].metric,
      x: 380,
      y: 28,
      width: 716,
      height: 28,
      shape: "rect",
      group: "Treatment program",
    },
    {
      id: "remelt-crucible",
      label: "Controlled remelt crucible",
      description:
        "Sixteen equal five-kilogram trace parcels move through a recorded sister-heat treatment. Motion does not infer chemistry, cleanliness, or disposition.",
      x: 380,
      y: 235,
      width: 444,
      height: 284,
      shape: "rect",
      group: "Treatment program",
    },
    ...[
      ["dross", "Skim dross", 82, 190, 122, 89, projection.dross],
      ["filter", "Filter cake", 82, 292, 122, 87, projection.filter],
      ["rework", "Rework hold", 674, 192, 132, 132, projection.rework],
      ["foundry", "Foundry return", 674, 315, 132, 73, projection.foundry],
      ["accepted", "R-17 billet release", 380, 368, 266, 119, projection.accepted],
    ].map(([id, label, x, y, width, height, mass]) => ({
      id: `remelt-${id}-outlet`,
      label: `${label}: ${mass == null ? "not yet assigned" : `${mass} kg`}`,
      description:
        id === "accepted" || id === "rework"
          ? "The main cohort reaches this outcome only after the authored assay disposition."
          : `The authored ${run.heat} ledger supplies this material assignment and its reason.`,
      x,
      y,
      width,
      height,
      shape: "rect",
      group: "Outcome projection",
    })),
  ]

  if (state.treated) {
    items.push({
      id: "remelt-main-lineage",
      label: `Main melt lineage: ${mainParcelIds.length} parcels, 65 kg`,
      description: state.assayed
        ? `The posted assay disposition is: ${run.disposition}.`
        : "The cohort is formed, but its qualifying destination is deliberately withheld until the observed assay posts.",
      x: state.routed ? destinationCenters[run.mainRoute].x : vesselCenter.x,
      y: state.routed ? destinationCenters[run.mainRoute].y : vesselCenter.y,
      group: "Preserved lineage",
    })
  }
  return items
}

function summary(state, run) {
  const phase = state.complete ? "Complete" : phases[state.phaseIndex].label
  if (!state.assayed) {
    return `Controlled remelt qualification. ${run.heat}, ${phase}. The R-17 disposition remains pending until the authored assay event; physics does not calculate the assay.`
  }
  if (!state.routed) {
    return `Controlled remelt qualification. ${run.heat}, ${phase}. The observed assay is posted: ${run.disposition}. Material routing has not yet occurred.`
  }
  return `Controlled remelt qualification. ${run.heat}, ${phase}. ${run.disposition}; 5 kilograms report to foundry return and 10 kilograms to reason-labelled process residue. The authored ledger closes at 80 kilograms.`
}

function projectionCards(state, run) {
  const projection = projectionFor(state, run)
  const mainDecision = !state.assayed
    ? "Await assay"
    : run.mainRoute === "accepted"
      ? "Qualifies"
      : "Rework required"

  return [
    {
      label: "Charge",
      value: state.charged ? "80 kg" : "Entering",
      detail: state.charged ? "16 × 5 kg trace parcels" : "source IDs retained",
      color: "#2563eb",
    },
    {
      label: "Main melt",
      value: state.treated ? "65 kg" : "Pending",
      detail: state.treated ? mainDecision : "forms after treatment",
      color: "#0f766e",
    },
    {
      label: "R-17 release",
      value: projection.accepted == null ? "Await assay" : `${projection.accepted} kg`,
      detail: state.assayed
        ? run.mainRoute === "accepted"
          ? "assay qualifies"
          : "mold not met"
        : "not precomputed",
      color: "#059669",
    },
    {
      label: "Rework hold",
      value: projection.rework == null ? "Await assay" : `${projection.rework} kg`,
      detail: state.assayed
        ? run.mainRoute === "rework"
          ? "corrective route required"
          : "no main-cohort hold"
        : "not precomputed",
      color: "#ea580c",
    },
    {
      label: "Co-product",
      value: projection.foundry == null ? "Await routing" : `${projection.foundry} kg`,
      detail: "foundry return",
      color: "#7e22ce",
    },
    {
      label: "Process residue",
      value:
        projection.dross == null
          ? "Await treatment"
          : `${projection.dross + (projection.filter || 0)} kg`,
      detail:
        projection.dross == null
          ? "reasons post with events"
          : `${projection.dross} kg dross · ${projection.filter || 0} kg filter cake`,
      color: "#a16207",
    },
  ]
}

const cardStyle = {
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  background: "var(--surface-1)",
  minWidth: 0,
  padding: "9px 11px",
}

const cellStyle = {
  borderBottom: "1px solid var(--surface-2)",
  padding: "5px 6px",
  textAlign: "left",
  verticalAlign: "top",
}

export default function AlloyCrucibleExample({
  rerunMS = null,
  initialRun = "skim",
  initialPace = 0.65,
}) {
  const frameRef = useRef(null)
  const reducedMotion = useReducedMotion()
  const [selectedRun, setSelectedRun] = useState(() =>
    runById.has(initialRun) ? initialRun : "skim",
  )
  const [pace, setPace] = useState(() => normalizePace(initialPace))
  const [autoReplayMS, setAutoReplayMS] = useState(() => normalizeRerunDelay(rerunMS))
  const [runId, setRunId] = useState(0)
  const [paused, setPaused] = useState(false)
  const [runState, setRunState] = useState(() => stateAt(0))
  const terminalState = useMemo(() => stateAt(programDuration), [])
  const displayState = reducedMotion ? terminalState : runState
  const run = runById.get(selectedRun)
  const runStateRef = useRef(runState)
  const displayStateRef = useRef(displayState)
  const runRef = useRef(run)
  const elapsedRef = useRef(0)
  const pauseAtRef = useRef(null)
  displayStateRef.current = displayState
  runRef.current = run

  const resetRun = useCallback(() => {
    const initial = stateAt(0)
    elapsedRef.current = 0
    pauseAtRef.current = null
    runStateRef.current = initial
    setRunState(initial)
    setPaused(false)
    setRunId((id) => id + 1)
  }, [])

  useEffect(() => {
    setAutoReplayMS(normalizeRerunDelay(rerunMS))
  }, [rerunMS])

  useEffect(() => {
    if (reducedMotion || !runState.complete || autoReplayMS == null) return undefined
    const timer = setTimeout(resetRun, autoReplayMS)
    return () => clearTimeout(timer)
  }, [autoReplayMS, reducedMotion, resetRun, runId, runState.complete])

  const spawns = useMemo(
    () => (reducedMotion ? terminalSpawns(run) : initialSpawns),
    [reducedMotion, run],
  )
  const config = useMemo(() => configForPace(pace), [pace])

  const programController = useMemo(
    () => ({
      id: `remelt-qualification-${selectedRun}-${runId}`,
      continuous: true,
      tick: ({ elapsed }) => {
        elapsedRef.current = elapsed
        const nextState = stateAt(elapsed)
        if (stateKey(nextState) !== stateKey(runStateRef.current)) {
          runStateRef.current = nextState
          setRunState(nextState)
        }
        if (nextState.complete) {
          pauseAtRef.current = null
          setPaused(true)
          return
        }
        if (pauseAtRef.current !== null && elapsed >= pauseAtRef.current) {
          pauseAtRef.current = null
          setPaused(true)
        }
      },
    }),
    [runId, selectedRun],
  )

  const background = useMemo(() => backgroundGraphics(displayState), [displayState])
  const foreground = useMemo(() => foregroundGraphics(displayState, run), [displayState, run])
  const bodyForces = useMemo(
    () =>
      displayState.complete
        ? undefined
        : ({ body }) => bodyForce(body, runStateRef.current, runRef.current, elapsedRef.current),
    [displayState.complete],
  )
  const bodyStyle = useMemo(
    () => (body) => {
      const parcel = parcelById.get(body.id)
      const category = categoryById.get(parcel.category)
      const destination = destinationFor(parcel, displayState, run)
      const outlines = {
        accepted: "#047857",
        rework: "#c2410c",
        foundry: "#7e22ce",
        dross: "#a16207",
        filter: "#475569",
        main: "#2563eb",
      }
      return {
        fill: category.color,
        stroke: outlines[destination] || "#1f2937",
        strokeWidth: outlines[destination] ? 2.5 : 1.2,
        opacity: 0.97,
      }
    },
    [displayState, run],
  )
  const beforePaint = useMemo(
    () => (context, bodies) =>
      drawLineage(context, bodies, displayStateRef.current, runRef.current),
    [],
  )
  const afterPaint = useMemo(
    () => (context, bodies) =>
      drawParcelLabels(context, bodies, displayStateRef.current, runRef.current),
    [],
  )

  const selectRun = (nextRun) => {
    if (nextRun === selectedRun) return
    setSelectedRun(nextRun)
    resetRun()
  }

  const selectPace = (nextPace) => {
    const normalized = normalizePace(nextPace)
    if (normalized === pace) return
    setPace(normalized)
    resetRun()
  }

  const togglePlayback = () => {
    if (displayState.complete) {
      resetRun()
      return
    }
    pauseAtRef.current = null
    setPaused((value) => !value)
  }

  const stepPhase = () => {
    const elapsed = frameRef.current?.snapshot?.().elapsedSeconds ?? elapsedRef.current
    const nextBoundary = phaseEnds.find((end) => end > elapsed + 0.001)
    if (nextBoundary == null) {
      resetRun()
      return
    }
    pauseAtRef.current = nextBoundary
    setPaused(false)
  }

  const currentPhase = phases[displayState.phaseIndex]
  const cards = projectionCards(displayState, run)
  const eventTape = [
    {
      id: "charge",
      label: "Load 16 source-identified parcels (80 kg)",
      phase: "Charge",
      progress: "58%",
      applied: displayState.charged,
    },
    {
      id: "homogenize",
      label: "Record the sister heat as homogenized",
      phase: "Melt",
      progress: "48%",
      applied: displayState.homogenized,
    },
    {
      id: "skim",
      label:
        run.id === "filtered"
          ? "Skim CHIP-03 to dross; retain MIX-02 in filter cake"
          : "Skim CHIP-03 and MIX-02 to dross",
      phase: "Treat",
      progress: "28%",
      applied: displayState.skimmed,
    },
    {
      id: "treat",
      label: run.treatment,
      phase: "Treat",
      progress: "76%",
      applied: displayState.treated,
    },
    {
      id: "assay",
      label: displayState.assayed ? `Post assay · ${run.disposition}` : "Post observed assay panel",
      phase: "Assay",
      progress: "58%",
      applied: displayState.assayed,
    },
    {
      id: "route",
      label: displayState.assayed
        ? `Route 65 kg main cohort to ${destinationLabel(run.mainRoute)}`
        : "Apply the authored disposition after assay",
      phase: "Cast / route",
      progress: "34%",
      applied: displayState.routed,
    },
  ]

  return (
    <div className="live-example">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 290px), 1fr))",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <strong>Closed-loop aluminum qualification crucible</strong>
          <p style={{ margin: "6px 0 0", color: "var(--text-secondary)" }}>
            Sixteen equal circles are five-kilogram recipe parcels. Compare two recorded sister
            heats over the same traced charge: treatment changes the posted assay and therefore the
            governed release decision; collisions never calculate metallurgy.
          </p>
        </div>

        <fieldset
          style={{
            border: "1px solid var(--surface-3)",
            borderRadius: 8,
            margin: 0,
            padding: "8px 10px 10px",
          }}
        >
          <legend style={{ padding: "0 4px", fontSize: 13, fontWeight: 700 }}>
            Observed treatment run
          </legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {treatmentRuns.map((candidate) => (
              <label
                key={candidate.id}
                style={{ display: "inline-flex", gap: 5, alignItems: "center" }}
              >
                <input
                  type="radio"
                  name="alloy-treatment-run"
                  value={candidate.id}
                  checked={selectedRun === candidate.id}
                  onChange={() => selectRun(candidate.id)}
                />
                {candidate.heat} · {candidate.label}
              </label>
            ))}
          </div>
          <div style={{ marginTop: 7, color: "var(--text-secondary)", fontSize: 12 }}>
            {run.treatment}. Selecting a run restarts its deterministic replay.
          </div>
        </fieldset>

        <aside
          aria-label="R-17 extrusion billet acceptance mold"
          style={{
            border: "1px solid color-mix(in srgb, var(--accent) 55%, var(--surface-3))",
            borderRadius: 8,
            background: "color-mix(in srgb, var(--surface-1) 92%, var(--accent))",
            gridColumn: "1 / -1",
            padding: "9px 11px",
          }}
        >
          <strong>R-17 billet mold</strong>
          <div style={{ color: "var(--text-secondary)", fontSize: 11, marginTop: 2 }}>
            Illustrative plant acceptance criteria—these thresholds do not preview either heat’s
            observed result
          </div>
          <ul
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "3px 18px",
              margin: "7px 0 0",
              paddingLeft: 18,
            }}
          >
            {moldCriteria.map((criterion) => (
              <li key={criterion.id}>
                {criterion.label}: {criterion.mold}
              </li>
            ))}
            <li>80 kg input must reconcile to named products, holds, and residue</li>
            <li>Every five-kilogram recipe parcel retains its source-lot lineage</li>
          </ul>
        </aside>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <button
          type="button"
          onClick={togglePlayback}
          aria-pressed={!paused && !reducedMotion}
          disabled={reducedMotion}
        >
          {reducedMotion
            ? "Reduced motion"
            : displayState.complete
              ? "Replay"
              : paused
                ? "Play"
                : "Pause"}
        </button>
        <button type="button" onClick={stepPhase} disabled={reducedMotion || displayState.complete}>
          {displayState.complete ? "Program complete" : `Step ${currentPhase.label}`}
        </button>
        <button type="button" onClick={resetRun} disabled={reducedMotion}>
          Reset
        </button>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          Pace
          <select
            aria-label="Replay pace"
            value={pace}
            onChange={(event) => selectPace(event.target.value)}
            disabled={reducedMotion}
          >
            {paceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          Auto replay
          <select
            aria-label="Automatic replay delay"
            value={autoReplayMS == null ? "off" : String(autoReplayMS)}
            onChange={(event) =>
              setAutoReplayMS(event.target.value === "off" ? null : Number(event.target.value))
            }
            disabled={reducedMotion}
          >
            {autoReplayOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            {autoReplayMS != null &&
            !autoReplayOptions.some((option) => option.delay === autoReplayMS) ? (
              <option value={autoReplayMS}>{autoReplayMS} ms (prop)</option>
            ) : null}
          </select>
        </label>
        <span aria-live="polite" style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          {reducedMotion
            ? `Reduced motion: ${run.heat}'s authored terminal disposition is shown.`
            : displayState.complete
              ? `${run.disposition}.${autoReplayMS == null ? "" : ` Replay resets in ${autoReplayMS} ms.`}`
              : `Phase ${displayState.phaseIndex + 1} of ${phases.length}: ${currentPhase.label}.`}
        </span>
      </div>

      <div
        aria-label="Live remelt outcome projection"
        aria-live="polite"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(126px, 1fr))",
          gap: 8,
          marginBottom: 10,
        }}
      >
        {cards.map((card) => (
          <div key={card.label} style={{ ...cardStyle, borderTop: `3px solid ${card.color}` }}>
            <div style={{ color: "var(--text-secondary)", fontSize: 11 }}>{card.label}</div>
            <strong style={{ display: "block", marginTop: 2 }}>{card.value}</strong>
            <div style={{ color: "var(--text-secondary)", fontSize: 10, marginTop: 2 }}>
              {card.detail}
            </div>
          </div>
        ))}
      </div>

      <div className="live-example-viz">
        <StreamPhysicsFrame
          key={`${runId}-${selectedRun}-${reducedMotion ? "settled" : "replay"}`}
          ref={frameRef}
          title="Closed-loop aluminum qualification crucible"
          summary={summary(displayState, run)}
          description="Sixteen preserved five-kilogram recipe parcels move through Charge, Melt, Treat, Assay, and Cast or route. Two authored sister-heat records compare a skim-only route with rotary degassing and ceramic filtration. The main lineage cohort, foundry return, skim dross, and filter cake remain visible. Laboratory values and all destinations come from the selected record; motion never calculates chemistry or material quality."
          size={frameSize}
          config={config}
          initialSpawns={spawns}
          controllers={reducedMotion || displayState.complete ? undefined : [programController]}
          simulationExecution="sync"
          paused={reducedMotion || paused}
          bodyForces={bodyForces}
          backgroundGraphics={background}
          foregroundGraphics={foreground}
          beforePaint={beforePaint}
          afterPaint={afterPaint}
          semanticItems={semanticItems(displayState, run)}
          bodySemanticItems={(body) => {
            const parcel = parcelById.get(body.id)
            const category = categoryById.get(parcel.category)
            const destination = destinationFor(parcel, displayState, run)
            return {
              label: `${run.heat} / ${parcel.id}: ${category.label}`,
              description: `${parcel.kg} kg from source lot ${parcel.sourceLot}; ${parcel.note}; ${parcelStatus(parcel, displayState, run)}. Destination: ${destinationLabel(destination)}. Reason: ${routeReason(parcel, displayState, run)}. Lineage is preserved.`,
              group: destinationLabel(destination),
              datum: parcel,
            }
          }}
          accessibleTable
          enableHover
          hoverRadius={17}
          bodyStyle={bodyStyle}
          tooltipContent={(hover) => {
            const parcel = parcelById.get(hover.id) || hover.data || {}
            const category = categoryById.get(parcel.category)
            const destination = destinationFor(parcel, displayState, run)
            return (
              <div className="semiotic-tooltip">
                <strong>{parcel.id || hover.id}</strong>
                <div>{category?.label}</div>
                <div>
                  {parcel.kg} kg · lot {parcel.sourceLot}
                </div>
                <div>{destinationLabel(destination)}</div>
                <div>{routeReason(parcel, displayState, run)}</div>
              </div>
            )
          }}
        />
      </div>

      <p
        role="note"
        style={{
          borderLeft: "3px solid var(--accent)",
          color: "var(--text-secondary)",
          fontSize: 13,
          margin: "10px 0 12px",
          padding: "4px 0 4px 10px",
        }}
      >
        One circle always means one traced five-kilogram recipe parcel. The hull is the 65 kg main
        melt’s lineage envelope, not a newly invented product body. Outlet position, contact, and
        velocity cannot alter an assay value, reason, mass, or disposition.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: 14,
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <caption style={{ padding: "0 0 7px", textAlign: "left", fontWeight: 700 }}>
              Posted laboratory assay
            </caption>
            <thead>
              <tr>
                {["Criterion", "R-17 mold", "Observed", "Evaluation"].map((label) => (
                  <th
                    key={label}
                    scope="col"
                    style={{ ...cellStyle, borderBottomColor: "var(--surface-3)" }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {moldCriteria.map((criterion) => {
                const observation = run.assay[criterion.id]
                return (
                  <tr key={criterion.id}>
                    <th scope="row" style={cellStyle}>
                      {criterion.label}
                      <small
                        style={{
                          display: "block",
                          color: "var(--text-secondary)",
                          fontWeight: 400,
                        }}
                      >
                        {criterion.purpose}
                      </small>
                    </th>
                    <td style={cellStyle}>{criterion.mold}</td>
                    <td style={cellStyle}>
                      {displayState.assayed ? observation.value : "Pending"}
                    </td>
                    <td style={cellStyle}>
                      {displayState.assayed
                        ? observation.status === "pass"
                          ? "Within mold"
                          : "Exception"
                        : "Not posted"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div
            aria-live="polite"
            style={{
              border: "1px solid var(--surface-3)",
              borderRadius: 7,
              marginTop: 9,
              padding: "8px 10px",
              color: displayState.assayed
                ? run.mainRoute === "accepted"
                  ? "#047857"
                  : "#c2410c"
                : "var(--text-secondary)",
            }}
          >
            <strong>Disposition: </strong>
            {displayState.assayed ? run.disposition : "withheld until the assay event"}
            {displayState.assayed ? ` — ${run.decisionReason}` : null}
          </div>
        </div>

        <div
          style={{
            border: "1px solid var(--surface-3)",
            borderRadius: 8,
            alignSelf: "start",
            padding: "10px 12px",
            fontSize: 13,
          }}
        >
          <strong>Authored event tape</strong>
          <ol style={{ display: "grid", gap: 8, margin: "9px 0 0", paddingLeft: 20 }}>
            {eventTape.map((event) => (
              <li
                key={event.id}
                style={{ color: event.applied ? "var(--text-primary)" : "var(--text-secondary)" }}
              >
                <span aria-hidden="true">{event.applied ? "✓ " : "○ "}</span>
                <span>{event.label}</span>
                <div style={{ fontSize: 11, marginTop: 2 }}>
                  {event.phase} · authored at {event.progress} of phase
                </div>
              </li>
            ))}
          </ol>
          <p style={{ margin: "11px 0 0", color: "var(--text-secondary)" }}>
            Switching heats replaces the assay and route ledger, then remounts the same seeded
            scene. It does not tune a force until a preferred answer appears.
          </p>
        </div>
      </div>

      <div style={{ overflowX: "auto", marginTop: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <caption style={{ padding: "0 0 7px", textAlign: "left", fontWeight: 700 }}>
            Authoritative 80 kg charge and disposition ledger
          </caption>
          <thead>
            <tr>
              {[
                "Trace parcel",
                "Source lot",
                "Charge role",
                "Mass",
                "Current destination",
                "Authored reason",
              ].map((label) => (
                <th
                  key={label}
                  scope="col"
                  style={{ ...cellStyle, borderBottomColor: "var(--surface-3)" }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parcels.map((parcel) => {
              const category = categoryById.get(parcel.category)
              const destination = destinationFor(parcel, displayState, run)
              return (
                <tr key={parcel.id}>
                  <th scope="row" style={cellStyle}>
                    {run.heat} / {parcel.id}
                  </th>
                  <td style={cellStyle}>{parcel.sourceLot}</td>
                  <td style={cellStyle}>
                    {category.label}
                    <small style={{ display: "block", color: "var(--text-secondary)" }}>
                      {parcel.note}
                    </small>
                  </td>
                  <td style={cellStyle}>{parcel.kg} kg</td>
                  <td style={cellStyle}>{destinationLabel(destination)}</td>
                  <td style={cellStyle}>{routeReason(parcel, displayState, run)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan="3" style={{ ...cellStyle, borderBottom: 0 }}>
                Ledger balance
              </th>
              <td style={{ ...cellStyle, borderBottom: 0 }}>80 kg input</td>
              <td colSpan="2" style={{ ...cellStyle, borderBottom: 0 }}>
                {displayState.complete
                  ? "80 kg assigned · delta 0 kg"
                  : "Open until the treatment program completes"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
