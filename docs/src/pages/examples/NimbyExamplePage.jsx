import React, { useCallback, useEffect, useMemo, useState } from "react"
import { GauntletChart } from "semiotic/physics"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import "./NimbyExamplePage.css"

const MAX_WIDTH = 1120
const MIN_WIDTH = 780
const FRAME_HEIGHT = 620
const CRASH_LINE_OFFSET = 30
const BASE_PLAN = {
  affordableUnits: 18,
  baseDollars: 0,
  heightStories: 6,
  originalAffordableUnits: 18,
  originalHeightStories: 6,
  originalUnits: 84,
  units: 84,
}

const PRESETS = {
  noGates: {
    id: "noGates",
    label: "0. No Gates",
    description: "Only the starting package acts on the plan: enough lift carries it across, too much drag crashes it.",
    enabledGateCount: 0,
    designQuality: 0.84,
    oppositionIntensity: 0.22,
    proceduralComplexity: 0,
    designStrictness: 0,
    parkingMinimums: 0,
    appealIntensity: 0,
    financingFragility: 0.32,
    byRightApproval: 1,
    statePreemption: 1,
    affordableHousingBonus: 0.72,
    developerMomentum: 0.76,
    costGravity: 0.38,
    seed: 31,
  },
  zoning: {
    id: "zoning",
    label: "1. Add Zoning",
    description: "The first gate asks whether the plan is allowed here; height and units can be scraped down before anything else happens.",
    enabledGateCount: 1,
    designQuality: 0.86,
    oppositionIntensity: 0.54,
    proceduralComplexity: 0,
    designStrictness: 0,
    parkingMinimums: 0,
    appealIntensity: 0,
    financingFragility: 0.38,
    byRightApproval: 0.34,
    statePreemption: 0.24,
    affordableHousingBonus: 0.2,
    developerMomentum: 0.7,
    costGravity: 0.42,
    seed: 83,
  },
  design: {
    id: "design",
    label: "2. Add Design Review",
    description: "Design review pops civic-value balloons: plaza, retail, childcare, trees, or energy features can disappear.",
    enabledGateCount: 2,
    designQuality: 0.82,
    oppositionIntensity: 0.58,
    proceduralComplexity: 0,
    designStrictness: 0.72,
    parkingMinimums: 0,
    appealIntensity: 0,
    financingFragility: 0.44,
    byRightApproval: 0.28,
    statePreemption: 0.2,
    affordableHousingBonus: 0.18,
    developerMomentum: 0.66,
    costGravity: 0.5,
    seed: 101,
  },
  parking: {
    id: "parking",
    label: "3. Add Parking",
    description: "Parking requirements bolt heavy Cost drag onto the plan and trade homes, retail, or childcare for stalls.",
    enabledGateCount: 3,
    designQuality: 0.78,
    oppositionIntensity: 0.56,
    proceduralComplexity: 0,
    designStrictness: 0.62,
    parkingMinimums: 0.9,
    appealIntensity: 0,
    financingFragility: 0.62,
    byRightApproval: 0.24,
    statePreemption: 0.18,
    affordableHousingBonus: 0.14,
    developerMomentum: 0.62,
    costGravity: 0.72,
    seed: 122,
  },
  procedural: {
    id: "procedural",
    label: "4. Add Review Eddy",
    description: "Procedural review can capture the plan in loops: comments, response, appeal, revise, and re-study.",
    enabledGateCount: 4,
    designQuality: 0.74,
    oppositionIntensity: 0.72,
    proceduralComplexity: 0.88,
    designStrictness: 0.62,
    parkingMinimums: 0.45,
    appealIntensity: 0.68,
    financingFragility: 0.78,
    byRightApproval: 0.16,
    statePreemption: 0.12,
    affordableHousingBonus: 0.18,
    developerMomentum: 0.55,
    costGravity: 0.72,
    seed: 154,
  },
  full: {
    id: "full",
    label: "5. Add Council / Appeal",
    description: "Final politics can approve the plan while making it too expensive, too late, or too diminished to become housing.",
    enabledGateCount: 5,
    designQuality: 0.72,
    oppositionIntensity: 0.78,
    proceduralComplexity: 0.54,
    designStrictness: 0.86,
    parkingMinimums: 0.52,
    appealIntensity: 0.58,
    financingFragility: 0.56,
    byRightApproval: 0.2,
    statePreemption: 0.22,
    affordableHousingBonus: 0.28,
    developerMomentum: 0.66,
    costGravity: 0.56,
    seed: 177,
  },
}

const PRESET_ORDER = ["noGates", "zoning", "design", "parking", "procedural", "full"]

const FAILURE_MODES = {
  physics: {
    id: "physics",
    label: "Pure physics",
    description: "Equal lift and drag totals steer the core; touching the crash line is the failure check.",
  },
  gate: {
    id: "gate",
    label: "Check each gate",
    description: "After each gate, a too-heavy or too-diminished plan can terminate before later gates.",
  },
  end: {
    id: "end",
    label: "Check only at end",
    description: "Every authored gate runs, then the final outcome check lands the plan at the last active gate.",
  },
}

const FAILURE_MODE_ORDER = ["physics", "gate", "end"]

const FEATURES = [
  { id: "homes", label: "Homes", short: "H", value: 4.8, color: "var(--nimby-homes)", popColor: "#45c2b4" },
  { id: "affordability", label: "Affordability", short: "A", value: 4.1, color: "var(--nimby-afford)", popColor: "#8ddf5f" },
  { id: "height", label: "Height", short: "6", value: 2.4, color: "var(--nimby-height)", popColor: "#93c5fd" },
  { id: "ground_floor_retail", label: "Retail", short: "R", value: 2.1, color: "var(--nimby-retail)", popColor: "#f8c24e" },
  { id: "trees", label: "Trees", short: "T", value: 1.6, color: "var(--nimby-trees)", popColor: "#46b36a" },
  { id: "bike_parking", label: "Bike room", short: "B", value: 1.3, color: "var(--nimby-bike)", popColor: "#67e8f9" },
  { id: "childcare", label: "Childcare", short: "C", value: 2.7, color: "var(--nimby-childcare)", popColor: "#f0a6d2" },
  { id: "public_plaza", label: "Plaza", short: "P", value: 1.9, color: "var(--nimby-plaza)", popColor: "#c4b5fd" },
  { id: "energy_efficiency", label: "Energy", short: "E", value: 1.5, color: "var(--nimby-energy)", popColor: "#bef264" },
]

