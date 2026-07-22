import React, { useEffect, useMemo, useRef, useState } from "react"
import { StreamPhysicsFrame } from "semiotic/physics"
import { useReducedMotion } from "semiotic/utils"

import { paddedHull, tracePolygon } from "./cruciblePreviewUtils.js"

const frameSize = [720, 480]
const bodyRadius = 11

const phases = [
  { id: "charge", label: "Charge", duration: 1.6, metric: "Load 12 peer requirements" },
  { id: "assay", label: "Assay", duration: 3.2, metric: "Test evidence, owners, and fit" },
  {
    id: "deliberate",
    label: "Deliberate",
    duration: 4.8,
    metric: "Apply the selected facilitation record",
  },
  { id: "ratify", label: "Ratify", duration: 2.4, metric: "Publish commitments and exceptions" },
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
  assayed: timeInPhase("assay", 0.22),
  evidenceNamed: timeInPhase("assay", 0.7),
  openRouted: timeInPhase("deliberate", 0.15),
  deferredRouted: timeInPhase("deliberate", 0.36),
  conflictRouted: timeInPhase("deliberate", 0.56),
  declinedRouted: timeInPhase("deliberate", 0.73),
  packageFormed: timeInPhase("deliberate", 0.9),
  ratified: timeInPhase("ratify", 0.48),
  complete: programDuration,
}

const origins = [
  { id: "architecture", label: "Architecture", code: "A", color: "#2563eb" },
  { id: "support", label: "Support", code: "S", color: "#d97706" },
  { id: "sdk", label: "SDK", code: "K", color: "#7c3aed" },
  { id: "product", label: "Product", code: "P", color: "#db2777" },
  { id: "docs", label: "Docs", code: "D", color: "#0891b2" },
  { id: "sre", label: "SRE", code: "R", color: "#0f766e" },
  { id: "on-call", label: "On-call", code: "O", color: "#ea580c" },
  { id: "incident", label: "Incident command", code: "I", color: "#be123c" },
  { id: "security", label: "Security", code: "X", color: "#dc2626" },
  { id: "mobile", label: "Mobile", code: "M", color: "#4f46e5" },
  { id: "comms", label: "Communications", code: "C", color: "#64748b" },
]

const proposals = [
  {
    id: "change-record",
    code: "A",
    origin: "architecture",
    label: "One-page change record",
    requirement: "Record scope, owner, affected surface, and rollback before review.",
  },
  {
    id: "consumer-map",
    code: "B",
    origin: "support",
    label: "Affected-consumer map",
    requirement: "Name affected teams, integration paths, and contact channels.",
  },
  {
    id: "contract-tests",
    code: "C",
    origin: "sdk",
    label: "Consumer contract tests",
    requirement: "Block merge when a supported client contract fails in CI.",
  },
  {
    id: "compatibility-window",
    code: "D",
    origin: "product",
    label: "Two-release compatibility window",
    requirement: "Keep the old API working for at least two releases.",
  },
  {
    id: "migration-kit",
    code: "E",
    origin: "docs",
    label: "Migration guide + JS codemod",
    requirement: "Publish the guide and first codemod when the beta opens.",
  },
  {
    id: "usage-threshold",
    code: "F",
    origin: "sre",
    label: "Usage threshold before removal",
    requirement: "Retire the old API only after legacy traffic falls below five percent.",
  },
  {
    id: "rollback-owner",
    code: "G",
    origin: "on-call",
    label: "Named rollback owner",
    requirement: "A named owner confirms the rollback path before launch.",
  },
  {
    id: "emergency-review",
    code: "H",
    origin: "incident",
    label: "24-hour emergency review",
    requirement: "Permit an incident bypass, then audit it within 24 hours.",
  },
  {
    id: "unanimous-approval",
    code: "I",
    origin: "security",
    label: "Unanimous approval",
    requirement: "Require every reviewing function to approve a breaking change.",
  },
  {
    id: "accountable-approver",
    code: "J",
    origin: "product",
    label: "One accountable approver",
    requirement: "Consult every reviewing function; one named approver makes the call.",
  },
  {
    id: "sdk-parity",
    code: "K",
    origin: "mobile",
    label: "All-SDK migration parity",
    requirement: "Do not launch generally until every supported SDK has a migration path.",
  },
  {
    id: "release-notes-only",
    code: "L",
    origin: "comms",
    label: "Release notes as sole notice",
    requirement: "Use the normal release notes as the only consumer notification.",
  },
]

const proposalById = new Map(proposals.map((proposal) => [proposal.id, proposal]))
const originById = new Map(origins.map((origin) => [origin.id, origin]))

const products = [
  { id: "evidence", label: "Release evidence", center: { x: 267, y: 202 }, color: "#2563eb" },
  {
    id: "migration",
    label: "Migration promise",
    center: { x: 443, y: 202 },
    color: "#7c3aed",
  },
  {
    id: "safety",
    label: "Decision & recovery",
    center: { x: 355, y: 336 },
    color: "#0f766e",
  },
]

const productById = new Map(products.map((product) => [product.id, product]))

