import { planGauntletPropertyWork, replaceGauntletNegative } from "semiotic/physics"
import type {
  GauntletEvent,
  GauntletLayout,
  GauntletProjectState,
  GauntletPropertyDefinition,
} from "semiotic/physics"
import { NEGATIVE_PROPERTIES, TRAITS, type ReviewScenario } from "./mergePressureScenarios"

function traitLabel(id: string) {
  return TRAITS[id]?.label ?? id
}

function humanReviewEffect(
  project: GauntletProjectState,
  scenario: ReviewScenario,
  passLabel: string,
) {
  const plan = planGauntletPropertyWork({
    attachedIds: project.negativeIds,
    properties: NEGATIVE_PROPERTIES,
    budget: scenario.humanBudget,
  })
  const popped = plan.ids.map(traitLabel).join(", ") || "nothing"
  return {
    metricsDelta: {
      humanPasses: 1,
      humanReviewedWork: plan.used,
    },
    popNegative: { ids: plan.ids },
    stage: passLabel,
    summary: `${passLabel} used ${plan.used}/${scenario.humanBudget} remediation units and removed ${popped}.`,
  }
}

function aiReviewEffect(project: GauntletProjectState, scenario: ReviewScenario) {
  if (scenario.aiMode === "bad_tests") {
    const replacement = replaceGauntletNegative(project, {
      from: "missing_tests",
      to: "bad_tests",
    })
    if (replacement.popNegative) {
      return {
        ...replacement,
        metricsDelta: { aiPasses: 1, aiReplacements: 1 },
        stage: "AI Review",
        summary: "AI review replaced Missing Tests with Bad Tests.",
      }
    }
  }
  return {
    metricsDelta: { aiPasses: 1 },
    stage: "AI Review",
    summary: "AI review left the attached negative traits unchanged.",
  }
}

function ciEffect(project: GauntletProjectState, label: string) {
  if (project.negativeIds.includes("missing_tests")) {
    return {
      delayDelta: 1,
      metricsDelta: { ciReturns: 1 },
      outcome: "returned_to_review",
      stage: label,
      summary: "CI found Missing Tests and returned the same PR to human review.",
    }
  }
  return {
    metricsDelta: { ciPasses: 1 },
    stage: label,
    summary: "CI passed; any remaining non-blocking risk stays attached.",
  }
}

function gateById(layout: GauntletLayout, id: string) {
  return layout.gates.find((gate) => gate.id === id)
}

export function buildReviewEvents(
  scenario: ReviewScenario,
  project: GauntletProjectState,
  layout: GauntletLayout,
) {
  const ai = gateById(layout, "ai-review")
  const human = gateById(layout, "human-review")
  const ci = gateById(layout, "ci")
  const routeY = layout.routeY
  const events: GauntletEvent[] = [
    {
      id: "ai-review",
      label: "AI Review",
      gateId: "ai-review",
      routeX: ai?.x,
      routeY,
      time: 0.72,
      effects: [aiReviewEffect(project, scenario)],
    },
    {
      id: "human-review-1",
      label: "Human Review",
      gateId: "human-review",
      gateVisit: 1,
      routeX: human?.x,
      routeY,
      time: 1.55,
      effects: [humanReviewEffect(project, scenario, "Human Review")],
    },
    {
      id: "ci-check-1",
      label: "CI",
      gateId: "ci",
      gateVisit: 1,
      routeX: ci?.x,
      routeY,
      time: 2.5,
      effects: [ciEffect(project, "CI")],
    },
  ]

  // Queue delays can make several nominal times overdue at once. Offer only
  // the next action, so CI evaluates the ledger AFTER review has changed it.
  const nextAction = () =>
    events.filter((event) => !project.eventsApplied.includes(event.id)).slice(0, 1)
  if (!project.eventsApplied.includes("ci-check-1")) return nextAction()
  if (!(project.metrics.ciReturns > 0)) {
    events.push({
      id: "merge-decision",
      label: "Merge Decision",
      routeX: (ci?.x ?? layout.socketX) + 18,
      routeY,
      time: 2.72,
      final: true,
      summary: "The PR contributes its points to the Feature once.",
    })
    return nextAction()
  }

  events.push(
    {
      id: "human-review-2",
      label: "Return Review",
      gateId: "human-review",
      gateVisit: 2,
      routeX: human?.x,
      routeY: routeY - 72,
      time: 3.55,
      effects: [humanReviewEffect(project, scenario, "Return Review")],
    },
    {
      id: "ci-final",
      label: "CI Final",
      gateId: "ci",
      gateVisit: 2,
      routeX: ci?.x,
      routeY,
      time: 4.65,
      effects: [ciEffect(project, "CI Final")],
    },
  )
  if (project.eventsApplied.includes("ci-final")) {
    events.push({
      id: "merge-decision",
      label: "Merge Decision",
      routeX: (ci?.x ?? layout.socketX) + 18,
      routeY,
      time: 4.88,
      final: true,
      summary: project.negativeIds.includes("missing_tests")
        ? "Missing Tests still block this PR from contributing Feature points."
        : "The returned PR now contributes its points to the Feature once.",
    })
  }
  return nextAction()
}

export function outcomeForPR(project: GauntletProjectState) {
  if (project.negativeIds.includes("missing_tests")) return "approved_not_built"
  if (project.negativeIds.length > 0) return "built_diminished"
  return "built"
}

export function viabilityForPR(
  project: GauntletProjectState,
  { negativeProperties }: { negativeProperties: Map<string, GauntletPropertyDefinition> },
) {
  const points = Number(project.datum.points ?? 1)
  const load = project.negativeIds.reduce(
    (sum, id) => sum + (negativeProperties.get(id)?.load ?? 1),
    0,
  )
  return Math.max(0, Math.min(100, 96 - points * 1.1 - load * 8 - project.delay * 6))
}
