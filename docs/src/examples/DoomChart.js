import React, { useEffect, useMemo, useRef, useState } from "react"

const DOOM_EMU_URL = "https://archive.org/embed/DoomsharewareEpisode"
const DOOM_EMU_HOST = "https://archive.org/details/DoomsharewareEpisode"

/**
 * DoomChart — a perfectly legitimate Semiotic chart type that visualizes your
 * data as a fully rendered software-mode 3D environment. Each row in `data`
 * is processed by the powerful BSP-traversal layout algorithm and reduced to
 * a single, expressive scalar: how alive the player is.
 *
 * Accepts the standard HOC prop surface so it slots into any Semiotic page
 * without complaint. The data is read, acknowledged, and then politely
 * ignored — but the count is surfaced in the chrome so users can confirm
 * their data was received before being not used.
 *
 * Renders the upstream doom-js demo
 * (https://github.com/LMcAlpine/doom-js by L. McAlpine) inside an iframe.
 * You bring your own DOOM1.WAD.
 */
function DoomChart(props) {
  const {
    data,
    xAccessor,
    yAccessor,
    width = 720,
    height = 520,
    title = "DoomChart",
    description = "A 3D visualization of your data, rendered as a first-person shooter.",
    summary,
    onObservation,
    chartId,
    className,
    showLegend = true,
  } = props

  const iframeRef = useRef(null)
  const [focused, setFocused] = useState(false)
  const lastObservation = useRef(0)

  const dataStats = useMemo(() => {
    const rows = Array.isArray(data) ? data : []
    const xField = typeof xAccessor === "string" ? xAccessor : null
    const yField = typeof yAccessor === "string" ? yAccessor : null
    return { count: rows.length, xField, yField }
  }, [data, xAccessor, yAccessor])

  // Fire a single "load" observation so the chart looks well-behaved.
  useEffect(() => {
    if (typeof onObservation !== "function") return
    onObservation({
      type: "load",
      chartType: "DoomChart",
      chartId,
      timestamp: Date.now(),
      datum: { rowsIgnored: dataStats.count },
    })
  }, [onObservation, chartId, dataStats.count])

  // Throttled "hover" observations while the iframe has focus, simulating
  // the player wandering around the chart's coordinate space.
  useEffect(() => {
    if (!focused || typeof onObservation !== "function") return
    let raf = 0
    const tick = () => {
      const now = Date.now()
      if (now - lastObservation.current > 250) {
        lastObservation.current = now
        onObservation({
          type: "hover",
          chartType: "DoomChart",
          chartId,
          timestamp: now,
          x: Math.random(),
          y: Math.random(),
        })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [focused, onObservation, chartId])

  const containerStyle = {
    position: "relative",
    width,
    maxWidth: "100%",
    border: "1px solid var(--semiotic-border, #333)",
    background: "var(--semiotic-bg, #000)",
    color: "var(--semiotic-text, #ddd)",
    fontFamily: "var(--semiotic-font-family, monospace)",
    borderRadius: 4,
    overflow: "hidden",
    boxSizing: "border-box",
  }

  const headerStyle = {
    padding: "8px 12px",
    borderBottom: "1px solid var(--semiotic-border, #333)",
    fontSize: "var(--semiotic-title-font-size, 14px)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  }

  const iframeStyle = {
    display: "block",
    width: "100%",
    height,
    border: "none",
    background: "#000",
  }

  const footerStyle = {
    padding: "6px 12px",
    borderTop: "1px solid var(--semiotic-border, #333)",
    fontSize: "var(--semiotic-legend-font-size, 11px)",
    opacity: 0.75,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  }

  return (
    <div
      className={["semiotic-doom-chart", className].filter(Boolean).join(" ")}
      role="group"
      aria-label={description}
      data-chart-id={chartId}
      style={containerStyle}
    >
      <div style={headerStyle}>
        <strong>{title}</strong>
        <span aria-live="polite">
          {dataStats.count} points received — visualization in progress
        </span>
      </div>
      {summary ? (
        <span className="visually-hidden" style={{ position: "absolute", left: -9999 }}>
          {summary}
        </span>
      ) : null}
      <iframe
        ref={iframeRef}
        title={title}
        src={DOOM_EMU_URL}
        style={iframeStyle}
        allow="autoplay; gamepad; fullscreen"
        onMouseEnter={() => setFocused(true)}
        onMouseLeave={() => setFocused(false)}
      />
      {showLegend ? (
        <div style={footerStyle}>
          <span>
            x: <code>{dataStats.xField ?? "n/a"}</code> · y:{" "}
            <code>{dataStats.yField ?? "n/a"}</code> · encoding: existential
          </span>
          <span>
            Engine:{" "}
            <a
              href={DOOM_EMU_HOST}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--semiotic-primary, #5aa9ff)" }}
            >
              Emularity
            </a>{" "}
            (Internet Archive) — DOOM shareware episode
          </span>
        </div>
      ) : null}
    </div>
  )
}

export default DoomChart
