"use client"

import type * as React from "react"
import { useEffect, useLayoutEffect, useState, useRef } from "react"
import { useDataSummary } from "../DataSummaryContext"

const useBrowserLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect

/** Shared focus and paging behavior for scene, network, and physics tables. */
export function useAccessibleTableInteraction() {
  const [srExpanded, setSrExpanded] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const dataSummary = useDataSummary()
  const visible = dataSummary?.visible ?? false
  const isExpanded = srExpanded || visible
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const restoreFocusRef = useRef(false)
  const wasExpandedRef = useRef(false)
  const pageTargetRef = useRef<{ table: Element; index: number } | null>(
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
