import { useEffect, useState } from "react"
import { LineChart, WaterfallChart } from "semiotic/xy"
import { buildBriefing, verifyHandoff, type BriefingReading } from "./packet"
import { lineProps } from "./chart-config"
import {
  dateName,
  laterEdition,
  monthName,
  months,
  prepareMonth,
  signed,
  type JobsSnapshot,
} from "./model"
import bootstrap from "./bootstrap.json"

export default function BriefingDesk({ snapshot }: { snapshot: JobsSnapshot }) {
  const [month, setMonth] = useState("2025-06")
  const [asOf, setAsOf] = useState(laterEdition)
  const [reading, setReading] = useState<BriefingReading>("direction")
  const [reportedThen, setReportedThen] = useState(false)
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [restored, setRestored] = useState(false)
  useEffect(() => {
    const url = new URL(window.location.href)
    const requestedMonth = url.searchParams.get("month")
    const date = url.searchParams.get("vintage")
    const requestedReading = url.searchParams.get("reading") ?? "direction"
    if (requestedMonth || date) {
      if (
        requestedMonth &&
        months.includes(requestedMonth) &&
        snapshot.vintages.some((v) => v.releaseDate === date) &&
        (requestedReading === "direction" || requestedReading === "size")
      ) {
        setMonth(requestedMonth)
        setAsOf(date!)
        setReading(requestedReading)
      } else
        setMessage(
          "That link names an unavailable month or vintage. Showing the pinned June example.",
        )
    }
  }, [snapshot])
  function select(nextMonth: string, date: string, nextReading = reading) {
    setMonth(nextMonth)
    setAsOf(date)
    setReading(nextReading)
    setRestored(false)
    setMessage("")
    const url = new URL(window.location.href)
    url.searchParams.set("month", nextMonth)
    url.searchParams.set("vintage", date)
    url.searchParams.set("reading", nextReading)
    window.history.replaceState(null, "", url)
  }
  const selected = prepareMonth(snapshot, month, asOf)
  const briefing = selected.latest ? buildBriefing(snapshot, month, asOf, reading) : null
  async function download(format: "packet" | "svg" | "png" | "html" | "csv") {
    setBusy(true)
    try {
      const runtime = await import("./export-runtime")
      await runtime.downloadBriefing(snapshot, month, asOf, format, reading)
      setMessage(
        `Saved ${format.toUpperCase()} for ${monthName(month)}, using the ${dateName(asOf)} vintage. Editorial review remains pending.`,
      )
    } catch (error) {
      setMessage(`Could not export: ${(error as Error).message}`)
    } finally {
      setBusy(false)
    }
  }
  async function reopen(file?: File) {
    if (!file) return
    setRestored(false)
    try {
      if (file.size > 300000) throw new Error("This is larger than a jobs briefing packet")
      const packet = JSON.parse(await file.text())
      const saved = verifyHandoff(snapshot, packet)
      select(saved.month, saved.asOf, saved.reading)
      setRestored(true)
      setMessage(
        "Saved month, publication date, exact values and claims restored and checked against this source capture. Editorial approval is unrecorded.",
      )
    } catch (error) {
      setMessage(`Packet refused: ${(error as Error).message}`)
    }
  }
  return (
    <section className="jobs-desk" aria-labelledby="jobs-desk-title">
      <p className="jobs-kicker">At the copy desk</p>
      <h2 id="jobs-desk-title">Make your own briefing</h2>
      <p>
        Pick the month the jobs belonged to, then the date of the report you want to read. Each
        download keeps those dates with the graphic. The address bar keeps your selection, too.
      </p>
      <div className="jobs-controls">
        <label>
          Employment reference month
          <select value={month} onChange={(event) => select(event.target.value, asOf)}>
            {months.map((value) => (
              <option key={value} value={value}>
                {monthName(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estimate available in this release
          <select value={asOf} onChange={(event) => select(month, event.target.value)}>
            {snapshot.vintages.map(({ releaseDate }) => (
              <option key={releaseDate} value={releaseDate}>
                {dateName(releaseDate)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="jobs-reading">
        Briefing emphasis
        <select
          value={reading}
          onChange={(event) => select(month, asOf, event.target.value as BriefingReading)}
        >
          <option value="direction">Did the estimated direction change?</option>
          <option value="size">How large was the revision?</option>
        </select>
      </label>
      <p className="jobs-selected-summary" data-testid="jobs-selected-summary" aria-live="polite">
        {selected.summary}
      </p>
      {briefing ? (
        <>
          <div className="jobs-estimates" data-testid="jobs-estimate-cards">
            {(
              [
                ["First estimate", selected.first],
                ["Third estimate", selected.third],
                ["Chosen release", selected.latest],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{signed(value?.change ?? null)}</strong>
                <small>{value ? dateName(value.releaseDate) : "Unavailable by this date"}</small>
              </div>
            ))}
          </div>
          <div className="jobs-chart" data-testid="jobs-waterfall">
            <WaterfallChart {...briefing.props} responsiveWidth />
          </div>
          <p>
            {selected.first
              ? "The first bar starts at zero. Each following bar moves the previous endpoint by the size of a revision; the last endpoint is the chosen estimate."
              : "There is no first estimate to compare. This single bar shows only the chosen dated estimate."}
          </p>
          <p>{briefing.contract.claims[1].text}</p>
          <div className="jobs-actions" aria-label="Download this briefing">
            {(
              [
                ["packet", "Save briefing packet"],
                ["svg", "Download SVG"],
                ["png", "Download PNG"],
                ["html", "Printable HTML"],
                ["csv", "Source CSV"],
              ] as const
            ).map(([format, label]) => (
              <button key={format} disabled={busy} onClick={() => download(format)}>
                {label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="jobs-notice">
          This report predates an available estimate for {monthName(month)}. Choose a later
          publication date to build its briefing.
        </p>
      )}
      <label className="jobs-reopen">
        Reopen a saved briefing packet
        <input
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            void reopen(file)
          }}
        />
      </label>
      <p role="status" data-testid="jobs-export-status" data-restored={restored}>
        {message}
      </p>
      <h3>The monthly picture, in context</h3>
      <div className="jobs-actions" aria-label="Monthly series perspective">
        <button aria-pressed={reportedThen} onClick={() => setReportedThen(true)}>
          What was reported then?
        </button>
        <button aria-pressed={!reportedThen} onClick={() => setReportedThen(false)}>
          What this vintage says
        </button>
      </div>
      <div className="jobs-chart" data-testid="jobs-line">
        <LineChart
          {...lineProps(snapshot, asOf, reportedThen)}
          responsiveWidth
          xFormat={(value) => {
            const index = Math.round(Number(value)) - 1
            return months[index] ?? ""
          }}
        />
      </div>
      <p>
        {reportedThen
          ? "First estimates published by the selected date. October 2025 has no first estimate, so the line breaks there. These values come from different vintages; do not add them into an annual total."
          : `Every change shown here uses levels from the ${dateName(asOf)} vintage. Months not yet available remain absent.`}
      </p>
      <details className="jobs-recipe">
        <summary>Build a briefing from the command line</summary>
        <p>
          <a href={`${bootstrap.base}/kit/briefing-kit.tar.gz`} download>
            Download the complete briefing kit
          </a>
          : pinned inputs, both editions, the local command and its recipe.
        </p>
        <p>
          The <a href={`${bootstrap.base}/tools/README.md`}>complete recipe</a> explains the pinned
          inputs and local build tool. The output includes an ordinary email table, graphic, source
          CSV and the checks a reviewer still needs to make.
        </p>
        <pre>
          <code>{`node tools/cli.mjs build --source raw \\\n  --month ${month} --vintage ${asOf} --output my-briefing\nnode tools/cli.mjs check --source raw --output my-briefing --json`}</code>
        </pre>
        <p>
          A successful export is a draft, not editorial sign-off. The check preserves a{" "}
          <code>conditional</code> status until its open work has been considered. Demonstration
          receipts are explicitly labeled; none asserts a person’s approval.
        </p>
        <p>
          Compare <a href={`${bootstrap.base}/edition-a/briefing.html`}>edition A</a> with{" "}
          <a href={`${bootstrap.base}/edition-b/briefing.html`}>edition B</a>, or read their{" "}
          <a href={`${bootstrap.base}/tools/change-report.txt`}>change report</a>. The earlier
          values and claims remain available.
        </p>
      </details>
    </section>
  )
}