const outlets = {
  open: {
    id: "open",
    label: "OPEN",
    detail: "evidence or policy needed · retained",
    center: { x: 658, y: 161 },
    box: { x: 596, y: 112, width: 116, height: 96 },
    color: "#0891b2",
  },
  deferred: {
    id: "deferred",
    label: "DEFERRED",
    detail: "owned work beyond this release",
    center: { x: 658, y: 277 },
    box: { x: 596, y: 228, width: 116, height: 96 },
    color: "#d97706",
  },
  conflict: {
    id: "conflict",
    label: "CONFLICT",
    detail: "incompatible rules · escalate",
    center: { x: 658, y: 393 },
    box: { x: 596, y: 344, width: 116, height: 96 },
    color: "#dc2626",
  },
  declined: {
    id: "declined",
    label: "DECLINED",
    detail: "tested and fails the mold",
    center: { x: 61, y: 351 },
    box: { x: 8, y: 286, width: 106, height: 130 },
    color: "#64748b",
  },
}

const decisionRuns = {
  synthesis: {
    id: "synthesis",
    label: "Consensus synthesis",
    shortLabel: "Synthesis",
    description:
      "The facilitator preserves both approval proposals as an explicit conflict and ratifies the requirements that already have evidence and owners.",
    decisions: {
      "change-record": {
        kind: "product",
        destination: "evidence",
        reason: "Owned by Architecture; the review template already exists.",
      },
      "consumer-map": {
        kind: "product",
        destination: "evidence",
        reason: "Support owns the consumer inventory and contact list.",
      },
      "contract-tests": {
        kind: "product",
        destination: "evidence",
        reason: "The SDK group commits its existing contract suite to the release gate.",
      },
      "compatibility-window": {
        kind: "product",
        destination: "migration",
        reason: "Product accepts two releases as the compatibility promise.",
      },
      "migration-kit": {
        kind: "product",
        destination: "migration",
        reason: "Docs owns the guide and the JavaScript codemod has a maintainer.",
      },
      "usage-threshold": {
        kind: "open",
        reason: "No trustworthy baseline exists yet; the threshold remains a retained question.",
      },
      "rollback-owner": {
        kind: "product",
        destination: "safety",
        reason: "On-call can name the owner and verify rollback before launch.",
      },
      "emergency-review": {
        kind: "product",
        destination: "safety",
        reason: "Incident command owns the time-boxed bypass and retrospective.",
      },
      "unanimous-approval": {
        kind: "conflict",
        reason: "It cannot coexist with the proposed accountable-decider rule.",
      },
      "accountable-approver": {
        kind: "conflict",
        reason: "It cannot coexist with unanimous approval; escalation is recorded.",
      },
      "sdk-parity": {
        kind: "deferred",
        reason: "The requirement is in scope, but two SDK migration owners are not staffed.",
      },
      "release-notes-only": {
        kind: "declined",
        reason: "Passive notice alone fails the mold's affected-consumer requirement.",
      },
    },
  },
  timeboxed: {
    id: "timeboxed",
    label: "Ship-date floor",
    shortLabel: "Ship-date floor",
    description:
      "The facilitator ratifies a smaller release floor, selects one accountable approver, and makes date-bound missing work visible instead of treating it as agreement.",
    decisions: {
      "change-record": {
        kind: "product",
        destination: "evidence",
        reason: "The compact change record is required for the ship-date floor.",
      },
      "consumer-map": {
        kind: "product",
        destination: "evidence",
        reason: "Support commits a named affected-consumer list before beta.",
      },
      "contract-tests": {
        kind: "deferred",
        reason: "The harness has a funded owner, but cannot be wired before this release.",
      },
      "compatibility-window": {
        kind: "open",
        reason:
          "Product calendars disagree on what counts as two releases; a policy decision remains.",
      },
      "migration-kit": {
        kind: "product",
        destination: "migration",
        reason: "Docs commits the guide and first codemod as the minimum migration deliverable.",
      },
      "usage-threshold": {
        kind: "deferred",
        reason: "SRE schedules instrumentation next sprint with a named owner.",
      },
      "rollback-owner": {
        kind: "product",
        destination: "safety",
        reason: "A rollback owner remains a non-negotiable launch commitment.",
      },
      "emergency-review": {
        kind: "product",
        destination: "safety",
        reason: "The 24-hour review keeps the emergency path accountable.",
      },
      "unanimous-approval": {
        kind: "declined",
        reason: "Unanimity can strand a time-boxed decision and does not name the final decider.",
      },
      "accountable-approver": {
        kind: "product",
        destination: "safety",
        reason: "The run names one approver while preserving consultation duties.",
      },
      "sdk-parity": {
        kind: "deferred",
        reason: "The mobile migration work is owned, but sits outside the agreed release floor.",
      },
      "release-notes-only": {
        kind: "declined",
        reason: "Release notes alone still fail the affected-consumer criterion.",
      },
    },
  },
}

