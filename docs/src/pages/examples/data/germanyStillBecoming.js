import riverDataset from "../../../../strategy/germany_history_river_dataset.json"

const NODE_HALF_LIFE = 0.11
const stageByIdMap = new Map(riverDataset.stages.map((stage) => [stage.stage_id, stage]))
const nodeByIdMap = new Map(riverDataset.nodes.map((node) => [node.node_id, node]))

export const GERMANY_RIVER_METADATA = Object.freeze(riverDataset.metadata)
export const GERMANY_METRIC_DEFINITIONS = Object.freeze(riverDataset.metric_definitions)
export const GERMANY_DOMAIN = Object.freeze([-0.18, 11.18])

export const GERMANY_COLORS = Object.freeze(Object.fromEntries(
  riverDataset.palette.map((entry) => [entry.palette_key, entry.hex]),
))

export const GERMANY_FLOW_TYPES = Object.freeze([
  { id: "continuation", label: "Continues", description: "The same regional contribution remains grouped together." },
  { id: "split", label: "Splits", description: "One historical container divides into several later containers." },
  { id: "merge", label: "Merges", description: "Several prior containers enter one later container." },
  { id: "recombination", label: "Recombines", description: "Previously separated endpoint contributions return to one container." },
])

export const GERMANY_STAGES = Object.freeze(riverDataset.stages.map((stage) => Object.freeze({
  id: stage.stage_id,
  order: stage.stage_order,
  benchmark: stage.benchmark,
  label: stage.label,
  focus: stage.focus,
  description: stage.description,
  nodeCount: riverDataset.nodes.filter((node) => node.stage_id === stage.stage_id).length,
})))

export const GERMANY_AXIS_TICKS = Object.freeze(GERMANY_STAGES.map((stage) => Object.freeze({
  date: stage.order,
  label: stage.benchmark,
})))

export const GERMANY_PROCESS_NODES = Object.freeze(riverDataset.nodes.map((node) => Object.freeze({
  ...node,
  id: node.node_id,
  label: node.label,
  shortLabel: node.short_label,
  category: node.palette_key,
  stageId: node.stage_id,
  stageOrder: node.stage_order,
  xExtent: [node.stage_order - NODE_HALF_LIFE, node.stage_order + NODE_HALF_LIFE],
})))

export const GERMANY_PROCESS_EDGES = Object.freeze(riverDataset.links.map((link) => {
  const sourceStage = stageByIdMap.get(link.source_stage)
  const targetStage = stageByIdMap.get(link.target_stage)
  const sourceNode = nodeByIdMap.get(link.source_node_id)
  const targetNode = nodeByIdMap.get(link.target_node_id)
  return Object.freeze({
    ...link,
    id: link.link_id,
    source: link.source_node_id,
    target: link.target_node_id,
    startTime: sourceStage.stage_order + NODE_HALF_LIFE,
    endTime: targetStage.stage_order - NODE_HALF_LIFE,
    thread: link.flow_type,
    chapterId: link.target_stage,
    sourceLabel: sourceNode.label,
    targetLabel: targetNode.label,
    sourceBenchmark: sourceStage.benchmark,
    targetBenchmark: targetStage.benchmark,
  })
}))

export const GERMANY_EVENTS = Object.freeze(riverDataset.events.map((event) => Object.freeze({
  ...event,
  id: event.event_id,
  stageId: event.stage_after || event.stage_before,
})))

export const GERMANY_EXTERNAL_FLOWS = Object.freeze(riverDataset.external_flows)
export const GERMANY_ENDPOINT_ATOMS = Object.freeze(riverDataset.endpoint_atoms)
export const GERMANY_SOURCES = Object.freeze(
  riverDataset.sources
    .filter((source) => source.url)
    .map((source) => Object.freeze({
      id: source.source_key,
      label: source.publisher,
      title: source.title,
      href: source.url,
      use: source.used_for,
      quality: source.quality_note,
    })),
)

export const GERMANY_METRICS = Object.freeze([
  { id: "balanced_pct_DE", label: "Balanced", shortLabel: "balanced", description: "equal mean of modern area, population, and GDP shares" },
  { id: "area_pct_DE", label: "Land", shortLabel: "area", description: "share of Germany’s official 2022 area" },
  { id: "population_pct_DE", label: "People", shortLabel: "population", description: "share of Germany’s 2022 population" },
  { id: "gdp_pct_DE", label: "Economy", shortLabel: "GDP", description: "share of Germany’s 2022 nominal GDP" },
])

export function germanyStageById(id) {
  return GERMANY_STAGES.find((stage) => stage.id === id) ?? GERMANY_STAGES[4]
}

export function germanyEventsForStage(id) {
  return GERMANY_EVENTS.filter((event) => event.stageId === id)
}

export function germanyNodeLabel(node) {
  if (node.stageId === "S11" || node.value >= 4.25) return node.shortLabel ?? node.label
  return ""
}

export function formatGermanyStage(value) {
  const numeric = typeof value === "number" ? value : Number(value)
  const nearest = GERMANY_STAGES.reduce((best, stage) =>
    Math.abs(stage.order - numeric) < Math.abs(best.order - numeric) ? stage : best,
  GERMANY_STAGES[0])
  return nearest.benchmark
}

// Backward-compatible aliases retained for example registry consumers that
// imported the first iteration of this story directly.
export const GERMANY_THREADS = GERMANY_FLOW_TYPES
export const GERMANY_TERRITORIAL_THREADS = GERMANY_ENDPOINT_ATOMS
export const GERMANY_CHAPTERS = GERMANY_STAGES
export const germanyChapterById = germanyStageById
