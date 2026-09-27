// The worker transport is untyped. Reject incomplete messages before they can
// replace a visible chart with an empty scene or reach the geometry renderer.
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Map)
const numericRecord = (value: unknown) => record(value) && Object.values(value).every(Number.isFinite)
const fields = (value: unknown, names: string[]) =>
  record(value) && names.every((name) => Number.isFinite(value[name]))
const array = (value: unknown, check: (item: unknown) => boolean) => Array.isArray(value) && value.every(check)
const issue = (value: unknown) => record(value) && typeof value.kind === "string"
const mark = (value: unknown) => record(value) && typeof value.id === "string" && typeof value.pathD === "string"

export function validateProcessSankeyWorkerResponse(value: unknown): void {
  const invalid = () => { throw new Error("Malformed ProcessSankey worker response") }
  if (!record(value)) return invalid()
  if (!record(value.layoutConfig) || !array(value.layoutConfig.bands, mark) ||
      !array(value.layoutConfig.ribbons, mark) || !array(value.issues, issue) || !array(value.warnings, issue) ||
      !Array.isArray(value.domain) || value.domain.length !== 2 || !value.domain.every(Number.isFinite) ||
      !Number.isFinite(value.timelineExtent)) return invalid()
  const layout = value.layout
  if (layout === null) return
  if (!record(layout) || !fields(layout, ["valueScale", "padding"]) ||
      !numericRecord(layout.centerlines) || !numericRecord(layout.slotByNode) ||
      !record(layout.laneLifetime) || !record(layout.nodeData) ||
      !fields(layout.layoutQuality, ["crossings", "weightedLength", "pixelLength", "transitOcclusion", "verticalUtilization"]) ||
      !fields(layout.layoutQualityBefore, ["crossings", "weightedLength", "pixelLength", "transitOcclusion", "verticalUtilization"]) ||
      !array(layout.slots, (slot) => record(slot) && fields(slot.peak, ["topPeak", "botPeak"]) &&
        array(slot.occupants, (occupant) => record(occupant) && typeof occupant.id === "string" && (Number.isFinite(occupant.end) || occupant.end === -Infinity)))) return invalid()
  for (const node of Object.values(layout.nodeData)) {
    if (!fields(node, ["peak", "topPeak", "botPeak"]) || !record(node) ||
        !(node.localAttachments instanceof Map) ||
        !array(node.samples, (sample) => fields(sample, ["t", "topMass", "botMass"]))) return invalid()
  }
  const sides = layout.sides instanceof Map ? [...layout.sides] : layout.sides
  if (!array(sides, (entry) => Array.isArray(entry) && entry.length === 2 &&
      typeof entry[0] === "string" && record(entry[1]) &&
      [entry[1].sourceSide, entry[1].targetSide].every((side) => side === undefined || side === "top" || side === "bot"))) invalid()
}
