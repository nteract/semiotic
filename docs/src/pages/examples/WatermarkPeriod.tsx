import React from "react"
import type { EventDropProjectionMetadata } from "semiotic/physics"

type TimeGeometry = Pick<
  EventDropProjectionMetadata,
  "windowPlot" | "windowStart" | "windowSize" | "windowCount"
>

/** The ruler and board use exactly the same event-time coordinates. */
export function watermarkPeriodGeometry(metadata: TimeGeometry, watermark: number, now: number) {
  const { windowPlot, windowStart, windowSize, windowCount } = metadata
  const domainEnd = windowStart + windowSize * windowCount
  const x = (time: number) =>
    windowPlot.x +
    Math.max(0, Math.min(1, (time - windowStart) / (domainEnd - windowStart))) * windowPlot.width
  return { x, watermarkX: x(watermark), nowX: x(now), domainEnd }
}

export function WatermarkPeriod({
  width,
  metadata,
  watermark,
  now,
}: {
  width: number
  metadata: TimeGeometry
  watermark: number
  now: number
}) {
  const { x, watermarkX, nowX, domainEnd } = watermarkPeriodGeometry(metadata, watermark, now)
  const lag = Math.round(now - watermark)
  const labelX = (position: number, inset: number) =>
    Math.max(inset, Math.min(width - inset, position))
  return (
    <div className="watermarks-example__period" data-testid="watermark-period">
      <p className="watermarks-example__period-equation">
        <strong>{lag}s watermark lag</strong>
        <span>
          now {now}s − lag {lag}s = watermark {watermark}s
        </span>
      </p>
      <p className="watermarks-example__period-reading">
        The watermark is the left edge of the shaded waiting span. A window closes when that
        edge passes its end.
        {watermark < metadata.windowStart && " The watermark is before the visible time range."}
      </p>
      <svg
        width={width}
        height={94}
        viewBox={`0 0 ${width} 94`}
        role="img"
        aria-label={`Watermark ${watermark}s, now ${now}s, watermark lag ${lag}s. Windows ending before ${watermark}s are closed.`}
      >
        <line
          x1={x(metadata.windowStart)}
          x2={x(domainEnd)}
          y1={59}
          y2={59}
          className="watermarks-example__time-rail"
        />
        <rect
          data-testid="watermark-period-band"
          x={watermarkX}
          y={53}
          width={Math.max(0, nowX - watermarkX)}
          height={12}
          className="watermarks-example__period-band"
        />
        <line
          x1={watermarkX}
          x2={watermarkX}
          y1={19}
          y2={65}
          className="watermarks-example__watermark"
        />
        <text
          x={labelX(watermarkX, 66)}
          y={13}
          textAnchor="middle"
          className="watermarks-example__watermark-label"
        >
          {watermark < metadata.windowStart ? "← " : ""}Watermark {watermark}s
        </text>
        <line x1={nowX} x2={nowX} y1={39} y2={65} className="watermarks-example__current-time" />
        <text
          x={labelX(nowX, 35)}
          y={33}
          textAnchor="middle"
          className="watermarks-example__current-time-label"
        >
          Now {now}s{now > domainEnd ? " →" : ""}
        </text>
        {Array.from({ length: metadata.windowCount + 1 }, (_, index) => {
          const time = metadata.windowStart + index * metadata.windowSize
          return (
            <g key={time}>
              <line
                x1={x(time)}
                x2={x(time)}
                y1={68}
                y2={73}
                className="watermarks-example__time-rail"
              />
              <text
                x={x(time)}
                y={88}
                textAnchor="middle"
                className="watermarks-example__axis-label"
              >
                {time}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
