/** Transactional, pure reducers and summaries for a bounded Crucible tape. */
import type { Datum } from "../shared/datumTypes"
import type {
  CrucibleApplyContext,
  CrucibleApplyResult,
  CrucibleComponentState,
  CrucibleConservationResult,
  CrucibleConservationSpec,
  CrucibleDiagnostic,
  CrucibleEffect,
  CrucibleEvent,
  CrucibleHistoryItem,
  CrucibleMaterialization,
  CrucibleMetricMap,
  CrucibleObservation,
  CrucibleProductDefinition,
  CrucibleProductState,
  CrucibleProjectionRow,
  CrucibleProjectionSpec,
  CrucibleRelationState,
  CrucibleRunState,
  CrucibleSelector
} from "./crucibleTypes"

const EPSILON = 1e-9

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function cloneMetrics(metrics: CrucibleMetricMap): CrucibleMetricMap {
  return { ...metrics }
}

function cloneHistory(
  history: readonly CrucibleHistoryItem[]
): CrucibleHistoryItem[] {
  return history.map((item) => ({
    ...item,
    sourceIds: item.sourceIds ? [...item.sourceIds] : undefined,
    productIds: item.productIds ? [...item.productIds] : undefined,
    relationIds: item.relationIds ? [...item.relationIds] : undefined,
    outletIds: item.outletIds ? [...item.outletIds] : undefined
  }))
}

/** Clone mutable run structures while intentionally retaining source datum references. */
export function cloneCrucibleState<TDatum extends Datum>(
  state: CrucibleRunState<TDatum>
): CrucibleRunState<TDatum> {
  const components = Object.fromEntries(
    Object.entries(state.components).map(([id, component]) => [
      id,
      {
        ...component,
        initialMetrics: cloneMetrics(component.initialMetrics),
        metrics: cloneMetrics(component.metrics),
        productIds: [...component.productIds],
        history: cloneHistory(component.history)
      }
    ])
  ) as Record<string, CrucibleComponentState<TDatum>>
  const products = Object.fromEntries(
    Object.entries(state.products).map(([id, product]) => [
      id,
      {
        ...product,
        metrics: cloneMetrics(product.metrics),
        sourceIds: [...product.sourceIds],
        history: cloneHistory(product.history)
      }
    ])
  ) as Record<string, CrucibleProductState>
  const relations = Object.fromEntries(
    Object.entries(state.relations).map(([id, relation]) => [
      id,
      {
        ...relation,
        sourceIds: [...relation.sourceIds],
        metrics: relation.metrics ? cloneMetrics(relation.metrics) : undefined
      }
    ])
  ) as Record<string, CrucibleRelationState>
  return {
    ...state,
    eventsApplied: [...state.eventsApplied],
    components,
    products,
    relations,
    input: {
      amount: state.input.amount,
      metrics: cloneMetrics(state.input.metrics)
    },
    metrics: cloneMetrics(state.metrics),
    loss: {
      amount: state.loss.amount,
      metrics: cloneMetrics(state.loss.metrics)
    },
    history: cloneHistory(state.history)
  }
}

function diagnostic(
  severity: CrucibleDiagnostic["severity"],
  code: string,
  message: string,
  path?: string,
  ids?: readonly string[]
): CrucibleDiagnostic {
  return {
    severity,
    code,
    message,
    path,
    ids: ids ? [...ids] : undefined
  }
}

function duplicateIds(ids: readonly string[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id)
    seen.add(id)
  }
  return [...duplicates].sort(compareIds)
}

function validateMetrics(
  metrics: CrucibleMetricMap | undefined,
  path: string
): CrucibleDiagnostic[] {
  if (!metrics) return []
  return Object.entries(metrics).flatMap(([key, value]) =>
    Number.isFinite(value)
      ? []
      : [
          diagnostic(
            "error",
            "invalid-metric",
            `Metric "${key}" must be a finite number.`,
            `${path}.${key}`
          )
        ]
  )
}

function addMetrics(target: CrucibleMetricMap, delta: CrucibleMetricMap): void {
  for (const [key, value] of Object.entries(delta)) {
    target[key] = Number(target[key] ?? 0) + value
  }
}

function sumComponentMetrics<TDatum extends Datum>(
  components: readonly CrucibleComponentState<TDatum>[]
): CrucibleMetricMap {
  const result: CrucibleMetricMap = {}
  for (const component of components) addMetrics(result, component.metrics)
  return result
}

export interface CrucibleSelectorResult {
  ids: string[]
  diagnostics: CrucibleDiagnostic[]
}

