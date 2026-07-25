"use client"

import { useEffect, useRef } from "react"
import { serializeSelections } from "../export/selectionSerializer"
import {
  useObservationSelector,
  type ChartObservation,
} from "../store/ObservationStore"
import {
  useSelectionSelector,
  type FieldSelection,
  type SelectionStoreState,
} from "../store/SelectionStore"
import {
  createSemioticVACPBridge,
  installSemioticVACPBridge,
  type CreateSemioticVACPBridgeOptions,
  type SemioticVACPBridgeInstallation,
} from "./vacpAdapter"

type StoreBackedBridgeOption =
  | "getSelections"
  | "getObservations"
  | "selectionActions"

export interface SemioticVACPBridgeProps
  extends Omit<CreateSemioticVACPBridgeOptions, StoreBackedBridgeOption> {
  /** Global property used for installation. Default `__vacp`. */
  globalKey?: string
  /** Receives either the successful installation or its refusal result. */
  onInstallationChange?: (
    installation: SemioticVACPBridgeInstallation
  ) => void
}

interface LiveBridgeValues extends SemioticVACPBridgeProps {
  selections: SelectionStoreState["selections"]
  setClause: SelectionStoreState["setClause"]
  clearSelection: SelectionStoreState["clearSelection"]
  observations: ChartObservation[]
  observationVersion: number
}

function pointFields(
  fields: Record<string, unknown[]>
): Record<string, FieldSelection> {
  const result = Object.create(null) as Record<string, FieldSelection>
  for (const [field, values] of Object.entries(fields)) {
    result[field] = { type: "point", values: new Set(values) }
  }
  return result
}

function intervalFields(
  fields: Record<string, [number, number]>
): Record<string, FieldSelection> {
  const result = Object.create(null) as Record<string, FieldSelection>
  for (const [field, range] of Object.entries(fields)) {
    result[field] = { type: "interval", range: [range[0], range[1]] }
  }
  return result
}

/**
 * Installs a live VACP bridge for the nearest LinkedCharts stores.
 *
 * Render this component inside the same `<LinkedCharts>` instance as the
 * charts it describes. That ensures agent mutations and human observations
 * share the same SelectionStore and ObservationStore. The component renders
 * no DOM, and installation only runs after a client commit.
 *
 * `appId`, `viewId`, `globalKey`, and `stateCacheSize` establish the mounted
 * bridge's identity/lifecycle. Remount to change them. Other protocol inputs
 * are read live without replacing the installed bridge.
 */
export function SemioticVACPBridge(props: SemioticVACPBridgeProps): null {
  const selections = useSelectionSelector((state) => state.selections)
  const setClause = useSelectionSelector((state) => state.setClause)
  const clearSelection = useSelectionSelector(
    (state) => state.clearSelection
  )
  const observations = useObservationSelector(
    (state) => state.observations
  )
  const observationVersion = useObservationSelector(
    (state) => state.version
  )

  const liveValues = useRef<LiveBridgeValues | null>(null)
  liveValues.current = {
    ...props,
    selections,
    setClause,
    clearSelection,
    observations,
    observationVersion,
  }

  useEffect(() => {
    const initial = liveValues.current
    if (!initial) return

    const options: CreateSemioticVACPBridgeOptions = {
      appId: initial.appId,
      viewId: initial.viewId,
      stateCacheSize: initial.stateCacheSize,
      get title() {
        return liveValues.current?.title
      },
      charts: () => {
        const source = liveValues.current?.charts ?? []
        return typeof source === "function" ? source() : source
      },
      getSelections: () => {
        const current = liveValues.current
        return current ? serializeSelections(current.selections) : {}
      },
      getObservations: () => {
        const current = liveValues.current
        if (!current) return []
        // ObservationStore mutates its ring buffer in place. Reading version
        // here documents the counter that caused this component's live ref to
        // refresh even when the array identity stayed stable.
        void current.observationVersion
        return current.observations
      },
      selectionActions: {
        setPointSelection(selectionName, clientId, fields) {
          liveValues.current?.setClause(selectionName, {
            clientId,
            type: "point",
            fields: pointFields(fields),
          })
        },
        setIntervalSelection(selectionName, clientId, fields) {
          liveValues.current?.setClause(selectionName, {
            clientId,
            type: "interval",
            fields: intervalFields(fields),
          })
        },
        clearSelection(selectionName) {
          liveValues.current?.clearSelection(selectionName)
        },
      },
      get dataAccess() {
        return liveValues.current?.dataAccess
      },
      actions: () => {
        const source = liveValues.current?.actions
        return (typeof source === "function" ? source() : source) ?? []
      },
      now: () => liveValues.current?.now?.() ?? new Date(),
    }

    const bridge = createSemioticVACPBridge(options)
    const installation = installSemioticVACPBridge(bridge, {
      globalKey: initial.globalKey,
    })
    liveValues.current?.onInstallationChange?.(installation)

    return () => {
      installation.cleanup()
    }
  }, [])

  return null
}