const GREAT_FEATURES = FEATURES.map((feature) => feature.id)
const NORMAL_FEATURES = [
  "homes",
  "affordability",
  "height",
  "ground_floor_retail",
  "trees",
  "bike_parking",
  "energy_efficiency",
]
const BAD_FEATURES = ["homes", "height", "bike_parking"]
const TOTAL_FEATURE_VALUE = FEATURES.reduce((sum, feature) => sum + feature.value, 0)

const NEGATIVE_DRAGS = {
  cost: {
    id: "cost",
    label: "Cost",
    short: "$",
    color: "var(--nimby-red)",
    load: 1.2,
    pullX: -16,
    pullY: 46,
  },
  ugly: {
    id: "ugly",
    label: "Ugly",
    short: "U",
    color: "var(--nimby-purple)",
    load: 1,
    pullX: -9,
    pullY: 30,
  },
  fatigue: {
    id: "fatigue",
    label: "Fatigue",
    short: "F",
    color: "var(--nimby-gold)",
    load: 1.05,
    pullX: -18,
    pullY: 24,
  },
  slowdown: {
    id: "slowdown",
    label: "Slowdown",
    short: "S",
    color: "var(--nimby-blue)",
    load: 0.9,
    pullX: -32,
    pullY: 14,
  },
}

const PROJECT_ARCHETYPES = {
  great: {
    id: "great",
    label: "Great Project",
    description: "Lots of positive lift balloons and no starting drag.",
    featureIds: GREAT_FEATURES,
    initialDrags: [],
    liftScale: 1.18,
    viabilityBonus: 12,
    seedOffset: 0,
  },
  normal: {
    id: "normal",
    label: "Normal Project",
    description: "Many positives, with cost and slowdown already attached.",
    featureIds: NORMAL_FEATURES,
    initialDrags: ["cost", "slowdown"],
    liftScale: 1,
    viabilityBonus: 0,
    seedOffset: 200,
  },
  bad: {
    id: "bad",
    label: "Bad Project",
    description: "Few positive balloons and a bundle of Cost, Ugly, Fatigue, and Slowdown drag.",
    featureIds: BAD_FEATURES,
    initialDrags: ["cost", "cost", "ugly", "fatigue", "slowdown", "slowdown"],
    liftScale: 0.72,
    viabilityBonus: -32,
    seedOffset: 400,
  },
}

const PROJECT_ORDER = ["great", "normal", "bad"]

const SACRIFICE_ORDER = [
  "public_plaza",
  "ground_floor_retail",
  "childcare",
  "energy_efficiency",
  "trees",
  "affordability",
  "homes",
  "height",
]

const OUTCOME_LABELS = {
  approved_not_built: "Approved, not built",
  bad_design_crash: "Crashed on its own",
  built: "Built",
  built_diminished: "Built, diminished",
  financially_infeasible: "Financially infeasible",
  in_process: "In process",
  redesigned_below_viability: "Redesigned below viability",
}

const BUILT_OUTCOMES = new Set(["built", "built_diminished"])

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function mulberry32(seed) {
  let value = seed
  return function nextRandom() {
    value |= 0
    value = (value + 0x6d2b79f5) | 0
    let t = Math.imul(value ^ (value >>> 15), 1 | value)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function chartWidth(width) {
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(width)))
}

function previewLayout(width) {
  const w = chartWidth(width)
  return {
    width: w,
    height: FRAME_HEIGHT,
    routeY: Math.round(FRAME_HEIGHT * 0.48),
    socketX: Math.round(w * 0.92),
    graveyardX: Math.round(w * 0.84),
    graveyardY: FRAME_HEIGHT - 40,
  }
}

function buildGates(width, settings) {
  const w = chartWidth(width)
  const sx = (value) => Math.round(value * (w / MAX_WIDTH))
  const enabledGateCount = clamp(Math.round(settings.enabledGateCount ?? 5), 0, 5)
  const base = [
    { id: "zoning-fit", label: "Zoning Fit", x: sx(220), width: sx(70), color: "var(--nimby-blue)" },
    { id: "design-review", label: "Design Review", x: sx(390), width: sx(76), color: "var(--nimby-purple)" },
    { id: "parking-traffic", label: "Parking & Traffic", x: sx(548), width: sx(82), color: "var(--nimby-gold)" },
    { id: "procedural-review", label: "Procedural Review", x: sx(720), width: sx(92), color: "var(--nimby-red)" },
    { id: "final-approval", label: "Council / Appeal", x: sx(870), width: sx(84), color: "var(--nimby-green)" },
  ]
  return base.slice(0, enabledGateCount).map((gate) => ({
    ...gate,
    regionEffect: {
      kind: gate.id === "procedural-review" ? "membrane" : "force-field",
      damping: gate.id === "procedural-review"
        ? 0.08 + settings.proceduralComplexity * 0.18
        : 0.035 + settings.oppositionIntensity * 0.04,
      force: {
        x: 18 + settings.developerMomentum * 30,
        y: gate.id === "parking-traffic" ? settings.parkingMinimums * 18 : 0,
      },
      semanticItem: false,
    },
  }))
}

function featureById(id) {
  return FEATURES.find((feature) => feature.id === id)
}

function dragByType(type) {
  return NEGATIVE_DRAGS[type] ?? NEGATIVE_DRAGS.cost
}

function dragTypesForEvent(event) {
  if (event.addDragTypes) return event.addDragTypes
  return Array.from({ length: event.addDollars ?? 0 }, () => "cost")
}

function dragLoadFor(types) {
  return types.reduce((sum, type) => sum + dragByType(type).load, 0)
}

function countDrags(types, type) {
  return types.filter((candidate) => candidate === type).length
}

