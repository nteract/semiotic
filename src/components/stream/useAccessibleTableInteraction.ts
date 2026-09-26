"use client"

import * as React from "react"
import { useDataSummary } from "../DataSummaryContext"

const useBrowserLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

/** Shared focus and paging behavior for scene, network, and physics tables. */
export function useAccessibleTableInteraction() {
  const [srExpanded, setSrExpanded] = React.useState(false)
  const [announcement, setAnnouncement] = React.useState("")
  const dataSummary = useDataSummary()
  const visible = dataSummary?.visible ?? false
  const isExpanded = srExpanded || visible
  const containerRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const openerRef = React.useRef<HTMLElement | null>(null)
  const restoreFocusRef = React.useRef(false)
  const wasExpandedRef = React.useRef(false)
  const pageTargetRef = React.useRef<{ table: Element; index: number } | null>(
    null
  )

  useBrowserLayoutEffect(() => {
    if (isExpanded && !wasExpandedRef.current) {
      const active = document.activeElement
      if (
        active instanceof HTMLElement &&
        active !== document.body &&
        !containerRef.current?.contains(active)
      )
        openerRef.current = active
      containerRef.current?.focus()
    } else if (!isExpanded && wasExpandedRef.current) {
      if (restoreFocusRef.current) {
        const target = openerRef.current?.isConnected
          ? openerRef.current
          : triggerRef.current
        target?.focus()
      }
      restoreFocusRef.current = false
      openerRef.current = null
      pageTargetRef.current = null
      setAnnouncement("")
    }
    wasExpandedRef.current = isExpanded
    const pending = pageTargetRef.current
    if (isExpanded && pending) {
      const rows = pending.table.querySelectorAll<HTMLElement>("tbody tr")
      rows[pending.index]?.focus()
      pageTargetRef.current = null
    }
  })

  const open = () => setSrExpanded(true)
  const handleFocus = (event: React.FocusEvent) => {
    if (event.target !== event.currentTarget || isExpanded) return
    if (event.relatedTarget instanceof HTMLElement)
      openerRef.current = event.relatedTarget
    open()
  }
  const handleBlur = (event: React.FocusEvent) => {
    if (visible || containerRef.current?.contains(event.relatedTarget as Node))
      return
    setSrExpanded(false)
  }
  const dismiss = () => {
    restoreFocusRef.current = true
    if (visible) dataSummary?.setVisible(false)
    setSrExpanded(false)
  }
  const revealRows = (
    button: HTMLButtonElement,
    first: number,
    shown: number,
    total: number,
    kind = "rows"
  ) => {
    const table = button.previousElementSibling
    if (table) pageTargetRef.current = { table, index: first }
    setAnnouncement(`${shown} of ${total} ${kind} shown.`)
  }
  return {
    isExpanded,
    containerRef,
    triggerRef,
    open,
    handleFocus,
    handleBlur,
    dismiss,
    revealRows,
    announcement
  }
}
