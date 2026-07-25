import { toConfig } from "../export/chartConfig"
import { buildReaderGrounding } from "./readerGrounding"
import type { NavTreeNode } from "./navigationTree"
import {
  isRecord,
  jsonSafe,
  safeRecord,
  stableHash,
} from "./vacpAdapterRuntime"
import {
  SEMIOTIC_VACP_INSPECT_DATA_ACTION,
  type ChartModel,
  type CreateSemioticVACPBridgeOptions,
  type DataHandleModel,
  type NavigationIndex,
  type RuntimeModelBase,
  type SelectionModel,
  type SemioticVACPChart,
  type SemioticVACPNavigationBinding,
  type SemioticVACPRefs,
} from "./vacpAdapterTypes"
import {
  VACP_DATA_SCHEMA_ACTION,
  VACP_SCHEMA_VERSION,
  type VacpEdge,
  type VacpNode,
  type VacpRef,
} from "./vacpTypes"

const DATA_COLLECTION_PROPS = [
  "data",
  "nodes",
  "edges",
  "points",
  "areas",
  "lines",
  "flows",
] as const

const ACCESSOR_CHANNELS = [
  ["xAccessor", "x"],
  ["yAccessor", "y"],
  ["categoryAccessor", "category"],
  ["valueAccessor", "value"],
  ["colorBy", "color"],
  ["sizeAccessor", "size"],
  ["lineBy", "series"],
  ["groupAccessor", "group"],
  ["oAccessor", "ordinal"],
  ["rAccessor", "radial"],
  ["sourceAccessor", "source"],
  ["targetAccessor", "target"],
  ["nodeIDAccessor", "id"],
] as const

function segment(value: string, label: string): string {
  const normalized = value.trim()
  if (!normalized) throw new Error(`${label} must be a non-empty string.`)
  return encodeURIComponent(normalized)
}

function refWith(base: VacpRef, ...parts: string[]): VacpRef {
  return `${base}/${parts.map((part) => segment(part, "VACP ref segment")).join("/")}` as VacpRef
}

export function createRefs(
  appId: string,
  viewId: string
): SemioticVACPRefs {
  const app = `vacp://${segment(appId, "appId")}` as VacpRef
  const view = refWith(app, "view", viewId)
  const visualization = (chartId: string) =>
    refWith(view, "visualization", chartId)
  return {
    app,
    view,
    visualization,
    config: (chartId) => refWith(visualization(chartId), "config"),
    data: (chartId, collection = "data") =>
      refWith(visualization(chartId), "data", collection),
    selection: (name) => refWith(view, "selection", name),
    navigation: (chartId) =>
      refWith(visualization(chartId), "navigation"),
    observation: (chartId) =>
      refWith(visualization(chartId), "interaction", "latest-observation"),
  }
}

export function clock(options: CreateSemioticVACPBridgeOptions): string {
  const value = options.now?.() ?? new Date()
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) {
    throw new Error("VACP bridge clock returned an invalid date.")
  }
  return date.toISOString()
}

function resolveCharts(
  source: CreateSemioticVACPBridgeOptions["charts"]
): readonly SemioticVACPChart[] {
  const charts = typeof source === "function" ? source() : source
  const ids = new Set<string>()
  for (const chart of charts) {
    const id = chart.chartId.trim()
    if (!id) throw new Error("Every VACP chart requires a non-empty chartId.")
    if (ids.has(id)) throw new Error(`Duplicate VACP chartId "${id}".`)
    ids.add(id)
  }
  return charts
}

function configWithoutTimestamp(
  chart: SemioticVACPChart
): Record<string, unknown> {
  try {
    const { createdAt: _createdAt, ...config } = toConfig(
      chart.component,
      chart.props,
      { includeData: false }
    )
    return safeRecord(config)
  } catch (error) {
    const props = Object.create(null) as Record<string, unknown>
    for (const [key, value] of Object.entries(chart.props)) {
      if (
        (DATA_COLLECTION_PROPS as readonly string[]).includes(key) ||
        typeof value === "function"
      ) {
        continue
      }
      const safe = jsonSafe(value)
      if (safe !== undefined) props[key] = safe
    }
    return {
      component: chart.component,
      props,
      version: "unregistered",
      warning:
        error instanceof Error
          ? error.message
          : "Chart config could not be serialized by toConfig.",
    }
  }
}

function chartGrounding(chart: SemioticVACPChart) {
  return buildReaderGrounding(chart.component, chart.props, {
    ...chart.grounding,
    audience: chart.audience,
    includeStructure: true,
    maxLeaves: Math.min(chart.grounding?.maxLeaves ?? 1, 1),
  })
}

