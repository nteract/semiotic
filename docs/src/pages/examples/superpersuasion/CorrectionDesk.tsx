import { useMemo, useState } from "react"
import { GroupedBarChart } from "semiotic/ordinal"
import {
  inspectSourceHandoff,
  originalRows,
  originalSourceArtifact,
  reviseSourceArtifact,
  sourceChartProps,
  sourceCorrectionSidecar,
} from "../../tasks/examples/source-correction"
import { correctionComparisonProps, correctionDownload } from "./correction-desk"
import "./correction-desk.css"

export default function CorrectionDesk() {
  const original = useMemo(originalSourceArtifact, [])
  const [revised, setRevised] = useState<ReturnType<typeof reviseSourceArtifact>>()
  const [message, setMessage] = useState("")
  const [includeContext, setIncludeContext] = useState(true)
  const current = revised ?? original
  const props = current.props as ReturnType<typeof sourceChartProps>
  const rows = props.data
  const comparison = useMemo(() => correctionComparisonProps(rows), [rows])
  const sidecar = useMemo(() => sourceCorrectionSidecar(current.contract), [current.contract])
  const inspection = useMemo(
    () => inspectSourceHandoff(props, includeContext ? JSON.parse(sidecar.content) : undefined),
    [props, includeContext, sidecar.content],
  )
  const total = rows.reduce((sum, row) => sum + row.total, 0)
  const leader = rows.reduce((best, row) => (row.total > best.total ? row : best))

  function correct(reassess: boolean) {
    try {
      setRevised(reviseSourceArtifact(reassess))
      setMessage(
        "Correction applied. West now leads, and the total is 78. The earlier conclusions remain in the record. Review is still needed.",
      )
    } catch {
      setMessage(
        "The figures stay as published: changing this source also requires revisiting the total and the leading region. Use “Correct the source” to revise all three together.",
      )
    }
  }

  function download() {
    const bundle = correctionDownload(props, current.contract, includeContext)
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" }),
    )
    const link = document.createElement("a")
    link.href = url
    link.download = `regional-totals-revision-${current.contract.artifact.revision}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
    setMessage(
      includeContext
        ? "Saved the current chart, its values and the context that explains this revision. Editorial approval remains unrecorded."
        : "Saved the current chart and its values. The source history and review context were left out.",
    )
  }

  return (
    <section className="sp-correction" aria-labelledby="sp-correction-title">
      <div className="sp-correction-heading">
        <span className="sp-correction-kicker">At the correction desk</span>
        <h3 id="sp-correction-title">Can the recommendation change its mind?</h3>
        <p>
          Imagine an assistant comparing three regional totals. South looks like the leader. Then a
          correction arrives: West’s figure should be 36, twice the reported 18. A persuasive answer
          now needs to do something harder than sound confident. It needs to change.
        </p>
      </div>

      <div className="sp-correction-reading">
        <div>
          <span className="sp-correction-label">The current reading</span>
          <p className="sp-correction-conclusion" data-testid="sp-correction-conclusion">
            <strong>{leader.region}</strong> leads with {leader.total} units.
            <span>
              {" "}
              Together, the three regions add up to <strong>{total}</strong>.
            </span>
          </p>
        </div>
        <span className="sp-correction-review">Review still needed</span>
      </div>

      <div className="sp-correction-chart" data-testid="sp-correction-chart">
        <div className="sp-correction-key" aria-label="Chart key">
          <span>
            <i className="sp-correction-published" aria-hidden="true" />
            Published
          </span>
          <span>
            <i className="sp-correction-current" aria-hidden="true" />
            Current
          </span>
        </div>
        <GroupedBarChart {...comparison} />
        <p className="sp-correction-caption">
          Hatched bars keep the published figures in view. Solid bars show the current reading.
          These are invented values, chosen to make a correction easy to follow.
        </p>
      </div>

      <div className="sp-correction-actions">
        <button
          type="button"
          className="sp-correction-primary"
          disabled={Boolean(revised)}
          onClick={() => correct(true)}
        >
          {revised ? "Source corrected" : "Correct the source"}
        </button>
        {revised && (
          <button
            type="button"
            onClick={() => {
              setRevised(undefined)
              setMessage("Back to the published figures: South leads with 30; the total is 60.")
            }}
          >
            Start again
          </button>
        )}
      </div>
      <p className="sp-correction-status" role="status" data-testid="sp-correction-status">
        {message}
      </p>

      <div className="sp-correction-footnotes">
        <details>
          <summary>Follow the change</summary>
          <p>
            {revised
              ? "The correction changes two conclusions, not just one bar. Both the earlier and revised readings are kept, along with the source records they refer to."
              : "Correcting West also changes the sum and the ranking. A fresh number should prompt a fresh reading."}
          </p>
          <table>
            <caption>Published and current values, in illustrative units</caption>
            <thead>
              <tr>
                <th scope="col">Region</th>
                <th scope="col">Published</th>
                <th scope="col">Current</th>
              </tr>
            </thead>
            <tbody>
              {originalRows.map((row) => (
                <tr key={row.region}>
                  <th scope="row">{row.region}</th>
                  <td>{row.total}</td>
                  <td>{rows.find((item) => item.region === row.region)?.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="sp-correction-history" aria-label="Earlier and current conclusions">
            {current.contract.claims.map((claim) => (
              <li key={claim.id}>
                <span>{claim.status === "superseded" ? "Earlier reading" : "Current reading"}</span>
                {claim.text}
              </li>
            ))}
          </ul>
          <p>
            The record can connect a conclusion to a source and preserve its history. It cannot
            decide that a source is trustworthy or stand in for an editor’s judgment.
          </p>
          {!revised && (
            <button type="button" onClick={() => correct(false)}>
              Try changing the figures alone
            </button>
          )}
        </details>

        <details>
          <summary>What travels with the chart?</summary>
          <p>
            A saved chart can travel farther than the conversation that produced it. This copy
            contains the current totals. Keep its context and the next reader can also follow its
            earlier conclusions and see that review is still pending.
          </p>
          <label className="sp-correction-checkbox">
            <input
              type="checkbox"
              checked={includeContext}
              onChange={(event) => setIncludeContext(event.target.checked)}
            />
            Keep the source and correction context
          </label>
          <p className="sp-correction-handoff" role="status" data-testid="sp-correction-handoff">
            {inspection.status === "available"
              ? "The context matches these values. No editorial approval has been recorded."
              : inspection.status === "unavailable"
                ? "The chart keeps its values. The next reader loses the source identity, earlier conclusions and review history."
                : "This context does not match the chart. Check the source before passing it on."}
          </p>
          <button type="button" onClick={download}>
            Save this reading
          </button>
          <p className="sp-correction-caption">
            Downloads a reusable bar-chart configuration and values as JSON, with optional context.
            No account required.
          </p>
        </details>
      </div>
    </section>
  )
}
