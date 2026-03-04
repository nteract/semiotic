import React, { useRef, useEffect, useState } from "react"
import { StreamXYFrame, StreamOrdinalFrame } from "semiotic"

import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Responsive container hook
// ---------------------------------------------------------------------------

function useContainerWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}

// ---------------------------------------------------------------------------
// Decay demo
// ---------------------------------------------------------------------------

function DecayDemo() {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({
          time: i,
          value: 50 + Math.sin(i * 0.05) * 20 + (Math.random() - 0.5) * 10,
        })
      }
    }, 40)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && (
        <StreamXYFrame
          ref={chartRef}
          chartType="scatter"
          runtimeMode="streaming"
          size={[containerWidth, 250]}
          windowSize={200}
          showAxes={true}
          pointStyle={() => ({ fill: "#6366f1", opacity: 0.8 })}
          decay={{ type: "exponential", halfLife: 80, minOpacity: 0.05 }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pulse demo
// ---------------------------------------------------------------------------

function PulseDemo() {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({
          time: i,
          value: 50 + Math.sin(i * 0.04) * 25 + (Math.random() - 0.5) * 8,
        })
      }
    }, 100)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && (
        <StreamXYFrame
          ref={chartRef}
          chartType="scatter"
          runtimeMode="streaming"
          size={[containerWidth, 250]}
          windowSize={150}
          showAxes={true}
          pointStyle={() => ({ fill: "#10b981", opacity: 0.8 })}
          pulse={{ duration: 600, color: "rgba(16, 185, 129, 0.6)", glowRadius: 6 }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Staleness demo
// ---------------------------------------------------------------------------

function StalenessDemo() {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({
          time: i,
          value: 50 + Math.random() * 30,
        })
      }
    }, 50)
    return () => clearInterval(id)
  }, [paused])

  return (
    <div>
      <button
        onClick={() => setPaused(!paused)}
        style={{
          marginBottom: 8,
          padding: "6px 16px",
          borderRadius: 4,
          border: "1px solid var(--surface-3)",
          background: paused ? "#dc3545" : "#28a745",
          color: "white",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {paused ? "Resume Feed" : "Pause Feed (to trigger staleness)"}
      </button>
      <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
        {containerWidth && (
          <StreamXYFrame
            ref={chartRef}
            chartType="scatter"
            runtimeMode="streaming"
            size={[containerWidth, 250]}
            windowSize={200}
            showAxes={true}
            pointStyle={() => ({ fill: "#f59e0b", opacity: 0.7 })}
            staleness={{ threshold: 2000, dimOpacity: 0.3, showBadge: true, badgePosition: "top-right" }}
          />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Combined demo
// ---------------------------------------------------------------------------

function CombinedDemo() {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({
          time: i,
          value: 50 + Math.sin(i * 0.03) * 30 + (Math.random() - 0.5) * 15,
        })
      }
    }, 60)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && (
        <StreamXYFrame
          ref={chartRef}
          chartType="scatter"
          runtimeMode="streaming"
          size={[containerWidth, 280]}
          windowSize={200}
          showAxes={true}
          pointStyle={() => ({ fill: "#6366f1", opacity: 0.8 })}
          decay={{ type: "linear", minOpacity: 0.1 }}
          pulse={{ duration: 500, color: "rgba(99, 102, 241, 0.5)" }}
          staleness={{ threshold: 5000, dimOpacity: 0.4, showBadge: true }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RealtimeEncodingPage() {
  return (
    <PageLayout
      title="Realtime Encoding"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Realtime Encoding", path: "/features/realtime-encoding" },
      ]}
      prevPage={{ title: "Legends", path: "/features/legends" }}
      nextPage={null}
    >
      <p>
        When visualizing streaming data, the chart needs to communicate not just
        current values, but <strong>change over time</strong>. Semiotic provides
        four visual encoding features for realtime data: <strong>decay</strong>,{" "}
        <strong>pulse</strong>, <strong>transitions</strong>, and{" "}
        <strong>staleness</strong>. These work on all streaming chart types
        (StreamXYFrame, StreamOrdinalFrame, and all realtime HOCs).
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Decay */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="decay">Decay</h2>

      <p>
        Older data fades out based on age in the ring buffer. This creates a
        visual trail that shows the history of data flow. Three modes:
      </p>
      <ul>
        <li><strong>linear</strong> -- opacity decreases linearly from 1 (newest) to minOpacity (oldest)</li>
        <li><strong>exponential</strong> -- opacity follows a half-life curve (more natural feel)</li>
        <li><strong>step</strong> -- full opacity within a threshold, then drops to minOpacity</li>
      </ul>

      <DecayDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`<StreamXYFrame
  ref={chartRef}
  chartType="scatter"
  runtimeMode="streaming"
  decay={{
    type: "exponential",
    halfLife: 80,        // buffer positions
    minOpacity: 0.05     // floor opacity
  }}
/>`}
          language="jsx"
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Pulse */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="pulse">Pulse</h2>

      <p>
        Recently inserted data points flash briefly with a glow effect. This
        draws the eye to where new data is appearing. Points get a glow ring;
        bars and heatmap cells get a white overlay flash.
      </p>

      <PulseDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`<StreamXYFrame
  ref={chartRef}
  chartType="scatter"
  runtimeMode="streaming"
  pulse={{
    duration: 600,                          // ms
    color: "rgba(16, 185, 129, 0.6)",       // glow color
    glowRadius: 6                           // extra px
  }}
/>`}
          language="jsx"
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Staleness */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="staleness">Staleness</h2>

      <p>
        When the data feed stops, the chart dims and optionally shows a
        LIVE/STALE badge. This communicates whether the visualization reflects
        current or outdated data. Try pausing the feed below:
      </p>

      <StalenessDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`<StreamXYFrame
  ref={chartRef}
  chartType="scatter"
  runtimeMode="streaming"
  staleness={{
    threshold: 2000,       // ms without data → stale
    dimOpacity: 0.3,       // canvas alpha when stale
    showBadge: true,       // render LIVE/STALE indicator
    badgePosition: "top-right"
  }}
/>`}
          language="jsx"
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Transitions */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="transitions">Transitions</h2>

      <p>
        When data changes cause scene nodes to move (e.g. bar heights changing
        or points repositioning), <code>transition</code> smoothly interpolates
        from old to new positions using ease-out cubic easing.
      </p>

      <CodeBlock
        code={`<StreamOrdinalFrame
  ref={chartRef}
  chartType="bar"
  runtimeMode="streaming"
  transition={{
    duration: 300,         // ms
    easing: "ease-out"     // or "linear"
  }}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Combining */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="combining">Combining Encodings</h2>

      <p>
        All four features can be used together. A common pattern is decay +
        pulse: older data fades while new data flashes, creating a clear sense
        of data flow direction and recency.
      </p>

      <CombinedDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`<StreamXYFrame
  ref={chartRef}
  chartType="scatter"
  runtimeMode="streaming"
  decay={{ type: "linear", minOpacity: 0.1 }}
  pulse={{ duration: 500, color: "rgba(99, 102, 241, 0.5)" }}
  staleness={{ threshold: 5000, dimOpacity: 0.4, showBadge: true }}
/>`}
          language="jsx"
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/charts/realtime-line-chart">RealtimeLineChart</Link> --
          streaming line chart
        </li>
        <li>
          <Link to="/charts/realtime-heatmap">RealtimeHeatmap</Link> --
          streaming 2D heatmap with decay + pulse demo
        </li>
        <li>
          <Link to="/charts/realtime-swarm-chart">RealtimeSwarmChart</Link> --
          streaming scatter chart
        </li>
        <li>
          <Link to="/frames/realtime-frame">StreamXYFrame</Link> -- the
          underlying frame
        </li>
      </ul>
    </PageLayout>
  )
}