/** Resolve a source selector with deterministic intersection semantics. */
export function resolveCrucibleSelector<TDatum extends Datum>(
  state: CrucibleRunState<TDatum>,
  selector: CrucibleSelector,
  path = "selector"
): CrucibleSelectorResult {
  const diagnostics: CrucibleDiagnostic[] = []
  const components = Object.values(state.components)
  const known = new Set(components.map((component) => component.id))
  const missingIds = (selector.ids ?? []).filter((id) => !known.has(id))
  if (missingIds.length) {
    diagnostics.push(
      diagnostic(
        "error",
        "unknown-component",
        `Selector references unknown component id${missingIds.length === 1 ? "" : "s"}: ${missingIds.join(", ")}.`,
        `${path}.ids`,
        missingIds
      )
    )
  }
  if (
    selector.count !== undefined &&
    (!Number.isInteger(selector.count) || selector.count < 0)
  ) {
    diagnostics.push(
      diagnostic(
        "error",
        "invalid-selector-count",
        "Selector count must be a non-negative integer.",
        `${path}.count`
      )
    )
  }
  if (diagnostics.some((item) => item.severity === "error")) {
    return { ids: [], diagnostics }
  }

  const idSet = selector.ids ? new Set(selector.ids) : null
  const categorySet = selector.categories ? new Set(selector.categories) : null
  const statusSet = selector.statuses ? new Set(selector.statuses) : null
  const outletSet = selector.outletIds ? new Set(selector.outletIds) : null
  let ids = components
    .filter((component) => !idSet || idSet.has(component.id))
    .filter((component) => !categorySet || categorySet.has(component.category))
    .filter((component) => !statusSet || statusSet.has(component.status))
    .filter(
      (component) =>
        !outletSet ||
        (component.outletId !== undefined && outletSet.has(component.outletId))
    )
    .map((component) => component.id)
    .sort(compareIds)

  if (selector.count !== undefined) ids = ids.slice(0, selector.count)
  if (!ids.length) {
    diagnostics.push(
      diagnostic(
        "warning",
        "empty-selector",
        "Selector matched no source components.",
        path
      )
    )
  }
  return { ids, diagnostics }
}

interface EventTransaction<TDatum extends Datum> {
  state: CrucibleRunState<TDatum>
  event: CrucibleEvent
  context: CrucibleApplyContext
  productDefinitions: Map<string, CrucibleProductDefinition>
  outletIds: Set<string>
  diagnostics: CrucibleDiagnostic[]
  materializations: CrucibleMaterialization[]
  observations: CrucibleObservation[]
}

function historyItem(
  transaction: EventTransaction<Datum>,
  effect: CrucibleEffect,
  details: Partial<CrucibleHistoryItem> = {}
): CrucibleHistoryItem {
  return {
    eventId: transaction.event.id,
    effectType: effect.type,
    phaseId: transaction.context.phaseId,
    authoredAt: transaction.context.authoredAt,
    appliedAt: transaction.context.appliedAt,
    label: transaction.event.label,
    summary: transaction.event.summary,
    ...details
  }
}

function recordMaterialization<TDatum extends Datum>(
  transaction: EventTransaction<TDatum>,
  materialization: Omit<CrucibleMaterialization, "eventId">
): void {
  const item: CrucibleMaterialization = {
    ...materialization,
    eventId: transaction.event.id
  }
  transaction.materializations.push(item)
  transaction.observations.push({
    ...item,
    phaseId: transaction.context.phaseId,
    authoredAt: transaction.context.authoredAt,
    appliedAt: transaction.context.appliedAt
  })
}

function validateOutlet<TDatum extends Datum>(
  transaction: EventTransaction<TDatum>,
  outletId: string | undefined,
  path: string
): boolean {
  if (outletId === undefined || transaction.outletIds.has(outletId)) return true
  transaction.diagnostics.push(
    diagnostic(
      "error",
      "unknown-outlet",
      `Unknown outlet "${outletId}".`,
      path,
      [outletId]
    )
  )
  return false
}

function resolveSources<TDatum extends Datum>(
  transaction: EventTransaction<TDatum>,
  sourceIds: readonly string[],
  path: string
): CrucibleComponentState<TDatum>[] | null {
  const duplicates = duplicateIds(sourceIds)
  if (!sourceIds.length) {
    transaction.diagnostics.push(
      diagnostic(
        "error",
        "empty-source-list",
        "A product requires at least one source component.",
        path
      )
    )
  }
  if (duplicates.length) {
    transaction.diagnostics.push(
      diagnostic(
        "error",
        "duplicate-source",
        `Source ids may appear only once: ${duplicates.join(", ")}.`,
        path,
        duplicates
      )
    )
  }
  const missing = sourceIds.filter((id) => !transaction.state.components[id])
  if (missing.length) {
    transaction.diagnostics.push(
      diagnostic(
        "error",
        "unknown-component",
        `Unknown source component id${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`,
        path,
        missing
      )
    )
  }
  const assigned = sourceIds.filter(
    (id) => (transaction.state.components[id]?.productIds.length ?? 0) > 0
  )
  if (assigned.length) {
    transaction.diagnostics.push(
      diagnostic(
        "error",
        "source-already-assigned",
        `Source component${assigned.length === 1 ? " is" : "s are"} already assigned: ${assigned.join(", ")}.`,
        path,
        assigned
      )
    )
  }
  const unavailable = sourceIds.filter(
    (id) =>
      transaction.state.components[id]?.status === "consumed" &&
      !assigned.includes(id)
  )
  if (unavailable.length) {
    transaction.diagnostics.push(
      diagnostic(
        "error",
        "source-unavailable",
        `Consumed source component${unavailable.length === 1 ? " is" : "s are"} unavailable: ${unavailable.join(", ")}.`,
        path,
        unavailable
      )
    )
  }
  if (transaction.diagnostics.some((item) => item.severity === "error")) {
    return null
  }
  return sourceIds.map((id) => transaction.state.components[id])
}

function resolveRelationSources<TDatum extends Datum>(
  transaction: EventTransaction<TDatum>,
  sourceIds: readonly string[],
  path: string
): CrucibleComponentState<TDatum>[] | null {
  const duplicates = duplicateIds(sourceIds)
  const missing = sourceIds.filter((id) => !transaction.state.components[id])
  if (sourceIds.length < 2) {
    transaction.diagnostics.push(
      diagnostic(
        "error",
        "insufficient-relation-sources",
        "A relation requires at least two source components.",
        path
      )
    )
  }
  if (duplicates.length) {
    transaction.diagnostics.push(
      diagnostic(
        "error",
        "duplicate-source",
        `Relation source ids must be unique: ${duplicates.join(", ")}.`,
        path,
        duplicates
      )
    )
  }
  if (missing.length) {
    transaction.diagnostics.push(
      diagnostic(
        "error",
        "unknown-component",
        `Relation references unknown source component${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`,
        path,
        missing
      )
    )
  }
  if (transaction.diagnostics.some((item) => item.severity === "error")) {
    return null
  }
  return sourceIds.map((id) => transaction.state.components[id])
}

