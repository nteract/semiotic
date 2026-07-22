import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { StreamPhysicsFrame } from "semiotic/physics"
import { useReducedMotion } from "semiotic/utils"

import { paddedHull, tracePolygon } from "./cruciblePreviewUtils.js"

const frameSize = [720, 410]
const bodyRadius = 9

const phases = [
  { id: "normalize", label: "Normalize", duration: 1.4, metric: "Standardize fields" },
  {
    id: "propose",
    label: "Propose matches",
    duration: 2.1,
    metric: "Materialize candidate groups",
  },
  {
    id: "resolve",
    label: "Resolve conflicts",
    duration: 1.8,
    metric: "Apply the selected resolution run",
  },
  { id: "publish", label: "Publish", duration: 1.5, metric: "Freeze golden records" },
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
  normalized: timeInPhase("normalize", 0.55),
  proposed: timeInPhase("propose", 0.16),
  resolved: timeInPhase("resolve", 0.18),
  published: timeInPhase("publish", 0.45),
  complete: programDuration,
}

const sourceSystems = [
  { id: "crm", label: "CRM", code: "C", color: "#2563eb" },
  { id: "billing", label: "Billing", code: "B", color: "#0f766e" },
  { id: "support", label: "Support", code: "S", color: "#d97706" },
  { id: "events", label: "Events", code: "E", color: "#7c3aed" },
]

const goldenRecords = [
  { id: "GR-101", label: "Ada Rivera", color: "#2563eb", center: { x: 258, y: 182 } },
  { id: "GR-102", label: "Devon Lee", color: "#0f766e", center: { x: 462, y: 182 } },
  { id: "GR-103", label: "Mina Patel", color: "#db2777", center: { x: 258, y: 296 } },
  { id: "GR-104", label: "Rowan Chen", color: "#7c3aed", center: { x: 462, y: 296 } },
]

const records = [
  {
    id: "CRM-1042",
    system: "crm",
    observedName: "Ada Rivera",
    evidence: "email + phone",
    goldenId: "GR-101",
  },
  {
    id: "CRM-1108",
    system: "crm",
    observedName: "Devon Lee",
    evidence: "email + loyalty id",
    goldenId: "GR-102",
  },
  {
    id: "CRM-1187",
    system: "crm",
    observedName: "Mina Patel",
    evidence: "email + phone",
    goldenId: "GR-103",
  },
  {
    id: "CRM-1204",
    system: "crm",
    observedName: "Rowan Chen",
    evidence: "email + postal address",
    goldenId: "GR-104",
  },
  {
    id: "BILL-882",
    system: "billing",
    observedName: "Ada M. Rivera",
    evidence: "email + billing address",
    goldenId: "GR-101",
  },
  {
    id: "BILL-913",
    system: "billing",
    observedName: "Devon K Lee",
    evidence: "phone + billing address",
    goldenId: "GR-102",
  },
  {
    id: "BILL-947",
    system: "billing",
    observedName: "Mina Patel",
    evidence: "email + billing address",
    goldenId: "GR-103",
  },
  {
    id: "BILL-991",
    system: "billing",
    observedName: "Rowan Chen",
    evidence: "email + billing address",
    goldenId: "GR-104",
  },
  {
    id: "SUP-291",
    system: "support",
    observedName: "A. Rivera",
    evidence: "verified phone",
    goldenId: "GR-101",
  },
  {
    id: "SUP-336",
    system: "support",
    observedName: "Devon Lee",
    evidence: "verified email",
    goldenId: "GR-102",
  },
  {
    id: "SUP-401",
    system: "support",
    observedName: "Mina P.",
    evidence: "verified phone",
    goldenId: "GR-103",
  },
  {
    id: "SUP-404",
    system: "support",
    observedName: "(blank)",
    evidence: "missing name and contact fields",
    goldenId: null,
    valid: false,
  },
  {
    id: "EVT-051",
    system: "events",
    observedName: "Ada Rivera",
    evidence: "email + event account",
    goldenId: "GR-101",
  },
  {
    id: "EVT-087",
    system: "events",
    observedName: "Devon Lee",
    evidence: "email + event account",
    goldenId: "GR-102",
  },
  {
    id: "EVT-103",
    system: "events",
    observedName: "R. Chen",
    evidence: "shared postal address; no email",
    goldenId: "GR-104",
    ambiguous: true,
  },
].map((record) => ({ valid: true, ambiguous: false, ...record }))

const recordById = new Map(records.map((record) => [record.id, record]))
const systemById = new Map(sourceSystems.map((system) => [system.id, system]))
const goldenById = new Map(goldenRecords.map((golden) => [golden.id, golden]))

