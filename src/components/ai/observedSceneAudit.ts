import type { Datum } from "../charts/shared/datumTypes"
import { contrastRatio } from "../charts/shared/colorContrast"
import { extractAllRows } from "../stream/accessibleDataRows"
import type { NavTreeNode } from "./navigationTree"
import type {
  AccessibilityTableField,
  ChartRecipe,
} from "./chartRecipes"
import {
  fieldForRole,
  recipeConfig,
  recipeIntentId,
} from "./recipeSemantics"

export type ObservedAuditStatus = "pass" | "warn" | "fail" | "manual" | "not-applicable"

export interface ObservedAuditFinding {
  id: string
  category: "geometry" | "identity" | "coverage" | "interaction" | "accessibility" | "visual" | "manual-at"
  status: ObservedAuditStatus
  message: string
  evidence?: Record<string, unknown>
  remediation?: string
}

export interface DeclaredRecipeSemantics {
  dataRoles: string[]
  intents: string[]
  accessibilityExpectations: string[]
  fallbackDeclared: boolean
  designContractDeclared: boolean
}

export interface AuditObservedSceneInput {
  recipe: ChartRecipe
  /** A getCustomLayout() result, a node array, or a frame-specific scene bundle. */
  scene:
    | ReadonlyArray<Record<string, unknown>>
    | {
        nodes?: ReadonlyArray<Record<string, unknown>>
        sceneNodes?: ReadonlyArray<Record<string, unknown>>
        sceneEdges?: ReadonlyArray<Record<string, unknown>>
      }
    | null
    | undefined
  inputData: ReadonlyArray<Datum>
  annotations?: ReadonlyArray<Datum>
  dimensions: {
    width: number
    height: number
    plot?: { x?: number; y?: number; width: number; height: number }
  }
  theme?: {
    background?: string
    categorical?: string[]
  }
  layoutConfig?: Record<string, unknown>
  chart?: {
    title?: string
    summary?: string
    description?: string
    accessibleTable?: boolean
    navigationTree?: NavTreeNode
    selectedIds?: ReadonlyArray<string>
  }
}

export interface ObservedSceneAuditResult {
  recipeId: string
  ok: boolean
  summary: {
    marks: number
    passes: number
    warnings: number
    failures: number
    manual: number
  }
  declaredSemantics: DeclaredRecipeSemantics
  observedSceneEvidence: ObservedAuditFinding[]
  manualATChecks: ObservedAuditFinding[]
}

type SceneNode = Record<string, any>

interface Bounds {
  x0: number
  y0: number
  x1: number
  y1: number
}

function nodesFrom(input: AuditObservedSceneInput["scene"]): SceneNode[] {
  if (Array.isArray(input)) return input as SceneNode[]
  if (!input || typeof input !== "object") return []
  const bundle = input as Exclude<
    AuditObservedSceneInput["scene"],
    ReadonlyArray<Record<string, unknown>> | null | undefined
  >
  return [
    ...((bundle.nodes ?? bundle.sceneNodes ?? []) as SceneNode[]),
    ...((bundle.sceneEdges ?? []) as SceneNode[]),
  ]
}

function nodeId(node: SceneNode): string | undefined {
  const value = node.pointId ?? node.id ?? node._transitionKey
  return value == null || value === "" ? undefined : String(value)
}

