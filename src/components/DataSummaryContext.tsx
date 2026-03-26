"use client"
import * as React from "react"

interface DataSummaryState {
  /** When true, AccessibleDataTable renders visibly instead of sr-only */
  visible: boolean
  setVisible: React.Dispatch<React.SetStateAction<boolean>>
}

const DataSummaryContext = React.createContext<DataSummaryState | null>(null)

export function DataSummaryProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = React.useState(false)
  const value = React.useMemo(() => ({ visible, setVisible }), [visible])
  return (
    <DataSummaryContext.Provider value={value}>
      {children}
    </DataSummaryContext.Provider>
  )
}

export function useDataSummary(): DataSummaryState | null {
  return React.useContext(DataSummaryContext)
}

export function useDataSummaryToggle(): (() => void) | null {
  const ctx = React.useContext(DataSummaryContext)
  return ctx ? () => ctx.setVisible(v => !v) : null
}
