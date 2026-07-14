import React from "react"

function evidenceLabel(artifact) {
  if (typeof artifact === "string") return artifact
  return artifact?.label ?? artifact?.title ?? artifact?.id ?? "Unnamed evidence"
}

/** A native details-based evidence drawer. */
export function EvidenceDiskette({
  evidence = [],
  onReopen,
  open,
  defaultOpen = false,
  onToggle,
  title = "Evidence Diskette",
  emptyMessage = "No defensible claims saved yet.",
  className = "",
}) {
  const artifacts = Array.isArray(evidence) ? evidence : []

  return (
    <details
      className={`aa-evidence ${className}`.trim()}
      open={typeof open === "boolean" ? open : defaultOpen}
      onToggle={(event) => onToggle?.(event.currentTarget.open, event)}
    >
      <summary className="aa-evidence__summary">
        <span className="aa-evidence__disk" aria-hidden="true">
          <span />
        </span>
        <span>
          <strong>{title}</strong>
          <small>{artifacts.length} / 4 sectors</small>
        </span>
        <span className="aa-evidence__chevron" aria-hidden="true">
          +
        </span>
      </summary>

      <div className="aa-evidence__drawer">
        {artifacts.length === 0 ? (
          <p className="aa-evidence__empty">{emptyMessage}</p>
        ) : (
          <ol className="aa-evidence__list">
            {artifacts.map((artifact, index) => {
              const item = typeof artifact === "object" && artifact != null ? artifact : {}
              const label = evidenceLabel(artifact)
              return (
                <li key={item.id ?? `${label}-${index}`} className="aa-evidence-card">
                  <div className="aa-evidence-card__topline">
                    <span aria-hidden="true">#{String(index + 1).padStart(2, "0")}</span>
                    <strong>{label}</strong>
                  </div>
                  {item.claim ? <p>{item.claim}</p> : null}
                  <dl>
                    {item.scope ? (
                      <div>
                        <dt>Scope</dt>
                        <dd>{item.scope}</dd>
                      </div>
                    ) : null}
                    {item.denominator ? (
                      <div>
                        <dt>Denominator</dt>
                        <dd>{item.denominator}</dd>
                      </div>
                    ) : null}
                    {item.frame || item.frameFamily ? (
                      <div>
                        <dt>Frame</dt>
                        <dd>{item.frame ?? item.frameFamily}</dd>
                      </div>
                    ) : null}
                    {item.hinted != null || item.usedHint != null ? (
                      <div>
                        <dt>Method</dt>
                        <dd>{item.hinted || item.usedHint ? "Hint assisted" : "Unaided"}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {onReopen || item.onReopen ? (
                    <button
                      type="button"
                      className="aa-text-button"
                      onClick={(event) => (item.onReopen ?? onReopen)?.(artifact, index, event)}
                    >
                      Reopen view
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </details>
  )
}

export default EvidenceDiskette
