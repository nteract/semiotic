"use client"

import * as React from "react"
import { SR_ONLY_STYLE } from "./screenReaderStyles"

type CopyStatus = "idle" | "pending" | "copied" | "failed"

/** Clipboard feedback with cancellation-safe completion and timer cleanup. */
export function useClipboard(resetMs = 1200) {
  const [status, setStatus] = React.useState<CopyStatus>("idle")
  const requestRef = React.useRef(0)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )
  React.useEffect(
    () => () => {
      requestRef.current++
      clearTimeout(timerRef.current)
    },
    []
  )
  const copy = React.useCallback(
    async (value: string | (() => Promise<void>)) => {
      const request = ++requestRef.current
      clearTimeout(timerRef.current)
      setStatus("pending")
      let next: CopyStatus = "copied"
      try {
        if (typeof value === "function") await value()
        else await navigator.clipboard.writeText(value)
      } catch {
        next = "failed"
      }
      if (request !== requestRef.current) return false
      setStatus(next)
      timerRef.current = setTimeout(() => setStatus("idle"), resetMs)
      return next === "copied"
    },
    [resetMs]
  )
  return { status, copy }
}

export function ClipboardStatus({ status }: { status: CopyStatus }) {
  return (
    <span
      role="status"
      aria-atomic="true"
      style={SR_ONLY_STYLE}
    >
      {status === "copied"
        ? "Copied"
        : status === "failed"
          ? "Copy failed. Clipboard access may be unavailable or denied."
          : ""}
    </span>
  )
}