function dataHandlesFor(
  chart: SemioticVACPChart,
  refs: SemioticVACPRefs
): DataHandleModel[] {
  const handles: DataHandleModel[] = []
  for (const collection of DATA_COLLECTION_PROPS) {
    const rows = chart.props[collection]
    if (!Array.isArray(rows)) continue
    handles.push({
      ref: refs.data(chart.chartId, collection),
      chartId: chart.chartId,
      collection,
      rows,
    })
  }
  return handles
}

function walkTree(
  node: NavTreeNode,
  visit: (node: NavTreeNode) => void
): void {
  visit(node)
  for (const child of node.children ?? []) walkTree(child, visit)
}

export function findTreeNode(
  tree: NavTreeNode,
  id: string | undefined
): NavTreeNode | undefined {
  if (!id) return undefined
  let result: NavTreeNode | undefined
  walkTree(tree, (node) => {
    if (!result && node.id === id) result = node
  })
  return result
}

function isStableMatchValue(value: unknown): boolean {
  return (
    value == null ||
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value)) ||
    typeof value === "boolean" ||
    (value instanceof Date && Number.isFinite(value.getTime()))
  )
}

export function matchFromNode(
  node: NavTreeNode,
  fields: readonly string[]
): Record<string, unknown> | undefined {
  if (node.role !== "datum" || !node.datum) return undefined
  const match = Object.create(null) as Record<string, unknown>
  for (const field of fields) {
    if (
      !Object.prototype.hasOwnProperty.call(node.datum, field) ||
      !isStableMatchValue(node.datum[field])
    ) {
      return undefined
    }
    match[field] =
      node.datum[field] instanceof Date
        ? node.datum[field].toISOString()
        : node.datum[field]
  }
  return match
}

function navigationIndex(
  binding: SemioticVACPNavigationBinding,
  navigationRef: VacpRef
): NavigationIndex {
  const matchFields = Array.from(
    new Set(binding.matchFields.map((field) => field.trim()).filter(Boolean))
  )
  const byKey = new Map<string, NavTreeNode>()
  if (!matchFields.length) {
    return {
      valid: false,
      diagnostic: "Navigation actions require at least one durable match field.",
      byKey,
      matchFields,
      targetRef: () => refWith(navigationRef, "target", "invalid"),
    }
  }

  let leaves = 0
  let missing = 0
  let duplicate = false
  walkTree(binding.tree, (node) => {
    if (node.role !== "datum") return
    leaves++
    const match = matchFromNode(node, matchFields)
    if (!match) {
      missing++
      return
    }
    const key = stableHash(match)
    if (byKey.has(key)) duplicate = true
    else byKey.set(key, node)
  })

  let diagnostic: string | undefined
  if (!leaves) diagnostic = "Navigation tree has no datum leaves."
  else if (missing) {
    diagnostic = `${missing} navigation leaves lack durable primitive match-field values.`
  } else if (duplicate) {
    diagnostic = "Navigation match fields do not uniquely identify every datum leaf."
  }

  return {
    valid: !diagnostic,
    ...(diagnostic ? { diagnostic } : {}),
    byKey,
    matchFields,
    targetRef: (match) =>
      refWith(navigationRef, "target", stableHash(match)),
  }
}

function selectionModels(
  charts: readonly ChartModel[],
  refs: SemioticVACPRefs
): SelectionModel[] {
  const models = new Map<
    string,
    {
      fields: Set<string>
      modes: Set<"point" | "interval">
      clientId?: string
      chartRefs: Set<VacpRef>
    }
  >()
  for (const chart of charts) {
    for (const binding of chart.chart.selections ?? []) {
      const name = binding.name.trim()
      if (!name) throw new Error("VACP selection names must be non-empty.")
      const existing =
        models.get(name) ??
        {
          fields: new Set<string>(),
          modes: new Set<"point" | "interval">(),
          chartRefs: new Set<VacpRef>(),
        }
      for (const field of binding.fields.map((value) => value.trim())) {
        if (field) existing.fields.add(field)
      }
      if (binding.mode !== "interval") existing.modes.add("point")
      if (binding.mode !== "point") existing.modes.add("interval")
      if (binding.clientId) {
        if (existing.clientId && existing.clientId !== binding.clientId) {
          throw new Error(
            `Selection "${name}" declares conflicting VACP clientIds.`
          )
        }
        existing.clientId = binding.clientId
      }
      existing.chartRefs.add(chart.ref)
      models.set(name, existing)
    }
  }
  return Array.from(models)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, model]) => {
      if (model.fields.size === 0) {
        throw new Error(
          `Selection "${name}" requires at least one allowlisted field.`
        )
      }
      return {
        ref: refs.selection(name),
        name,
        fields: Array.from(model.fields).sort(),
        modes: model.modes,
        clientId: model.clientId ?? `__semiotic-vacp__:${name}`,
        chartRefs: Array.from(model.chartRefs),
      }
    })
}