function validateLoss<TDatum extends Datum>(
  transaction: EventTransaction<TDatum>,
  amount: number,
  metrics: CrucibleMetricMap,
  loss: { amount?: number; metrics?: CrucibleMetricMap } | undefined,
  path: string
): boolean {
  const lossAmount = loss?.amount ?? 0
  if (
    !Number.isFinite(lossAmount) ||
    lossAmount < 0 ||
    lossAmount > amount + EPSILON
  ) {
    transaction.diagnostics.push(
      diagnostic(
        "error",
        "invalid-loss",
        "Loss amount must be finite, non-negative, and no greater than its sources.",
        `${path}.amount`
      )
    )
  }
  transaction.diagnostics.push(
    ...validateMetrics(loss?.metrics, `${path}.metrics`)
  )
  for (const [key, value] of Object.entries(loss?.metrics ?? {})) {
    if (value < 0 || value > Number(metrics[key] ?? 0) + EPSILON) {
      transaction.diagnostics.push(
        diagnostic(
          "error",
          "invalid-metric-loss",
          `Metric loss "${key}" must be non-negative and no greater than its sources.`,
          `${path}.metrics.${key}`
        )
      )
    }
  }
  return !transaction.diagnostics.some((item) => item.severity === "error")
}

function resolveBasisRelations<TDatum extends Datum>(
  transaction: EventTransaction<TDatum>,
  relationIds: readonly string[] | undefined,
  sourceIds: readonly string[],
  path: string
): CrucibleRelationState[] | null {
  if (!relationIds?.length) return []
  const duplicates = duplicateIds(relationIds)
  const missing = relationIds.filter((id) => !transaction.state.relations[id])
  const inactive = relationIds.filter(
    (id) => transaction.state.relations[id]?.status === "resolved"
  )
  const sourceSet = new Set(sourceIds)
  const outside = relationIds.filter((id) =>
    (transaction.state.relations[id]?.sourceIds ?? []).some(
      (sourceId) => !sourceSet.has(sourceId)
    )
  )
  if (duplicates.length) {
    transaction.diagnostics.push(
      diagnostic(
        "error",
        "duplicate-relation",
        "Basis relations must be unique.",
        path,
        duplicates
      )
    )
  }
  if (missing.length) {
    transaction.diagnostics.push(
      diagnostic(
        "error",
        "unknown-relation",
        `Unknown basis relation: ${missing.join(", ")}.`,
        path,
        missing
      )
    )
  }
  if (inactive.length) {
    transaction.diagnostics.push(
      diagnostic(
        "error",
        "resolved-relation",
        `Basis relation is already resolved: ${inactive.join(", ")}.`,
        path,
        inactive
      )
    )
  }
  if (outside.length) {
    transaction.diagnostics.push(
      diagnostic(
        "error",
        "relation-source-mismatch",
        `Basis relation includes a source outside this product: ${outside.join(", ")}.`,
        path,
        outside
      )
    )
  }
  if (transaction.diagnostics.some((item) => item.severity === "error"))
    return null
  return relationIds.map((id) => transaction.state.relations[id])
}

function resolveRelationsAsCombined<TDatum extends Datum>(
  transaction: EventTransaction<TDatum>,
  relations: readonly CrucibleRelationState[]
): void {
  if (!relations.length) return
  for (const relation of relations) {
    relation.status = "resolved"
    relation.resolution = "combined"
    relation.resolvedByEventId = transaction.event.id
    relation.resolvedAt = transaction.context.appliedAt
  }
  recordMaterialization(transaction, {
    type: "resolve-relation",
    relationIds: relations.map((relation) => relation.id)
  })
}

function applyProductLoss<TDatum extends Datum>(
  transaction: EventTransaction<TDatum>,
  productMetrics: CrucibleMetricMap,
  loss: { amount?: number; metrics?: CrucibleMetricMap } | undefined
): void {
  transaction.state.loss.amount += loss?.amount ?? 0
  for (const [key, value] of Object.entries(loss?.metrics ?? {})) {
    productMetrics[key] = Number(productMetrics[key] ?? 0) - value
    transaction.state.loss.metrics[key] =
      Number(transaction.state.loss.metrics[key] ?? 0) + value
  }
}

function productFromDefinition(
  definition: CrucibleProductDefinition,
  sourceIds: readonly string[],
  amount: number,
  metrics: CrucibleMetricMap,
  transaction: EventTransaction<Datum>,
  complete: boolean,
  history: CrucibleHistoryItem
): CrucibleProductState {
  const resolvedAmount =
    complete && definition.amount !== undefined ? definition.amount : amount
  return {
    id: definition.id,
    label: definition.label ?? definition.id,
    description: definition.description,
    category: definition.category ?? "product",
    color: definition.color,
    order: definition.order,
    declaredAmount: definition.amount,
    amount: resolvedAmount,
    metrics:
      complete && definition.metrics
        ? { ...metrics, ...definition.metrics }
        : metrics,
    status: complete ? "complete" : "forming",
    sourceIds: [...sourceIds],
    outletId: complete
      ? (definition.outletId ??
        (transaction.outletIds.has("product") ? "product" : undefined))
      : undefined,
    createdByEventId: transaction.event.id,
    createdAt: transaction.context.appliedAt,
    completedByEventId: complete ? transaction.event.id : undefined,
    completedAt: complete ? transaction.context.appliedAt : undefined,
    history: [history]
  }
}

