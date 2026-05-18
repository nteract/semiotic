import React, { useCallback, useEffect, useRef, useState } from "react"

/**
 * Small reusable streaming-demo controller for chart-explainer
 * blog entries. The blog entry hands us:
 *
 *   - `chartRef`   a forwardRef into the chart HOC (omit `data`,
 *                  use push API)
 *   - `frames`     the ordered list of pushes (one entry per
 *                  step; the demo pushes index N at step N)
 *   - `pushAt`     callback (chartRef, frames[i], i) that does
 *                  the actual push — different charts call
 *                  different ref methods
 *   - `resetAt`    callback (chartRef) — usually `clear()` then
 *                  re-prime with whatever the initial state is
 *
 * Auto-play interval defaults to 600 ms to match the
 * MinardsMarchStreaming cadence; bump it lower for faster
 * datasets and higher for ones where each step has more to read.
 *
 * Implementation note: `advance` must NOT call `pushAt` from inside
 * a `setStep((prev) => …)` updater. Updater functions are supposed
 * to be pure, and `pushAt` triggers the chart's internal `setState`
 * — React 18 flags that as "setState during render" of a foreign
 * component. We keep the live step in `stepRef` so the body of
 * `advance` runs once per click/tick, does the push side-effect,
 * then mirrors the new value into React state for the UI.
 */
export default function BlogPushDemo({
  chartRef,
  frames,
  pushAt,
  resetAt,
  intervalMs = 600,
  children,
}) {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const stepRef = useRef(0)
  const timerRef = useRef(null)

  // Prime the chart on mount: call `resetAt` so the chart starts
  // empty (or in whatever baseline state the entry chose).
  useEffect(() => {
    resetAt?.(chartRef.current)
    // We intentionally only re-prime on mount; subsequent reset
    // is handled by the reset button below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const advance = useCallback(() => {
    const current = stepRef.current
    if (current >= frames.length) {
      setPlaying(false)
      return
    }
    pushAt?.(chartRef.current, frames[current], current)
    const next = current + 1
    stepRef.current = next
    setStep(next)
    if (next >= frames.length) setPlaying(false)
  }, [frames, pushAt, chartRef])

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(advance, intervalMs)
    return () => clearInterval(timerRef.current)
  }, [playing, intervalMs, advance])

  const reset = () => {
    setPlaying(false)
    stepRef.current = 0
    setStep(0)
    resetAt?.(chartRef.current)
  }

  const isComplete = step >= frames.length

  return (
    <div>
      <div style={controlsRow}>
        <button
          onClick={() => setPlaying((p) => !p)}
          disabled={isComplete}
          style={{
            ...btnBase,
            fontWeight: 600,
            background: playing ? "var(--surface-3, #2a2a35)" : "var(--surface-2, #1a1a22)",
            cursor: isComplete ? "default" : "pointer",
            opacity: isComplete ? 0.5 : 1,
          }}
        >
          {playing ? "Pause" : isComplete ? "Done" : "Play"}
        </button>
        {!playing && !isComplete && (
          <button onClick={advance} style={btnBase}>Step</button>
        )}
        <button onClick={reset} style={btnBase}>Reset</button>
        <span style={status}>
          {step} / {frames.length}
          {isComplete && " — complete"}
        </span>
      </div>
      {children}
    </div>
  )
}

const controlsRow = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 10,
  fontFamily: "system-ui, sans-serif",
  fontSize: 13,
}

const btnBase = {
  padding: "4px 12px",
  borderRadius: 4,
  border: "1px solid var(--surface-3, #2a2a35)",
  background: "var(--surface-2, #1a1a22)",
  color: "var(--text-primary, #e5e7eb)",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 13,
}

const status = {
  color: "var(--text-secondary, #94a3b8)",
  fontFamily: "var(--font-code, ui-monospace, Menlo, monospace)",
}
