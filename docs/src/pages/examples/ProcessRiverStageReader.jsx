import React from "react"

/**
 * Sticky stage / milestone inspect panel for Process River examples.
 *
 * Germany and the United States share this chrome; Good Earth’s lens reader
 * stays custom because it is argument-driven rather than stage-driven.
 */
export default function ProcessRiverStageReader({
  kicker = "CURRENT OPENING · FOLLOWS SCROLL",
  selectLabel = "Inspect a stage",
  selectAriaDescription = "Updates as you scroll the river to each historical year",
  stages = [],
  stage,
  events = [],
  selection = null,
  onStageChange,
  className,
}) {
  if (!stage) return null

  return (
    <aside
      className={["process-river__reader", className].filter(Boolean).join(" ")}
      aria-live="polite"
    >
      <span className="process-river__reader-kicker">{kicker}</span>
      <label className="process-river__stage-select">
        <span>{selectLabel}</span>
        <select
          value={stage.id}
          onChange={(event) => onStageChange?.(event.target.value)}
          aria-description={selectAriaDescription}
        >
          {stages.map((option) => (
            <option key={option.id} value={option.id}>
              {option.benchmark} — {option.label}
            </option>
          ))}
        </select>
      </label>
      <strong className="process-river__reader-year">{stage.benchmark}</strong>
      <h3>{stage.label}</h3>
      <p>{stage.description}</p>

      {events.length > 0 && (
        <div className="process-river__reader-events">
          {events.map((event) => (
            <article key={event.id}>
              <small>
                {event.date}
                {event.event_type ? ` / ${event.event_type}` : ""}
              </small>
              <strong>{event.title}</strong>
              <p>{event.body ?? event.notes}</p>
            </article>
          ))}
        </div>
      )}

      {selection && (
        <div className="process-river__selection">
          <span>{selection.kindLabel}</span>
          <strong>{selection.title}</strong>
          {selection.body && <p>{selection.body}</p>}
          {selection.value && <b>{selection.value}</b>}
          {selection.meta && <small>{selection.meta}</small>}
        </div>
      )}
    </aside>
  )
}
