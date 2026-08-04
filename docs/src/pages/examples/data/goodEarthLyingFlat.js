import dataset from "../../../../strategy/good-earth-to-lying-flat-process-sankey.json"

const NODE_HALF_LIFE = 0.12
export const GOOD_EARTH_ALWAYS_LENS = "__node__"
export const GOOD_EARTH_DOMAIN = Object.freeze([-0.22, 5.22])

export const GOOD_EARTH_COLORS = Object.freeze({
  inheritance: "#fa4d56",
  security_strategy: "#f1c21b",
  growth_machine: "#33b1ff",
  bottleneck: "#a56eff",
  response: "#42be65",
  outcome: "#ff7eb6",
})

const FAMILY_LABELS = Object.freeze({
  inheritance: "Inherited force",
  security_strategy: "Security strategy",
  growth_machine: "Growth machine",
  bottleneck: "Broken promise",
  response: "Adaptive response",
  outcome: "Social outcome",
})

const SHORT_LABELS = Object.freeze({
  scarcity_memory: "Scarcity memory",
  growth_bargain: "Growth bargain",
  property_security: "Property security",
  credential_security: "Credentials",
  consumption_success: "Consumption proof",
  housing_machine: "Housing accumulation",
  credential_race: "Credential race",
  status_competition: "Status competition",
  overwork_norm: "Overwork duty",
  affordability: "Housing burden",
  job_mismatch: "Graduate mismatch",
  involution: "Involution",
  confidence_loss: "Loss of confidence",
  precaution: "Precautionary saving",
  lying_flat: "Lying flat",
  rat_people: "Rat people",
  defensive_stability: "Defensive stability",
  weak_consumption: "Weak consumption",
  delayed_family: "Delayed family",
  private_retreat: "Private retreat",
})

export const GOOD_EARTH_TITLE = dataset.title
export const GOOD_EARTH_SUBTITLE = dataset.subtitle
export const GOOD_EARTH_WEIGHT_SEMANTICS = dataset.weight_semantics

export const GOOD_EARTH_STAGES = Object.freeze(
  Object.entries(dataset.stage_labels).map(([id, label]) =>
    Object.freeze({
      id: Number(id),
      label,
      shortLabel: label
        .replace(" moral economy", "")
        .replace(" strategies", "")
        .replace(" machinery", ""),
    }),
  ),
)

const STAGE_BY_ID = new Map(GOOD_EARTH_STAGES.map((stage) => [stage.id, stage]))
const SOURCE_NODE_BY_ID = new Map(dataset.nodes.map((node) => [node.id, node]))

function claimLensFor(type) {
  if (type === "historical analogy") return "historical"
  if (type === "structural" || type === "economic") return "economic"
  if (type === "cultural" || type === "cultural response" || type === "cultural-economic")
    return "cultural"
  return "interpretive"
}

function confidenceOpacity(confidence) {
  if (confidence === "high") return 0.8
  if (confidence === "medium") return 0.58
  return 0.36
}

export const GOOD_EARTH_LENSES = Object.freeze([
  { id: "all", label: "All claims", description: "" },
  {
    id: "historical",
    label: "Historical analogy",
    description: "The Wang Lung / modern-security analogy.",
  },
  {
    id: "economic",
    label: "Economic structure",
    description: "Accumulation, risk, and demand mechanisms.",
  },
  {
    id: "cultural",
    label: "Cultural response",
    description: "Status, exhaustion, and cultural withdrawal.",
  },
  {
    id: "interpretive",
    label: "Interpretive synthesis",
    description: "The model's explicit analytical inferences.",
  },
])

export const GOOD_EARTH_PROCESS_NODES = Object.freeze(
  dataset.nodes.map((node) => {
    const stage = STAGE_BY_ID.get(node.stage)
    return Object.freeze({
      ...node,
      shortLabel: SHORT_LABELS[node.id] ?? node.label,
      familyLabel: FAMILY_LABELS[node.family] ?? node.family,
      stageLabel: stage?.label ?? `Stage ${node.stage + 1}`,
      labelPriority: node.stage === 3 || node.stage === 4 ? 2 : 1,
      // Every node stays legible under a claim lens. Only ribbons carry a
      // particular lens value, so the selection dims claims rather than stages.
      claimLens: GOOD_EARTH_ALWAYS_LENS,
      xExtent: [node.stage - NODE_HALF_LIFE, node.stage + NODE_HALF_LIFE],
    })
  }),
)