function countBy(values) {
  return values.reduce((counts, value) => ({
    ...counts,
    [value]: (counts[value] ?? 0) + 1,
  }), {})
}

function initialMissingFeatures(project) {
  const active = new Set(project.featureIds)
  return FEATURES.map((feature) => feature.id).filter((id) => !active.has(id))
}

function viabilityFor(plan, controls, project) {
  const lostUnits = BASE_PLAN.originalUnits - plan.units
  const activeCivicValue = plan.activeFeatures.reduce((sum, id) => sum + (featureById(id)?.value ?? 1), 0)
  const missingCivicValue = Math.max(0, TOTAL_FEATURE_VALUE - activeCivicValue)
  const lostCivicValue = plan.lostFeatures.reduce((sum, id) => sum + (featureById(id)?.value ?? 1), 0)
  const dragLoad = dragLoadFor(plan.negativeDrags)
  const designQuality = controls.designQuality ?? 0.7
  const lowDesignPenalty = Math.max(0, 0.45 - designQuality) * 350
  return clamp(
    100 -
      dragLoad * 8.8 -
      plan.delayMonths * (1.05 + controls.financingFragility * 1.05) -
      lostUnits * 0.28 -
      missingCivicValue * 2.2 -
      lostCivicValue * 1.2 +
      (designQuality - 0.5) * 34 -
      lowDesignPenalty +
      project.viabilityBonus +
      controls.developerMomentum * 16 +
      controls.byRightApproval * 8 +
      controls.affordableHousingBonus * 6,
    -20,
    100,
  )
}

function initialPlanState(controls, project) {
  const negativeDrags = [...project.initialDrags]
  const plan = {
    ...BASE_PLAN,
    activeFeatures: [...project.featureIds],
    delayMonths: 0,
    dollars: countDrags(negativeDrags, "cost"),
    eventsApplied: [],
    killed: false,
    lastEvent: null,
    missingFeatures: initialMissingFeatures(project),
    negativeDrags,
    lostFeatures: [],
    outcome: "in_process",
    projectId: project.id,
    reviewCycles: 0,
    stage: "plan filed",
  }
  return { ...plan, viability: viabilityFor(plan, controls, project) }
}

function selectSacrifice(plan, candidates = SACRIFICE_ORDER) {
  return candidates.find((id) => plan.activeFeatures.includes(id)) ?? null
}

function applyEventPreview(plan, controls, project, event) {
  const lostFeatures = [...plan.lostFeatures]
  const addedDrags = dragTypesForEvent(event)
  const activeFeatures = plan.activeFeatures.filter((id) => {
    if (!event.detachFeatureIds?.includes(id)) return true
    if (!lostFeatures.includes(id)) lostFeatures.push(id)
    return false
  })
  const next = {
    ...plan,
    activeFeatures,
    affordableUnits: clamp(plan.affordableUnits + (event.affordableDelta ?? 0), 0, BASE_PLAN.originalAffordableUnits),
    delayMonths: plan.delayMonths + (event.delayMonths ?? 0),
    dollars: plan.dollars + countDrags(addedDrags, "cost"),
    heightStories: clamp(plan.heightStories + (event.heightDelta ?? 0), 2, BASE_PLAN.originalHeightStories),
    lostFeatures,
    negativeDrags: [...plan.negativeDrags, ...addedDrags],
    reviewCycles: plan.reviewCycles + (event.reviewCycle ? 1 : 0),
    stage: event.label,
    units: clamp(plan.units + (event.unitsDelta ?? 0), 0, BASE_PLAN.originalUnits),
  }
  return { ...next, viability: viabilityFor(next, controls, project) }
}

function landsInSocket(outcome) {
  return BUILT_OUTCOMES.has(outcome)
}

function finalRouteForOutcome(layout, outcome) {
  return landsInSocket(outcome)
    ? { x: layout.socketX, y: layout.routeY - 4 }
    : { x: layout.graveyardX, y: layout.graveyardY - 14 }
}

function terminalRouteForOutcome(layout, controls, event, outcome) {
  if (landsInSocket(outcome)) return finalRouteForOutcome(layout, outcome)
  const gates = buildGates(layout.width, controls)
  const gate = event.gateId
    ? gates.find((candidate) => candidate.id === event.gateId)
    : gates[gates.length - 1]
  return {
    x: event.routeX ?? gate?.x ?? Math.round(layout.width * 0.58),
    y: event.routeY ?? layout.height - 36 - CRASH_LINE_OFFSET - 28,
  }
}

function outcomeFor(plan, controls, project) {
  if ((controls.enabledGateCount ?? 5) === 0 && (project.id === "bad" || plan.viability < 30)) return "bad_design_crash"
  if (plan.viability <= 0) return "financially_infeasible"
  if (plan.units < 30 || plan.affordableUnits < 4) return "redesigned_below_viability"
  if (plan.viability < 24 || plan.delayMonths > 34 + controls.developerMomentum * 10) return "approved_not_built"
  if (plan.units < BASE_PLAN.originalUnits * 0.75 || plan.lostFeatures.length >= 3) return "built_diminished"
  return "built"
}

function outcomeForMode(plan, controls, project, failureMode) {
  if (failureMode === "physics") {
    return plan.units < BASE_PLAN.originalUnits || plan.lostFeatures.length
      ? "built_diminished"
      : "built"
  }
  return outcomeFor(plan, controls, project)
}

