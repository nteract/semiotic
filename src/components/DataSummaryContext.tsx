"use client"
import type * as React from "react"
import { createContext, useState, useCallback, useMemo, useContext } from "react"

interface DataSummaryState {
  /** When true, AccessibleDataTable renders visibly instead of sr-only */
  visible: boolean
  setVisible: React.Dispatch<React.SetStateAction<boolean>>
  toggle: () => void
}

const DataSummaryContext = /* @__PURE__ */ createContext<DataSummaryState | null>(null)

export function DataSummaryProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  const toggle = useCallback(() => setVisible(v => !v), [])
  const value = useMemo(() => ({ visible, setVisible, toggle }), [visible, toggle])
  return (
    <DataSummaryContext.Provider value={value}>
      {children}
    </DataSummaryContext.Provider>
  )
}

export function useDataSummary(): DataSummaryState | null {
  return useContext(DataSummaryContext)
}

export function useDataSummaryToggle(): (() => void) | null {
  const ctx = useContext(DataSummaryContext)
  return ctx ? ctx.toggle : null
}