const initialSpawns = proposals.map((proposal, index) => ({
  id: proposal.id,
  x: 191 + (index % 6) * 64,
  y: 114 + Math.floor(index / 6) * 25,
  vx: (index % 5) * 2 - 4,
  vy: 2,
  mass: 1,
  shape: { type: "circle", radius: bodyRadius },
  datum: { ...proposal, role: "peer-requirement", proposalId: proposal.id },
}))

const config = {
  kernel: {
    seed: 20260721,
    gravity: { x: 0, y: 0 },
    restitution: 0.16,
    friction: 0.7,
    velocityDamping: 0.989,
    collisionIterations: 4,
    sleepSpeed: 1.5,
    sleepAfter: 0.55,
  },
  fixedDt: 1 / 60,
  maxSubsteps: 8,
  timeScale: 1,
  observation: {
    chartId: "crucible-chart-working-agreement-preview-docs",
    chartType: "StreamPhysicsFrame",
  },
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
    assayed: time >= eventTimes.assayed,
    evidenceNamed: time >= eventTimes.evidenceNamed,
    openRouted: time >= eventTimes.openRouted,
    deferredRouted: time >= eventTimes.deferredRouted,
    conflictRouted: time >= eventTimes.conflictRouted,
    declinedRouted: time >= eventTimes.declinedRouted,
    packageFormed: time >= eventTimes.packageFormed,
    ratified: time >= eventTimes.ratified,
    complete: time >= eventTimes.complete,
  }
}

function stateKey(state) {
  return [
    state.phaseIndex,
    state.assayed,
    state.evidenceNamed,
    state.openRouted,
    state.deferredRouted,
    state.conflictRouted,
    state.declinedRouted,
    state.packageFormed,
    state.ratified,
    state.complete,
  ].join("|")
}

function decisionApplied(decision, state) {
  if (decision.kind === "product") return state.packageFormed
  if (decision.kind === "open") return state.openRouted
  if (decision.kind === "deferred") return state.deferredRouted
  if (decision.kind === "conflict") return state.conflictRouted
  if (decision.kind === "declined") return state.declinedRouted
  return false
}

function runDecisions(runId) {
  return decisionRuns[runId].decisions
}

function destinationLabel(decision) {
  if (decision.kind === "product") return productById.get(decision.destination).label
  return outlets[decision.kind].label[0] + outlets[decision.kind].label.slice(1).toLowerCase()
}

function currentDestination(proposal, state, runId) {
  const decision = runDecisions(runId)[proposal.id]
  if (decisionApplied(decision, state)) return destinationLabel(decision)
  if (state.evidenceNamed) return "Deliberation table"
  if (state.assayed) return "Criteria assay"
  return "Workshop charge"
}

function currentStatus(proposal, state, runId) {
  const decision = runDecisions(runId)[proposal.id]
  if (decisionApplied(decision, state)) {
    if (decision.kind === "product")
      return state.ratified ? "ratified commitment" : "package member"
    if (decision.kind === "open") return "open: retained for evidence or policy"
    if (decision.kind === "deferred") return "deferred: owned later work"
    if (decision.kind === "conflict") return "unresolved conflict: escalated"
    return "declined: fails an acceptance criterion"
  }
  if (state.evidenceNamed) return "evidence and ownership named"
  if (state.assayed) return "being tested against the mold"
  return "charged peer requirement"
}

function projectionFor(state, runId) {
  const result = {
    input: proposals.length,
    commitments: 0,
    products: 0,
    open: 0,
    deferred: 0,
    conflict: 0,
    declined: 0,
    accounted: 0,
  }
  const activeProducts = new Set()

  for (const decision of Object.values(runDecisions(runId))) {
    if (!decisionApplied(decision, state)) continue
    result.accounted += 1
    if (decision.kind === "product") {
      result.commitments += 1
      activeProducts.add(decision.destination)
    } else {
      result[decision.kind] += 1
    }
  }

  result.products = activeProducts.size
  result.balance = result.input - result.accounted
  return result
}

function assayTarget(index, elapsed) {
  const angle = -Math.PI / 2 + index * ((Math.PI * 2) / proposals.length) + elapsed * 0.18
  const radiusX = index % 2 ? 132 : 109
  const radiusY = index % 2 ? 104 : 82
  return { x: 355 + Math.cos(angle) * radiusX, y: 267 + Math.sin(angle) * radiusY }
}

function productMembers(productId, runId) {
  const decisions = runDecisions(runId)
  return proposals.filter((proposal) => {
    const decision = decisions[proposal.id]
    return decision.kind === "product" && decision.destination === productId
  })
}

function productTarget(proposal, runId) {
  const decision = runDecisions(runId)[proposal.id]
  const product = productById.get(decision.destination)
  const members = productMembers(product.id, runId)
  const index = members.findIndex((member) => member.id === proposal.id)
  if (members.length === 1) return product.center
  const angle = -Math.PI / 2 + index * ((Math.PI * 2) / members.length)
  const radius = members.length > 2 ? 27 : 25
  return {
    x: product.center.x + Math.cos(angle) * radius,
    y: product.center.y + Math.sin(angle) * radius,
  }
}