function nodeDatum(node: SceneNode): Datum | Datum[] | null {
  return node.accessibility?.tableFields ?? node.accessibleDatum ?? node.datum ?? null
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function nodeBounds(node: SceneNode): Bounds | null {
  if (finite(node.x) && finite(node.y) && finite(node.w) && finite(node.h)) {
    return { x0: node.x, y0: node.y, x1: node.x + node.w, y1: node.y + node.h }
  }
  if (finite(node.x) && finite(node.y) && finite(node.r)) {
    return { x0: node.x - node.r, y0: node.y - node.r, x1: node.x + node.r, y1: node.y + node.r }
  }
  if (finite(node.cx) && finite(node.cy) && finite(node.r)) {
    return { x0: node.cx - node.r, y0: node.cy - node.r, x1: node.cx + node.r, y1: node.cy + node.r }
  }
  if (finite(node.cx) && finite(node.cy) && finite(node.outerR)) {
    return {
      x0: node.cx - node.outerR,
      y0: node.cy - node.outerR,
      x1: node.cx + node.outerR,
      y1: node.cy + node.outerR,
    }
  }
  const paths = [node.path, node.topPath, node.bottomPath].filter(Array.isArray)
  const points = paths.flat().filter(
    (point: unknown): point is [number, number] =>
      Array.isArray(point) && finite(point[0]) && finite(point[1]),
  )
  if (points.length > 0) {
    return {
      x0: Math.min(...points.map((point) => point[0])),
      y0: Math.min(...points.map((point) => point[1])),
      x1: Math.max(...points.map((point) => point[0])),
      y1: Math.max(...points.map((point) => point[1])),
    }
  }
  return null
}

function rawGeometryValues(node: SceneNode): unknown[] {
  const direct = [
    node.x, node.y, node.w, node.h, node.r, node.cx, node.cy, node.innerR,
    node.outerR, node.x1, node.x2, node.y1, node.y2, node.openY, node.closeY,
    node.highY, node.lowY, node.bodyWidth,
  ].filter((value) => value !== undefined)
  const paths = [node.path, node.topPath, node.bottomPath]
    .filter(Array.isArray)
    .flat(2)
  return [...direct, ...paths]
}

function overlapRatio(a: Bounds, b: Bounds): number {
  const width = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0))
  const height = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0))
  const intersection = width * height
  const areaA = Math.max(0, a.x1 - a.x0) * Math.max(0, a.y1 - a.y0)
  const areaB = Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0)
  const smaller = Math.min(areaA, areaB)
  return smaller > 0 ? intersection / smaller : 0
}

function matchesInput(
  datum: Datum,
  input: Datum,
  recipe: ChartRecipe,
  config: Record<string, unknown>,
  data: ReadonlyArray<Datum>,
): boolean {
  if (datum === input) return true
  const fields = recipe.dataRoles
    .map((role) => fieldForRole(role, config, data))
    .filter((field): field is string => !!field)
  const comparable = fields.filter(
    (field) => datum[field] != null && input[field] != null,
  )
  return comparable.length > 0 && comparable.every(
    (field) => String(datum[field]) === String(input[field]),
  )
}

function statusFinding(
  id: string,
  category: ObservedAuditFinding["category"],
  ok: boolean,
  pass: string,
  fail: string,
  failStatus: "warn" | "fail" = "warn",
  evidence?: Record<string, unknown>,
): ObservedAuditFinding {
  return {
    id,
    category,
    status: ok ? "pass" : failStatus,
    message: ok ? pass : fail,
    ...(evidence ? { evidence } : {}),
  }
}

/**
 * Audit what a custom layout actually emitted. The report deliberately keeps
 * declared meaning, observed evidence, and manual AT/reception checks separate.
 */
