import { useMemo, useState } from "react"
import { BarChart } from "semiotic/ordinal"
import {
  correctedRows,
  inspectSourceHandoff,
  originalRows,
  originalSourceArtifact,
  reviseSourceArtifact,
  sourceChartProps,
  sourceCorrectionNote,
  sourceCorrectionSidecar,
} from "./source-correction"
import "./source-correction.css"

function downloadText(filename: string, content: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export default function SourceCorrectionExample() {
  const original = useMemo(originalSourceArtifact, [])
  const [revised, setRevised] = useState<ReturnType<typeof reviseSourceArtifact>>()
  const [message, setMessage] = useState("Original revision: total 60; South leads with 30 units.")
  const [includeSidecar, setIncludeSidecar] = useState(true)
  const [includeNote, setIncludeNote] = useState(false)
  const current = revised ?? original
  const props = current.props as ReturnType<typeof sourceChartProps>
  const sidecar = useMemo(() => sourceCorrectionSidecar(current.contract), [current.contract])
  const handoff = useMemo(
    () => inspectSourceHandoff(props, includeSidecar ? JSON.parse(sidecar.content) : undefined),
    [props, includeSidecar, sidecar.content],
  )

  function attemptCorrection(reassess: boolean) {
    try {
      const result = reviseSourceArtifact(reassess)
      setRevised(result)
      setMessage(
        "Correction prepared: total 78; West leads with 36 units. Two previous claims were superseded. Human editorial review remains pending.",
      )
    } catch (error) {
      setMessage(`Correction refused: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <section className="source-correction-example" aria-label="Source correction demonstration">
      <p>
        The source corrects West from 18 to 36 units. That changes the total and the leading region.
        Updating the bars requires reviewing both conclusions. These are synthetic teaching values.
      </p>
      <table>
        <caption>The source correction, in units</caption>
        <thead>
          <tr>
            <th scope="col">Region</th>
            <th scope="col">Original</th>
            <th scope="col">Corrected</th>
          </tr>
        </thead>
        <tbody>
          {originalRows.map((row, index) => (
            <tr key={row.region}>
              <th scope="row">{row.region}</th>
              <td>{row.total}</td>
              <td>{correctedRows[index].total}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">Total</th>
            <td>60</td>
            <td>78</td>
          </tr>
        </tbody>
      </table>
      <div className="source-correction-actions">
        <button type="button" disabled={Boolean(revised)} onClick={() => attemptCorrection(false)}>
          Try changing data only
        </button>
        <button type="button" disabled={Boolean(revised)} onClick={() => attemptCorrection(true)}>
          Correct data and both claims
        </button>
        <button
          type="button"
          onClick={() => {
            setRevised(undefined)
            setMessage("Original revision restored: total 60; South leads with 30 units.")
          }}
        >
          Reset example
        </button>
      </div>
      <p role="status" data-testid="source-correction-status">
        {message}
      </p>
      <BarChart {...props} />
      <p>
        <strong>Displayed revision {current.contract.artifact.revision}.</strong> {props.summary}
      </p>
      <ul aria-label="Claim history">
        {current.contract.claims.map((claim) => (
          <li key={claim.id}>
            <strong>{claim.status}</strong>: {claim.text}
            {claim.supersedes?.length ? ` Replaces ${claim.supersedes.join(", ")}.` : ""}
          </li>
        ))}
      </ul>
      <p>
        Supported here means an authored claim about this fixture, with arithmetic checked in its
        tests. The contract does not prove prose true. No human editorial approval is recorded.
        {revised
          ? ` The revision evaluation is ${revised.evaluation.status}; publishable is ${String(revised.publishable)}.`
          : ""}
      </p>
      {revised && (
        <details>
          <summary>Inspect correction identities and open checks</summary>
          <p>
            Original data identity: <code>{original.contract.artifact.dataFingerprint}</code>
          </p>
          <p>
            Revised data identity: <code>{revised.contract.artifact.dataFingerprint}</code>
          </p>
          <ul>
            {revised.evaluation.manualChecks.map((check) => (
              <li key={check}>{check}</li>
            ))}
          </ul>
          <pre>{JSON.stringify(revised.contract.contestability?.corrections, null, 2)}</pre>
        </details>
      )}
      <details>
        <summary>Optional handoff: see what another reader receives</summary>
        <p>
          The chart configuration includes its values. The separate sidecar carries claims, evidence
          identifiers and correction history. The optional note records project context. You can
          keep the chart without either file.
        </p>
        <label>
          <input
            type="checkbox"
            checked={includeSidecar}
            onChange={(event) => setIncludeSidecar(event.target.checked)}
          />{" "}
          Include correction sidecar
        </label>
        <label>
          <input
            type="checkbox"
            checked={includeNote}
            onChange={(event) => setIncludeNote(event.target.checked)}
          />{" "}
          Include project maintenance note
        </label>
        <p role="status" data-testid="source-handoff-status">
          {handoff.message}
        </p>
        <p>
          An image alone cannot establish the source values, correction history or review status.
        </p>
        <div className="source-correction-actions">
          <button
            type="button"
            onClick={() =>
              downloadText(
                "regional-totals.config.json",
                JSON.stringify({ component: "BarChart", props }, null, 2),
              )
            }
          >
            Download chart configuration
          </button>
          {includeSidecar && (
            <button
              type="button"
              onClick={() => downloadText(sidecar.sidecarPath, sidecar.content)}
            >
              Download correction sidecar
            </button>
          )}
          {includeNote && (
            <button
              type="button"
              onClick={() =>
                downloadText(
                  "regional-totals-maintenance.md",
                  sourceCorrectionNote,
                  "text/markdown",
                )
              }
            >
              Download maintenance note
            </button>
          )}
        </div>
        {includeNote && <pre>{sourceCorrectionNote}</pre>}
      </details>
    </section>
  )
}