function outletTarget(proposal, kind, runId) {
  const outlet = outlets[kind]
  const decisions = runDecisions(runId)
  const members = proposals.filter((candidate) => decisions[candidate.id].kind === kind)
  const index = members.findIndex((member) => member.id === proposal.id)
  if (members.length === 1) return outlet.center
  const columns = members.length > 2 ? 2 : members.length
  const row = Math.floor(index / columns)
  const column = index % columns
  return {
    x: outlet.center.x + (column - (columns - 1) / 2) * 27,
    y: outlet.center.y + (row - (Math.ceil(members.length / columns) - 1) / 2) * 28,
  }
}

function targetFor(proposal, state, runId, elapsed) {
  const decision = runDecisions(runId)[proposal.id]
  if (decisionApplied(decision, state)) {
    if (decision.kind === "product") return productTarget(proposal, runId)
    return outletTarget(proposal, decision.kind, runId)
  }

  if (state.assayed) return assayTarget(proposals.indexOf(proposal), elapsed)

  const index = proposals.indexOf(proposal)
  return {
    x: 205 + (index % 6) * 60,
    y: 170 + Math.floor(index / 6) * 54,
  }
}

function forceToTarget(body, target, stiffness, damping = 6.1) {
  return {
    x: (target.x - body.x) * stiffness - body.vx * damping,
    y: (target.y - body.y) * stiffness - body.vy * damping,
  }
}

function bodyForce(body, state, runId, elapsed) {
  const proposal = proposalById.get(body.id)
  if (!proposal) return null
  const decision = runDecisions(runId)[proposal.id]
  const applied = decisionApplied(decision, state)
  const stiffness = applied
    ? decision.kind === "open"
      ? 52
      : decision.kind === "product"
        ? state.ratified
          ? 42
          : 34
        : 39
    : state.assayed
      ? 20
      : 25
  const damping = applied && decision.kind === "open" ? 5.2 : 6.1
  return forceToTarget(body, targetFor(proposal, state, runId, elapsed), stiffness, damping)
}

function terminalSpawns(runId) {
  const state = stateAt(programDuration)
  return initialSpawns.map((spawn) => {
    const proposal = proposalById.get(spawn.id)
    const target = targetFor(proposal, state, runId, programDuration)
    return { ...spawn, ...target, vx: 0, vy: 0 }
  })
}

