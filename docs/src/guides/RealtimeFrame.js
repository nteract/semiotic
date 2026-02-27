import React, { useRef, useEffect, useState } from "react"
import { RealtimeFrame } from "semiotic"
import MarkdownText from "../MarkdownText"

function generatePoint(index) {
  return {
    time: index,
    value:
      Math.sin(index * 0.05) * 50 + 100 + (Math.random() - 0.5) * 20
  }
}

function HeroExample() {
  const frameRef = useRef()
  const indexRef = useRef(0)
  const prevRef = useRef(null)
  const prevPrevRef = useRef(null)
  const [callouts, setCallouts] = useState([])

  useEffect(() => {
    const id = setInterval(() => {
      if (!frameRef.current) return
      const point = generatePoint(indexRef.current++)
      frameRef.current.push(point)

      const prev = prevRef.current
      const prevPrev = prevPrevRef.current
      prevPrevRef.current = prev
      prevRef.current = point

      // Detect local peaks: prev higher than both neighbors
      if (
        prev &&
        prevPrev &&
        prev.value > prevPrev.value &&
        prev.value > point.value &&
        prev.value > 130
      ) {
        setCallouts((old) => {
          // Drop older callouts whose value is lower than the new peak,
          // so they don't appear to "drift down" when the scale expands
          // to accommodate the higher peak.
          const filtered = old.filter((c) => c.value >= prev.value)
          const next = [
            ...filtered,
            {
              type: "callout",
              time: prev.time,
              value: prev.value,
              label: `Peak: ${Math.round(prev.value)}`
            }
          ]
          // Keep only the most recent 3 callouts
          return next.slice(-3)
        })
      }
    }, 50)
    return () => clearInterval(id)
  }, [])

  return (
    <RealtimeFrame
      ref={frameRef}
      chartType="line"
      arrowOfTime="right"
      windowMode="sliding"
      windowSize={200}
      size={[700, 300]}
      lineStyle={{ stroke: "#007bff", strokeWidth: 2 }}
      annotations={callouts}
      svgAnnotationRules={(annotation, i, context) => {
        if (!context || !context.scales) return null
        const x = context.scales.time(annotation.time)
        const y = context.scales.value(annotation.value)
        // Hide if scrolled off-screen
        if (x < 0 || x > context.width) return null
        return (
          <g key={`callout-${annotation.time}`}>
            <circle cx={x} cy={y} r={4} fill="#dc3545" />
            <line
              x1={x}
              y1={y - 6}
              x2={x}
              y2={y - 24}
              stroke="#dc3545"
              strokeWidth={1}
            />
            <rect
              x={x - 34}
              y={y - 40}
              width={68}
              height={16}
              rx={3}
              fill="#dc3545"
            />
            <text
              x={x}
              y={y - 29}
              textAnchor="middle"
              fill="white"
              fontSize={10}
              fontWeight="bold"
            >
              {annotation.label}
            </text>
          </g>
        )
      }}
    />
  )
}

function ArrowOfTimeDemo() {
  const refs = {
    right: useRef(),
    left: useRef(),
    down: useRef(),
    up: useRef()
  }
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      const point = generatePoint(indexRef.current++)
      Object.values(refs).forEach((ref) => {
        if (ref.current) ref.current.push(point)
      })
    }, 50)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
      {["right", "left", "down", "up"].map((dir) => (
        <div key={dir} style={{ textAlign: "center" }}>
          <p style={{ margin: "0 0 4px", fontWeight: "bold" }}>
            arrowOfTime="{dir}"
          </p>
          <RealtimeFrame
            ref={refs[dir]}
            arrowOfTime={dir}
            windowSize={100}
            size={[300, 200]}
            lineStyle={{ stroke: "#28a745", strokeWidth: 1.5 }}
          />
        </div>
      ))}
    </div>
  )
}

