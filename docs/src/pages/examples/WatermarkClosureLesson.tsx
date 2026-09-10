import React, { useCallback, useMemo, useState } from "react"
import { EventDropChart, buildEventDropPhysics, readEventDropOccupancy } from "semiotic/physics"
import type { EventDropProjectionMetadata, PhysicsPipelineControlSurface } from "semiotic/physics"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import "./physicsStories.css"

const EARLY = { id: "early", time: 6, arrivalTime: 7, admission: -11, kind: "in-window" }
const LATE = { id: "late", time: 6, arrivalTime: 32, admission: 14, kind: "late" }
const FIRST = [EARLY]
const BOTH = [EARLY, LATE]
const WINDOWS = { size: 12 }
const EMPTY = { accepted: [0, 0], late: 0, inFlight: 0, total: 0 }

/** A controlled sequence of board states; arrival time pauses while bodies travel. */
export function WatermarkClosureLesson() {
  const [width, hostRef] = useResponsiveWidth(260, 720)
  const [step, setStep] = useState(0)
  const [run, setRun] = useState(0)
  const [occupancy, setOccupancy] = useState(EMPTY)
  const [readyToClose, setReadyToClose] = useState(false)
  const data = step === 2 ? BOTH : FIRST
  const size = useMemo<[number, number]>(() => [width, 300], [width])
  const watermark = useMemo(() => ({ value: step === 0 ? -11 : step === 1 ? 13 : 14 }), [step])
  const metadata = useMemo(
    () =>
      buildEventDropPhysics({
        data,
        size,
        windows: WINDOWS,
        watermark,
        timeAccessor: "time",
        arrivalAccessor: "arrivalTime",
        watermarkAtArrivalAccessor: "admission",
        ballRadius: 10,
        seed: 47,
      }).metadata as unknown as EventDropProjectionMetadata,
    [data, size, watermark],
  )
  const observe = useCallback(
    (_result: unknown, controls: PhysicsPipelineControlSurface) => {
      const bodies = controls.readBodies()
      const next = readEventDropOccupancy(metadata, bodies)
      const early = bodies.find((body) => body.id === "early")
      setReadyToClose(
        early?.shape.type === "circle" &&
          early.y + early.shape.radius >= metadata.windowPlot.y + metadata.windowPlot.height - 1,
      )
      setOccupancy((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next))
    },
    [metadata],
  )
  const labels = [
    "An event arrives while its window is open. Let it reach the bottom before closing the lid.",
    "The lid closes above the accepted event.",
    "The later arrival hits the lid and rolls into the far-left bin.",
  ]
  const onTime = occupancy.accepted.reduce((sum, count) => sum + count, 0)
  const floorY = metadata.windowPlot.y + metadata.windowPlot.height
  const gutterTop =
    metadata.lidSegments[0]?.y1 ?? metadata.windowPlot.y + metadata.windowPlot.height * 0.48
  const foreground = (
    <svg
      aria-hidden="true"
      width={width}
      height={300}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <rect
        x={metadata.gutter.x}
        y={gutterTop}
        width={metadata.gutter.width}
        height={floorY - gutterTop}
        fill="#b07aa1"
        fillOpacity={0.12}
      />
      <path
        d={`M ${metadata.gutter.x} ${gutterTop} V ${floorY} H ${metadata.windowPlot.x + metadata.windowPlot.width}`}
        fill="none"
        stroke="var(--text-secondary)"
        strokeWidth={2}
      />
      {metadata.windowWalls?.map(({ id, ...wall }) => (
        <rect key={id} {...wall} fill="var(--text-secondary)" fillOpacity={0.6} />
      ))}
      <text
        x={metadata.gutter.x + metadata.gutter.width / 2}
        y={floorY + 16}
        textAnchor="middle"
        fill="var(--text-primary)"
        fontSize={11}
      >
        Late
      </text>
      <text
        x={metadata.gutter.x + metadata.gutter.width / 2}
        y={52}
        textAnchor="middle"
        fill="var(--text-primary)"
        fontSize={20}
      >
        {occupancy.late}
      </text>
      {metadata.lidSegments.map((lid) => (
        <line
          key={lid.id}
          x1={lid.x1}
          y1={lid.y1}
          x2={lid.x2}
          y2={lid.y2}
          stroke="#c25762"
          strokeWidth={5}
          strokeLinecap="round"
        />
      ))}
      {occupancy.accepted.map((count, index) => {
        const lane = metadata.windowPlot.width / metadata.windowCount
        const x = metadata.windowPlot.x + index * lane
        return (
          <g key={index}>
            <text
              x={x + lane / 2}
              y={52}
              textAnchor="middle"
              fill="var(--text-primary)"
              fontSize={20}
            >
              {count}
            </text>
            <text
              x={x + lane / 2}
              y={floorY + 16}
              textAnchor="middle"
              fill="var(--text-primary)"
              fontSize={11}
            >
              {index * 12}–{(index + 1) * 12}s
            </text>
          </g>
        )
      })}
    </svg>
  )
  return (
    <section className="physics-story" data-testid="watermark-closure-lesson">
      <span className="physics-story__eyebrow">Admission → closure → late arrival</span>
      <h2>Watch a window close</h2>
      <p>
        Both events happened at 6s. The first arrives at 7s; the second at 32s. The 0–12s window
        closes after 30s. Advance one moment at a time.
      </p>
      <div className="physics-story__actions">
        <button
          type="button"
          aria-pressed={step === 0}
          onClick={() => {
            setStep(0)
            setRun(run + 1)
            setOccupancy(EMPTY)
            setReadyToClose(false)
          }}
        >
          1. Let an event in
        </button>
        <button
          type="button"
          aria-pressed={step === 1}
          disabled={step !== 0 || !readyToClose || onTime !== 1 || occupancy.inFlight !== 0}
          onClick={() => setStep(1)}
        >
          2. Close the lid
        </button>
        <button
          type="button"
          aria-pressed={step === 2}
          disabled={step !== 1}
          onClick={() => setStep(2)}
        >
          3. Send a late arrival
        </button>
      </div>
      <p aria-live="polite">
        Arrival frontier: {[7, 31, 32][step]}s. {labels[step]}
      </p>
      <div ref={hostRef} style={{ maxWidth: 720, margin: "0 auto" }}>
        <EventDropChart
          key={run}
          data={data}
          size={size}
          windows={WINDOWS}
          watermark={watermark}
          watermarkAtArrivalAccessor="admission"
          colorBy="kind"
          ballRadius={10}
          seed={47}
          showProjection={false}
          title="One window and the far-left late bin"
          description={labels[step]}
          frameProps={{ onTick: observe, foregroundGraphics: foreground, suspendWhenHidden: false }}
        />
      </div>
      <output data-testid="watermark-lesson-counts" aria-live="polite">
        {onTime} in event-time bins + {occupancy.late} in the far-left bin + {occupancy.inFlight} in
        flight = {occupancy.total} {occupancy.total === 1 ? "arrival" : "arrivals"}
      </output>
      <p className="physics-story__reading">
        The numbers count balls inside each container. The lid blocks every ball. Source time pauses
        while a ball travels, so the next deadline cannot overtake its illustrated arrival.
      </p>
    </section>
  )
}
