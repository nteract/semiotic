import React, { useMemo, useRef } from "react"
import ChartMethodDisclosure from "../../../components/ChartMethodDisclosure"
import DrawerDialog from "../../../components/DrawerDialog"
import {
  CLAIM_CLASS_META,
  CLAIM_LEDGER,
  RECIPE_MANIFESTS,
  SOURCE_MANIFEST,
  sourceById,
} from "./lastScarcityData"

/** Small colored claim-type mark. Text labels stay in aria/title, not on the face. */
export function EvidenceBadge({ claimClass, claimId, sourceId, onOpen, children }) {
  const meta = CLAIM_CLASS_META[claimClass] ?? CLAIM_CLASS_META["philosophical-interpretation"]
  const label = children ?? meta.label
  const title = meta.description ? `${meta.label}: ${meta.description}` : meta.label

  const mark = (
    <span className="ls-evidence-badge__mark" aria-hidden="true" />
  )

  if (!onOpen) {
    return (
      <span
        className={`ls-evidence-badge is-${claimClass}`}
        title={title}
        aria-label={label}
      >
        {mark}
      </span>
    )
  }

  return (
    <button
      type="button"
      className={`ls-evidence-badge is-${claimClass}`}
      onClick={() => onOpen({ claimId, sourceId, claimClass })}
      title={title}
      aria-label={`About this claim (${label})`}
    >
      {mark}
    </button>
  )
}

/** Quiet, opt-in claim mark + short wording. Not a second essay track. */
export function ClaimNote({ claimId, onOpen }) {
  const claim = CLAIM_LEDGER.find((item) => item.id === claimId)
  if (!claim) return null
  return (
    <aside className="ls-claim-note is-compact">
      <EvidenceBadge claimClass={claim.claimClass} claimId={claim.id} onOpen={onOpen} />
      <p>{claim.wording}</p>
    </aside>
  )
}

export function RecipeInspector({ chapterId }) {
  const recipe = RECIPE_MANIFESTS[chapterId]
  return <ChartMethodDisclosure recipe={recipe} className="ls-recipe-inspector" />
}

export function EvidenceDrawer({ open, selection, onClose }) {
  const closeRef = useRef(null)
  const selectedClaim = useMemo(
    () => CLAIM_LEDGER.find((claim) => claim.id === selection?.claimId),
    [selection?.claimId],
  )
  const selectedSource = useMemo(
    () => sourceById(selection?.sourceId) ?? sourceById(selectedClaim?.sourceIds?.[0]),
    [selectedClaim, selection?.sourceId],
  )

  return (
    <DrawerDialog
      open={open}
      onClose={onClose}
      labelledBy="last-scarcity-evidence-title"
      className="ls-evidence-drawer"
      backdropClassName="ls-evidence-backdrop"
      initialFocusRef={closeRef}
    >
      <div className="ls-evidence-drawer__head">
        <div>
          <span>Sources and claims</span>
          <h2 id="last-scarcity-evidence-title">What each mark means</h2>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close sources and claims">×</button>
      </div>

      {selectedClaim && (
        <section className="ls-evidence-focus" aria-live="polite">
          <div className="ls-evidence-focus__type">
            <EvidenceBadge claimClass={selectedClaim.claimClass} onOpen={undefined} />
            <span>{CLAIM_CLASS_META[selectedClaim.claimClass]?.label ?? selectedClaim.claimClass}</span>
          </div>
          <h3>{selectedClaim.wording}</h3>
          <dl>
            <div>
              <dt>What supports it</dt>
              <dd>{selectedClaim.supports.join(" ")}</dd>
            </div>
            <div>
              <dt>What it does not establish</dt>
              <dd>{selectedClaim.contradicts.join(" ")}</dd>
            </div>
            <div>
              <dt>What would weaken it</dt>
              <dd>{selectedClaim.weakenedBy}</dd>
            </div>
          </dl>
          {selectedClaim.sourceIds.length > 0 && (
            <div className="ls-evidence-focus__sources">
              {selectedClaim.sourceIds.map((sourceId) => {
                const source = sourceById(sourceId)
                return source ? <a key={sourceId} href={source.href} target="_blank" rel="noreferrer">{source.title} ↗</a> : null
              })}
            </div>
          )}
        </section>
      )}

      {selectedSource && (
        <section className="ls-source-focus">
          <span>Selected source</span>
          <h3>{selectedSource.title}</h3>
          <p>{selectedSource.publisher}. Coverage: {selectedSource.coverage}</p>
          <p><strong>Citation:</strong> {selectedSource.citation}</p>
          <p>Retrieved {selectedSource.retrievedAt}. License: {selectedSource.licenseStatus}</p>
          <h4>How this example uses it</h4>
          <ul>{selectedSource.transformations.map((transformation) => <li key={transformation}>{transformation}</li>)}</ul>
          <h4>Known limits</h4>
          <ul>{selectedSource.knownLimits.map((limit) => <li key={limit}>{limit}</li>)}</ul>
        </section>
      )}

      <details open={!selectedClaim} className="ls-drawer-section">
        <summary>Claim types</summary>
        <div className="ls-claim-class-list">
          {Object.entries(CLAIM_CLASS_META).map(([id, meta]) => (
            <div key={id} className="ls-claim-class-list__row">
              <EvidenceBadge claimClass={id} onOpen={undefined} />
              <div>
                <strong>{meta.label}</strong>
                <p>{meta.description}</p>
              </div>
            </div>
          ))}
        </div>
      </details>

      <details className="ls-drawer-section">
        <summary>All {CLAIM_LEDGER.length} claims</summary>
        <ol className="ls-claim-ledger-list">
          {CLAIM_LEDGER.map((claim) => (
            <li key={claim.id} className={claim.id === selectedClaim?.id ? "is-selected" : ""}>
              <EvidenceBadge claimClass={claim.claimClass} claimId={claim.id} />
              <p>{claim.wording}</p>
              <small>{claim.id}</small>
            </li>
          ))}
        </ol>
      </details>

      <details className="ls-drawer-section">
        <summary>All {SOURCE_MANIFEST.length} sources</summary>
        <div className="ls-source-list">
          {SOURCE_MANIFEST.map((source) => (
            <article key={source.id} className={source.id === selectedSource?.id ? "is-selected" : ""}>
              <span>{source.publisher}</span>
              <h3><a href={source.href} target="_blank" rel="noreferrer">{source.title} ↗</a></h3>
              <p>{source.citation}</p>
              <p>{source.coverage}</p>
              <small>Retrieved {source.retrievedAt}. License: {source.licenseStatus}</small>
            </article>
          ))}
        </div>
      </details>
    </DrawerDialog>
  )
}