function WindowModeDemo() {
  const slidingRef = useRef()
  const growingRef = useRef()
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      const point = generatePoint(indexRef.current++)
      if (slidingRef.current) slidingRef.current.push(point)
      if (growingRef.current) growingRef.current.push(point)
    }, 50)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ display: "flex", gap: 24 }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ margin: "0 0 4px", fontWeight: "bold" }}>
          windowMode="sliding" (default)
        </p>
        <RealtimeFrame
          ref={slidingRef}
          windowMode="sliding"
          windowSize={100}
          size={[340, 200]}
          lineStyle={{ stroke: "#dc3545", strokeWidth: 1.5 }}
        />
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ margin: "0 0 4px", fontWeight: "bold" }}>
          windowMode="growing"
        </p>
        <RealtimeFrame
          ref={growingRef}
          windowMode="growing"
          windowSize={100}
          size={[340, 200]}
          lineStyle={{ stroke: "#6f42c1", strokeWidth: 1.5 }}
        />
      </div>
    </div>
  )
}

function AxesExample() {
  const defaultRef = useRef()
  const noAxesRef = useRef()
  const fixedRef = useRef()
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      const point = generatePoint(indexRef.current++)
      if (defaultRef.current) defaultRef.current.push(point)
      if (noAxesRef.current) noAxesRef.current.push(point)
      if (fixedRef.current) fixedRef.current.push(point)
    }, 50)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ margin: "0 0 4px", fontWeight: "bold" }}>
          showAxes=true (default)
        </p>
        <RealtimeFrame
          ref={defaultRef}
          windowSize={100}
          size={[340, 200]}
          lineStyle={{ stroke: "#007bff", strokeWidth: 1.5 }}
        />
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ margin: "0 0 4px", fontWeight: "bold" }}>
          showAxes=false + background
        </p>
        <RealtimeFrame
          ref={noAxesRef}
          windowSize={100}
          size={[340, 200]}
          margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
          showAxes={false}
          background="#1e1e2e"
          lineStyle={{ stroke: "#50fa7b", strokeWidth: 1.5 }}
        />
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ margin: "0 0 4px", fontWeight: "bold" }}>
          Fixed valueExtent=[0, 200]
        </p>
        <RealtimeFrame
          ref={fixedRef}
          windowSize={100}
          size={[340, 200]}
          valueExtent={[0, 200]}
          lineStyle={{ stroke: "#fd7e14", strokeWidth: 1.5 }}
        />
      </div>
    </div>
  )
}

function AnnotationsExample() {
  const frameRef = useRef()
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      if (frameRef.current) {
        frameRef.current.push(generatePoint(indexRef.current++))
      }
    }, 50)
    return () => clearInterval(id)
  }, [])

  return (
    <RealtimeFrame
      ref={frameRef}
      windowSize={200}
      size={[700, 300]}
      lineStyle={{ stroke: "#fd7e14", strokeWidth: 2 }}
      annotations={[
        { type: "threshold", value: 100, label: "Target: 100" },
        { type: "threshold", value: 140, label: "Too Much", color: "#dc3545" },
        { type: "threshold", value: 60, label: "Too Little", color: "#007bff", thresholdType: "lesser" }
      ]}
      svgAnnotationRules={(annotation, i, context) => {
        if (annotation.type === "threshold" && context && context.scales) {
          const y = context.scales.value(annotation.value)
          const lineColor = annotation.color || "#dc3545"
          return (
            <g key={`threshold-${i}`}>
              <line
                x1={0}
                x2={context.width}
                y1={y}
                y2={y}
                stroke={lineColor}
                strokeWidth={1.5}
                strokeDasharray="6,3"
              />
              <text
                x={context.width - 4}
                y={y - 6}
                textAnchor="end"
                fill={lineColor}
                fontSize={11}
                fontWeight="bold"
              >
                {annotation.label}
              </text>
            </g>
          )
        }
        return null
      }}
    />
  )
}