const quarantineTarget = { x: 77, y: 238 }
const reviewTarget = { x: 643, y: 238 }

const initialSpawns = records.map((record, index) => ({
  id: record.id,
  x: 183 + (index % 8) * 50,
  y: 116 + Math.floor(index / 8) * 22,
  vx: (index % 5) * 2 - 4,
  vy: 2,
  mass: 1,
  shape: { type: "circle", radius: bodyRadius },
  datum: { ...record, role: "source-record", recordId: record.id },
}))

const baseConfig = {
  kernel: {
    seed: 20260720,
    gravity: { x: 0, y: 0 },
    restitution: 0.12,
    friction: 0.72,
    velocityDamping: 0.989,
    collisionIterations: 4,
    sleepSpeed: 1.5,
    sleepAfter: 0.5,
  },
  fixedDt: 1 / 60,
  maxSubsteps: 8,
  observation: {
    chartId: "crucible-chart-entity-resolution-preview-docs",
    chartType: "StreamPhysicsFrame",
  },
}

const playbackRates = [
  { value: 0.35, label: "Very slow · 0.35×" },
  { value: 0.65, label: "Slow · 0.65×" },
  { value: 1, label: "Normal · 1×" },
  { value: 1.35, label: "Fast · 1.35×" },
]

const rerunDelays = [
  { value: null, label: "Off" },
  { value: 1500, label: "1,500 ms" },
  { value: 3000, label: "3,000 ms" },
  { value: 6000, label: "6,000 ms" },
]

function normalizeRerunMS(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null
}

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
    normalized: time >= eventTimes.normalized,
    proposed: time >= eventTimes.proposed,
    resolved: time >= eventTimes.resolved,
    published: time >= eventTimes.published,
    complete: time >= eventTimes.complete,
  }
}

function stateKey(state) {
  return [
    state.phaseIndex,
    state.normalized,
    state.proposed,
    state.resolved,
    state.published,
    state.complete,
  ].join("|")
}

function isClusterMember(record, state, policy) {
  if (!record.valid || !record.goldenId || !state.proposed) return false
  return !(state.resolved && policy === "conservative" && record.ambiguous)
}

function clusterRecords(goldenId, state, policy) {
  return records.filter(
    (record) => record.goldenId === goldenId && isClusterMember(record, state, policy),
  )
}

function normalizedTarget(record) {
  const systemIndex = sourceSystems.findIndex((system) => system.id === record.system)
  const peers = records.filter((candidate) => candidate.system === record.system)
  const peerIndex = peers.findIndex((candidate) => candidate.id === record.id)
  const spacing = 52

  return {
    x: 210 + systemIndex * 100,
    y: 236 + (peerIndex - (peers.length - 1) / 2) * spacing,
  }
}

function clusterTarget(record, state, policy) {
  const golden = goldenById.get(record.goldenId)
  const members = clusterRecords(record.goldenId, state, policy)
  const index = members.findIndex((candidate) => candidate.id === record.id)
  const radius = state.published ? 20 : state.resolved ? 23 : 29
  const angle = -Math.PI / 2 + index * ((Math.PI * 2) / Math.max(1, members.length))

  if (members.length === 1) return golden.center
  if (members.length === 2) {
    return { x: golden.center.x + (index === 0 ? -radius : radius), y: golden.center.y }
  }

  return {
    x: golden.center.x + Math.cos(angle) * radius,
    y: golden.center.y + Math.sin(angle) * radius,
  }
}

function targetForRecord(record, state, policy) {
  if (state.normalized && !record.valid) return quarantineTarget
  if (state.resolved && policy === "conservative" && record.ambiguous) return reviewTarget
  if (isClusterMember(record, state, policy)) return clusterTarget(record, state, policy)
  return normalizedTarget(record)
}

function forceToTarget(body, target, stiffness, damping = 6.2) {
  return {
    x: (target.x - body.x) * stiffness - body.vx * damping,
    y: (target.y - body.y) * stiffness - body.vy * damping,
  }
}

function bodyForce(body, state, policy) {
  const record = recordById.get(body.datum?.recordId || body.id)
  if (!record) return null
  const stiffness = state.published
    ? 40
    : state.resolved
      ? 34
      : state.proposed
        ? 27
        : state.normalized
          ? 24
          : 20
  return forceToTarget(body, targetForRecord(record, state, policy), stiffness)
}

function terminalSpawns(policy) {
  const terminalState = stateAt(programDuration)
  return initialSpawns.map((spawn) => {
    const record = recordById.get(spawn.id)
    const target = targetForRecord(record, terminalState, policy)
    return { ...spawn, ...target, vx: 0, vy: 0 }
  })
}