export const GOOD_EARTH_PROCESS_EDGES = Object.freeze(
  dataset.edges.map((edge, index) => {
    const source = SOURCE_NODE_BY_ID.get(edge.source)
    const target = SOURCE_NODE_BY_ID.get(edge.target)
    const sourceStage = source?.stage ?? 0
    const targetStage = target?.stage ?? sourceStage + 1
    return Object.freeze({
      ...edge,
      id: `good-earth-claim-${String(index + 1).padStart(2, "0")}`,
      startTime: sourceStage + NODE_HALF_LIFE,
      // A few authored claims stay within one stage (for example, status
      // competition → overwork duty and job mismatch → involution). They remain
      // zero-duration local handoffs instead of inventing extra stages merely
      // to satisfy a temporal layout.
      endTime:
        targetStage > sourceStage ? targetStage - NODE_HALF_LIFE : sourceStage + NODE_HALF_LIFE,
      sourceLabel: source?.label ?? edge.source,
      targetLabel: target?.label ?? edge.target,
      sourceStageLabel: STAGE_BY_ID.get(sourceStage)?.label ?? `Stage ${sourceStage + 1}`,
      targetStageLabel: STAGE_BY_ID.get(targetStage)?.label ?? `Stage ${targetStage + 1}`,
      claimLens: claimLensFor(edge.type),
      confidenceOpacity: confidenceOpacity(edge.confidence),
    })
  }),
)

function dominantIncomingColor(nodeId) {
  let strongestEdge
  let strongestColor
  for (const edge of GOOD_EARTH_PROCESS_EDGES) {
    if (edge.target !== nodeId) continue
    const sourceFamily = SOURCE_NODE_BY_ID.get(edge.source)?.family
    const color = sourceFamily ? GOOD_EARTH_COLORS[sourceFamily] : undefined
    if (!color) continue
    if (
      !strongestEdge ||
      edge.value > strongestEdge.value ||
      (edge.value === strongestEdge.value && edge.id.localeCompare(strongestEdge.id) < 0)
    ) {
      strongestEdge = edge
      strongestColor = color
    }
  }
  return strongestColor
}

/**
 * One HatchFill per concept. Its background is the strongest incoming ribbon
 * color; its diagonal stroke is the color it sends onward as a source. The
 * node therefore visibly carries the before/after flow colors rather than
 * acting as a detached, solid category chip.
 */
export const GOOD_EARTH_NODE_HATCHES = Object.freeze(
  Object.fromEntries(
    GOOD_EARTH_PROCESS_NODES.map((node) => {
      const outgoingColor = GOOD_EARTH_COLORS[node.family]
      return [
        node.id,
        Object.freeze({
          type: "hatch",
          background: dominantIncomingColor(node.id) ?? outgoingColor,
          stroke: outgoingColor,
          lineWidth: 2.25,
          spacing: 9,
          angle: -45,
          lineOpacity: 0.92,
        }),
      ]
    }),
  ),
)

export const GOOD_EARTH_AXIS_TICKS = Object.freeze(
  GOOD_EARTH_STAGES.map((stage) =>
    Object.freeze({
      date: stage.id,
      label: stage.shortLabel,
    }),
  ),
)

export const GOOD_EARTH_NODE_BY_ID = Object.freeze(
  new Map(GOOD_EARTH_PROCESS_NODES.map((node) => [node.id, node])),
)

export function goodEarthStageLabel(value) {
  const numeric = Number(value)
  const stage = GOOD_EARTH_STAGES.reduce(
    (closest, candidate) =>
      Math.abs(candidate.id - numeric) < Math.abs(closest.id - numeric) ? candidate : closest,
    GOOD_EARTH_STAGES[0],
  )
  return stage.shortLabel
}