function HoverExample() {
  const defaultRef = useRef()
  const customRef = useRef()
  const callbackRef = useRef()
  const indexRef = useRef(0)
  const [lastHover, setLastHover] = useState(null)

  useEffect(() => {
    const id = setInterval(() => {
      const point = generatePoint(indexRef.current++)
      if (defaultRef.current) defaultRef.current.push(point)
      if (customRef.current) customRef.current.push(point)
      if (callbackRef.current) callbackRef.current.push(point)
    }, 50)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ margin: "0 0 4px", fontWeight: "bold" }}>
          Default tooltip
        </p>
        <RealtimeFrame
          ref={defaultRef}
          windowSize={100}
          size={[340, 200]}
          hoverAnnotation={true}
          lineStyle={{ stroke: "#007bff", strokeWidth: 1.5 }}
        />
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ margin: "0 0 4px", fontWeight: "bold" }}>
          Custom tooltipContent
        </p>
        <RealtimeFrame
          ref={customRef}
          windowSize={100}
          size={[340, 200]}
          hoverAnnotation={true}
          lineStyle={{ stroke: "#6f42c1", strokeWidth: 1.5 }}
          tooltipContent={(d) => (
            <div style={{
              background: "#6f42c1",
              color: "white",
              padding: "8px 12px",
              borderRadius: 6,
              fontSize: 13,
              pointerEvents: "none"
            }}>
              <strong>{Math.round(d.value)}</strong>
              <span style={{ opacity: 0.7, marginLeft: 8 }}>
                t={Math.round(d.time)}
              </span>
            </div>
          )}
        />
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ margin: "0 0 4px", fontWeight: "bold" }}>
          customHoverBehavior
        </p>
        <RealtimeFrame
          ref={callbackRef}
          windowSize={100}
          size={[340, 200]}
          hoverAnnotation={{ crosshair: { stroke: "#dc3545", strokeDasharray: "2,2" } }}
          lineStyle={{ stroke: "#dc3545", strokeWidth: 1.5 }}
          customHoverBehavior={(d) => setLastHover(d)}
        />
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#666" }}>
          {lastHover
            ? `value: ${Math.round(lastHover.value)}, time: ${Math.round(lastHover.time)}`
            : "Hover to see data"}
        </p>
      </div>
    </div>
  )
}

function MultiInstanceDemo() {
  const refsArray = useRef([])
  const indexRef = useRef(0)
  const [count] = useState(10)

  if (refsArray.current.length !== count) {
    refsArray.current = Array.from({ length: count }, () => React.createRef())
  }

  useEffect(() => {
    const id = setInterval(() => {
      indexRef.current++
      refsArray.current.forEach((ref, i) => {
        if (ref.current) {
          ref.current.push({
            time: indexRef.current,
            value:
              Math.sin(indexRef.current * 0.05 + i * 0.5) * 50 +
              100 +
              (Math.random() - 0.5) * 20
          })
        }
      })
    }, 50)
    return () => clearInterval(id)
  }, [count])

  const colors = [
    "#007bff", "#28a745", "#dc3545", "#fd7e14", "#6f42c1",
    "#20c997", "#e83e8c", "#17a2b8", "#6610f2", "#ffc107"
  ]

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {refsArray.current.map((ref, i) => (
        <RealtimeFrame
          key={i}
          ref={ref}
          windowSize={100}
          size={[220, 120]}
          margin={{ top: 10, right: 10, bottom: 20, left: 30 }}
          lineStyle={{ stroke: colors[i], strokeWidth: 1.5 }}
          showAxes={false}
        />
      ))}
    </div>
  )
}

