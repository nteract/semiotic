import React from "react"
import "../analyst-adventure.css"

function classNames(...values) {
  return values.filter(Boolean).join(" ")
}

function locationParts(location, fallbackSubtitle) {
  if (location && typeof location === "object") {
    return {
      title: location.title ?? location.label ?? location.name ?? "Unknown sector",
      subtitle: location.subtitle ?? fallbackSubtitle,
    }
  }

  return {
    title: location || "Case file 1984",
    subtitle: fallbackSubtitle,
  }
}

/**
 * Layout-only shell for the adventure. Its DOM order is narrative, chart,
 * choices, support; the desktop grid promotes the chart without changing the
 * mobile or screen-reader reading order.
 */
export function CgaShell({
  title = "Analyst Adventure",
  kicker = "ZORKCORP // INTERNAL SYSTEM",
  location,
  subtitle,
  chart,
  chartLabel,
  narrative,
  choices,
  evidence,
  status,
  controls,
  headerActions,
  children,
  className,
  ariaLabel,
  busy = false,
}) {
  const currentLocation = locationParts(location, subtitle)
  const hasSupport = Boolean(status || evidence)

  return (
    <section
      className={classNames("aa-shell", className)}
      aria-label={ariaLabel ?? `${title}: ${currentLocation.title}`}
      aria-busy={busy || undefined}
    >
      <header className="aa-shell__header">
        <div className="aa-shell__identity">
          <span className="aa-shell__kicker">{kicker}</span>
          <h2 className="aa-shell__title">{title}</h2>
        </div>
        <div className="aa-shell__location" aria-label="Current location">
          <span className="aa-shell__location-label">Current location</span>
          <strong>{currentLocation.title}</strong>
          {currentLocation.subtitle ? <span>{currentLocation.subtitle}</span> : null}
        </div>
        {headerActions ? <div className="aa-shell__header-actions">{headerActions}</div> : null}
      </header>

      <div className={classNames("aa-shell__stage", !hasSupport && "aa-shell__stage--wide")}>
        {narrative ? <div className="aa-shell__narrative">{narrative}</div> : null}

        <section className="aa-chart-viewport" aria-label={chartLabel ?? "Room analysis"}>
          <div className="aa-chart-viewport__bezel">
            <div className="aa-chart-viewport__screen">{chart}</div>
          </div>
        </section>

        {choices ? <div className="aa-shell__choices">{choices}</div> : null}

        {hasSupport ? (
          <aside className="aa-shell__support" aria-label="Case status and evidence">
            {status}
            {evidence}
          </aside>
        ) : null}

        {controls ? (
          <div className="aa-shell__controls" aria-label="Reader and hint controls">
            {controls}
          </div>
        ) : null}
      </div>

      {children ? <div className="aa-shell__after-stage">{children}</div> : null}
    </section>
  )
}

export default CgaShell
