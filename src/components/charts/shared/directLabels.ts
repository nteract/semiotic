import type { Datum } from "./datumTypes"

export interface DirectLabelRequest {
  position: "start" | "end"
  fontSize: number
  colorBy: string | ((d: Datum) => unknown)
  color: (label: string) => string
}

/** Select semantic endpoints by x, across gaps/forecast segments, before projection. */
export function directLabelAnnotations(
  rows: readonly Datum[],
  request: DirectLabelRequest,
  xAccessor: string | ((d: Datum) => unknown) = "x",
  yAccessor: string | ((d: Datum) => unknown) = "y"
): Datum[] {
  const x =
    typeof xAccessor === "function" ? xAccessor : (d: Datum) => d[xAccessor]
  const y =
    typeof yAccessor === "function" ? yAccessor : (d: Datum) => d[yAccessor]
  const color =
    typeof request.colorBy === "function"
      ? request.colorBy
      : (d: Datum) => d[request.colorBy as string]
  const endpoints = new Map<string, Datum>()
  for (const row of rows) {
    const raw = color(row) ?? (row.parentLine && color(row.parentLine))
    if (raw == null || String(raw) === "") continue
    const label = String(raw)
    const previous = endpoints.get(label)
    if (
      !previous ||
      (request.position === "end"
        ? Number(x(row)) > Number(x(previous))
        : Number(x(row)) < Number(x(previous)))
    ) {
      endpoints.set(label, row)
    }
  }
  return [...endpoints].map(([label, row]) => ({
    type: "text",
    label,
    [typeof xAccessor === "string" ? xAccessor : "x"]: x(row),
    [typeof yAccessor === "string" ? yAccessor : "y"]: y(row),
    x: x(row),
    y: y(row),
    _directLabel: { id: label, position: request.position },
    color: request.color(label),
    fontSize: request.fontSize
  }))
}

export function expandDirectLabelRequests(
  annotations: readonly Datum[],
  rows: readonly Datum[] = [],
  xAccessor?: string,
  yAccessor?: string
): Datum[] {
  return annotations.flatMap((annotation) =>
    annotation._directLabelRequest
      ? directLabelAnnotations(
          rows,
          annotation._directLabelRequest as DirectLabelRequest,
          xAccessor,
          yAccessor
        )
      : [annotation]
  )
}

/** Included in the root SVG description so role=img cannot hide fallback identity. */
export function directLabelDescription(
  annotations: readonly Datum[] = []
): string {
  const labels = annotations.filter((a) => a._directLabel)
  return labels.length
    ? ` Series endpoints: ${labels.map((a) => `${a.label}: x ${String(a.x)}, y ${String(a.y)}`).join("; ")}.`
    : ""
}