function terminalEventForGate(event, plan, controls, layout) {
  if (!event?.gateId) return null
  const positiveCount = plan.activeFeatures.length
  const negativeCount = plan.negativeDrags.length
  const dragLoad = dragLoadFor(plan.negativeDrags)
  let outcome = null
  let summary = null

  if (event.gateId === "design-review" && positiveCount <= 2 && negativeCount >= 8) {
    outcome = "redesigned_below_viability"
    summary = `${event.label} sees only ${positiveCount} lift balloons against ${negativeCount} drag particles; the plan terminates before later gates.`
  } else if (event.gateId === "parking-traffic" && ((positiveCount <= 3 && negativeCount >= 8) || dragLoad >= 9 || plan.units < 45)) {
    outcome = "financially_infeasible"
    summary = `${event.label} pushes the plan to ${negativeCount} drag particles and ${plan.units} homes, so it cannot carry forward.`
  } else if (event.gateId !== "zoning-fit" && plan.viability <= 0) {
    outcome = "financially_infeasible"
    summary = `${event.label} leaves the plan below viability with ${negativeCount} drag particles attached.`
  } else if (event.gateId === "procedural-review" && (plan.viability < 18 || plan.delayMonths > 30)) {
    outcome = "approved_not_built"
    summary = `${event.label} leaves the plan with ${plan.delayMonths} months of delay and too little viability to continue.`
  } else if (plan.units < 30 || plan.affordableUnits < 4) {
    outcome = "redesigned_below_viability"
    summary = `${event.label} cuts the housing package below the minimum viable plan.`
  }

  if (!outcome) return null
  const route = terminalRouteForOutcome(layout, controls, event, outcome)
  return {
    id: `${event.id}-gate-stop`,
    label: `${event.label} Stop`,
    time: event.time + 0.28,
    gateId: event.gateId,
    routeX: route.x,
    routeY: route.y,
    addDragTypes: [],
    delayMonths: 0,
    detachFeatureIds: [],
    final: true,
    outcome,
    summary,
  }
}

