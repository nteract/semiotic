import React, { useId } from "react"

function endingLines(ending) {
  if (typeof ending === "string" || React.isValidElement(ending)) return [ending]
  const source = ending?.lines ?? ending?.body ?? ending?.epilogue ?? []
  return Array.isArray(source) ? source : [source]
}

/** Full-stage ending card for good, bad, and secret conclusions. */
export function EndingScreen({
  ending,
  evidence = [],
  onRestart,
  onRewind,
  onContinue,
  children,
  className = "",
}) {
  const details =
    ending && typeof ending === "object" && !React.isValidElement(ending) ? ending : {}
  const titleId = useId()
  const title = details.title ?? details.label ?? "Case closed"
  const tone = details.tone ?? details.kind ?? "neutral"
  const lines = endingLines(ending)

  return (
    <section
      className={`aa-ending aa-ending--${tone} ${className}`.trim()}
      aria-labelledby={titleId}
      aria-live="polite"
    >
      <div className="aa-ending__signal" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="aa-ending__eyebrow">{details.eyebrow ?? "FINAL REPORT // CASE 1984"}</p>
      <h2 id={titleId}>{title}</h2>
      {details.subtitle ? <p className="aa-ending__subtitle">{details.subtitle}</p> : null}

      <div className="aa-ending__copy">
        {lines.filter(Boolean).map((line, index) => (
          <p key={details.id ? `${details.id}-${index}` : index}>{line}</p>
        ))}
      </div>

      {Array.isArray(evidence) && evidence.length > 0 ? (
        <div className="aa-ending__evidence">
          <span>Evidence restored</span>
          <ul>
            {evidence.map((artifact, index) => (
              <li key={artifact?.id ?? index}>{artifact?.label ?? artifact?.title ?? artifact}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {children}

      <div className="aa-ending__actions">
        {onContinue ? (
          <button type="button" className="aa-primary-button" onClick={onContinue}>
            Continue investigation
          </button>
        ) : null}
        {onRewind ? (
          <button type="button" className="aa-text-button" onClick={onRewind} aria-keyshortcuts="R">
            Rewind one room
          </button>
        ) : null}
        {onRestart ? (
          <button type="button" className="aa-text-button" onClick={onRestart}>
            Restart case
          </button>
        ) : null}
      </div>
    </section>
  )
}

export default EndingScreen
