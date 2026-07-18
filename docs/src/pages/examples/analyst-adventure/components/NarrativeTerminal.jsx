import React, { useId } from "react"
import { withSecretTitleWarp } from "./SecretRoomWarp"

function normalizedLines(lines) {
  if (lines == null) return []
  return Array.isArray(lines) ? lines : [lines]
}

function lineKey(line, index) {
  if (line && typeof line === "object" && !React.isValidElement(line)) {
    return line.id ?? `${line.speaker ?? "line"}-${index}`
  }
  return `line-${index}`
}

function NarrativeLine({ line }) {
  if (React.isValidElement(line) || typeof line !== "object" || line == null) {
    return <p className="aa-terminal__line">{line}</p>
  }

  return (
    <p className={`aa-terminal__line aa-terminal__line--${line.tone ?? "default"}`}>
      {line.speaker ? <strong className="aa-terminal__speaker">{line.speaker}</strong> : null}
      <span>{line.text ?? line.body ?? ""}</span>
    </p>
  )
}

/** A compact story transcript with an optional live-region prompt. */
export function NarrativeTerminal({
  lines = [],
  prompt,
  title = "Narrative terminal",
  eyebrow = "CASE TRANSCRIPT",
  live = "polite",
  className = "",
  onSecretCalendarWarp,
}) {
  const transcript = normalizedLines(lines)
  const titleId = useId()
  const titleNode = onSecretCalendarWarp
    ? withSecretTitleWarp(title, { word: "Lies", onWarp: onSecretCalendarWarp })
    : title

  return (
    <section className={`aa-terminal ${className}`.trim()} aria-labelledby={titleId}>
      <header className="aa-terminal__header">
        <span className="aa-terminal__eyebrow">{eyebrow}</span>
        <h2 id={titleId}>{titleNode}</h2>
      </header>
      <div className="aa-terminal__transcript">
        {transcript.map((line, index) => (
          <NarrativeLine key={lineKey(line, index)} line={line} />
        ))}
      </div>
      {prompt ? (
        <p className="aa-terminal__prompt" aria-live={live} aria-atomic="true">
          <span aria-hidden="true">&gt;&nbsp;</span>
          {prompt}
        </p>
      ) : null}
    </section>
  )
}

export default NarrativeTerminal