function chartNodes(
  model: ChartModel,
  options: CreateSemioticVACPBridgeOptions
): { nodes: VacpNode[]; edges: VacpEdge[] } {
  const { chart, ref, configRef, grounding } = model
  const nodes: VacpNode[] = [
    {
      ref,
      kind: "Visualization",
      layer: "VisualizationLayer",
      title: chart.title ?? String(chart.props.title ?? chart.component),
      description: chart.description ?? grounding.text,
      data: safeRecord({
        component: chart.component,
        grounding: {
          description: grounding.description,
          intent: grounding.intent,
          physics: grounding.physics,
          text: grounding.text,
        },
        audience: chart.audience,
      }),
    },
    {
      ref: configRef,
      kind: "Param",
      layer: "ConfigLayer",
      title: `${chart.component} configuration`,
      description:
        "Serializable Semiotic chart configuration with raw data collections omitted.",
      data: model.config,
    },
  ]
  const edges: VacpEdge[] = [
    { from: model.ref, to: configRef, kind: "contains" },
  ]

  const axisLabels = (grounding.structure?.children ?? [])
    .filter((node) => node.role === "axis")
    .map((node) => node.label)
  let axisIndex = 0
  for (const [prop, channel] of ACCESSOR_CHANNELS) {
    const field = chart.props[prop]
    if (typeof field !== "string" || !field.trim()) continue
    const channelRef = refWith(ref, "encoding", channel)
    nodes.push({
      ref: channelRef,
      kind: "EncodingChannel",
      layer: "VisualizationLayer",
      title: `${channel} → ${field}`,
      data: { channel, field, accessorProp: prop },
    })
    edges.push({ from: ref, to: channelRef, kind: "contains" })
    if (
      channel === "x" ||
      channel === "y" ||
      channel === "category" ||
      channel === "value" ||
      channel === "ordinal" ||
      channel === "radial"
    ) {
      const axisRef = refWith(ref, "axis", channel)
      nodes.push({
        ref: axisRef,
        kind: "Axis",
        layer: "VisualizationLayer",
        title: axisLabels[axisIndex++] ?? `${channel} axis: ${field}`,
        data: { channel, field },
      })
      edges.push({ from: ref, to: axisRef, kind: "contains" })
      edges.push({ from: axisRef, to: channelRef, kind: "derivedFrom" })
    }
  }

  for (const handle of model.dataHandles) {
    nodes.push({
      ref: handle.ref,
      kind: "DataHandle",
      layer: "DataLayer",
      title: `${chart.chartId}.${handle.collection}`,
      description:
        "Bounded details-on-demand handle. Use vacp.data_schema before requesting an opt-in sample.",
      data: {
        collection: handle.collection,
        rowCount: handle.rows.length,
        schemaAction: VACP_DATA_SCHEMA_ACTION,
        ...(options.dataAccess?.sample
          ? { inspectAction: SEMIOTIC_VACP_INSPECT_DATA_ACTION }
          : {}),
      },
    })
    edges.push({ from: ref, to: handle.ref, kind: "contains" })
  }

  if (model.navigation) {
    const { navigation } = model
    nodes.push({
      ref: navigation.ref,
      kind: "Selection",
      layer: "InteractionFeedbackLayer",
      title: `${chart.title ?? chart.component} structured navigation`,
      description:
        navigation.index.diagnostic ??
        "Active accessible-navigation target identified by durable datum fields.",
      data: {
        matchFields: navigation.index.matchFields,
        targetCount: navigation.index.byKey.size,
        status: navigation.index.valid
          ? navigation.binding.onActiveChange
            ? "actionable"
            : "read-only"
          : "ambiguous",
      },
    })
    edges.push({ from: ref, to: navigation.ref, kind: "contains" })
  }

  if (options.getObservations) {
    const observationRef = refWith(ref, "interaction", "latest-observation")
    nodes.push({
      ref: observationRef,
      kind: "InteractionTarget",
      layer: "InteractionFeedbackLayer",
      title: `${chart.title ?? chart.component} latest observation`,
      description:
        "Latest semantic hover, focus, selection, brush, activation, or control observation.",
    })
    edges.push({ from: ref, to: observationRef, kind: "contains" })
  }

  const annotations = Array.isArray(chart.props.annotations)
    ? chart.props.annotations
    : []
  const annotationRefs = new Set<VacpRef>()
  for (const annotation of annotations) {
    if (!isRecord(annotation)) continue
    const provenance = isRecord(annotation.provenance)
      ? annotation.provenance
      : undefined
    const stableId =
      annotation.id ?? annotation.stableId ?? provenance?.stableId
    const id =
      stableId == null || stableId === "" ? undefined : String(stableId)
    if (!id) continue
    const note = isRecord(annotation.note) ? annotation.note : undefined
    const noteData = isRecord(annotation.noteData)
      ? annotation.noteData
      : undefined
    const annotationRef = refWith(ref, "annotation", id)
    if (annotationRefs.has(annotationRef)) {
      throw new Error(
        `Duplicate stable annotation id "${id.trim()}" in VACP chart "${chart.chartId}".`
      )
    }
    annotationRefs.add(annotationRef)
    nodes.push({
      ref: annotationRef,
      kind: "InteractionTarget",
      layer: "VisualizationLayer",
      title: String(
        annotation.label ??
          note?.label ??
          noteData?.label ??
          `Annotation ${id}`
      ),
      description:
        typeof annotation.note === "string"
          ? annotation.note
          : typeof annotation.description === "string"
            ? annotation.description
            : undefined,
      data: safeRecord({
        id,
        provenance,
        lifecycle: annotation.lifecycle,
      }),
    })
    edges.push({ from: ref, to: annotationRef, kind: "contains" })
  }

  return { nodes, edges }
}