function buildProcessEvents(controls, layout, project, failureMode = "end") {
  const random = mulberry32(controls.seed)
  const events = []
  const enabledGateCount = clamp(Math.round(controls.enabledGateCount ?? 5), 0, 5)
  const gateEnabled = (index) => enabledGateCount > index
  let plan = initialPlanState(controls, project)
  let time = enabledGateCount === 0 ? 4.9 : 1.55
  let captureChance = 0
  let loopCount = 0
  const finishWithTerminal = (terminalEvent) => ({
    captureChance,
    events: [...events, terminalEvent],
    finalPlan: { ...plan, outcome: terminalEvent.outcome, stage: OUTCOME_LABELS[terminalEvent.outcome] },
    loopCount,
  })
  const maybeTerminalAtGate = (event) => failureMode === "gate" ? terminalEventForGate(event, plan, controls, layout) : null

  if (gateEnabled(0)) {
    const allowedHeight = 4 + Math.round(controls.affordableHousingBonus * 1.4 + controls.statePreemption * 1.6)
    if (BASE_PLAN.heightStories > allowedHeight) {
      const unitsLost = Math.round((BASE_PLAN.heightStories - allowedHeight) * (6 + controls.oppositionIntensity * 4))
      const event = {
        id: "zoning-fit",
        label: "Zoning Fit",
        time,
        gateId: "zoning-fit",
        addDragTypes: ["ugly", ...Array.from({ length: Math.round(controls.oppositionIntensity * 2) }, () => "cost")],
        delayMonths: 2 + Math.round(controls.oppositionIntensity * 3),
        detachFeatureIds: ["height"],
        heightDelta: allowedHeight - BASE_PLAN.heightStories,
        unitsDelta: -unitsLost,
        affordableDelta: -Math.round(unitsLost * 0.2),
        summary: `${BASE_PLAN.heightStories} stories scraped down to ${allowedHeight}.`,
      }
      plan = applyEventPreview(plan, controls, project, event)
      events.push(event)
    } else {
      const event = {
        id: "zoning-fit-clear",
        label: "Zoning Fit",
        time,
        gateId: "zoning-fit",
        addDragTypes: [],
        delayMonths: 1,
        summary: "The height fits by-right standards.",
      }
      plan = applyEventPreview(plan, controls, project, event)
      events.push(event)
    }
    time += 1.55
    const terminal = maybeTerminalAtGate(events[events.length - 1])
    if (terminal) return finishWithTerminal(terminal)
  }

  if (gateEnabled(1)) {
    const designLosses = Math.min(3, Math.round(controls.designStrictness * 3))
    const designFeatures = []
    const designCandidates = ["public_plaza", "ground_floor_retail", "childcare", "trees", "energy_efficiency"]
    for (let i = 0; i < designLosses; i += 1) {
      const sacrifice = designCandidates.find((id) => plan.activeFeatures.includes(id) && !designFeatures.includes(id))
      if (!sacrifice) break
      designFeatures.push(sacrifice)
    }
    if (designFeatures.length) {
      const event = {
        id: "design-review",
        label: "Design Review",
        time,
        gateId: "design-review",
        addDragTypes: ["ugly", ...Array.from({ length: Math.ceil(controls.designStrictness * 2) }, () => "cost")],
        delayMonths: 2 + Math.round(controls.designStrictness * 5),
        detachFeatureIds: designFeatures,
        summary: `${designFeatures.map((id) => featureById(id)?.label).join(", ")} balloons popped by design review.`,
      }
      plan = applyEventPreview(plan, controls, project, event)
      events.push(event)
    } else {
      const event = {
        id: "design-review-clear",
        label: "Design Review",
        time,
        gateId: "design-review",
        addDragTypes: [],
        delayMonths: 1,
        summary: "Design review leaves the feature balloons intact.",
      }
      plan = applyEventPreview(plan, controls, project, event)
      events.push(event)
    }
    time += 1.55
    const terminal = maybeTerminalAtGate(events[events.length - 1])
    if (terminal) return finishWithTerminal(terminal)
  }

  if (gateEnabled(2)) {
    const parkingDollars = Math.ceil(controls.parkingMinimums * 5)
    if (parkingDollars > 0) {
      const unitLoss = Math.round(controls.parkingMinimums * 18)
      const parkingSacrifice = selectSacrifice(plan, ["ground_floor_retail", "childcare", "homes"])
      const event = {
        id: "parking-traffic",
        label: "Parking & Traffic",
        time,
        gateId: "parking-traffic",
        addDragTypes: Array.from({ length: parkingDollars }, () => "cost"),
        delayMonths: Math.round(controls.parkingMinimums * 4),
        detachFeatureIds: parkingSacrifice ? [parkingSacrifice] : [],
        unitsDelta: -unitLoss,
        affordableDelta: -Math.round(unitLoss * 0.18),
        summary: `Parking burden adds ${parkingDollars} Cost drag particles and removes ${unitLoss} homes.`,
      }
      plan = applyEventPreview(plan, controls, project, event)
      events.push(event)
    } else {
      const event = {
        id: "parking-traffic-clear",
        label: "Parking & Traffic",
        time,
        gateId: "parking-traffic",
        addDragTypes: [],
        delayMonths: 1,
        summary: "Parking and traffic review adds no major new weight.",
      }
      plan = applyEventPreview(plan, controls, project, event)
      events.push(event)
    }
    time += 1.35
    const terminal = maybeTerminalAtGate(events[events.length - 1])
    if (terminal) return finishWithTerminal(terminal)
  }

  if (gateEnabled(3)) {
    captureChance = clamp(
      controls.proceduralComplexity * 0.36 +
        controls.oppositionIntensity * 0.34 +
        controls.appealIntensity * 0.22 -
        controls.byRightApproval * 0.42 -
        controls.statePreemption * 0.26,
      0,
      0.92,
    )
    loopCount = Math.min(4, Math.max(0, Math.round(captureChance * 5 - 0.4 + random() * 0.45)))
    for (let index = 0; index < loopCount; index += 1) {
      const sacrifice = random() < 0.42 + controls.proceduralComplexity * 0.25 ? selectSacrifice(plan) : null
      const event = {
        id: `procedural-loop-${index + 1}`,
        label: `Review Eddy ${index + 1}`,
        time,
        gateId: "procedural-review",
        addDragTypes: index % 2 ? ["fatigue", "cost"] : ["slowdown", "fatigue"],
        delayMonths: 4 + Math.round(controls.proceduralComplexity * 2),
        detachFeatureIds: sacrifice ? [sacrifice] : [],
        reviewCycle: true,
        summary: `Appeal, comments, response, and re-study cycle ${index + 1}.`,
      }
      plan = applyEventPreview(plan, controls, project, event)
      events.push(event)
      const terminal = maybeTerminalAtGate(event)
      if (terminal) return finishWithTerminal(terminal)
      time += 1.08
    }

    if (loopCount === 0) {
      const event = {
        id: "procedural-clear",
        label: "Procedural Review",
        time,
        gateId: "procedural-review",
        addDragTypes: ["slowdown"],
        delayMonths: 2,
        summary: "Review clears without capturing the plan in the eddy.",
      }
      plan = applyEventPreview(plan, controls, project, event)
      events.push(event)
      time += 0.9
      const terminal = maybeTerminalAtGate(event)
      if (terminal) return finishWithTerminal(terminal)
    }
  }

  let finalEvent
  if (gateEnabled(4)) {
    const compromiseChance = clamp(controls.oppositionIntensity * 0.42 + controls.appealIntensity * 0.25 + controls.designStrictness * 0.2 - controls.statePreemption * 0.24, 0, 0.95)
    const compromiseLoss = compromiseChance > 0.42 ? selectSacrifice(plan, ["affordability", "homes", "height", "trees"]) : null
    const compromiseUnits = compromiseChance > 0.42 ? Math.round(8 + compromiseChance * 10) : 0
    finalEvent = {
      id: "final-approval",
      label: "Council / Appeal",
      time: time + 0.65,
      gateId: "final-approval",
      addDragTypes: compromiseChance > 0.42 ? ["cost", "fatigue"] : [],
      delayMonths: compromiseChance > 0.42 ? 3 + Math.round(controls.appealIntensity * 4) : 1,
      detachFeatureIds: compromiseLoss ? [compromiseLoss] : [],
      unitsDelta: -compromiseUnits,
      affordableDelta: -Math.round(compromiseUnits * 0.22),
      final: true,
      summary: compromiseLoss ? `Final compromise pops ${featureById(compromiseLoss)?.label}.` : "Council approval lands without another major concession.",
    }
    plan = applyEventPreview(plan, controls, project, finalEvent)
  } else {
    const outcome = outcomeForMode(plan, controls, project, failureMode)
    const isNoGateFlight = enabledGateCount === 0
    const activeGates = buildGates(layout.width, controls)
    const lastGate = activeGates[activeGates.length - 1]
    const route = terminalRouteForOutcome(layout, controls, { gateId: lastGate?.id }, outcome)
    finalEvent = {
      id: isNoGateFlight ? "open-flight-finish" : "current-route-finish",
      label: isNoGateFlight ? "Open Flight" : "Current Process Edge",
      time: time + (isNoGateFlight ? 0 : 0.8),
      routeX: route.x,
      routeY: route.y,
      addDragTypes: [],
      delayMonths: 0,
      detachFeatureIds: [],
      final: true,
      outcome,
      summary:
        outcome === "bad_design_crash"
          ? "No gate touched it; weak design balloons could not keep the plan aloft."
          : landsInSocket(outcome)
            ? "Without additional gates, the remaining design lift carries the plan into the neighborhood socket."
            : "The current process leaves the plan too heavy or too diminished to land as housing.",
    }
  }

  finalEvent.outcome = finalEvent.outcome ?? outcomeForMode(plan, controls, project, failureMode)
  const terminalRoute = terminalRouteForOutcome(layout, controls, finalEvent, finalEvent.outcome)
  finalEvent = {
    ...finalEvent,
    routeX: finalEvent.routeX ?? terminalRoute.x,
    routeY: finalEvent.routeY ?? terminalRoute.y,
  }
  plan = finalEvent.id === "final-approval" ? plan : applyEventPreview(plan, controls, project, finalEvent)
  events.push(finalEvent)

  return {
    captureChance,
    events,
    finalPlan: { ...plan, outcome: finalEvent.outcome, stage: OUTCOME_LABELS[finalEvent.outcome] },
    loopCount,
  }
}

