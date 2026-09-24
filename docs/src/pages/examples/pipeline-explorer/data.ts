/** Illustrative daily snapshot. These values are invented, not live telemetry. */
export const cardWidth = 260
export const cardHeight = 216
export const stages = ["Source", "Validate", "Enrich", "Aggregate", "Publish"]
export const colors = ["#358499", "#8874bb", "#b98538", "#498c75", "#bb7089"]
export const bounds = { x: 0, y: 0, width: 1668, height: 1704 }
export const margin = { left: 16, top: 16, right: 16, bottom: 16 }
export const thresholds = [55, 125, 235]

export type PipelineNode = {
  id: string
  x: number
  y: number
  pipeline: string
  stage: string
  stageIndex: number
  label: string
  color: string
  rows: number
  fields: number
  latency: number
  status: "Healthy" | "Review" | "Delayed"
  detail: string
}

const pipelines = ["Orders", "Customers", "Payments", "Inventory", "Shipments", "Events"]
const volumes = [24816, 6320, 18364, 9840, 4386, 76820]
const operations = [
  "Read the daily source snapshot.",
  "Check required fields and remove invalid records.",
  "Join reference data and resolve identifiers.",
  "Group records into daily reporting totals.",
  "Write the curated table to the warehouse.",
]

export const nodes: PipelineNode[] = pipelines.flatMap((pipeline, row) =>
  stages.map((stage, column) => {
    const review = pipeline === "Payments" && column === 1
    const delayed = pipeline === "Inventory" && column === 2
    const validRows = volumes[row] - (pipeline === "Payments" ? 96 : 8 + row * 3)
    return {
      id: `step-${row * 5 + column}`,
      x: 24 + column * 340,
      y: 24 + row * 288,
      pipeline,
      stage,
      stageIndex: column,
      label: `${pipeline} · ${stage}`,
      color: colors[column],
      rows: column === 0 ? volumes[row] : column < 3 ? validRows : Math.floor(validRows * 0.62),
      fields: [12, 12, 16, 6, 6][column],
      latency: delayed ? 980 : 42 + row * 17 + column * 28,
      status: review ? "Review" : delayed ? "Delayed" : "Healthy",
      detail: review
        ? "96 records are missing a payment identifier. Valid records continue downstream."
        : delayed
          ? "The product lookup takes 980 ms per batch. Check the reference table before the next run."
          : operations[column],
    }
  }),
)

export const edges = nodes
  .filter((node) => node.stageIndex < 4)
  .map((source) => ({
    id: `${source.id}-next`,
    source: source.id,
    target: nodes[nodes.indexOf(source) + 1].id,
  }))
export const byId = new Map(nodes.map((node) => [node.id, node]))
export const formatRows = (rows: number) => rows.toLocaleString("en-US")

export function connectionPath(id: string) {
  const node = byId.get(id)!
  const x = node.x + cardWidth,
    y = node.y + 54
  return `M${x},${y} C${x + 40},${y} ${x + 40},${y} ${x + 80},${y}`
}