function recordStatus(record, state, policy) {
  if (!state.normalized) return "raw source row"
  if (!record.valid) return "quarantined: invalid identity fields"
  if (!state.proposed) return "normalized"
  if (!state.resolved) return `candidate for ${goldenById.get(record.goldenId).label}`
  if (policy === "conservative" && record.ambiguous) return "awaiting manual review"
  if (!state.published) return "resolved member of a draft golden record"
  return "published source member"
}

function recordDestination(record, state, policy) {
  if (!state.normalized) return "Normalization crucible"
  if (!record.valid) return "Quarantine"
  if (!state.proposed) return "Normalized source pool"
  if (state.resolved && policy === "conservative" && record.ambiguous) return "Manual review"
  const golden = goldenById.get(record.goldenId)
  if (!state.resolved) return `Candidate: ${golden.label}`
  return `${golden.id} · ${golden.label}${state.published ? " · published" : " · draft"}`
}

function projectionFor(state, policy) {
  return {
    input: records.length,
    candidates: state.proposed ? records.filter((record) => record.valid).length : null,
    golden: state.resolved ? goldenRecords.length : null,
    published: state.published,
    review: state.resolved && policy === "conservative" ? 1 : state.resolved ? 0 : null,
    quarantine: state.normalized ? records.filter((record) => !record.valid).length : null,
  }
}

function projectionCards(state, policy) {
  const projection = projectionFor(state, policy)
  return [
    {
      label: "Source rows",
      value: `${projection.input} loaded`,
      detail: "4 source systems",
      color: "#475569",
    },
    {
      label: "Candidate assignments",
      value: projection.candidates == null ? "Pending" : `${projection.candidates} proposed`,
      detail: projection.candidates == null ? "Waiting for proposal event" : "Authored candidates",
      color: "#2563eb",
    },
    {
      label: "Golden records",
      value:
        projection.golden == null
          ? "Pending"
          : projection.published
            ? `${projection.golden} published`
            : `${projection.golden} ready`,
      detail:
        projection.golden == null
          ? "Waiting for resolution"
          : projection.published
            ? "Publication event applied"
            : "Resolved drafts",
      color: "#0f766e",
    },
    {
      label: "Manual review",
      value: projection.review == null ? "Pending" : `${projection.review} row`,
      detail:
        projection.review == null
          ? "Waiting for resolution decision"
          : projection.review
            ? "Ambiguous evidence retained"
            : "Reviewer override applied",
      color: "#d97706",
    },
    {
      label: "Quarantine",
      value: projection.quarantine == null ? "Pending" : `${projection.quarantine} row`,
      detail: projection.quarantine == null ? "Waiting for validation" : "Invalid row isolated",
      color: "#dc2626",
    },
  ]
}

function clusterStageLabel(state, golden) {
  if (state.published) return `${golden.id} · golden`
  if (state.resolved) return `${golden.id} · draft`
  return `${golden.label} · candidate`
}