function warnDeclaredAmount<TDatum extends Datum>(
  transaction: EventTransaction<TDatum>,
  definition: CrucibleProductDefinition,
  observedAmount: number,
  path: string
): void {
  if (
    definition.amount !== undefined &&
    Math.abs(definition.amount - observedAmount) > EPSILON
  ) {
    transaction.diagnostics.push(
      diagnostic(
        "warning",
        "declared-product-amount-mismatch",
        `Product "${definition.id}" declares ${definition.amount}, while its sources yield ${observedAmount}.`,
        path,
        [definition.id]
      )
    )
  }
}

function completeProduct<TDatum extends Datum>(
  transaction: EventTransaction<TDatum>,
  product: CrucibleProductState,
  outletOverride: string | undefined,
  reason: string | undefined,
  effect: CrucibleEffect,
  path: string
): void {
  const definition = transaction.productDefinitions.get(product.id)
  const outletId =
    outletOverride ??
    definition?.outletId ??
    (transaction.outletIds.has("product") ? "product" : undefined)
  if (!validateOutlet(transaction, outletId, `${path}.outletId`)) return
  if (product.status === "complete") {
    transaction.diagnostics.push(
      diagnostic(
        "error",
        "product-already-complete",
        `Product "${product.id}" is already complete.`,
        path,
        [product.id]
      )
    )
    return
  }
  if (definition) {
    warnDeclaredAmount(
      transaction,
      definition,
      product.amount,
      `${path}.productId`
    )
    if (definition.amount !== undefined) product.amount = definition.amount
    if (definition.metrics)
      product.metrics = { ...product.metrics, ...definition.metrics }
  }
  product.status = "complete"
  product.outletId = outletId
  product.reason = reason
  product.completedByEventId = transaction.event.id
  product.completedAt = transaction.context.appliedAt
  const item = historyItem(transaction as EventTransaction<Datum>, effect, {
    sourceIds: [...product.sourceIds],
    productIds: [product.id],
    outletIds: outletId ? [outletId] : undefined
  })
  product.history.push(item)
  transaction.state.history.push(item)
  recordMaterialization(transaction, {
    type: "complete-product",
    sourceIds: [...product.sourceIds],
    productIds: [product.id],
    outletIds: outletId ? [outletId] : undefined
  })
}