function backgroundGraphics(state, runId) {
  const projection = projectionFor(state, runId)
  const activeColor = ["#64748b", "#2563eb", "#7c3aed", "#0f766e"][state.phaseIndex]

  return () => (
    <svg
      aria-hidden="true"
      width={frameSize[0]}
      height={frameSize[1]}
      viewBox={`0 0 ${frameSize[0]} ${frameSize[1]}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <path
        d="M 130 106 L 151 412 Q 355 463 575 412 L 592 106 Z"
        fill={activeColor}
        fillOpacity={state.phaseIndex === 1 ? 0.1 : 0.05}
      />

      {Object.values(outlets).map((outlet) => {
        const count = projection[outlet.id]
        return (
          <g key={outlet.id}>
            <rect
              {...outlet.box}
              rx="10"
              fill={outlet.color}
              fillOpacity="0.075"
              stroke={outlet.color}
              strokeOpacity="0.78"
              strokeWidth="1.5"
            />
            <text
              x={outlet.box.x + outlet.box.width / 2}
              y={outlet.box.y + 20}
              textAnchor="middle"
              fill={outlet.color}
              fontSize="10"
              fontWeight="800"
            >
              {outlet.label} · {count}
            </text>
            <text
              x={outlet.box.x + outlet.box.width / 2}
              y={outlet.box.y + outlet.box.height - 11}
              textAnchor="middle"
              fill={outlet.color}
              fontSize="8"
            >
              {outlet.id === "open" ? "retained—not rejected" : outlet.detail.split(" · ")[0]}
            </text>
          </g>
        )
      })}

      {state.assayed && !state.packageFormed && (
        <g>
          <ellipse
            cx="355"
            cy="267"
            rx="157"
            ry="123"
            fill="none"
            stroke={activeColor}
            strokeOpacity="0.32"
            strokeDasharray="5 6"
          />
          <text x="355" y="267" textAnchor="middle" fill={activeColor} fontSize="10">
            criteria assay
          </text>
        </g>
      )}

      {state.packageFormed &&
        products.map((product) => {
          const count = productMembers(product.id, runId).length
          return (
            <g key={product.id}>
              <ellipse
                cx={product.center.x}
                cy={product.center.y}
                rx="67"
                ry="51"
                fill={product.color}
                fillOpacity={state.ratified ? 0.085 : 0.045}
                stroke={product.color}
                strokeOpacity="0.42"
              />
              <text
                x={product.center.x}
                y={product.center.y - 42}
                textAnchor="middle"
                fill={product.color}
                fontSize="10"
                fontWeight="800"
              >
                {product.label} · {count}
              </text>
            </g>
          )
        })}
    </svg>
  )
}

function foregroundGraphics(state, runId) {
  const currentPhase = phases[state.phaseIndex]
  const railWidth = 696

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
          12 +
          phases
            .slice(0, index)
            .reduce(
              (start, previous) => start + (previous.duration / programDuration) * railWidth,
              0,
            )
        const active = !state.complete && index === state.phaseIndex
        const complete = state.complete || index < state.phaseIndex
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
                  ? "#7c3aed"
                  : complete
                    ? "color-mix(in srgb, var(--surface-2) 72%, #7c3aed)"
                    : "var(--surface-2, #e5e7eb)"
              }
              stroke={active ? "#5b21b6" : "var(--surface-3, #cbd5e1)"}
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
        x="355"
        y="67"
        textAnchor="middle"
        fill="var(--text-primary, #334155)"
        fontSize="12"
        fontWeight="700"
      >
        {state.complete
          ? `${decisionRuns[runId].shortLabel} · decision record complete`
          : `${currentPhase.label} · ${currentPhase.metric}`}
      </text>

      <path
        d="M 130 106 L 151 412 Q 355 463 575 412 L 592 106"
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

function traceProductEnvelope(context, members) {
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
  roundedRectPath(context, x, y, width, height, 19)
}

function drawProducts(context, bodies, state, runId) {
  if (!state.packageFormed) return
  for (const product of products) {
    const members = productMembers(product.id, runId)
      .map((proposal) => bodies.find((body) => body.id === proposal.id))
      .filter(Boolean)
    if (!members.length) continue

    context.save()
    traceProductEnvelope(context, members)
    context.fillStyle = `${product.color}${state.ratified ? "29" : "16"}`
    context.strokeStyle = product.color
    context.globalAlpha = state.ratified ? 0.88 : 0.58
    context.lineWidth = state.ratified ? 2.4 : 1.7
    context.setLineDash(state.ratified ? [] : [5, 4])
    context.fill()
    context.stroke()
    context.restore()

    if (members.length < 2) continue
    context.save()
    context.strokeStyle = product.color
    context.globalAlpha = state.ratified ? 0.85 : 0.48
    context.lineWidth = state.ratified ? 1.8 : 1.3
    context.setLineDash(state.ratified ? [] : [4, 4])
    for (let index = 0; index < members.length - 1; index += 1) {
      const source = members[index]
      const target = members[index + 1]
      context.beginPath()
      context.moveTo(source.x, source.y)
      context.lineTo(target.x, target.y)
      context.stroke()
    }
    context.restore()
  }
}

function drawProposalCodes(context, bodies) {
  context.save()
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.font = "800 9px system-ui, sans-serif"
  for (const body of bodies) {
    const proposal = proposalById.get(body.id)
    if (!proposal) continue
    context.fillStyle = "#ffffff"
    context.fillText(proposal.code, body.x, body.y + 0.5)
  }
  context.restore()
}

function semanticItems(state, runId) {
  const projection = projectionFor(state, runId)
  const phase = state.complete ? "complete" : phases[state.phaseIndex].label
  return [
    {
      id: "workshop-phase-rail",
      label: `Working-agreement phase: ${phase}`,
      description: state.complete
        ? "All authored facilitation events have been applied."
        : phases[state.phaseIndex].metric,
      x: 360,
      y: 28,
      width: 696,
      height: 28,
      shape: "rect",
      group: "Facilitation program",
    },
    {
      id: "working-agreement-crucible",
      label: "Breaking-change working-agreement crucible",
      description:
        "Twelve preserved peer requirements undergo a criteria assay and an authored facilitation run. Contact does not accept, reject, or combine a requirement.",
      x: 360,
      y: 272,
      width: 462,
      height: 332,
      shape: "rect",
      group: "Scene structure",
    },
    ...(state.packageFormed
      ? products.map((product) => ({
          id: `workshop-product-${product.id}`,
          label: `${product.label}: ${productMembers(product.id, runId).length} commitments`,
          description:
            "The envelope preserves the exact requirement bodies assigned by the selected facilitation record.",
          x: product.center.x,
          y: product.center.y,
          width: 134,
          height: 102,
          shape: "rect",
          group: "Working-agreement package",
        }))
      : []),
    ...Object.values(outlets).map((outlet) => ({
      id: `workshop-outlet-${outlet.id}`,
      label: `${outlet.label}: ${projection[outlet.id]} requirements`,
      description: outlet.detail,
      x: outlet.box.x + outlet.box.width / 2,
      y: outlet.box.y + outlet.box.height / 2,
      width: outlet.box.width,
      height: outlet.box.height,
      shape: "rect",
      group: "Decision outlets",
    })),
  ]
}

function summary(state, runId) {
  const projection = projectionFor(state, runId)
  const phase = state.complete ? "Complete" : phases[state.phaseIndex].label
  return `Breaking-change workshop crucible. ${phase}. ${projection.commitments} requirements are commitments across ${projection.products} products; ${projection.open} are open, ${projection.deferred} deferred, ${projection.conflict} in conflict, and ${projection.declined} declined. ${projection.balance} of ${projection.input} requirements await an authored destination. Physics does not decide the result.`
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
  padding: "6px",
  textAlign: "left",
  verticalAlign: "top",
}

function normalizedPace(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.max(0.2, Math.min(2, number)) : 0.65
}

function normalizedRerunDelay(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null
}

export default function TeamWorkshopExample({ rerunMS = null, initialPace = 0.65 } = {}) {
  const frameRef = useRef(null)
  const reducedMotion = useReducedMotion()
  const [decisionRun, setDecisionRun] = useState("synthesis")
  const [pace, setPace] = useState(() => normalizedPace(initialPace))
  const [autoReplayMS, setAutoReplayMS] = useState(() => normalizedRerunDelay(rerunMS))
  const [runId, setRunId] = useState(0)
  const [paused, setPaused] = useState(false)
  const [runState, setRunState] = useState(() => stateAt(0))
  const terminalState = useMemo(() => stateAt(programDuration), [])
  const displayState = reducedMotion ? terminalState : runState
  const runStateRef = useRef(runState)
  const displayStateRef = useRef(displayState)
  const decisionRunRef = useRef(decisionRun)
  const elapsedRef = useRef(0)
  const pauseAtRef = useRef(null)
  const restartRef = useRef(null)
  const rerunTimerRef = useRef(null)
  displayStateRef.current = displayState
  decisionRunRef.current = decisionRun

  const spawns = useMemo(
    () => (reducedMotion ? terminalSpawns(decisionRun) : initialSpawns),
    [decisionRun, reducedMotion],
  )
  const playbackConfig = useMemo(() => ({ ...config, timeScale: pace }), [pace])

  const programController = useMemo(
    () => ({
      id: `working-agreement-program-${decisionRun}-${runId}`,
      continuous: true,
      tick: ({ elapsed }) => {
        const programElapsed = elapsed
        elapsedRef.current = programElapsed
        const nextState = stateAt(programElapsed)
        if (stateKey(nextState) !== stateKey(runStateRef.current)) {
          runStateRef.current = nextState
          setRunState(nextState)
        }

        if (nextState.complete) {
          pauseAtRef.current = null
          setPaused(true)
          return
        }

        if (pauseAtRef.current !== null && programElapsed >= pauseAtRef.current) {
          pauseAtRef.current = null
          setPaused(true)
        }
      },
    }),
    [decisionRun, runId],
  )

  const background = useMemo(
    () => backgroundGraphics(displayState, decisionRun),
    [decisionRun, displayState],
  )
  const foreground = useMemo(
    () => foregroundGraphics(displayState, decisionRun),
    [decisionRun, displayState],
  )
  const bodyForces = useMemo(
    () =>
      displayState.complete
        ? undefined
        : ({ body }) =>
            bodyForce(body, runStateRef.current, decisionRunRef.current, elapsedRef.current),
    [displayState.complete],
  )
  const bodyStyle = useMemo(
    () => (body) => {
      const proposal = proposalById.get(body.id)
      const origin = originById.get(proposal.origin)
      const decision = runDecisions(decisionRun)[proposal.id]
      const applied = decisionApplied(decision, displayState)
      const destinationColor =
        decision.kind === "product"
          ? productById.get(decision.destination).color
          : outlets[decision.kind].color
      return {
        fill: origin.color,
        stroke: applied ? destinationColor : "#1f2937",
        strokeWidth: applied ? (displayState.ratified ? 3 : 2.4) : 1.2,
        opacity: applied ? 0.98 : 0.93,
      }
    },
    [decisionRun, displayState],
  )
  const beforePaint = useMemo(
    () => (context, bodies) =>
      drawProducts(context, bodies, displayStateRef.current, decisionRunRef.current),
    [],
  )
  const afterPaint = useMemo(() => (context, bodies) => drawProposalCodes(context, bodies), [])

  const restart = () => {
    if (rerunTimerRef.current != null) {
      clearTimeout(rerunTimerRef.current)
      rerunTimerRef.current = null
    }
    const initial = stateAt(0)
    elapsedRef.current = 0
    pauseAtRef.current = null
    runStateRef.current = initial
    setRunState(initial)
    setPaused(false)
    setRunId((id) => id + 1)
  }
  restartRef.current = restart

  useEffect(() => {
    if (rerunTimerRef.current != null) {
      clearTimeout(rerunTimerRef.current)
      rerunTimerRef.current = null
    }
    const delay = normalizedRerunDelay(autoReplayMS)
    if (reducedMotion || !displayState.complete || delay == null) return undefined

    rerunTimerRef.current = setTimeout(() => {
      rerunTimerRef.current = null
      restartRef.current?.()
    }, delay)
    return () => {
      if (rerunTimerRef.current != null) {
        clearTimeout(rerunTimerRef.current)
        rerunTimerRef.current = null
      }
    }
  }, [autoReplayMS, displayState.complete, reducedMotion, runId])

  useEffect(() => {
    setAutoReplayMS(normalizedRerunDelay(rerunMS))
  }, [rerunMS])

  const selectDecisionRun = (nextRun) => {
    if (nextRun === decisionRun) return
    setDecisionRun(nextRun)
    restart()
  }

  const selectPace = (event) => {
    const nextPace = normalizedPace(event.target.value)
    if (nextPace === pace) return
    setPace(nextPace)
    restart()
  }

  const selectAutoReplay = (event) => {
    setAutoReplayMS(event.target.value === "off" ? null : Number(event.target.value))
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
    const frameElapsed = frameRef.current?.snapshot?.().elapsedSeconds
    const elapsed = frameElapsed == null ? elapsedRef.current : frameElapsed
    const nextBoundary = phaseEnds.find((end) => end > elapsed + 0.001)
    if (nextBoundary == null) {
      restart()
      return
    }
    pauseAtRef.current = nextBoundary
    setPaused(false)
  }

  const projection = projectionFor(displayState, decisionRun)
  const currentPhase = phases[displayState.phaseIndex]
  const selectedRun = decisionRuns[decisionRun]
  const autoDelay = normalizedRerunDelay(autoReplayMS)
  const cards = [
    {
      label: "Requirements",
      value: `${projection.input} charged`,
      detail: `${projection.accounted} assigned · balance ${projection.balance}`,
      color: "#475569",
    },
    {
      label: "Commitments",
      value: `${projection.commitments} in ${projection.products} products`,
      detail: displayState.ratified ? "Ratified package" : "Forms late in Deliberate",
      color: "#2563eb",
    },
    {
      label: "Open / deferred",
      value: `${projection.open} open · ${projection.deferred} deferred`,
      detail: "Unresolved is not rejected",
      color: "#0891b2",
    },
    {
      label: "Conflict / declined",
      value: `${projection.conflict} conflict · ${projection.declined} declined`,
      detail: "Different reasons, separate outlets",
      color: "#dc2626",
    },
  ]
  const eventTape = [
    {
      id: "assay",
      label: "Test every requirement against the publication mold",
      at: "22% of Assay",
      applied: displayState.assayed,
    },
    {
      id: "evidence",
      label: "Name available evidence, owners, and incompatible pairs",
      at: "70% of Assay",
      applied: displayState.evidenceNamed,
    },
    {
      id: "open",
      label: "Throw retained questions to Open—not to rejection",
      at: "15% of Deliberate",
      applied: displayState.openRouted,
    },
    {
      id: "defer",
      label: "Route owned, later work to Deferred",
      at: "36% of Deliberate",
      applied: displayState.deferredRouted,
    },
    {
      id: "conflict",
      label: "Escalate incompatible rules to Conflict",
      at: "56% of Deliberate",
      applied: displayState.conflictRouted,
    },
    {
      id: "decline",
      label: "Route criteria failures to Declined",
      at: "73% of Deliberate",
      applied: displayState.declinedRouted,
    },
    {
      id: "package",
      label: `Bind ${Object.values(runDecisions(decisionRun)).filter((decision) => decision.kind === "product").length} commitments into three products`,
      at: "90% of Deliberate",
      applied: displayState.packageFormed,
    },
    {
      id: "ratify",
      label: "Ratify the package and publish every exception",
      at: "48% of Ratify",
      applied: displayState.ratified,
    },
  ]

  return (
    <div className="live-example">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <strong>Breaking-change agreement crucible</strong>
          <p style={{ margin: "6px 0 0", color: "var(--text-secondary)" }}>
            Twelve concrete requirements from peer functions become a release standard, remain
            explicitly unresolved, move to owned later work, expose a conflict, or fail an
            acceptance criterion. Every source requirement survives as lineage.
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
            Authored facilitation run
          </legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {Object.values(decisionRuns).map((run) => (
              <label key={run.id} style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
                <input
                  type="radio"
                  name="working-agreement-run"
                  value={run.id}
                  checked={decisionRun === run.id}
                  onChange={() => selectDecisionRun(run.id)}
                />
                {run.label}
              </label>
            ))}
          </div>
          <div style={{ marginTop: 7, color: "var(--text-secondary)", fontSize: 12 }}>
            {selectedRun.description}
          </div>
        </fieldset>

        <aside
          aria-label="Working-agreement publication mold"
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
            Static acceptance criteria—not a preview of either result
          </div>
          <ul
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "3px 24px",
              margin: "7px 0 0",
              paddingLeft: 18,
            }}
          >
            <li>Every commitment has a named owner</li>
            <li>Affected consumers and migration work are explicit</li>
            <li>Emergency paths are time-boxed and reviewed</li>
            <li>Unresolved disagreement remains visible</li>
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
        <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13 }}>
          Pace
          <select value={pace} onChange={selectPace} disabled={reducedMotion}>
            <option value="0.35">Very slow · 0.35×</option>
            <option value="0.65">Slow · 0.65×</option>
            <option value="1">Normal · 1×</option>
            <option value="1.35">Fast · 1.35×</option>
          </select>
        </label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13 }}>
          Auto replay
          <select
            value={autoReplayMS == null ? "off" : String(autoReplayMS)}
            onChange={selectAutoReplay}
            disabled={reducedMotion}
          >
            <option value="off">Off</option>
            <option value="1500">1,500 ms</option>
            <option value="3000">3,000 ms</option>
            <option value="6000">6,000 ms</option>
            {autoReplayMS != null && ![1500, 3000, 6000].includes(autoReplayMS) && (
              <option value={String(autoReplayMS)} hidden>
                Custom · {autoReplayMS} ms
              </option>
            )}
          </select>
        </label>
        <span aria-live="polite" style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          {reducedMotion
            ? "Reduced motion: the selected terminal decision record is shown."
            : displayState.complete
              ? `Decision record complete.${autoDelay == null ? "" : ` Auto-replay after ${autoDelay} ms.`}`
              : `Phase ${displayState.phaseIndex + 1} of ${phases.length}: ${currentPhase.label}.`}
        </span>
      </div>

      <div
        aria-label="Live working-agreement projection"
        aria-live="polite"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
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
          key={`${runId}-${decisionRun}-${reducedMotion ? "settled" : "replay"}`}
          ref={frameRef}
          title="Breaking-change working-agreement crucible"
          summary={summary(displayState, decisionRun)}
          description="Twelve equal-size circles preserve peer-authored requirements for a breaking-change standard. Fill color records the proposing function and letter labels link bodies to the ledger. Charge, Assay, Deliberate, and Ratify apply a selected authored decision record. Three product envelopes preserve commitment lineage. Open retains questions, Deferred holds owned later work, Conflict exposes incompatible rules, and Declined records criteria failures. Physics materializes the decisions and never makes them."
          size={frameSize}
          config={playbackConfig}
          initialSpawns={spawns}
          controllers={reducedMotion || displayState.complete ? undefined : [programController]}
          simulationExecution="sync"
          paused={reducedMotion || paused}
          bodyForces={bodyForces}
          backgroundGraphics={background}
          foregroundGraphics={foreground}
          beforePaint={beforePaint}
          afterPaint={afterPaint}
          semanticItems={semanticItems(displayState, decisionRun)}
          bodySemanticItems={(body) => {
            const proposal = proposalById.get(body.id)
            const origin = originById.get(proposal.origin)
            const decision = runDecisions(decisionRun)[proposal.id]
            const applied = decisionApplied(decision, displayState)
            return {
              label: `${proposal.code}: ${proposal.label}`,
              description: `${origin.label} requirement. ${proposal.requirement} ${currentStatus(proposal, displayState, decisionRun)}. Destination: ${currentDestination(proposal, displayState, decisionRun)}.${applied ? ` Decision basis: ${decision.reason}` : ""}`,
              group: currentDestination(proposal, displayState, decisionRun),
              datum: proposal,
            }
          }}
          accessibleTable
          enableHover
          hoverRadius={18}
          bodyStyle={bodyStyle}
          tooltipContent={(hover) => {
            const proposal = proposalById.get(hover.id) || hover.data || {}
            const origin = originById.get(proposal.origin)
            const decision = runDecisions(decisionRun)[proposal.id]
            const applied = decision && decisionApplied(decision, displayState)
            return (
              <div className="semiotic-tooltip">
                <strong>
                  {proposal.code} · {proposal.label || hover.id}
                </strong>
                <div>{origin?.label}</div>
                <div>{currentDestination(proposal, displayState, decisionRun)}</div>
                {applied && <div>{decision.reason}</div>}
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
        The memorable throw is a retained question moving to Open. It is not a rejection. Deferred
        means owned later work, Conflict means incompatible requirements need escalation, and
        Declined means the proposal was tested and failed a stated criterion.
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
              Authoritative requirement ledger · {selectedRun.label}
            </caption>
            <thead>
              <tr>
                {["Requirement", "Peer source", "Current destination", "Decision basis"].map(
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
              {proposals.map((proposal) => {
                const origin = originById.get(proposal.origin)
                const decision = runDecisions(decisionRun)[proposal.id]
                const applied = decisionApplied(decision, displayState)
                return (
                  <tr key={proposal.id}>
                    <th scope="row" style={cellStyle}>
                      <span style={{ display: "block" }}>
                        {proposal.code} · {proposal.label}
                      </span>
                      <small style={{ color: "var(--text-secondary)", fontWeight: 400 }}>
                        {proposal.requirement}
                      </small>
                    </th>
                    <td style={cellStyle}>{origin.label}</td>
                    <td style={cellStyle}>
                      {currentDestination(proposal, displayState, decisionRun)}
                    </td>
                    <td style={cellStyle}>
                      {applied ? decision.reason : "Pending the authored decision event."}
                    </td>
                  </tr>
                )
              })}
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
            {eventTape.map((event) => (
              <li
                key={event.id}
                style={{ color: event.applied ? "var(--text-primary)" : "var(--text-secondary)" }}
              >
                <span aria-hidden="true">{event.applied ? "✓ " : "○ "}</span>
                <span>{event.label}</span>
                <div style={{ fontSize: 11, marginTop: 2 }}>{event.at}</div>
              </li>
            ))}
          </ol>
          <p style={{ margin: "11px 0 0", color: "var(--text-secondary)" }}>
            Switching runs changes authored destinations and decision reasons, never force
            parameters. At completion, all {proposals.length} source requirements are accounted for
            and the balance is zero.
          </p>
        </div>
      </div>
    </div>
  )
}
