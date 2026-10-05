import React, { useEffect, useRef, useState } from "react"
import { LinkedCharts, type CrosshairPosition } from "semiotic/ai"
import { LineChart, useLinkedCrosshair } from "semiotic/xy"
import { ThemeProvider } from "semiotic/themes/react"
import {
  RealtimeHistogram,
  TemporalHistogram,
  type RealtimeFrameHandle
} from "semiotic/realtime"

const rows = [0, 10, 20].map((time) => ({ time, value: 4 }))
const link = { name: "health", mode: "x-position" as const, xField: "time" }
const ownedContent = (d: Record<string, unknown>) => (
  <ConsumerTooltip value={d.total} />
)
function ConsumerTooltip({ value }: { value: unknown }) {
  return (
    <div
      data-testid="owned-surface"
      style={{ background: "navy", color: "white", padding: 12 }}
    >{`Total ${value}`}</div>
  )
}

function TableControl({ visual }: { visual: boolean }) {
  const { position, setPosition } = useLinkedCrosshair("health")
  return (
    <>
      <output data-testid="crosshair-state">
        {position ? `${position.xValue}:${!!position.locked}` : "none"}
      </output>
      <button onClick={() => setPosition({ xValue: 20, locked: true })}>
        Lock last timestamp
      </button>
      <button onClick={() => setPosition(null)}>Clear crosshair</button>
      {visual && (
        <table
          data-testid="linked-table"
          style={{
            borderCollapse: "collapse",
            margin: "12px 0",
            width: "100%"
          }}
        >
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.time}
                aria-selected={position?.xValue === row.time}
                style={{
                  background:
                    position?.xValue === row.time ? "#1e3a8a" : undefined
                }}
              >
                <td style={{ textAlign: "center", padding: 4 }}>
                  <button
                    onClick={() =>
                      setPosition({ xValue: row.time, locked: true })
                    }
                  >
                    {row.time}
                  </button>
                </td>
                <td style={{ textAlign: "center" }}>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

export function LinkedCrosshairFixture() {
  const params = new URLSearchParams(location.search)
  const push = params.has("push")
  const controlled = !params.has("uncontrolled")
  const visual = params.has("visual")
  const [position, setPosition] = useState<CrosshairPosition | null>(null)
  const [compact, setCompact] = useState(false)
  const [changes, setChanges] = useState(0)
  const ref = useRef<RealtimeFrameHandle>(null)
  useEffect(() => {
    if (push) ref.current?.pushMany(rows)
  }, [push])
  const props = {
    binSize: 10,
    binAlign: "center" as const,
    gap: 2,
    responsiveWidth: true,
    height: 220,
    showAxes: false,
    showLegend: false,
    // Visual coverage exercises automatic whole-bin extents, while the
    // interaction fixture retains its explicit shared domain.
    timeExtent: visual ? undefined : ([-5, 25] as [number, number]),
    background: visual ? "#111827" : undefined,
    fill: visual ? "#38bdf8" : undefined,
    valueExtent: [0, 10] as [number, number],
    margin: { left: 40, right: 20, top: 20, bottom: 20 },
    linkedHover: link,
    tooltip: { content: ownedContent, chrome: "none" as const }
  }
  const dashboard = (
    <LinkedCharts
      showLegend={false}
      crosshair={{
        name: "health",
        position: controlled ? position : undefined,
        onPositionChange: (next) => {
          setPosition(next)
          setChanges((count) => count + 1)
        }
      }}
    >
      <TableControl visual={visual} />
      <section
        data-testid="linked-histogram"
        style={{ width: compact ? 420 : 720 }}
      >
        {push ? (
          <RealtimeHistogram {...props} ref={ref} />
        ) : (
          <TemporalHistogram {...props} data={rows} />
        )}
      </section>
      <section data-testid="linked-line" style={{ width: compact ? 420 : 720 }}>
        <LineChart
          data={rows}
          xAccessor="time"
          yAccessor="value"
          linkedHover={link}
          responsiveWidth
          height={180}
          showPoints
          showAxes={false}
          showLegend={false}
          xExtent={[-5, 25]}
          yExtent={[0, 10]}
          color={visual ? "#f97316" : undefined}
          frameProps={visual ? { background: "#111827" } : undefined}
          margin={{ left: 40, right: 20, top: 20, bottom: 20 }}
        />
      </section>
    </LinkedCharts>
  )
  return (
    <main>
      <button onClick={() => setCompact((value) => !value)}>
        Resize linked charts
      </button>
      <output data-testid="crosshair-changes">{changes}</output>
      <div
        data-testid="linked-dashboard"
        style={
          visual
            ? {
                width: compact ? 420 : 720,
                background: "#111827",
                color: "white",
                fontFamily: "Arial, sans-serif"
              }
            : undefined
        }
      >
        {visual ? (
          <ThemeProvider theme="dark">{dashboard}</ThemeProvider>
        ) : (
          dashboard
        )}
      </div>
    </main>
  )
}
