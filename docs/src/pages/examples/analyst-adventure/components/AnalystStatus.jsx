import React, { useId } from "react"

function bounded(value, min, max) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return min
  return Math.min(max, Math.max(min, numeric))
}

/** Compact case telemetry. `items` can append room-specific counters. */
export function AnalystStatus({
  credibility = 100,
  hintsUsed = 0,
  evidenceCount = 0,
  visitedCount,
  role = "Intrepid Young Analyst",
  statusText = "Investigating",
  items = [],
  className = "",
}) {
  const safeCredibility = bounded(credibility, 0, 100)
  const titleId = useId()
  const credibilityId = useId()
  const additionalItems = Array.isArray(items) ? items : []
  const statusItems = [
    { key: "evidence", label: "Evidence", value: evidenceCount },
    { key: "hints", label: "Hints", value: hintsUsed },
    ...(visitedCount == null ? [] : [{ key: "visited", label: "Visited", value: visitedCount }]),
    ...additionalItems.map((item, index) => ({ key: item.id ?? item.label ?? index, ...item })),
  ]

  return (
    <section className={`aa-status ${className}`.trim()} aria-labelledby={titleId}>
      <header className="aa-status__header">
        <div>
          <span>Analyst status</span>
          <h2 id={titleId}>{role}</h2>
        </div>
        <span className="aa-status__state">
          <i aria-hidden="true" />
          {statusText}
        </span>
      </header>

      <div className="aa-status__credibility">
        <div>
          <span id={credibilityId}>Credibility</span>
          <strong>{safeCredibility}%</strong>
        </div>
        <meter
          min="0"
          max="100"
          low="35"
          high="70"
          optimum="100"
          value={safeCredibility}
          aria-labelledby={credibilityId}
        >
          {safeCredibility}%
        </meter>
      </div>

      <dl className="aa-status__counters">
        {statusItems.map((item) => (
          <div key={item.key}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default AnalystStatus
