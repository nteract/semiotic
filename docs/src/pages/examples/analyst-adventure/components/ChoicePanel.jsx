import React, { useEffect, useId, useRef } from "react"

function normalizeChoice(choice, index) {
  if (typeof choice === "string" || React.isValidElement(choice)) {
    return { id: `choice-${index + 1}`, label: choice }
  }
  return choice ?? { id: `choice-${index + 1}`, label: "Unavailable action" }
}

/** Numbered, keyboard-addressable story choices. Keyboard shortcuts are
 * advertised here; the game controller remains responsible for global keys. */
export function ChoicePanel({
  choices = [],
  onChoose,
  disabled = false,
  resolution,
  resolutionAction,
  title = "Choose your analysis",
  label,
  className = "",
}) {
  const titleId = useId()
  const resolutionRef = useRef(null)

  useEffect(() => {
    if (resolution) resolutionRef.current?.focus()
  }, [resolution])

  return (
    <section
      className={`aa-choice-panel ${className}`.trim()}
      aria-label={label}
      aria-labelledby={label ? undefined : titleId}
    >
      <div className="aa-choice-panel__heading">
        <span aria-hidden="true">{resolution ? "[ LEAD SECURED ]" : "[ ACTION QUEUE ]"}</span>
        <h2 id={titleId}>{resolution?.title ?? title}</h2>
      </div>
      {resolution ? (
        <div className="aa-choice-panel__resolution" ref={resolutionRef} tabIndex={-1}>
          <span className="aa-choice-panel__resolution-stamp" aria-hidden="true">
            ✓
          </span>
          <div>
            <p role="status">{resolution.explanation}</p>
            {resolutionAction ? (
              <button
                type="button"
                className="aa-primary-button aa-choice-panel__continue"
                onClick={resolutionAction.onClick}
              >
                {resolutionAction.label}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <ol className="aa-choice-panel__list">
          {choices.map((rawChoice, index) => {
            const choice = normalizeChoice(rawChoice, index)
            const number = choice.number ?? index + 1
            const isDisabled =
              Boolean(choice.disabled) ||
              (typeof disabled === "function"
                ? Boolean(disabled(choice, index))
                : Boolean(disabled))

            return (
              <li key={choice.id ?? `choice-${index + 1}`}>
                <button
                  type="button"
                  className={`aa-choice aa-choice--${choice.tone ?? "default"}`}
                  onClick={(event) => onChoose?.(choice, index, event)}
                  disabled={isDisabled}
                  aria-label={choice.ariaLabel}
                  aria-keyshortcuts={String(number)}
                  aria-pressed={typeof choice.active === "boolean" ? choice.active : undefined}
                >
                  <span className="aa-choice__number" aria-hidden="true">
                    {number}
                  </span>
                  <span className="aa-choice__copy">
                    <strong>{choice.label ?? choice.title}</strong>
                    {choice.description ? <span>{choice.description}</span> : null}
                  </span>
                  <span className="aa-choice__arrow" aria-hidden="true">
                    &gt;
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

export default ChoicePanel