function applyEffect<TDatum extends Datum>(
  transaction: EventTransaction<TDatum>,
  effect: CrucibleEffect,
  effectIndex: number
): void {
  const path = `events.${transaction.event.id}.effects.${effectIndex}`
  const state = transaction.state

  if (effect.type === "set-state") {
    if (
      ![
        "queued",
        "active",
        "transformed",
        "retained",
        "ejected",
        "failed",
        "recovered"
      ].includes(effect.state)
    ) {
      transaction.diagnostics.push(
        diagnostic(
          "error",
          "invalid-component-state",
          `set-state cannot assign "${String(effect.state)}".`,
          `${path}.state`
        )
      )
    }
    transaction.diagnostics.push(
      ...validateMetrics(effect.metricsDelta, `${path}.metricsDelta`)
    )
    validateOutlet(transaction, effect.outletId, `${path}.outletId`)
    const selected = resolveCrucibleSelector(
      state,
      effect.select,
      `${path}.select`
    )
    transaction.diagnostics.push(...selected.diagnostics)
    const assigned = selected.ids.filter(
      (id) => state.components[id].productIds.length
    )
    if (assigned.length) {
      transaction.diagnostics.push(
        diagnostic(
          "error",
          "source-already-assigned",
          `Assigned source components cannot be retargeted: ${assigned.join(", ")}.`,
          `${path}.select`,
          assigned
        )
      )
    }
    if (transaction.diagnostics.some((item) => item.severity === "error"))
      return
    const item = historyItem(transaction as EventTransaction<Datum>, effect, {
      sourceIds: selected.ids,
      outletIds: effect.outletId ? [effect.outletId] : undefined
    })
    for (const id of selected.ids) {
      const component = state.components[id]
      component.status = effect.state
      component.outletId = effect.outletId
      component.reason = effect.reason
      if (effect.metricsDelta)
        addMetrics(component.metrics, effect.metricsDelta)
      component.history.push(item)
    }
    state.history.push(item)
    if (selected.ids.length) {
      recordMaterialization(transaction, {
        type: "retarget-component",
        sourceIds: selected.ids,
        outletIds: effect.outletId ? [effect.outletId] : undefined
      })
    }
    return
  }

  if (effect.type === "set-relation") {
    const { relation } = effect
    if (!relation.id || state.relations[relation.id]) {
      transaction.diagnostics.push(
        diagnostic(
          "error",
          "duplicate-relation",
          `Relation id "${relation.id}" is missing or already active.`,
          `${path}.relation.id`,
          [relation.id]
        )
      )
    }
    const sources = resolveRelationSources(
      transaction,
      relation.sourceIds,
      `${path}.relation.sourceIds`
    )
    transaction.diagnostics.push(
      ...validateMetrics(relation.metrics, `${path}.relation.metrics`)
    )
    if (
      !sources ||
      transaction.diagnostics.some((item) => item.severity === "error")
    )
      return
    state.relations[relation.id] = {
      ...relation,
      sourceIds: [...relation.sourceIds],
      metrics: relation.metrics ? { ...relation.metrics } : undefined,
      status: "active",
      createdByEventId: transaction.event.id,
      createdAt: transaction.context.appliedAt
    }
    const item = historyItem(transaction as EventTransaction<Datum>, effect, {
      sourceIds: [...relation.sourceIds],
      relationIds: [relation.id]
    })
    state.history.push(item)
    recordMaterialization(transaction, {
      type: "activate-relation",
      sourceIds: [...relation.sourceIds],
      relationIds: [relation.id]
    })
    return
  }

  if (effect.type === "resolve-relation") {
    const duplicates = duplicateIds(effect.relationIds)
    const missing = effect.relationIds.filter((id) => !state.relations[id])
    const resolved = effect.relationIds.filter(
      (id) => state.relations[id]?.status === "resolved"
    )
    if (duplicates.length)
      transaction.diagnostics.push(
        diagnostic(
          "error",
          "duplicate-relation",
          "Relation ids must be unique.",
          `${path}.relationIds`,
          duplicates
        )
      )
    if (missing.length)
      transaction.diagnostics.push(
        diagnostic(
          "error",
          "unknown-relation",
          `Unknown relation: ${missing.join(", ")}.`,
          `${path}.relationIds`,
          missing
        )
      )
    if (resolved.length)
      transaction.diagnostics.push(
        diagnostic(
          "error",
          "resolved-relation",
          `Relation is already resolved: ${resolved.join(", ")}.`,
          `${path}.relationIds`,
          resolved
        )
      )
    if (transaction.diagnostics.some((item) => item.severity === "error"))
      return
    for (const id of effect.relationIds) {
      const relation = state.relations[id]
      relation.status = "resolved"
      relation.resolution = effect.resolution
      relation.resolvedByEventId = transaction.event.id
      relation.resolvedAt = transaction.context.appliedAt
      relation.reason = effect.reason
    }
    const item = historyItem(transaction as EventTransaction<Datum>, effect, {
      relationIds: [...effect.relationIds]
    })
    state.history.push(item)
    recordMaterialization(transaction, {
      type: "resolve-relation",
      relationIds: [...effect.relationIds]
    })
    return
  }

  if (effect.type === "combine" || effect.type === "contribute") {
    const definition = transaction.productDefinitions.get(effect.productId)
    if (!definition) {
      transaction.diagnostics.push(
        diagnostic(
          "error",
          "unknown-product",
          `Product "${effect.productId}" has no declared mold.`,
          `${path}.productId`,
          [effect.productId]
        )
      )
    }
    const existing = state.products[effect.productId]
    if (effect.type === "combine" && existing) {
      transaction.diagnostics.push(
        diagnostic(
          "error",
          "duplicate-product",
          `Product "${effect.productId}" has already been formed.`,
          `${path}.productId`,
          [effect.productId]
        )
      )
    }
    if (
      effect.type === "contribute" &&
      (!existing || existing.status !== "forming")
    ) {
      transaction.diagnostics.push(
        diagnostic(
          "error",
          "product-not-forming",
          `Contributions require an existing forming product "${effect.productId}".`,
          `${path}.productId`,
          [effect.productId]
        )
      )
    }
    const sources = resolveSources(
      transaction,
      effect.sourceIds,
      `${path}.sourceIds`
    )
    const basisSourceIds =
      effect.type === "contribute" && existing
        ? [...existing.sourceIds, ...effect.sourceIds]
        : effect.sourceIds
    const relations = resolveBasisRelations(
      transaction,
      effect.basisRelationIds,
      basisSourceIds,
      `${path}.basisRelationIds`
    )
    if (
      !sources ||
      !relations ||
      !definition ||
      transaction.diagnostics.some((item) => item.severity === "error")
    )
      return
    const sourceAmount = sources.reduce((sum, source) => sum + source.amount, 0)
    const sourceMetrics = sumComponentMetrics(sources)
    if (
      !validateLoss(
        transaction,
        sourceAmount,
        sourceMetrics,
        effect.loss,
        `${path}.loss`
      )
    )
      return
    const contributionAmount = sourceAmount - (effect.loss?.amount ?? 0)
    applyProductLoss(transaction, sourceMetrics, effect.loss)
    const complete = effect.type === "combine" && effect.complete !== false
    const item = historyItem(transaction as EventTransaction<Datum>, effect, {
      sourceIds: [...effect.sourceIds],
      productIds: [effect.productId],
      relationIds: effect.basisRelationIds
        ? [...effect.basisRelationIds]
        : undefined
    })
    let product: CrucibleProductState
    if (effect.type === "combine") {
      if (complete)
        warnDeclaredAmount(
          transaction,
          definition,
          contributionAmount,
          `${path}.productId`
        )
      product = productFromDefinition(
        definition,
        effect.sourceIds,
        contributionAmount,
        sourceMetrics,
        transaction as EventTransaction<Datum>,
        complete,
        item
      )
      if (
        complete &&
        !validateOutlet(transaction, product.outletId, `${path}.productId`)
      )
        return
      state.products[effect.productId] = product
    } else {
      product = existing
      product.sourceIds.push(...effect.sourceIds)
      product.amount += contributionAmount
      addMetrics(product.metrics, sourceMetrics)
      product.history.push(item)
    }
    for (const source of sources) {
      source.productIds = [effect.productId]
      source.status = "consumed"
      source.outletId = undefined
      source.history.push(item)
    }
    state.history.push(item)
    resolveRelationsAsCombined(transaction, relations)
    recordMaterialization(transaction, {
      type: effect.type === "combine" ? "form-product" : "update-product",
      sourceIds: [...effect.sourceIds],
      productIds: [effect.productId],
      relationIds: effect.basisRelationIds
        ? [...effect.basisRelationIds]
        : undefined,
      outletIds: product.outletId ? [product.outletId] : undefined
    })
    if (complete) {
      recordMaterialization(transaction, {
        type: "complete-product",
        sourceIds: [...product.sourceIds],
        productIds: [product.id],
        outletIds: product.outletId ? [product.outletId] : undefined
      })
    }
    return
  }

  if (effect.type === "complete-product") {
    const product = state.products[effect.productId]
    if (!product) {
      transaction.diagnostics.push(
        diagnostic(
          "error",
          "unknown-product-state",
          `Product "${effect.productId}" has not been formed.`,
          `${path}.productId`,
          [effect.productId]
        )
      )
      return
    }
    completeProduct(
      transaction,
      product,
      effect.outletId,
      effect.reason,
      effect,
      path
    )
    return
  }

  if (effect.type === "split") {
    const sources = resolveSources(
      transaction,
      [effect.sourceId],
      `${path}.sourceId`
    )
    if (!effect.products.length) {
      transaction.diagnostics.push(
        diagnostic(
          "error",
          "empty-split",
          "A split requires at least one product allocation.",
          `${path}.products`
        )
      )
    }
    const productIds = effect.products.map((allocation) => allocation.productId)
    const duplicates = duplicateIds(productIds)
    if (duplicates.length)
      transaction.diagnostics.push(
        diagnostic(
          "error",
          "duplicate-product",
          "Split product ids must be unique.",
          `${path}.products`,
          duplicates
        )
      )
    const definitions = productIds.map((id) =>
      transaction.productDefinitions.get(id)
    )
    const unknown = productIds.filter((id, index) => !definitions[index])
    const existing = productIds.filter((id) => state.products[id])
    if (unknown.length)
      transaction.diagnostics.push(
        diagnostic(
          "error",
          "unknown-product",
          `Split references undeclared product molds: ${unknown.join(", ")}.`,
          `${path}.products`,
          unknown
        )
      )
    if (existing.length)
      transaction.diagnostics.push(
        diagnostic(
          "error",
          "duplicate-product",
          `Split products already exist: ${existing.join(", ")}.`,
          `${path}.products`,
          existing
        )
      )
    for (const [index, allocation] of effect.products.entries()) {
      if (
        allocation.amount !== undefined &&
        (!Number.isFinite(allocation.amount) || allocation.amount < 0)
      ) {
        transaction.diagnostics.push(
          diagnostic(
            "error",
            "invalid-product-amount",
            "Split allocation amounts must be finite and non-negative.",
            `${path}.products.${index}.amount`
          )
        )
      }
      transaction.diagnostics.push(
        ...validateMetrics(
          allocation.metrics,
          `${path}.products.${index}.metrics`
        )
      )
    }
    if (
      !sources?.length ||
      transaction.diagnostics.some((item) => item.severity === "error")
    )
      return
    const source = sources[0]
    if (
      !validateLoss(
        transaction,
        source.amount,
        source.metrics,
        effect.loss,
        `${path}.loss`
      )
    )
      return
    const availableAmount = source.amount - (effect.loss?.amount ?? 0)
    const authoredAmounts = effect.products.map(
      (allocation, index) => allocation.amount ?? definitions[index]?.amount
    )
    const suppliedCount = authoredAmounts.filter(
      (value) => value !== undefined
    ).length
    if (suppliedCount !== 0 && suppliedCount !== authoredAmounts.length) {
      transaction.diagnostics.push(
        diagnostic(
          "error",
          "partial-split-allocation",
          "Either every split product must declare an amount or none may do so.",
          `${path}.products`
        )
      )
      return
    }
    const amounts = suppliedCount
      ? (authoredAmounts as number[])
      : effect.products.map(() => availableAmount / effect.products.length)
    const allocatedAmount = amounts.reduce((sum, amount) => sum + amount, 0)
    if (Math.abs(allocatedAmount - availableAmount) > EPSILON) {
      transaction.diagnostics.push(
        diagnostic(
          "error",
          "split-amount-mismatch",
          `Split allocations total ${allocatedAmount}, but ${availableAmount} remains after loss.`,
          `${path}.products`
        )
      )
      return
    }
    const availableMetrics = { ...source.metrics }
    for (const [key, value] of Object.entries(effect.loss?.metrics ?? {}))
      availableMetrics[key] = Number(availableMetrics[key] ?? 0) - value
    const item = historyItem(transaction as EventTransaction<Datum>, effect, {
      sourceIds: [source.id],
      productIds
    })
    effect.products.forEach((allocation, index) => {
      const definition = definitions[index] as CrucibleProductDefinition
      const share =
        availableAmount > EPSILON
          ? amounts[index] / availableAmount
          : 1 / effect.products.length
      const sharedMetrics = Object.fromEntries(
        Object.entries(availableMetrics).map(([key, value]) => [
          key,
          value * share
        ])
      )
      const metrics = allocation.metrics ?? definition.metrics ?? sharedMetrics
      const product = productFromDefinition(
        { ...definition, amount: amounts[index], metrics },
        [source.id],
        amounts[index],
        { ...metrics },
        transaction as EventTransaction<Datum>,
        true,
        item
      )
      if (
        !validateOutlet(
          transaction,
          product.outletId,
          `${path}.products.${index}.productId`
        )
      )
        return
      state.products[product.id] = product
    })
    if (transaction.diagnostics.some((entry) => entry.severity === "error"))
      return
    source.productIds = productIds
    source.status = "consumed"
    source.outletId = undefined
    source.history.push(item)
    state.loss.amount += effect.loss?.amount ?? 0
    for (const [key, value] of Object.entries(effect.loss?.metrics ?? {})) {
      state.loss.metrics[key] = Number(state.loss.metrics[key] ?? 0) + value
    }
    state.history.push(item)
    recordMaterialization(transaction, {
      type: "split-source",
      sourceIds: [source.id],
      productIds
    })
    for (const productId of productIds) {
      recordMaterialization(transaction, {
        type: "complete-product",
        sourceIds: [source.id],
        productIds: [productId],
        outletIds: state.products[productId].outletId
          ? [state.products[productId].outletId as string]
          : undefined
      })
    }
    return
  }

  if (effect.type === "eject") {
    validateOutlet(transaction, effect.outletId, `${path}.outletId`)
    const selected = resolveCrucibleSelector(
      state,
      effect.select,
      `${path}.select`
    )
    transaction.diagnostics.push(...selected.diagnostics)
    const assigned = selected.ids.filter(
      (id) => state.components[id].productIds.length
    )
    if (assigned.length)
      transaction.diagnostics.push(
        diagnostic(
          "error",
          "source-already-assigned",
          `Assigned source components cannot be ejected: ${assigned.join(", ")}.`,
          `${path}.select`,
          assigned
        )
      )
    if (transaction.diagnostics.some((item) => item.severity === "error"))
      return
    const item = historyItem(transaction as EventTransaction<Datum>, effect, {
      sourceIds: selected.ids,
      outletIds: [effect.outletId]
    })
    for (const id of selected.ids) {
      const component = state.components[id]
      component.status = effect.state ?? "ejected"
      component.outletId = effect.outletId
      component.reason = effect.reason
      component.history.push(item)
    }
    state.history.push(item)
    if (selected.ids.length)
      recordMaterialization(transaction, {
        type: "retarget-component",
        sourceIds: selected.ids,
        outletIds: [effect.outletId]
      })
    return
  }

  if (effect.type === "set-metric") {
    transaction.diagnostics.push(
      ...validateMetrics(effect.metricsDelta, `${path}.metricsDelta`)
    )
    if (transaction.diagnostics.some((item) => item.severity === "error"))
      return
    let sourceIds: string[] | undefined
    let productIds: string[] | undefined
    if (effect.target === "run") {
      addMetrics(state.metrics, effect.metricsDelta)
    } else if ("components" in effect.target) {
      const selected = resolveCrucibleSelector(
        state,
        effect.target.components,
        `${path}.target.components`
      )
      transaction.diagnostics.push(...selected.diagnostics)
      if (transaction.diagnostics.some((item) => item.severity === "error"))
        return
      sourceIds = selected.ids
      for (const id of selected.ids)
        addMetrics(state.components[id].metrics, effect.metricsDelta)
    } else {
      productIds = [...effect.target.productIds]
      const duplicates = duplicateIds(productIds)
      const missing = productIds.filter((id) => !state.products[id])
      if (duplicates.length)
        transaction.diagnostics.push(
          diagnostic(
            "error",
            "duplicate-product",
            "Metric target product ids must be unique.",
            `${path}.target.productIds`,
            duplicates
          )
        )
      if (missing.length)
        transaction.diagnostics.push(
          diagnostic(
            "error",
            "unknown-product-state",
            `Metric target product has not formed: ${missing.join(", ")}.`,
            `${path}.target.productIds`,
            missing
          )
        )
      if (transaction.diagnostics.some((item) => item.severity === "error"))
        return
      for (const id of productIds)
        addMetrics(state.products[id].metrics, effect.metricsDelta)
    }
    state.history.push(
      historyItem(transaction as EventTransaction<Datum>, effect, {
        sourceIds,
        productIds
      })
    )
    return
  }

  if (!effect.outcome.trim()) {
    transaction.diagnostics.push(
      diagnostic(
        "error",
        "invalid-outcome",
        "Outcome must be a non-empty string.",
        `${path}.outcome`
      )
    )
    return
  }
  state.outcome = effect.outcome
  state.summary = effect.summary
  state.history.push(
    historyItem(transaction as EventTransaction<Datum>, effect)
  )
  transaction.observations.push({
    type: "crucible-outcome",
    eventId: transaction.event.id,
    phaseId: transaction.context.phaseId,
    authoredAt: transaction.context.authoredAt,
    appliedAt: transaction.context.appliedAt,
    outcome: effect.outcome
  })
}

