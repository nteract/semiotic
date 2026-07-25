import type { SerializedSelections } from "../export/selectionSerializer"
import type { ChartObservation } from "../store/ObservationStore"
import {
  clock,
  findTreeNode,
  matchFromNode,
} from "./vacpAdapterModel"
import { safeRecord } from "./vacpAdapterRuntime"
import type {
  CreateSemioticVACPBridgeOptions,
  RuntimeModelBase,
  SemioticVACPRefs,
} from "./vacpAdapterTypes"
import {
  VACP_SCHEMA_VERSION,
  type VacpRef,
  type VacpStateSnapshot,
} from "./vacpTypes"

function latestObservation(
  observations: readonly ChartObservation[],
  chartId: string
): ChartObservation | undefined {
  for (let index = observations.length - 1; index >= 0; index--) {
    const observation = observations[index]
    if (observation.chartId === chartId) return observation
  }
  return undefined
}

export function buildStateSnapshot(
  model: RuntimeModelBase,
  options: CreateSemioticVACPBridgeOptions,
  refs: SemioticVACPRefs
): VacpStateSnapshot {
  const state = {} as Record<VacpRef, unknown>
  const summary = {} as Record<VacpRef, unknown>
  const serializedSelections = options.getSelections?.() ?? {}
  const observations = options.getObservations?.() ?? []

  for (const chart of model.charts) {
    state[chart.ref] = safeRecord({
      component: chart.chart.component,
      description: chart.grounding.description,
      intent: chart.grounding.intent,
      physics: chart.grounding.physics,
      audience: chart.chart.audience,
    })
    state[chart.configRef] = chart.config
    summary[chart.ref] = {
      component: chart.chart.component,
      dataHandles: chart.dataHandles.length,
    }

    for (const handle of chart.dataHandles) {
      state[handle.ref] = {
        kind: "DataHandle",
        collection: handle.collection,
        rowCount: handle.rows.length,
      }
      summary[handle.ref] = { rowCount: handle.rows.length }
    }

    if (chart.navigation) {
      const active = findTreeNode(
        chart.navigation.binding.tree,
        chart.navigation.binding.activeId
      )
      const match = active
        ? matchFromNode(active, chart.navigation.index.matchFields)
        : undefined
      state[chart.navigation.ref] = safeRecord({
        kind: "Selection",
        status: chart.navigation.index.valid ? "ready" : "ambiguous",
        activeRole: active?.role,
        activeLabel: active?.label,
        activeMatch: match,
        activeTargetRef: match
          ? chart.navigation.index.targetRef(match)
          : undefined,
        diagnostic: chart.navigation.index.diagnostic,
      })
      summary[chart.navigation.ref] = {
        targetCount: chart.navigation.index.byKey.size,
      }
    }

    if (options.getObservations) {
      const observation = latestObservation(observations, chart.chart.chartId)
      state[refs.observation(chart.chart.chartId)] = observation
        ? safeRecord(observation)
        : null
      if (observation) {
        summary[refs.observation(chart.chart.chartId)] = {
          type: observation.type,
          timestamp: observation.timestamp,
        }
      }
    }
  }

  for (const selection of model.selections) {
    const current = serializedSelections[selection.name]
    state[selection.ref] =
      (current ? safeRecord(current) : undefined) ??
      ({
        name: selection.name,
        resolution: "union",
        clauses: [],
      } satisfies SerializedSelections[string])
    summary[selection.ref] = {
      active: !!current?.clauses.length,
      clauseCount: current?.clauses.length ?? 0,
      fields: selection.fields,
    }
  }

  return {
    version: VACP_SCHEMA_VERSION,
    createdAt: clock(options),
    state,
    ...(Object.keys(summary).length ? { summary } : {}),
  }
}