export function auditObservedScene(
  input: AuditObservedSceneInput,
): ObservedSceneAuditResult {
  const { recipe } = input
  const nodes = nodesFrom(input.scene)
  const config = input.layoutConfig ?? recipeConfig({ layoutConfig: input.layoutConfig })
  const plot = input.dimensions.plot ?? {
    x: 0,
    y: 0,
    width: input.dimensions.width,
    height: input.dimensions.height,
  }
  const plotX = plot.x ?? 0
  const plotY = plot.y ?? 0
  const evidence: ObservedAuditFinding[] = []
  const dataNodes = nodes.filter((node) => nodeDatum(node) != null)

  const invalidGeometry = nodes.filter((node) => {
    if (typeof node.pathD === "string" && /NaN|Infinity|undefined/.test(node.pathD)) return true
    return rawGeometryValues(node).some((value) => typeof value !== "number" || !Number.isFinite(value))
  })
  evidence.push(statusFinding(
    "geometry.finite",
    "geometry",
    invalidGeometry.length === 0,
    "All emitted geometry is finite.",
    `${invalidGeometry.length} marks contain non-finite geometry.`,
    "fail",
    { count: invalidGeometry.length },
  ))

  const bounds = nodes.map(nodeBounds)
  const zeroArea = bounds.filter(
    (bound) => bound && (bound.x1 <= bound.x0 || bound.y1 <= bound.y0),
  ).length
  evidence.push(statusFinding(
    "geometry.nonzero-area",
    "geometry",
    zeroArea === 0,
    "All bounded marks have positive area.",
    `${zeroArea} marks have zero or negative area.`,
    "warn",
    { count: zeroArea },
  ))

  const outOfBounds = bounds.filter(
    (bound) =>
      bound &&
      (bound.x0 < plotX ||
        bound.y0 < plotY ||
        bound.x1 > plotX + plot.width ||
        bound.y1 > plotY + plot.height),
  ).length
  evidence.push(statusFinding(
    "geometry.bounds",
    "geometry",
    outOfBounds === 0,
    "All bounded marks stay inside the plot.",
    `${outOfBounds} marks extend outside the plot bounds.`,
    "warn",
    { count: outOfBounds },
  ))

  const minimumTarget =
    recipe.audit?.minimumHitTargetSize ??
    recipe.accessibility.minimumHitTarget ??
    24
  const tiny = bounds.filter((bound) => {
    if (!bound) return false
    return bound.x1 - bound.x0 < minimumTarget || bound.y1 - bound.y0 < minimumTarget
  }).length
  evidence.push(statusFinding(
    "interaction.target-size",
    "interaction",
    tiny === 0,
    `All bounded targets meet the declared ${minimumTarget}px minimum.`,
    `${tiny} targets are smaller than ${minimumTarget}px in at least one dimension.`,
    "warn",
    { count: tiny, minimumTarget },
  ))

  const ids = dataNodes.map(nodeId)
  const missingIds = ids.filter((id) => !id).length
  const seen = new Set<string>()
  const duplicateIds = ids.filter((id): id is string => {
    if (!id) return false
    if (seen.has(id)) return true
    seen.add(id)
    return false
  })
  evidence.push(statusFinding(
    "identity.stable-ids",
    "identity",
    missingIds === 0,
    "Every data-bearing mark exposes a stable id.",
    `${missingIds} data-bearing marks have no pointId, id, or transition key.`,
    recipe.audit?.requireStableIds ? "fail" : "warn",
    { missing: missingIds },
  ))
  evidence.push(statusFinding(
    "identity.unique-ids",
    "identity",
    duplicateIds.length === 0,
    "Stable mark ids are unique.",
    `${duplicateIds.length} duplicate stable ids were observed.`,
    "fail",
    { duplicates: [...new Set(duplicateIds)].slice(0, 10) },
  ))
  const unstableIds = ids.filter(
    (id) => id && /^(datum|mark|node|point|rect)-?\d+$/.test(id),
  ).length
  if (unstableIds > 0) {
    evidence.push({
      id: "identity.index-pattern",
      category: "identity",
      status: "warn",
      message: `${unstableIds} ids look index-derived and may change when data is reordered.`,
      remediation: "Derive ids from a declared identifier role or stable domain key.",
    })
  }

  const represented = new Set<number>()
  let unmatchedMarks = 0
  const inputRows = input.inputData
  for (const node of dataNodes) {
    const datum = nodeDatum(node)
    const datums = Array.isArray(datum) ? datum : [datum]
    let nodeMatched = false
    for (const candidate of datums) {
      if (!candidate || typeof candidate !== "object") continue
      for (let index = 0; index < inputRows.length; index += 1) {
        if (matchesInput(candidate as Datum, inputRows[index], recipe, config, inputRows)) {
          represented.add(index)
          nodeMatched = true
        }
      }
    }
    if (!nodeMatched) unmatchedMarks += 1
  }
  const missingData = Math.max(0, inputRows.length - represented.size)
  evidence.push(statusFinding(
    "coverage.input-data",
    "coverage",
    missingData === 0,
    "Every input datum is represented by the observed scene.",
    `${missingData} input data items have no matching scene mark.`,
    recipe.audit?.requireDatumCoverage ? "fail" : "warn",
    { represented: represented.size, input: inputRows.length },
  ))
  evidence.push(statusFinding(
    "coverage.scene-data",
    "coverage",
    unmatchedMarks === 0,
    "Every data-bearing scene mark maps back to input data.",
    `${unmatchedMarks} scene marks do not map back to an input datum.`,
    "warn",
    { count: unmatchedMarks },
  ))

  const intentionalMultiplicity = recipe.encodings?.some(
    (encoding) => encoding.channel === "count",
  )
  if (!intentionalMultiplicity && dataNodes.length > represented.size && represented.size > 0) {
    evidence.push({
      id: "coverage.duplicate-references",
      category: "coverage",
      status: "warn",
      message: "Input data is referenced by multiple marks, but multiplicity is not declared as an encoding.",
      remediation: "Declare count/repetition semantics or preserve a one-to-one datum-to-mark mapping.",
    })
  }

  const nonInteractive = dataNodes.filter((node) => node.interactive === false).length
  evidence.push(statusFinding(
    "interaction.hit-targets",
    "interaction",
    nonInteractive === 0 && dataNodes.length > 0,
    "Every observed data-bearing scene node participates in hit testing.",
    dataNodes.length === 0
      ? "No data-bearing scene nodes were emitted for interaction."
      : `${nonInteractive} data-bearing marks explicitly disable interaction.`,
    "fail",
  ))

  const annotationIds = (input.annotations ?? [])
    .map((annotation) => annotation.pointId)
    .filter((id): id is string | number => id != null)
    .map(String)
  const unresolved = annotationIds.filter((id) => !seen.has(id))
  evidence.push(statusFinding(
    "coverage.annotation-anchors",
    "coverage",
    unresolved.length === 0,
    annotationIds.length
      ? "All pointId annotation anchors resolve to observed scene nodes."
      : "No pointId annotations require scene resolution.",
    `${unresolved.length} annotations point to missing scene ids.`,
    "fail",
    { unresolved },
  ))

  const selectedMissing = (input.chart?.selectedIds ?? []).filter((id) => !seen.has(id))
  if (input.chart?.selectedIds) {
    evidence.push(statusFinding(
      "interaction.selection-reachability",
      "interaction",
      selectedMissing.length === 0,
      "Selected/highlighted states resolve to observed marks.",
      `${selectedMissing.length} selected ids are not reachable in the scene.`,
      "fail",
      { missing: selectedMissing },
    ))
  }

  const tableRows = extractAllRows(nodes)
  const declaredTableFields: AccessibilityTableField[] =
    recipe.accessibility.tableFields ??
    recipe.accessibility.tableRoles?.map((role) => ({
      role,
      label: role,
    })) ??
    []
  const expectedFields = declaredTableFields.map((entry) => {
    if (entry.field) return entry.field
    const role = entry.role
      ? recipe.dataRoles.find((candidate) => candidate.role === entry.role)
      : undefined
    return role ? fieldForRole(role, config, inputRows) : undefined
  }).filter((field): field is string => !!field)
  const tableFields = new Set(tableRows.flatMap((row) => Object.keys(row.values)))
  const lostFields = expectedFields.filter((field) => !tableFields.has(field))
  evidence.push(statusFinding(
    "accessibility.table-fields",
    "accessibility",
    lostFields.length === 0,
    expectedFields.length
      ? "The accessible table preserves all recipe-declared fields."
      : "The recipe declares no explicit accessible table field projection.",
    `The accessible table loses declared fields: ${lostFields.join(", ")}.`,
    "fail",
    { expectedFields, observedFields: [...tableFields] },
  ))
  const richerInputFields = new Set(
    inputRows.flatMap((datum) =>
      Object.entries(datum)
        .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
        .map(([field]) => field),
    ),
  )
  if (
    richerInputFields.size > 2 &&
    tableFields.size <= 2 &&
    [...tableFields].every((field) => field === "category" || field === "value")
  ) {
    evidence.push({
      id: "accessibility.generic-table-loss",
      category: "accessibility",
      status: "warn",
      message: "The table exposes only generic category/value fields although richer input data exists.",
      remediation: "Emit accessibleDatum or accessibility.tableFields on scene nodes.",
    })
  }

  const colorEncodings = recipe.encodings?.filter(
    (encoding) => encoding.channel === "color",
  ) ?? []
  const colorOnly = colorEncodings.filter(
    (encoding) => !encoding.redundantWith || encoding.redundantWith.length === 0,
  )
  evidence.push(statusFinding(
    "accessibility.color-only",
    "accessibility",
    colorOnly.length === 0,
    "Every declared color encoding names a redundant cue.",
    `${colorOnly.length} color encodings have no declared redundant cue.`,
    "warn",
  ))

  const chart = input.chart
  if (chart) {
    for (const [key, required] of [
      ["title", recipe.accessibility.requiresTitle],
      ["summary", recipe.accessibility.requiresSummary],
      ["description", recipe.accessibility.description === "required"],
    ] as const) {
      if (!required) continue
      evidence.push(statusFinding(
        `accessibility.${key}`,
        "accessibility",
        typeof chart[key] === "string" && chart[key]!.trim().length > 0,
        `A chart ${key} is present.`,
        `The recipe requires a chart ${key}, but none was supplied.`,
        "fail",
      ))
    }
    const requiresTable =
      recipe.accessibility.requiresAccessibleTable ||
      recipe.accessibility.accessibleTable === "required" ||
      recipe.accessibility.fallbackTable
    if (requiresTable) {
      evidence.push(statusFinding(
        "accessibility.fallback-table",
        "accessibility",
        chart.accessibleTable !== false,
        "The accessible fallback table is enabled.",
        "The recipe requires a fallback table, but accessibleTable is disabled.",
        "fail",
      ))
    }
    if (chart.navigationTree) {
      evidence.push(statusFinding(
        "accessibility.navigation-depth",
        "accessibility",
        (chart.navigationTree.children?.length ?? 0) > 0,
        "The navigation tree exposes structure below the root.",
        "The navigation tree is root-only.",
        "fail",
      ))
    }
  }

  const background = input.theme?.background ?? "#ffffff"
  const lowContrast = nodes.filter((node) => {
    const fill = node.style?.fill ?? node.fill
    if (typeof fill !== "string" || !fill.startsWith("#") || !background.startsWith("#")) {
      return false
    }
    const ratio = contrastRatio(fill, background)
    return ratio != null && ratio < 3
  }).length
  evidence.push(statusFinding(
    "visual.contrast",
    "visual",
    lowContrast === 0,
    "All statically checkable mark fills meet 3:1 contrast.",
    `${lowContrast} marks have fill contrast below 3:1.`,
    "warn",
    { background },
  ))

  let severeOverlaps = 0
  const bounded = bounds.filter((bound): bound is Bounds => !!bound).slice(0, 500)
  for (let left = 0; left < bounded.length; left += 1) {
    for (let right = left + 1; right < bounded.length; right += 1) {
      if (overlapRatio(bounded[left], bounded[right]) >= 0.8) severeOverlaps += 1
    }
  }
  if (severeOverlaps > bounded.length) {
    evidence.push({
      id: "visual.overlap-density",
      category: "visual",
      status: "warn",
      message: `${severeOverlaps} near-total mark overlaps suggest occlusion or excessive density.`,
      remediation: "Aggregate, jitter, layer explicitly, or declare overlap as intentional.",
    })
  }

  const manualMessages = [
    ["manual-at.screen-reader", "Verify real screen-reader behavior with the target browser/AT combinations."],
    ["manual-at.cognitive-load", "Assess cognitive load and whether the custom metaphor is understood."],
    ["manual-at.keyboard-order", "Verify that keyboard order is meaningful, not merely mechanically available."],
    ["manual-at.animation", "Verify that animation is not distracting and reduced-motion behavior is sufficient."],
    ["manual-at.reception", "Test whether the memorable form is received as intended by the target audience."],
    ["manual-at.overlay-occlusion", "Inspect labels, overlays, annotations, and important marks for clipping or occlusion."],
    ["manual-at.observation", "Exercise hover, focus, selection, and observation emission in the rendered chart."],
  ] as const
  const manualATChecks: ObservedAuditFinding[] = manualMessages.map(([id, message]) => ({
    id,
    category: "manual-at",
    status: "manual",
    message,
  }))

  const declaredSemantics: DeclaredRecipeSemantics = {
    dataRoles: recipe.dataRoles.map((role) => role.role),
    intents: recipe.intents.map(recipeIntentId).filter((id): id is string => !!id),
    accessibilityExpectations: [
      ...(recipe.accessibility.requirements ?? []),
      ...(recipe.accessibility.tableFields?.map((field) => `table field: ${field.label}`) ?? []),
    ],
    fallbackDeclared:
      recipe.accessibility.fallbackTable === true ||
      recipe.accessibility.accessibleTable === "required" ||
      recipe.accessibility.requiresAccessibleTable === true,
    designContractDeclared: !!recipe.designContract?.whyCustom,
  }

  const all = [...evidence, ...manualATChecks]
  const failures = evidence.filter((finding) => finding.status === "fail").length
  return {
    recipeId: recipe.id,
    ok: failures === 0,
    summary: {
      marks: nodes.length,
      passes: all.filter((finding) => finding.status === "pass").length,
      warnings: all.filter((finding) => finding.status === "warn").length,
      failures,
      manual: all.filter((finding) => finding.status === "manual").length,
    },
    declaredSemantics,
    observedSceneEvidence: evidence,
    manualATChecks,
  }
}