function toGauntletEvent(event) {
  const metricDelta = {
    affordableUnits: event.affordableDelta ?? 0,
    heightStories: event.heightDelta ?? 0,
    reviewCycles: event.reviewCycle ? 1 : 0,
    units: event.unitsDelta ?? 0,
  }
  return {
    id: event.id,
    label: event.label,
    time: event.time,
    gateId: event.gateId,
    final: event.final,
    outcome: event.outcome,
    routeX: event.routeX,
    routeY: event.routeY,
    summary: event.summary,
    effects: [
      {
        addNegative: countBy(dragTypesForEvent(event)),
        delayDelta: event.delayMonths ?? 0,
        metricsDelta: metricDelta,
        popPositive: event.detachFeatureIds ?? [],
        stage: event.label,
        summary: event.summary,
      },
    ],
  }
}

function planFromGauntletState(state, controls, project) {
  if (!state) return initialPlanState(controls, project)
  const negativeDrags = [...state.negativeIds]
  const plan = {
    ...BASE_PLAN,
    activeFeatures: [...state.activePositiveIds],
    affordableUnits: clamp(Math.round(state.metrics.affordableUnits ?? BASE_PLAN.affordableUnits), 0, BASE_PLAN.originalAffordableUnits),
    delayMonths: state.delay,
    dollars: countDrags(negativeDrags, "cost"),
    eventsApplied: [...state.eventsApplied],
    heightStories: clamp(Math.round(state.metrics.heightStories ?? BASE_PLAN.heightStories), 2, BASE_PLAN.originalHeightStories),
    killed: state.killed,
    lastEvent: state.lastEvent ?? null,
    lostFeatures: [...state.poppedPositiveIds],
    missingFeatures: [...state.missingPositiveIds],
    negativeDrags,
    outcome: state.killed ? "bad_design_crash" : state.outcome,
    projectId: project.id,
    reviewCycles: Math.round(state.metrics.reviewCycles ?? 0),
    stage: state.killed ? OUTCOME_LABELS.bad_design_crash : state.stage,
    units: clamp(Math.round(state.metrics.units ?? BASE_PLAN.units), 0, BASE_PLAN.originalUnits),
    viability: state.viability,
  }
  return plan
}

function metricsForPlan(plan) {
  const dragLoad = dragLoadFor(plan.negativeDrags)
  return {
    affordabilityLost: BASE_PLAN.originalAffordableUnits - plan.affordableUnits,
    civicValueLost: Math.round((plan.lostFeatures.reduce((sum, id) => sum + (featureById(id)?.value ?? 1), 0) + plan.missingFeatures.reduce((sum, id) => sum + (featureById(id)?.value ?? 1), 0)) * 10) / 10,
    costDrags: countDrags(plan.negativeDrags, "cost"),
    dragLoad: Math.round(dragLoad * 10) / 10,
    dragParticles: plan.negativeDrags.length,
    housingLost: BASE_PLAN.originalUnits - plan.units,
  }
}

function labelForOutcome(plan) {
  if (plan.outcome === "bad_design_crash" && plan.eventsApplied.length) {
    return "Crashed in review"
  }
  return OUTCOME_LABELS[plan.outcome] ?? "In process"
}

