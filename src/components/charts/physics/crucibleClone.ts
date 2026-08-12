import type { Datum } from "../shared/datumTypes"
import { createCrucibleRecord, mergeCrucibleRecords } from "./crucibleRecord"
import type {
  CrucibleHistoryItem,
  CrucibleMetricMap,
  CrucibleRunState
} from "./crucibleTypes"

export function cloneCrucibleMetrics(
  metrics: CrucibleMetricMap
): CrucibleMetricMap {
  return mergeCrucibleRecords(metrics)
}

export function cloneCrucibleHistory(
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
  const components = createCrucibleRecord(
    Object.entries(state.components).map(([id, component]) => [
      id,
      {
        ...component,
        initialMetrics: cloneCrucibleMetrics(component.initialMetrics),
        metrics: cloneCrucibleMetrics(component.metrics),
        productIds: [...component.productIds],
        history: cloneCrucibleHistory(component.history)
      }
    ])
  )
  const products = createCrucibleRecord(
    Object.entries(state.products).map(([id, product]) => [
      id,
      {
        ...product,
        metrics: cloneCrucibleMetrics(product.metrics),
        sourceIds: [...product.sourceIds],
        history: cloneCrucibleHistory(product.history)
      }
    ])
  )
  const relations = createCrucibleRecord(
    Object.entries(state.relations).map(([id, relation]) => [
      id,
      {
        ...relation,
        sourceIds: [...relation.sourceIds],
        metrics: relation.metrics
          ? cloneCrucibleMetrics(relation.metrics)
          : undefined
      }
    ])
  )
  return {
    ...state,
    eventsApplied: [...state.eventsApplied],
    components,
    products,
    relations,
    input: {
      amount: state.input.amount,
      metrics: cloneCrucibleMetrics(state.input.metrics)
    },
    metrics: cloneCrucibleMetrics(state.metrics),
    loss: {
      amount: state.loss.amount,
      metrics: cloneCrucibleMetrics(state.loss.metrics)
    },
    history: cloneCrucibleHistory(state.history)
  }
}