export default function RealtimeFrameGuide() {
  return (
    <div>
      <h1>RealtimeFrame</h1>

      <MarkdownText
        text={`
RealtimeFrame is a canvas-first frame designed for streaming and realtime data visualization.
Unlike other frames which are SVG-based and recalculate on every prop change, RealtimeFrame
uses a ring buffer for O(1) data insertion, incremental extent tracking, and
requestAnimationFrame-based rendering — making it ideal for high-frequency data updates.

## Streaming Line Chart

The simplest use case: data pushed every 50ms via the imperative ref API. The sliding window
keeps the most recent 200 points.
`}
      />

      <HeroExample />

      <MarkdownText
        text={`
## arrowOfTime

The \`arrowOfTime\` prop controls which direction time flows. The four options are
\`"right"\` (default), \`"left"\`, \`"down"\`, and \`"up"\`.
`}
      />

      <ArrowOfTimeDemo />

      <MarkdownText
        text={`
## Window Modes

- **sliding** (default): Fixed-capacity ring buffer. New data pushes out the oldest. Classic real-time dashboard behavior.
- **growing**: No eviction. Data accumulates indefinitely. Useful for recording sessions.
`}
      />

      <WindowModeDemo />

      <MarkdownText
        text={`
## Axes & Layout

By default RealtimeFrame draws canvas-based axes with tick marks and labels. Set \`showAxes={false}\` to
hide them — useful for sparkline-style embeds or when you provide your own chrome. When axes are hidden
you can tighten the \`margin\` to reclaim space. Use \`valueExtent\` to pin the y-axis to a fixed domain
so ticks stay stable as data streams in.
`}
      />

      <AxesExample />

      <MarkdownText
        text={`
## Annotations

RealtimeFrame supports the same annotation system as other Semiotic frames.
Annotations are rendered in an SVG overlay on top of the canvas.
`}
      />

      <AnnotationsExample />

      <MarkdownText
        text={`
## Hover Interaction

Set \`hoverAnnotation={true}\` for a default tooltip and crosshair. Customize with
\`tooltipContent\` for your own tooltip component, or use \`customHoverBehavior\` for
full control over hover state. Crosshair style is configurable via the object form:
\`hoverAnnotation={{ crosshair: { stroke: "#dc3545" } }}\`.
`}
      />

      <HoverExample />

      <MarkdownText
        text={`
## Multiple Instances

RealtimeFrame is designed to support 10+ simultaneous instances with no performance degradation.
Each instance manages its own ring buffer and requestAnimationFrame loop independently.
`}
      />

      <MultiInstanceDemo />

      <MarkdownText
        text={`
## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`chartType\` | \`"line" \\| "swarm" \\| "candlestick" \\| "waterfall"\` | \`"line"\` | Chart visualization type |
| \`arrowOfTime\` | \`"right" \\| "left" \\| "up" \\| "down"\` | \`"right"\` | Direction time flows |
| \`windowMode\` | \`"sliding" \\| "growing"\` | \`"sliding"\` | Data retention strategy |
| \`windowSize\` | \`number\` | \`200\` | Ring buffer capacity |
| \`data\` | \`object[]\` | — | Controlled data array |
| \`timeAccessor\` | \`string \\| function\` | \`"time"\` | Time value accessor |
| \`valueAccessor\` | \`string \\| function\` | \`"value"\` | Value accessor |
| \`size\` | \`[number, number]\` | \`[500, 300]\` | Chart dimensions |
| \`margin\` | \`object\` | \`{ top: 20, right: 20, bottom: 30, left: 40 }\` | Chart margins |
| \`lineStyle\` | \`object\` | — | Stroke, strokeWidth, strokeDasharray |
| \`showAxes\` | \`boolean\` | \`true\` | Show canvas-drawn axes |
| \`background\` | \`string\` | — | Background fill color |
| \`annotations\` | \`array\` | — | Annotation objects |
| \`hoverAnnotation\` | \`boolean \\| object\` | — | Enable hover interaction with crosshair + tooltip |
| \`tooltipContent\` | \`function\` | — | Custom tooltip renderer: \`(d: HoverData) => ReactNode\` |
| \`customHoverBehavior\` | \`function\` | — | Callback on hover: \`(d: HoverData \\| null) => void\` |

### Imperative API (via ref)

| Method | Description |
|--------|-------------|
| \`push(point)\` | Add a single data point |
| \`pushMany(points)\` | Add multiple data points |
| \`clear()\` | Clear all data |
| \`getData()\` | Get current data as array |
`}
      />
    </div>
  )
}