export default function NimbyExamplePage() {
  const [width, hostRef] = useResponsiveWidth(MIN_WIDTH, MAX_WIDTH)
  const [settings, setSettings] = useState(PRESETS.noGates)
  const [projectType, setProjectType] = useState(PROJECT_ARCHETYPES.normal)
  const [failureMode, setFailureMode] = useState("gate")
  const [runId, setRunId] = useState(0)
  const plotWidth = chartWidth(width)
  const layout = useMemo(() => previewLayout(plotWidth), [plotWidth])
  const gates = useMemo(() => buildGates(plotWidth, settings), [plotWidth, settings])
  const physicsFailureMode = failureMode === "physics"
  const activeFailureMode = FAILURE_MODES[failureMode]
  const runKey = `${projectType.id}:${settings.id}:${failureMode}:${runId}:${plotWidth}`
  const [planState, setPlanState] = useState(() => initialPlanState(settings, projectType))
  const [eventLog, setEventLog] = useState([])

  const processPreview = useMemo(
    () => buildProcessEvents(settings, layout, projectType, failureMode),
    [failureMode, layout, projectType, settings],
  )

  const positiveProperties = useMemo(
    () => FEATURES.map((feature) => ({
      ...feature,
      buoyancy: physicsFailureMode
        ? 1
        : feature.value * (1.15 + settings.designQuality * 1.55) * projectType.liftScale,
      mass: 0.75,
      radius: 10,
    })),
    [physicsFailureMode, projectType.liftScale, settings.designQuality],
  )

  const negativeProperties = useMemo(
    () => Object.values(NEGATIVE_DRAGS).map((drag) => ({
      id: drag.id,
      label: drag.label,
      short: drag.short,
      color: drag.color,
      load: physicsFailureMode ? 1 : drag.load * (0.9 + settings.costGravity * 0.55),
      mass: 0.72,
      radius: 7.2,
      pull: {
        x: drag.pullX * (0.55 + (1 - settings.developerMomentum) * 0.45),
        y: drag.pullY * (0.58 + settings.costGravity * 0.52),
      },
    })),
    [physicsFailureMode, settings.costGravity, settings.developerMomentum],
  )

  const projectData = useMemo(() => [
    {
      id: `${projectType.id}-${settings.id}-${runId}`,
      label: projectType.label,
      metrics: {
        affordableUnits: BASE_PLAN.affordableUnits,
        heightStories: BASE_PLAN.heightStories,
        reviewCycles: 0,
        units: BASE_PLAN.units,
      },
      negatives: [...projectType.initialDrags],
      positives: [...projectType.featureIds],
      projectType: projectType.id,
    },
  ], [projectType, runId, settings.id])

  const events = useCallback(
    (_project, chartLayout) => buildProcessEvents(settings, chartLayout, projectType, failureMode).events.map(toGauntletEvent),
    [failureMode, projectType, settings],
  )

  const computeViability = useCallback(
    (project) => viabilityFor(planFromGauntletState(project, settings, projectType), settings, projectType),
    [projectType, settings],
  )

  const computeOutcome = useCallback(
    (project) => outcomeForMode(planFromGauntletState(project, settings, projectType), settings, projectType, failureMode),
    [failureMode, projectType, settings],
  )

  const initialViability = useCallback(
    () => initialPlanState(settings, projectType).viability,
    [projectType, settings],
  )

  const handleStateChange = useCallback(
    (states) => {
      const state = states[0]
      const next = planFromGauntletState(state, settings, projectType)
      setPlanState(next)
      const lastEvent = state?.lastEvent
      if (!lastEvent) return
      setEventLog((current) => {
        if (current.some((event) => event.runKey === runKey && event.id === lastEvent.id)) return current
        return [
          { ...lastEvent, runKey },
          ...current.filter((event) => event.runKey === runKey),
        ].slice(0, 7)
      })
    },
    [projectType, runKey, settings],
  )

  const visibleEventLog = useMemo(
    () => eventLog.filter((event) => event.runKey === runKey),
    [eventLog, runKey],
  )

  const frameProps = useMemo(() => ({
    backgroundGraphics: null,
    bodySemanticUpdateMs: 160,
    config: {
      kernel: {
        seed: settings.seed + projectType.seedOffset + runId,
        gravity: { x: 0, y: 0 },
        restitution: 0.16,
        friction: 0.44,
        velocityDamping: 0.982,
        maxVelocity: 520,
        sleepAfter: 0.8,
        sleepSpeed: 7,
      },
      fixedDt: 1 / 60,
      maxSubsteps: 8,
    },
    foregroundGraphics: (
      <NimbyGauntletOverlay
        captureChance={processPreview.captureChance}
        eventLog={visibleEventLog}
        gates={gates}
        layout={layout}
        planState={planState}
      />
    ),
  }), [gates, layout, planState, processPreview.captureChance, projectType.seedOffset, runId, settings.seed, visibleEventLog])

  useEffect(() => {
    setPlanState(initialPlanState(settings, projectType))
    setEventLog([])
  }, [projectType, runKey, settings])

  const updateSetting = (key, value) => {
    setSettings((current) => ({
      ...current,
      id: "custom",
      label: "Custom Policy Mix",
      description: "A custom mix of local opposition, process burden, financing fragility, and streamlining reforms.",
      [key]: value,
    }))
    setRunId((current) => current + 1)
  }

  const metrics = metricsForPlan(planState)
  const outcomeLabel = labelForOutcome(planState)

  return (
    <ExamplePageLayout title="Not in MY Backyard">
      <div className="nimby-example" ref={hostRef}>
        <section className="nimby-example__hero">
          <div>
            <span className="nimby-example__kicker">A process simulator for cumulative burden</span>
            <p className="nimby-example__lede">
              A housing plan enters as a package of lift balloons and drag particles. Great projects start with many positives and no drag; normal projects carry some friction; bad projects begin with too little lift and too much Cost, Ugly, Fatigue, and Slowdown.
            </p>
          </div>
          <div className="nimby-example__formula">
            <span>Features lift, drag weighs, concessions pop balloons</span>
            <strong>viability = lift balloons - drag particles - process burden</strong>
          </div>
        </section>

        <section className="nimby-example__project-picker" aria-label="Project starting package">
          {PROJECT_ORDER.map((id) => {
            const project = PROJECT_ARCHETYPES[id]
            const active = projectType.id === id
            return (
              <button
                key={id}
                type="button"
                className={active ? "is-active" : ""}
                aria-pressed={active}
                onClick={() => {
                  setProjectType(project)
                  setRunId((current) => current + 1)
                }}
              >
                <strong>{project.label}</strong>
                <span>{project.description}</span>
              </button>
            )
          })}
        </section>

        <section className="nimby-example__presets" aria-label="NIMBY simulator presets">
          {PRESET_ORDER.map((id) => {
            const preset = PRESETS[id]
            const active = settings.id === id
            return (
              <button
                key={id}
                type="button"
                className={active ? "is-active" : ""}
                aria-pressed={active}
                onClick={() => {
                  setSettings(preset)
                  setRunId((current) => current + 1)
                }}
              >
                <strong>{preset.label}</strong>
                <span>{preset.description}</span>
              </button>
            )
          })}
        </section>

        <section className="nimby-example__mode-picker" aria-label="Failure mode">
          {FAILURE_MODE_ORDER.map((id) => {
            const mode = FAILURE_MODES[id]
            const active = failureMode === id
            return (
              <button
                key={id}
                type="button"
                className={active ? "is-active" : ""}
                aria-pressed={active}
                onClick={() => {
                  setFailureMode(id)
                  setRunId((current) => current + 1)
                }}
              >
                <strong>{mode.label}</strong>
                <span>{mode.description}</span>
              </button>
            )
          })}
        </section>

        <section className="nimby-example__workbench">
          <div className="nimby-example__chart-shell">
            <GauntletChart
              key={runKey}
              title={`${projectType.label}, ${settings.label} housing approval simulator`}
              summary={`${projectType.label} under ${settings.label}, ${activeFailureMode.label}: ${BASE_PLAN.originalUnits} homes enter review. Current state is ${outcomeLabel}, ${planState.units} homes, ${metrics.dragParticles} drag particles, ${planState.delayMonths} months delay.`}
              description="A compound housing plan moves through gauntlet gates. Attached positive property bodies act as lift balloons and pop when gate effects remove them; Cost, Ugly, Fatigue, and Slowdown properties are added through the same physics push path as live data."
              data={projectData}
              idAccessor="id"
              positiveAccessor="positives"
              negativeAccessor="negatives"
              metricsAccessor="metrics"
              positiveProperties={positiveProperties}
              negativeProperties={negativeProperties}
              gates={gates}
              events={events}
              initialViability={initialViability}
              viability={computeViability}
              outcome={computeOutcome}
              coreForceMode={physicsFailureMode ? "net" : "route"}
              crashDetection={physicsFailureMode}
              crashOffset={CRASH_LINE_OFFSET}
              size={[plotWidth, FRAME_HEIGHT]}
              terminalBehavior="hold-last"
              accessibleTable
              onStateChange={handleStateChange}
              frameProps={frameProps}
            />
          </div>
        </section>

        <section className="nimby-example__panel" aria-label="Current plan status">
          <div className="nimby-example__panel-summary">
            <span className="nimby-example__kicker">Current plan</span>
            <h2>{outcomeLabel}</h2>
            <p>{projectType.description} {settings.description} {activeFailureMode.description}</p>
          </div>
          <div className="nimby-example__metrics">
            <Metric label="homes" value={planState.units} detail={`${metrics.housingLost} lost`} warn={metrics.housingLost > 24} />
            <Metric label="affordable" value={planState.affordableUnits} detail={`${metrics.affordabilityLost} lost`} warn={metrics.affordabilityLost > 8} />
            <Metric label="drag" value={metrics.dragParticles} detail={`${metrics.costDrags} cost / ${metrics.dragLoad} load`} warn={metrics.dragLoad > 7} />
            <Metric label="delay" value={`${planState.delayMonths} mo`} detail={`${planState.reviewCycles} eddy loops`} warn={planState.delayMonths > 24} />
            <Metric label="viability" value={Math.round(planState.viability)} detail="pencil score" warn={planState.viability < 24} />
            <Metric label="missing / popped lift" value={metrics.civicValueLost} detail={`${planState.missingFeatures.length} absent, ${planState.lostFeatures.length} popped`} warn={metrics.civicValueLost > 5} />
          </div>
          <div className="nimby-example__ledger" aria-label="Recent process events">
            {visibleEventLog.length ? visibleEventLog.map((event) => (
              <div key={`${event.runKey}:${event.id}`}>
                <strong>{event.label}</strong>
                <span>{event.summary}</span>
              </div>
            )) : (
              <div>
                <strong>Plan filed</strong>
                <span>{projectType.label}: {planState.activeFeatures.length} lift balloons and {planState.negativeDrags.length} drag particles enter the process.</span>
              </div>
            )}
          </div>
        </section>

        <section className="nimby-example__controls" aria-label="NIMBY simulator controls">
          <Control label="Opposition" value={settings.oppositionIntensity} onChange={(value) => updateSetting("oppositionIntensity", value)} />
          <Control label="Design quality" value={settings.designQuality} onChange={(value) => updateSetting("designQuality", value)} />
          <Control label="Procedural complexity" value={settings.proceduralComplexity} onChange={(value) => updateSetting("proceduralComplexity", value)} />
          <Control label="Design strictness" value={settings.designStrictness} onChange={(value) => updateSetting("designStrictness", value)} />
          <Control label="Parking minimums" value={settings.parkingMinimums} onChange={(value) => updateSetting("parkingMinimums", value)} />
          <Control label="Appeal intensity" value={settings.appealIntensity} onChange={(value) => updateSetting("appealIntensity", value)} />
          <Control label="Financing fragility" value={settings.financingFragility} onChange={(value) => updateSetting("financingFragility", value)} />
          <Control label="By-right approval" value={settings.byRightApproval} onChange={(value) => updateSetting("byRightApproval", value)} />
          <Control label="State preemption" value={settings.statePreemption} onChange={(value) => updateSetting("statePreemption", value)} />
          <Control label="Affordability bonus" value={settings.affordableHousingBonus} onChange={(value) => updateSetting("affordableHousingBonus", value)} />
          <Control label="Developer momentum" value={settings.developerMomentum} onChange={(value) => updateSetting("developerMomentum", value)} />
          <Control label="Cost gravity" value={settings.costGravity} onChange={(value) => updateSetting("costGravity", value)} />
          <button
            type="button"
            className="nimby-example__rerun"
            onClick={() => setRunId((current) => current + 1)}
          >
            Rerun plan
          </button>
        </section>

        <section className="nimby-example__explanation">
          <div>
            <span className="nimby-example__kicker">Mechanic</span>
            <h2>The example is now a declarative gauntlet.</h2>
          </div>
          <p>
            The page supplies <code>data</code>, positive and negative property definitions, gate definitions, and gate events. From those declarations, <code>GauntletChart</code> builds the bodies, forces, gates, routes, and event state.
          </p>
          <p>
            The failure mode switch separates physical failure, per-gate checkpoint failure, and the original end-only outcome check. That lets the same plan either crash when the particles pull it down, stop at the first failed gate, or run every gate before the final decision.
          </p>
        </section>
      </div>
    </ExamplePageLayout>
  )
}