function backgroundGraphics(state, policy) {
  const activeColor = ["#64748b", "#2563eb", "#d97706", "#0f766e"][state.phaseIndex]
  const reviewCount = state.resolved ? (policy === "conservative" ? 1 : 0) : null
  const quarantineCount = state.normalized ? 1 : null

  return () => (
    <svg
      aria-hidden="true"
      width={frameSize[0]}
      height={frameSize[1]}
      viewBox={`0 0 ${frameSize[0]} ${frameSize[1]}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <path
        d="M 152 108 L 568 108 L 548 362 Q 360 389 172 362 Z"
        fill={activeColor}
        fillOpacity={state.phaseIndex === 1 ? 0.1 : 0.055}
      />

      <g>
        <rect
          x="18"
          y="112"
          width="120"
          height="244"
          rx="12"
          fill="#fef2f2"
          fillOpacity="0.9"
          stroke="#ef4444"
          strokeOpacity="0.72"
        />
        <text x="78" y="137" textAnchor="middle" fill="#991b1b" fontSize="11" fontWeight="700">
          QUARANTINE
        </text>
        <text x="78" y="155" textAnchor="middle" fill="#b91c1c" fontSize="10">
          {quarantineCount == null ? "No decision yet" : `${quarantineCount} invalid row`}
        </text>
        <text x="78" y="337" textAnchor="middle" fill="#991b1b" fontSize="9">
          schema failure
        </text>
      </g>

      <g>
        <rect
          x="582"
          y="112"
          width="120"
          height="244"
          rx="12"
          fill="#fffbeb"
          fillOpacity="0.92"
          stroke="#f59e0b"
          strokeOpacity="0.78"
        />
        <text x="642" y="137" textAnchor="middle" fill="#92400e" fontSize="11" fontWeight="700">
          MANUAL REVIEW
        </text>
        <text x="642" y="155" textAnchor="middle" fill="#a16207" fontSize="10">
          {reviewCount == null
            ? "No decision yet"
            : `${reviewCount} row${reviewCount === 1 ? "" : "s"}`}
        </text>
        <text x="642" y="337" textAnchor="middle" fill="#92400e" fontSize="9">
          governed exception
        </text>
      </g>

      {!state.proposed &&
        sourceSystems.map((system, index) => (
          <g key={system.id}>
            <line
              x1={210 + index * 100}
              y1="144"
              x2={210 + index * 100}
              y2="334"
              stroke={system.color}
              strokeOpacity="0.18"
              strokeDasharray="3 6"
            />
            <text
              x={210 + index * 100}
              y="134"
              textAnchor="middle"
              fill={system.color}
              fontSize="10"
              fontWeight="700"
            >
              {system.label}
            </text>
          </g>
        ))}

      {state.proposed &&
        goldenRecords.map((golden) => {
          const count = clusterRecords(golden.id, state, policy).length
          return (
            <g key={golden.id}>
              <ellipse
                cx={golden.center.x}
                cy={golden.center.y}
                rx="68"
                ry="47"
                fill={golden.color}
                fillOpacity={state.published ? 0.08 : 0.035}
                stroke={golden.color}
                strokeOpacity={state.resolved ? 0.34 : 0.2}
                strokeDasharray={state.resolved ? undefined : "4 5"}
              />
              <text
                x={golden.center.x}
                y={golden.center.y - 38}
                textAnchor="middle"
                fill={golden.color}
                fontSize="9"
                fontWeight="700"
              >
                {clusterStageLabel(state, golden)} · {count}
              </text>
            </g>
          )
        })}
    </svg>
  )
}

function foregroundGraphics(state) {
  const currentPhase = phases[state.phaseIndex]
  const railWidth = 684

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
          18 +
          phases
            .slice(0, index)
            .reduce(
              (start, previous) => start + (previous.duration / programDuration) * railWidth,
              0,
            )
        const active = !state.complete && state.phaseIndex === index
        const complete = state.complete || index < state.phaseIndex
        return (
          <g key={phase.id}>
            <rect
              x={x}
              y="16"
              width={Math.max(0, width - 3)}
              height="28"
              rx="5"
              fill={
                active
                  ? "#1d4ed8"
                  : complete
                    ? "color-mix(in srgb, var(--surface-2) 72%, #2563eb)"
                    : "var(--surface-2, #e5e7eb)"
              }
              stroke={active ? "#1e40af" : "var(--surface-3, #cbd5e1)"}
            />
            <text
              x={x + (width - 3) / 2}
              y="34"
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
        x="360"
        y="66"
        textAnchor="middle"
        fill="var(--text-primary, #334155)"
        fontSize="12"
        fontWeight="700"
      >
        {state.complete
          ? "Golden-record publication complete"
          : `${currentPhase.label} · ${currentPhase.metric}`}
      </text>

      <g transform="translate(215 86)">
        {sourceSystems.map((system, index) => (
          <g key={system.id} transform={`translate(${index * 82} 0)`}>
            <circle r="6" fill={system.color} />
            <text x="10" y="3.5" fill="var(--text-secondary, #475569)" fontSize="9">
              {system.code} · {system.label}
            </text>
          </g>
        ))}
      </g>

      <path
        d="M 152 108 L 172 362 Q 360 389 548 362 L 568 108"
        fill="none"
        stroke="var(--text-primary, #334155)"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function roundedRectPath(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + r, y)
  context.lineTo(x + width - r, y)
  context.quadraticCurveTo(x + width, y, x + width, y + r)
  context.lineTo(x + width, y + height - r)
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  context.lineTo(x + r, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - r)
  context.lineTo(x, y + r)
  context.quadraticCurveTo(x, y, x + r, y)
  context.closePath()
}

function traceClusterEnvelope(context, members) {
  if (members.length >= 3) {
    tracePolygon(context, paddedHull(members, 18))
    return
  }

  const xs = members.map((member) => member.x)
  const ys = members.map((member) => member.y)
  const padding = bodyRadius + 13
  const x = Math.min(...xs) - padding
  const y = Math.min(...ys) - padding
  const width = Math.max(...xs) - Math.min(...xs) + padding * 2
  const height = Math.max(...ys) - Math.min(...ys) + padding * 2
  roundedRectPath(context, x, y, width, height, 20)
}

function drawBond(context, source, target) {
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

function drawClusterHullsAndBonds(context, bodies, state, policy) {
  if (!state.proposed) return

  for (const golden of goldenRecords) {
    const members = clusterRecords(golden.id, state, policy)
      .map((record) => bodies.find((body) => body.id === record.id))
      .filter(Boolean)
    if (members.length < 2) continue

    context.save()
    traceClusterEnvelope(context, members)
    context.fillStyle = state.published
      ? `${golden.color}2b`
      : state.resolved
        ? `${golden.color}1f`
        : `${golden.color}10`
    context.strokeStyle = golden.color
    context.globalAlpha = state.resolved ? 0.82 : 0.48
    context.lineWidth = state.published ? 2.4 : 1.7
    context.setLineDash(state.resolved ? [] : [5, 4])
    context.fill()
    context.stroke()
    context.restore()

    context.save()
    context.strokeStyle = golden.color
    context.globalAlpha = state.published ? 0.92 : state.resolved ? 0.72 : 0.38
    context.lineWidth = state.published ? 2 : 1.4
    context.setLineDash(state.resolved ? [] : [4, 4])
    const linkCount = members.length === 2 ? 1 : members.length
    for (let index = 0; index < linkCount; index += 1) {
      drawBond(context, members[index], members[(index + 1) % members.length])
    }
    context.restore()
  }
}

function drawSourceLabels(context, bodies, state, policy) {
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.font = "700 9px system-ui, sans-serif"

  for (const body of bodies) {
    const record = recordById.get(body.id)
    if (!record) continue
    const system = systemById.get(record.system)
    context.fillStyle = "#ffffff"
    context.fillText(system.code, body.x, body.y + 0.5)

    const needsQuestionBadge =
      record.ambiguous && state.proposed && (!state.resolved || policy === "conservative")
    if (!needsQuestionBadge) continue

    context.beginPath()
    context.arc(body.x + 8, body.y - 8, 5, 0, Math.PI * 2)
    context.fillStyle = "#f59e0b"
    context.fill()
    context.strokeStyle = "#ffffff"
    context.lineWidth = 1
    context.stroke()
    context.fillStyle = "#451a03"
    context.font = "700 7px system-ui, sans-serif"
    context.fillText("?", body.x + 8, body.y - 7.5)
    context.font = "700 9px system-ui, sans-serif"
  }
}

function semanticItems(state, policy) {
  const projection = projectionFor(state, policy)
  const phase = state.complete ? "complete" : phases[state.phaseIndex].label
  return [
    {
      id: "entity-resolution-phase-rail",
      label: `Entity-resolution phase: ${phase}`,
      description: state.complete
        ? "All authored entity-resolution events have been applied."
        : `${phases[state.phaseIndex].metric}.`,
      x: 360,
      y: 30,
      width: 684,
      height: 28,
      shape: "rect",
      group: "Matching program",
    },
    {
      id: "identity-crucible",
      label: "Identity resolution crucible",
      description:
        "Equal-size source-record bodies materialize preauthored matching decisions. Body contact and position never create a match.",
      x: 360,
      y: 238,
      width: 416,
      height: 270,
      shape: "rect",
      group: "Scene structure",
    },
    ...(state.proposed
      ? goldenRecords.map((golden) => {
          const count = clusterRecords(golden.id, state, policy).length
          return {
            id: `entity-resolution-${golden.id}`,
            label: `${clusterStageLabel(state, golden)}: ${count} source records`,
            description: state.resolved
              ? `The authored ledger assigns ${count} preserved source ids to ${golden.label}.`
              : `A proposed envelope shows ${count} authored candidate assignments for ${golden.label}.`,
            x: golden.center.x,
            y: golden.center.y,
            width: 136,
            height: 94,
            shape: "rect",
            group: state.published ? "Published golden records" : "Candidate identity clusters",
          }
        })
      : []),
    {
      id: "entity-resolution-quarantine",
      label: `Quarantine: ${projection.quarantine == null ? "not evaluated" : `${projection.quarantine} row`}`,
      description:
        "SUP-404 is routed here by the authored normalization event because required identity fields are absent.",
      x: 78,
      y: 234,
      width: 120,
      height: 244,
      shape: "rect",
      group: "Resolution outlets",
    },
    {
      id: "entity-resolution-manual-review",
      label: `Manual review: ${projection.review == null ? "not evaluated" : `${projection.review} row`}`,
      description:
        policy === "conservative"
          ? "The conservative policy retains ambiguous EVT-103 here after conflict resolution."
          : "The reviewer-approved policy explicitly assigns EVT-103 to Rowan Chen, leaving this tray empty.",
      x: 642,
      y: 234,
      width: 120,
      height: 244,
      shape: "rect",
      group: "Resolution outlets",
    },
  ]
}

function summary(state, policy) {
  const projection = projectionFor(state, policy)
  const phase = state.complete ? "Complete" : phases[state.phaseIndex].label
  const currentResult = state.published
    ? `${projection.golden} golden records are published; ${projection.review} source row is in manual review and ${projection.quarantine} is in quarantine.`
    : state.resolved
      ? `${projection.golden} golden-record drafts are resolved; ${projection.review} source row is in manual review and ${projection.quarantine} is in quarantine.`
      : state.proposed
        ? `${projection.candidates} authored candidate assignments are visible.`
        : state.normalized
          ? `${records.filter((record) => record.valid).length} valid rows are normalized and ${projection.quarantine} invalid row is quarantined.`
          : `${records.length} source rows are entering normalization.`

  return `Entity resolution crucible. ${phase}. ${currentResult} Collisions do not propose or approve matches.`
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

export default function EntityResolutionCrucibleExample({ rerunMS = null }) {
  const frameRef = useRef(null)
  const reducedMotion = useReducedMotion()
  const [policy, setPolicy] = useState("conservative")
  const [playbackRate, setPlaybackRate] = useState(0.65)
  const [resolvedRerunMS, setResolvedRerunMS] = useState(() => normalizeRerunMS(rerunMS))
  const [runId, setRunId] = useState(0)
  const [paused, setPaused] = useState(false)
  const [runState, setRunState] = useState(() => stateAt(0))
  const terminalState = useMemo(() => stateAt(programDuration), [])
  const displayState = reducedMotion ? terminalState : runState
  const runStateRef = useRef(runState)
  const displayStateRef = useRef(displayState)
  const policyRef = useRef(policy)
  const elapsedRef = useRef(0)
  const pauseAtRef = useRef(null)
  displayStateRef.current = displayState
  policyRef.current = policy

  const config = useMemo(
    () => ({
      ...baseConfig,
      timeScale: playbackRate,
    }),
    [playbackRate],
  )

  useEffect(() => {
    setResolvedRerunMS(normalizeRerunMS(rerunMS))
  }, [rerunMS])

  const spawns = useMemo(
    () => (reducedMotion ? terminalSpawns(policy) : initialSpawns),
    [policy, reducedMotion],
  )

  const programController = useMemo(
    () => ({
      id: `entity-resolution-program-${policy}-${runId}`,
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
    [policy, runId],
  )

  const background = useMemo(() => backgroundGraphics(displayState, policy), [displayState, policy])
  const foreground = useMemo(() => foregroundGraphics(displayState), [displayState])
  const bodyForces = useMemo(
    () =>
      displayState.complete
        ? undefined
        : ({ body }) => bodyForce(body, runStateRef.current, policyRef.current),
    [displayState.complete],
  )
  const bodyStyle = useMemo(
    () => (body) => {
      const record = recordById.get(body.id)
      const system = systemById.get(record.system)
      const status = recordStatus(record, displayState, policy)
      const golden = record.goldenId ? goldenById.get(record.goldenId) : null

      if (status.startsWith("quarantined")) {
        return { fill: system.color, stroke: "#dc2626", strokeWidth: 3, opacity: 0.96 }
      }
      if (status === "awaiting manual review") {
        return { fill: system.color, stroke: "#f59e0b", strokeWidth: 3, opacity: 0.96 }
      }
      if (displayState.published && golden) {
        return { fill: system.color, stroke: golden.color, strokeWidth: 2.6, opacity: 0.98 }
      }
      if (displayState.proposed && golden) {
        return {
          fill: system.color,
          stroke: record.ambiguous ? "#f59e0b" : golden.color,
          strokeWidth: record.ambiguous ? 2.5 : 1.8,
          opacity: 0.96,
        }
      }
      return { fill: system.color, stroke: "#1f2937", strokeWidth: 1.2, opacity: 0.95 }
    },
    [displayState, policy],
  )
  const beforePaint = useMemo(
    () => (context, bodies) =>
      drawClusterHullsAndBonds(context, bodies, displayStateRef.current, policyRef.current),
    [],
  )
  const afterPaint = useMemo(
    () => (context, bodies) =>
      drawSourceLabels(context, bodies, displayStateRef.current, policyRef.current),
    [],
  )

  const restart = useCallback(() => {
    const initial = stateAt(0)
    elapsedRef.current = 0
    pauseAtRef.current = null
    runStateRef.current = initial
    setRunState(initial)
    setPaused(false)
    setRunId((id) => id + 1)
  }, [])

  useEffect(() => {
    if (reducedMotion || !displayState.complete || resolvedRerunMS == null) return undefined
    const timer = window.setTimeout(restart, resolvedRerunMS)
    return () => window.clearTimeout(timer)
  }, [displayState.complete, reducedMotion, resolvedRerunMS, restart])

  const selectPolicy = (nextPolicy) => {
    if (nextPolicy === policy) return
    setPolicy(nextPolicy)
    restart()
  }

  const selectPlaybackRate = (nextRate) => {
    if (nextRate === playbackRate) return
    setPlaybackRate(nextRate)
    restart()
  }

  const togglePlayback = () => {
    if (displayState.complete) {
      restart()
      return
    }
    pauseAtRef.current = null
    setPaused((value) => !value)
  }

  const stepPhase = () => {
    const elapsed = frameRef.current?.snapshot?.().elapsedSeconds ?? elapsedRef.current
    const nextBoundary = phaseEnds.find((end) => end > elapsed + 0.001)
    if (nextBoundary == null) {
      restart()
      return
    }
    pauseAtRef.current = nextBoundary
    setPaused(false)
  }

  const currentPhase = phases[displayState.phaseIndex]
  const cards = projectionCards(displayState, policy)
  const eventTape = [
    {
      id: "normalize",
      label: "Normalize fields; route invalid SUP-404 to Quarantine",
      progress: "55%",
      applied: displayState.normalized,
    },
    {
      id: "propose",
      label: "Materialize authored candidate assignments",
      progress: "16%",
      applied: displayState.proposed,
    },
    {
      id: "resolve",
      label:
        policy === "conservative"
          ? "Retain ambiguous EVT-103 for Manual review"
          : "Apply reviewer approval: EVT-103 → GR-104",
      progress: "18%",
      applied: displayState.resolved,
    },
    {
      id: "publish",
      label: "Publish approved golden records",
      progress: "45%",
      applied: displayState.published,
    },
  ]

  return (
    <div className="live-example">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <strong>Customer 360 identity crucible</strong>
          <p style={{ margin: "6px 0 0", color: "var(--text-secondary)" }}>
            Fifteen equal-size circles are preserved source records from four systems. Authored
            evidence and the selected resolution run assign every destination; collisions only
            animate the shared treatment and never propose, approve, or reject a match.
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
            Authored resolution run
          </legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {[
              ["conservative", "Conservative"],
              ["reviewed", "Reviewer-approved"],
            ].map(([value, label]) => (
              <label key={value} style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
                <input
                  type="radio"
                  name="entity-resolution-policy"
                  value={value}
                  checked={policy === value}
                  onChange={() => selectPolicy(value)}
                />
                {label}
              </label>
            ))}
          </div>
          <div style={{ marginTop: 7, color: "var(--text-secondary)", fontSize: 12 }}>
            {policy === "conservative"
              ? "EVT-103 has only a shared address, so its authored destination is Manual review."
              : "A recorded reviewer decision explicitly assigns EVT-103 to GR-104 · Rowan Chen."}
          </div>
        </fieldset>

        <aside
          aria-label="Golden-record publication mold"
          style={{
            border: "1px solid color-mix(in srgb, var(--accent) 55%, var(--surface-3))",
            borderRadius: 8,
            background: "color-mix(in srgb, var(--surface-1) 92%, var(--accent))",
            gridColumn: "1 / -1",
            padding: "9px 11px",
          }}
        >
          <strong>Publication mold</strong>
          <div style={{ color: "var(--text-secondary)", fontSize: 11, marginTop: 2 }}>
            Static acceptance criteria—not a preview of the result
          </div>
          <ul style={{ display: "grid", gap: 3, margin: "7px 0 0", paddingLeft: 18 }}>
            <li>One canonical identity per person</li>
            <li>Required identity fields present</li>
            <li>Exact source IDs retained as lineage</li>
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
        <button type="button" onClick={restart} disabled={reducedMotion}>
          Reset
        </button>
        <label
          style={{
            display: "inline-flex",
            gap: 6,
            alignItems: "center",
            color: "var(--text-secondary)",
            fontSize: 12,
          }}
        >
          Pace
          <select
            aria-label="Entity-resolution playback pace"
            value={playbackRate}
            disabled={reducedMotion}
            onChange={(event) => selectPlaybackRate(Number(event.target.value))}
          >
            {playbackRates.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label
          style={{
            display: "inline-flex",
            gap: 6,
            alignItems: "center",
            color: "var(--text-secondary)",
            fontSize: 12,
          }}
        >
          Auto replay
          <select
            aria-label="Entity-resolution automatic replay delay"
            value={resolvedRerunMS ?? ""}
            disabled={reducedMotion}
            onChange={(event) =>
              setResolvedRerunMS(event.target.value === "" ? null : Number(event.target.value))
            }
          >
            {rerunDelays.map((option) => (
              <option key={option.value ?? "off"} value={option.value ?? ""}>
                {option.label}
              </option>
            ))}
            {resolvedRerunMS != null &&
            !rerunDelays.some((option) => option.value === resolvedRerunMS) ? (
              <option value={resolvedRerunMS}>{resolvedRerunMS.toLocaleString()} ms (prop)</option>
            ) : null}
          </select>
        </label>
        <span aria-live="polite" style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          {reducedMotion
            ? "Reduced motion: the authored terminal projection is shown."
            : displayState.complete
              ? resolvedRerunMS == null
                ? "Publication complete. Switch resolution run to compare the governed exception."
                : `Publication complete. Automatic replay in ${resolvedRerunMS.toLocaleString()} ms.`
              : `Phase ${displayState.phaseIndex + 1} of ${phases.length}: ${currentPhase.label}.`}
        </span>
      </div>

      <div
        aria-label="Live entity-resolution projection"
        aria-live="polite"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))",
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
          key={`${runId}-${policy}-${reducedMotion ? "settled" : "replay"}`}
          ref={frameRef}
          title="Customer 360 entity-resolution crucible"
          summary={summary(displayState, policy)}
          description="Fifteen preserved, equal-size source-record bodies move through Normalize, Propose matches, Resolve conflicts, and Publish. Four source systems are encoded by fill and one-letter labels. Authored matching assignments form candidate and golden-record hulls; the selected resolution run routes ambiguous EVT-103 either to Manual review or to Rowan Chen. Invalid SUP-404 remains in Quarantine. Physics materializes deterministic targets and never decides identity."
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
          semanticItems={semanticItems(displayState, policy)}
          bodySemanticItems={(body) => {
            const record = recordById.get(body.id)
            const system = systemById.get(record.system)
            return {
              label: `${record.id}: ${record.observedName}`,
              description: `${system.label} source record; ${record.evidence}; ${recordStatus(record, displayState, policy)}. Destination: ${recordDestination(record, displayState, policy)}. The source id is preserved.`,
              group: recordDestination(record, displayState, policy),
              datum: record,
            }
          }}
          accessibleTable
          enableHover
          hoverRadius={17}
          bodyStyle={bodyStyle}
          tooltipContent={(hover) => {
            const record = recordById.get(hover.id) || hover.data || {}
            const system = systemById.get(record.system)
            return (
              <div className="semiotic-tooltip">
                <strong>{record.id || hover.id}</strong>
                <div>{record.observedName}</div>
                <div>
                  {system?.label} · {recordStatus(record, displayState, policy)}
                </div>
                <div>{recordDestination(record, displayState, policy)}</div>
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
        Circle size is deliberately constant: these are source rows, not weighted customers. Hulls
        and bonds show ledger membership, side trays remain part of the same world, and no row is
        removed or respawned when it reaches an outlet.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: 14,
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <caption style={{ padding: "0 0 7px", textAlign: "left", fontWeight: 700 }}>
              Authoritative source-record ledger
            </caption>
            <thead>
              <tr>
                {["Source row", "Observed identity", "Match evidence", "Ledger destination"].map(
                  (label) => (
                    <th
                      key={label}
                      scope="col"
                      style={{ ...cellStyle, borderBottomColor: "var(--surface-3)" }}
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <th scope="row" style={cellStyle}>
                    <span style={{ display: "block" }}>{record.id}</span>
                    <small style={{ color: "var(--text-secondary)", fontWeight: 400 }}>
                      {systemById.get(record.system).label}
                    </small>
                  </th>
                  <td style={cellStyle}>{record.observedName}</td>
                  <td style={cellStyle}>{record.evidence}</td>
                  <td style={cellStyle}>{recordDestination(record, displayState, policy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
            {eventTape.map((event, index) => (
              <li
                key={event.id}
                style={{ color: event.applied ? "var(--text-primary)" : "var(--text-secondary)" }}
              >
                <span aria-hidden="true">{event.applied ? "✓ " : "○ "}</span>
                <span>{event.label}</span>
                <div style={{ fontSize: 11, marginTop: 2 }}>
                  {phases[index].label} · authored at {event.progress} of phase
                </div>
              </li>
            ))}
          </ol>
          <p style={{ margin: "11px 0 0", color: "var(--text-secondary)" }}>
            The resolution run changes one authored assignment, not a force parameter. Replaying a
            run always produces the same semantic destinations and equivalent targets.
          </p>
        </div>
      </div>
    </div>
  )
}
