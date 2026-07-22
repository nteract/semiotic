import React from "react"
import { auditData } from "semiotic/ai"

function contractLabel(contract) {
  const requirements = contract.requirements
    .filter((requirement) => requirement !== "finite")
    .join(", ")
  const missing = contract.missingValue !== undefined
    ? `missing → ${contract.missingValue}`
    : contract.allowMissing ? "gaps allowed" : "values required"
  return `${contract.role}: ${contract.accessor}${contract.domain ? " · scale domain" : ""}${requirements ? ` · ${requirements}` : ""} · ${missing}`
}

/**
 * Compact numeric preflight shared by every schema-driven playground.
 * It intentionally audits data math only; configuration/deception and
 * accessibility checks keep their richer dedicated surfaces.
 */
export default function PlaygroundDiagnostics({ componentName, chartProps }) {
  // This runs during live playground render, so keep it linear; callers can
  // opt into exact IQR sorting through auditData or ChartContainer.
  const result = auditData(componentName, chartProps, undefined, { checkOutliers: false })
  if (result.summary.fieldsChecked === 0 && result.diagnoses.length === 0) return null

  const status = result.summary.errors > 0
    ? "error"
    : result.summary.warnings > 0
      ? "warning"
      : "safe"
  const headline = status === "safe"
    ? `Data safe · ${result.summary.fieldsChecked} numeric field${result.summary.fieldsChecked === 1 ? "" : "s"} checked`
    : `${result.summary.errors} error${result.summary.errors === 1 ? "" : "s"} · ${result.summary.warnings} warning${result.summary.warnings === 1 ? "" : "s"}`

  return (
    <section
      className={`playground-diagnostics playground-diagnostics--${status}`}
      aria-label="Numeric data diagnostics"
      aria-live="polite"
    >
      <details>
        <summary>
          <span className="playground-diagnostics-dot" aria-hidden="true" />
          <strong>{headline}</strong>
          <span className="playground-diagnostics-hint">Data Truth Lens</span>
        </summary>

        {result.diagnoses.length > 0 ? (
          <ol className="playground-diagnostics-list">
            {result.diagnoses.map((finding, index) => (
              <li key={`${finding.code}-${finding.field || "chart"}-${index}`}>
                <div>
                  <code>{finding.code}</code>
                  {finding.field && <span> · {finding.field}</span>}
                </div>
                <p>{finding.message}</p>
                {finding.fix && <p className="playground-diagnostics-fix">Fix: {finding.fix}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <div className="playground-diagnostics-contracts">
            <p>The current data satisfies this chart&rsquo;s declared numeric contract:</p>
            <ul>
              {result.contracts.map((contract, index) => (
                <li key={`${contract.role}-${contract.accessor}-${index}`}>
                  <code>{contractLabel(contract)}</code>
                </li>
              ))}
            </ul>
          </div>
        )}
      </details>
    </section>
  )
}