function NimbyGauntletOverlay({ captureChance, eventLog, gates, layout, planState }) {
  const lastEvent = eventLog[0]
  const burdenLabel = gates.some((gate) => gate.id === "procedural-review")
    ? `capture chance ${Math.round(captureChance * 100)}%`
    : gates.length
      ? `${gates.length} civic gates active`
      : "no civic gates active"
  return (
    <svg className="nimby-example__overlay" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
      <text className="nimby-example__stat" x="34" y="34">original {BASE_PLAN.originalUnits} homes / {BASE_PLAN.originalAffordableUnits} affordable</text>
      <text className="nimby-example__stat" x="34" y="54">now {planState.units} homes / {planState.affordableUnits} affordable</text>
      <text className="nimby-example__stat is-burden" x={Math.round(layout.width * 0.68)} y="34">{burdenLabel}</text>
      <text className="nimby-example__stat is-burden" x={Math.round(layout.width * 0.68)} y="54">delay {planState.delayMonths} months / {planState.negativeDrags.length} drag particles</text>
      {lastEvent && (
        <foreignObject x={Math.round(layout.width * 0.4)} y="22" width="260" height="92" style={{ pointerEvents: "none" }}>
          <div className="nimby-example__callout">
            <strong>{lastEvent.label}</strong>
            <span>{lastEvent.summary}</span>
          </div>
        </foreignObject>
      )}
    </svg>
  )
}

function Metric({ label, value, detail, warn }) {
  return (
    <div className={`nimby-example__metric ${warn ? "is-warning" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  )
}

function Control({ label, value, onChange }) {
  return (
    <label className="nimby-example__control">
      <span>
        {label}
        <strong>{Math.round(value * 100)}%</strong>
      </span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}