/**
 * Apply one event atomically. Any error rolls back all state,
 * materializations, and observations produced by that event.
 */
export function applyCrucibleEvent<TDatum extends Datum>(
  state: CrucibleRunState<TDatum>,
  event: CrucibleEvent,
  context: CrucibleApplyContext
): CrucibleApplyResult<TDatum> {
  if (state.eventsApplied.includes(event.id)) {
    return {
      applied: false,
      state,
      materializations: [],
      observations: [],
      diagnostics: [
        diagnostic(
          "warning",
          "duplicate-event-application",
          `Event "${event.id}" has already been applied.`,
          `events.${event.id}`,
          [event.id]
        )
      ]
    }
  }
  const working = cloneCrucibleState(state)
  const transaction: EventTransaction<TDatum> = {
    state: working,
    event,
    context,
    productDefinitions: new Map(
      context.products.map((product) => [product.id, product])
    ),
    outletIds: new Set(context.outlets.map((outlet) => outlet.id)),
    diagnostics: [],
    materializations: [],
    observations: []
  }
  for (const [index, effect] of event.effects.entries()) {
    applyEffect(transaction, effect, index)
    if (transaction.diagnostics.some((item) => item.severity === "error")) {
      return {
        applied: false,
        state,
        materializations: [],
        observations: [],
        diagnostics: transaction.diagnostics
      }
    }
  }
  working.elapsed = Math.max(working.elapsed, context.appliedAt)
  working.phaseId = context.phaseId
  working.eventsApplied.push(event.id)
  transaction.observations.unshift({
    type: "crucible-event",
    eventId: event.id,
    phaseId: context.phaseId,
    authoredAt: context.authoredAt,
    appliedAt: context.appliedAt
  })
  return {
    applied: true,
    state: working,
    materializations: transaction.materializations,
    observations: transaction.observations,
    diagnostics: transaction.diagnostics
  }
}