export function buildRuntimeModelBase(
  options: CreateSemioticVACPBridgeOptions,
  refs: SemioticVACPRefs
): RuntimeModelBase {
  const rawCharts = resolveCharts(options.charts)
  const charts: ChartModel[] = rawCharts.map((chart) => {
    const ref = refs.visualization(chart.chartId)
    const navigation = chart.navigation
      ? {
          ref: refs.navigation(chart.chartId),
          chartRef: ref,
          chartId: chart.chartId,
          binding: chart.navigation,
          index: navigationIndex(
            chart.navigation,
            refs.navigation(chart.chartId)
          ),
        }
      : undefined
    return {
      chart,
      ref,
      configRef: refs.config(chart.chartId),
      grounding: chartGrounding(chart),
      config: configWithoutTimestamp(chart),
      dataHandles: dataHandlesFor(chart, refs),
      ...(navigation ? { navigation } : {}),
    }
  })
  const selections = selectionModels(charts, refs)
  const dataHandles = charts.flatMap((chart) => chart.dataHandles)
  const nodes: VacpNode[] = [
    {
      ref: refs.app,
      kind: "App",
      layer: "ViewLayer",
      title: options.title ?? options.appId,
      description:
        "Semiotic application state exposed through the experimental VACP 0.1.0 bridge.",
      data: {
        provider: "semiotic",
        protocol: VACP_SCHEMA_VERSION,
      },
    },
    {
      ref: refs.view,
      kind: "View",
      layer: "ViewLayer",
      title: options.title ?? options.viewId ?? "Semiotic charts",
    },
  ]
  const edges: VacpEdge[] = [
    { from: refs.app, to: refs.view, kind: "contains" },
  ]

  for (const chart of charts) {
    const chartGraph = chartNodes(chart, options)
    nodes.push(...chartGraph.nodes)
    edges.push(...chartGraph.edges)
    edges.push({ from: refs.view, to: chart.ref, kind: "contains" })
  }

  for (const selection of selections) {
    nodes.push({
      ref: selection.ref,
      kind: "Selection",
      layer: "InteractionFeedbackLayer",
      title: `Selection: ${selection.name}`,
      description:
        "Named LinkedCharts selection. Agent mutations are restricted to declared fields and modes.",
      data: {
        name: selection.name,
        fields: selection.fields,
        modes: Array.from(selection.modes).sort(),
      },
    })
    edges.push({ from: refs.view, to: selection.ref, kind: "contains" })
    for (const chartRef of selection.chartRefs) {
      edges.push({ from: selection.ref, to: chartRef, kind: "controls" })
    }
  }

  return { charts, selections, dataHandles, nodes, edges }
}