function projectionKey(
  item: {
    kind: "component" | "product"
    id: string
    status: string
    outletId?: string
    category: string
  },
  groupBy: NonNullable<CrucibleProjectionSpec["groupBy"]>
): string {
  if (groupBy === "product")
    return item.kind === "product" ? item.id : "unassigned"
  if (groupBy === "outlet") return item.outletId ?? "unassigned"
  if (groupBy === "category") return item.category
  return item.status
}

/** Settled semantic rows; consumed source bodies are represented by products only. */
export function buildCrucibleProjection<TDatum extends Datum>(
  state: CrucibleRunState<TDatum>,
  spec: CrucibleProjectionSpec = {}
): CrucibleProjectionRow[] {
  const groupBy = spec.groupBy ?? "outlet"
  const rows = new Map<string, CrucibleProjectionRow>()
  const add = (item: {
    kind: "component" | "product"
    id: string
    label: string
    status: CrucibleProjectionRow["status"]
    outletId?: string
    category: string
    amount: number
    metrics: CrucibleMetricMap
  }) => {
    const key = projectionKey(
      { ...item, status: item.status ?? "active" },
      groupBy
    )
    const existing = rows.get(key)
    if (existing) {
      existing.count += 1
      existing.amount += item.amount
      addMetrics(existing.metrics, item.metrics)
      return
    }
    rows.set(key, {
      key,
      label:
        groupBy === "product" && item.kind === "product" ? item.label : key,
      count: 1,
      amount: item.amount,
      metrics: { ...item.metrics },
      status: groupBy === "status" ? item.status : undefined,
      outletId: groupBy === "outlet" ? item.outletId : undefined,
      category: groupBy === "category" ? item.category : undefined,
      productId:
        groupBy === "product" && item.kind === "product" ? item.id : undefined
    })
  }
  for (const component of Object.values(state.components)) {
    if (component.productIds.length || component.status === "consumed") continue
    add({
      kind: "component",
      id: component.id,
      label: component.label,
      status: component.status,
      outletId: component.outletId,
      category: component.category,
      amount: component.amount,
      metrics: component.metrics
    })
  }
  for (const product of Object.values(state.products)) {
    add({
      kind: "product",
      id: product.id,
      label: product.label,
      status: product.status,
      outletId: product.outletId,
      category: product.category,
      amount: product.amount,
      metrics: product.metrics
    })
  }
  const order = new Map((spec.order ?? []).map((key, index) => [key, index]))
  return [...rows.values()].sort(
    (a, b) =>
      (order.get(a.key) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(b.key) ?? Number.MAX_SAFE_INTEGER) ||
      compareIds(a.key, b.key)
  )
}

/** Normative projection-name alias used by server and AI chart builders. */
export const crucibleProjectionRows = buildCrucibleProjection

/** Products + still-independent components + declared loss must equal input. */
export function evaluateCrucibleConservation<TDatum extends Datum>(
  state: CrucibleRunState<TDatum>,
  spec: CrucibleConservationSpec = {}
): CrucibleConservationResult {
  const field = spec.field ?? "amount"
  const value = (item: { amount: number; metrics: CrucibleMetricMap }) =>
    field === "amount" ? item.amount : Number(item.metrics[field] ?? 0)
  const input =
    field === "amount"
      ? state.input.amount
      : Number(state.input.metrics[field] ?? 0)
  const products = Object.values(state.products).reduce(
    (sum, product) => sum + value(product),
    0
  )
  const unassigned = Object.values(state.components)
    .filter(
      (component) =>
        !component.productIds.length && component.status !== "consumed"
    )
    .reduce((sum, component) => sum + value(component), 0)
  const loss =
    field === "amount"
      ? state.loss.amount
      : Number(state.loss.metrics[field] ?? 0)
  const output = products + unassigned + loss
  const delta = output - input
  const tolerance = Math.max(0, spec.tolerance ?? 1e-6)
  return {
    field,
    input,
    products,
    unassigned,
    loss,
    output,
    delta,
    conserved: Math.abs(delta) <= tolerance
  }
}

export function buildCrucibleEvidence<TDatum extends Datum>(
  state: CrucibleRunState<TDatum>,
  options: {
    projection?: CrucibleProjectionSpec
    conservation?: CrucibleConservationSpec
  } = {}
): {
  history: CrucibleHistoryItem[]
  projection: CrucibleProjectionRow[]
  conservation: CrucibleConservationResult
} {
  return {
    history: cloneHistory(state.history),
    projection: buildCrucibleProjection(state, options.projection),
    conservation: evaluateCrucibleConservation(state, options.conservation)
  }
}
