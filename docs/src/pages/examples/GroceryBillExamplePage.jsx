import React, { lazy, Suspense, useEffect, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import ExamplePageLayout from "./ExamplePageLayout"
import snapshot from "./grocery-receipt/snapshot.json"
import { prepareBasket } from "./grocery-receipt/prepare"
import { defaultState, readReceiptSearch, receiptSearch } from "./grocery-receipt/state"
import {
  contributionSummary,
  money,
  monthName,
  percent,
  signedMoney,
  summary,
} from "./grocery-receipt/format"
import { QUALIFICATION, STORY_PATH } from "./grocery-receipt/items"
import "./GroceryBillExamplePage.css"

const ContributionChart = lazy(() =>
  import("./grocery-receipt/GroceryCharts").then((module) => ({
    default: module.ContributionChart,
  })),
)
const HistoryCharts = lazy(() =>
  import("./grocery-receipt/GroceryCharts").then((module) => ({ default: module.HistoryCharts })),
)
const editionPath = `/stories/grocery-bill/${snapshot.editionId}`

function loadSelection(search) {
  try {
    return { state: readReceiptSearch(search, snapshot), error: null }
  } catch (error) {
    return { state: null, error: error.message }
  }
}

function Quantity({ row, onChange, onError }) {
  const [draft, setDraft] = useState(String(row.quantity))
  useEffect(() => setDraft(String(row.quantity)), [row.quantity])
  function commit() {
    const quantity = Number(draft)
    if (
      draft.trim() === "" ||
      !Number.isFinite(quantity) ||
      quantity < 0 ||
      quantity > 100 ||
      !Number.isInteger(quantity * 4)
    ) {
      onError("Use quantities from 0 to 100, in steps of 0.25.")
      setDraft(String(row.quantity))
    } else onChange(quantity)
  }
  return (
    <div className="grocery-stepper">
      <button
        type="button"
        aria-label={`Decrease ${row.label} quantity`}
        disabled={row.quantity === 0}
        onClick={() => onChange(Math.max(0, row.quantity - 0.25))}
      >
        -
      </button>
      <input
        type="number"
        min="0"
        max="100"
        step="0.25"
        inputMode="decimal"
        aria-label={`${row.label} quantity in ${row.quantityUnit}`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur()
        }}
      />
      <button
        type="button"
        aria-label={`Increase ${row.label} quantity`}
        disabled={row.quantity === 100}
        onClick={() => onChange(Math.min(100, row.quantity + 0.25))}
      >
        +
      </button>
      <span>{row.quantityUnit}</span>
    </div>
  )
}

function Receipt({ receipt, side }) {
  const before = side === "before"
  return (
    <section
      className={`grocery-receipt grocery-receipt--${side}`}
      aria-label={`${before ? "Baseline" : "Comparison"} receipt`}
    >
      <p className="grocery-mono">
        {before ? "THE RECEIPT YOU REMEMBER" : "THE SAME THINGS, ANOTHER DATE"}
      </p>
      <h2>{monthName(receipt.state[side])}</h2>
      <p className="grocery-receipt-note">BLS national averages / USD</p>
      <ol>
        {receipt.rows.map((row) => (
          <li key={row.itemId}>
            <span>
              <b>{row.label}</b>
              <small>
                {row.quantity} {row.quantityUnit} at{" "}
                {money(before ? row.beforePriceUSD : row.afterPriceUSD, 3)} / {row.quantityUnit}
              </small>
            </span>
            <strong>{money(before ? row.beforeUSD : row.afterUSD)}</strong>
            {!row.included && row.quantity > 0 && (
              <small className="grocery-row-note">Excluded from both dates</small>
            )}
          </li>
        ))}
      </ol>
      <div className="grocery-receipt-total">
        <span>TOTAL</span>
        <strong data-testid={`${side}-total`}>
          {money(before ? receipt.beforeUSD : receipt.afterUSD)}
        </strong>
      </div>
      <p className="grocery-receipt-note">
        Same quantities.{" "}
        {receipt.state.mode === "comparable-subset" ? "Comparable subset." : "Fixed basket."}
      </p>
    </section>
  )
}

export default function GroceryBillExamplePage() {
  const { search } = useLocation()
  const [selection, setSelection] = useState(() => loadSelection(search))
  const [message, setMessage] = useState("")
  const [exporting, setExporting] = useState(false)
  const [exportSize, setExportSize] = useState("phone")
  useEffect(() => setSelection(loadSelection(search)), [search])
  const receipt = useMemo(
    () => (selection.state ? prepareBasket(snapshot, selection.state) : null),
    [selection.state],
  )
  const authored = useMemo(() => prepareBasket(snapshot, defaultState(snapshot)), [])
  function update(changes) {
    setSelection((previous) => ({ state: { ...previous.state, ...changes }, error: null }))
    setMessage("")
  }
  function reset() {
    setSelection({ state: defaultState(snapshot), error: null })
    setMessage("Restored the authored basket and comparison months.")
  }
  function preset(name) {
    const initial = defaultState(snapshot)
    if (name === "missing") initial.after = "2020-05"
    if (name === "meat-free")
      initial.quantities = initial.quantities.map((row) => ({
        ...row,
        quantity: ["chicken", "chuck"].includes(row.itemId) ? 0 : row.quantity,
      }))
    if (name === "high-egg")
      initial.quantities = initial.quantities.map((row) => ({
        ...row,
        quantity: row.itemId === "eggs" ? 4 : row.quantity,
      }))
    setSelection({ state: initial, error: null })
    setMessage("Preset applied, including its comparison months.")
  }
  async function download(format) {
    setExporting(true)
    setMessage("")
    try {
      const exports = await import("./grocery-receipt/exports")
      let blob
      if (format === "json") {
        const { buildReceiptPacket } = await import("./grocery-receipt/packet")
        blob = new Blob([JSON.stringify(buildReceiptPacket(snapshot, receipt.state), null, 2)], {
          type: "application/json",
        })
      } else if (format === "html")
        blob = new Blob([exports.renderReceiptHTML(receipt, snapshot)], { type: "text/html" })
      else {
        const svg = exports.renderReceiptSVG(receipt, snapshot, exportSize)
        blob =
          format === "png"
            ? await exports.receiptPNG(svg)
            : new Blob([svg], { type: "image/svg+xml" })
      }
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `grocery-${receipt.state.before}-${receipt.state.after}-${exportSize}.${format}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage(
        `Saved the ${monthName(receipt.state.before)} / ${monthName(receipt.state.after)} comparison as ${format.toUpperCase()}.`,
      )
    } catch (error) {
      setMessage(`Export failed: ${error.message}`)
    } finally {
      setExporting(false)
    }
  }
  const ranked = receipt
    ? receipt.rows
        .filter((row) => row.quantity > 0 && row.included && row.contributionUSD !== null)
        .sort((a, b) => Math.abs(b.contributionUSD) - Math.abs(a.contributionUSD))
    : []
  const march = receipt?.history.find((row) => row.month === "2025-03")?.costUSD
  const june = receipt?.history.find((row) => row.month === "2025-06")?.costUSD
  return (
    <ExamplePageLayout
      title="Your grocery bill has a memory"
      showPageHeader={false}
      showViewToggle={false}
      showContractPanels={false}
    >
      <article className="grocery-story">
        <header className="grocery-opening">
          <div className="grocery-edition">
            <span>THE EVERYDAY ECONOMY / 01</span>
            <span>Saved BLS edition / 2019-2025</span>
          </div>
          <p className="grocery-kicker">Six familiar things. Two different totals.</p>
          <h1>
            Your grocery bill
            <br />
            has a <em>memory.</em>
          </h1>
          <p className="grocery-deck">
            The receipt remembers prices you no longer see on the shelf. Put the same few things in
            the basket, and see where the difference comes from.
          </p>
          <p className="grocery-opening-fact">
            Our illustrative basket went from <b>{money(authored.beforeUSD)}</b> in June 2019 to{" "}
            <b>{money(authored.afterUSD)}</b> in June 2025. That is{" "}
            <b>{signedMoney(authored.differenceUSD)}</b>, with exactly the same quantities.
          </p>
          <a href="#your-basket" className="grocery-jump">
            Make the comparison yours <span aria-hidden="true">&darr;</span>
          </a>
          <p className="grocery-qualification">
            {QUALIFICATION}. This is not your actual shopping bill or the official CPI.
          </p>
        </header>

        <section className="grocery-section" id="your-basket" aria-labelledby="basket-heading">
          <p className="grocery-chapter">01 / SAME BASKET, TWO DATES</p>
          <h2 id="basket-heading">What stayed in the bag?</h2>
          <p>
            Two pounds of bananas. Two pounds of white bread. A dozen eggs, a gallon of milk, four
            pounds of whole chicken, and a pound of ground chuck. This is a small shopping
            selection, not a weekly meal plan. Keeping it fixed lets us ask a narrow question: what
            changed when the prices changed?
          </p>
          {selection.error ? (
            <div role="alert" className="grocery-notice">
              <h3>This saved comparison is unresolved</h3>
              <p>{selection.error}</p>
              <p>No substitute receipt is being shown.</p>
              <button onClick={reset}>Start a new comparison with the authored basket</button>
            </div>
          ) : (
            <>
              <div className="grocery-date-controls">
                {[
                  ["before", "Baseline month"],
                  ["after", "Comparison month"],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <select
                      aria-label={label}
                      value={receipt.state[key]}
                      onChange={(event) => update({ [key]: event.target.value })}
                    >
                      {snapshot.months.map((month) => (
                        <option key={month} value={month}>
                          {monthName(month)}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <button onClick={reset}>Reset basket and dates</button>
              </div>
              <div className="grocery-receipt-pair">
                <Receipt receipt={receipt} side="before" />
                <Receipt receipt={receipt} side="after" />
              </div>
              <div
                className="grocery-current-answer"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <span>THE DIFFERENCE</span>
                <strong>{signedMoney(receipt.differenceUSD)}</strong>
                <p>{summary(receipt)}</p>
              </div>
              <div
                className="grocery-mobile-comparison"
                role="region"
                aria-label="Aligned before and after receipt"
              >
                <div className="grocery-mobile-dates">
                  <span>Same quantities</span>
                  <span>{monthName(receipt.state.before)}</span>
                  <span>{monthName(receipt.state.after)}</span>
                </div>
                {receipt.rows.map((row) => (
                  <div className="grocery-mobile-row" key={row.itemId}>
                    <span>
                      <b>{row.label}</b>
                      <small>
                        {row.quantity} {row.quantityUnit}
                      </small>
                    </span>
                    <strong>{money(row.beforeUSD)}</strong>
                    <strong>{money(row.afterUSD)}</strong>
                  </div>
                ))}
              </div>
              <fieldset className="grocery-quantities">
                <legend>Keep your quantities the same in both months</legend>
                {receipt.rows.map((row) => (
                  <div className="grocery-quantity-row" key={row.itemId}>
                    <label>
                      {row.label}
                      <small>
                        {row.quantityUnit === "lb"
                          ? "Priced by weight, not by package"
                          : row.quantityUnit === "dozen"
                            ? "A quarter dozen is three eggs"
                            : "A quarter gallon is one quart"}
                      </small>
                    </label>
                    <Quantity
                      row={row}
                      onError={setMessage}
                      onChange={(quantity) =>
                        update({
                          quantities: receipt.state.quantities.map((entry) =>
                            entry.itemId === row.itemId ? { ...entry, quantity } : entry,
                          ),
                        })
                      }
                    />
                  </div>
                ))}
              </fieldset>
              <div className="grocery-presets">
                <span>Try a different basket:</span>
                <button onClick={() => preset("meat-free")}>Meat-free</button>
                <button onClick={() => preset("high-egg")}>Four dozen eggs</button>
                <button onClick={() => preset("missing")}>
                  A month with missing chicken prices
                </button>
              </div>
              {(receipt.rows.some((row) => row.quantity > 0 && row.missingMonths.length) ||
                receipt.state.mode === "comparable-subset") && (
                <div className="grocery-notice">
                  <h3>
                    {receipt.state.mode === "basket"
                      ? "A missing price is not a zero."
                      : "You are comparing a smaller basket."}
                  </h3>
                  <p>
                    {receipt.rows
                      .filter((row) => row.quantity > 0 && row.missingMonths.length)
                      .map(
                        (row) =>
                          `${row.label}: no price for ${row.missingMonths.map(monthName).join(" or ")}.`,
                      )
                      .join(" ") || "All selected prices are available for these dates."}
                  </p>
                  <p>
                    A comparable subset removes any item missing at either date from both receipts
                    and the entire timeline. The saved comparison records that choice.
                  </p>
                  <label className="grocery-checkbox">
                    <input
                      type="checkbox"
                      checked={receipt.state.mode === "comparable-subset"}
                      onChange={(event) =>
                        update({ mode: event.target.checked ? "comparable-subset" : "basket" })
                      }
                    />
                    Use an explicitly labeled comparable subset
                  </label>
                  <p>{receipt.scope}</p>
                </div>
              )}
            </>
          )}
        </section>

        {receipt && (
          <>
            <section className="grocery-section" aria-labelledby="contribution-heading">
              <p className="grocery-chapter">02 / FOLLOW THE EXTRA DOLLARS</p>
              <h2 id="contribution-heading">The difference has ingredients.</h2>
              <p>{contributionSummary(receipt)}</p>
              <p>
                An expensive item does not necessarily explain the biggest increase. Each
                contribution multiplies the change in a unit price by the quantity in the bag. Four
                pounds of chicken give a modest change per pound four chances to affect the total;
                setting its quantity to zero removes its contribution entirely.
              </p>
              <Suspense fallback={<p>The item contributions are listed below.</p>}>
                <ContributionChart receipt={receipt} />
              </Suspense>
              <ol className="grocery-ranked">
                {ranked.map((row) => (
                  <li key={row.itemId}>
                    <a href={`https://data.bls.gov/timeseries/${row.seriesId}`}>{row.label}</a>
                    <span>
                      {row.quantity} {row.quantityUnit}
                    </span>
                    <b>{signedMoney(row.contributionUSD)}</b>
                  </li>
                ))}
              </ol>
              <p className="grocery-small">
                Signed dollar changes, ordered by absolute contribution. Equal contributions are
                tied. Each item links to its BLS unit-price series. Calculations use source
                precision; individually rounded lines may not add to the displayed rounded total.
              </p>
              <details className="grocery-comparison-table">
                <summary>Inspect all quantities, unit prices, and contributions</summary>
                <div
                  className="grocery-table-scroll"
                  role="region"
                  tabIndex={0}
                  aria-label="Accessible receipt comparison table"
                >
                  <table>
                    <caption>
                      {monthName(receipt.state.before)} / {monthName(receipt.state.after)}.{" "}
                      {receipt.scope} Unit prices are USD per listed unit; costs and contributions
                      are USD. Required missing prices make the complete comparison unavailable.
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Item</th>
                        <th scope="col">Quantity</th>
                        <th scope="col">Before unit price</th>
                        <th scope="col">After unit price</th>
                        <th scope="col">Before cost</th>
                        <th scope="col">After cost</th>
                        <th scope="col">Contribution</th>
                        <th scope="col">Included</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipt.rows.map((row) => (
                        <tr key={row.itemId}>
                          <th scope="row">{row.label}</th>
                          <td>
                            {row.quantity} {row.quantityUnit}
                          </td>
                          <td>{money(row.beforePriceUSD, 3)}</td>
                          <td>{money(row.afterPriceUSD, 3)}</td>
                          <td>{money(row.beforeUSD, 3)}</td>
                          <td>{money(row.afterUSD, 3)}</td>
                          <td>{signedMoney(row.contributionUSD)}</td>
                          <td>
                            {row.quantity === 0
                              ? "No: zero quantity"
                              : row.included
                                ? "Yes"
                                : "No: comparable subset"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>

            <section className="grocery-section" aria-labelledby="history-heading">
              <p className="grocery-chapter">03 / HIGHER IS NOT THE SAME AS FASTER</p>
              <h2 id="history-heading">
                Prices can ease.
                <br />
                The old total can stay out of reach.
              </h2>
              {march !== null && june !== null && march > 0 && (
                <p className="grocery-pullquote">
                  For the quantities and scope currently selected, March 2025 cost {money(march)}{" "}
                  and June 2025 cost {money(june)}: {percent(((june - march) / march) * 100)} over
                  those three months.
                </p>
              )}
              <p>
                That shorter comparison offers a useful counterexample to the idea of an
                uninterrupted climb. A price can fall from a recent peak while remaining above its
                earlier level. In the authored basket, a dozen eggs cost $6.227 in March 2025,
                $3.775 in June 2025, and $1.203 in June 2019. Those statements describe different
                comparisons, and all three can be true.
              </p>
              <p>
                The first view below asks how many dollars the selected basket would cost in each
                month. The second asks how much that cost changed from the same month one year
                earlier. Its baseline moves every month. A smaller positive percentage means prices
                rose more slowly; only a negative percentage means this basket costs less than a
                year before. Neither says it returned to the 2019 price.
              </p>
              <Suspense
                fallback={
                  <p>
                    Monthly chart enhancements are loading. The saved data packet includes every
                    monthly value.
                  </p>
                }
              >
                <HistoryCharts receipt={receipt} />
              </Suspense>
              <p className="grocery-small">
                The series covers January 2019 through December 2025. January-December 2018 supplies
                the first annual comparisons. A gap means a required price is unavailable. A missing
                baseline also makes the following year's percentage unavailable. No line bridges
                those gaps.
              </p>
            </section>

            <section className="grocery-section grocery-limits" aria-labelledby="limits-heading">
              <p className="grocery-chapter">04 / WHAT THIS RECEIPT CAN REMEMBER</p>
              <h2 id="limits-heading">A national average is not your corner store.</h2>
              <p>
                You may buy different bread, find a sale, switch brands, or shop somewhere with
                quite different prices. The BLS series describe selected product categories across
                the U.S. city average. They do not describe a particular store, package, brand, or
                household. A pound of white pan bread is a weight, not a promise about the size of a
                loaf.
              </p>
              <p>
                Changing the quantities changes the question. Removing meat tells us what this
                smaller selection would have cost at the listed average prices. It does not
                establish what a household saved, what it bought instead, or whether the basket
                meets anyone's dietary needs. Holding quantities fixed makes the arithmetic
                interpretable, but it deliberately leaves those shopping decisions outside the
                comparison.
              </p>
              <p>
                The{" "}
                <a href="https://www.bls.gov/opub/hom/cpi/concepts.htm">
                  official Consumer Price Index
                </a>{" "}
                has a broader measurement framework. This six-item calculation does not reproduce
                that index or its treatment of changing products and quality. These data also do not
                establish why prices changed. A contribution explains the arithmetic of this
                receipt, not the cause of a price increase.
              </p>
              <p>
                The answer is narrower, and useful on its own: <b>{summary(receipt)}</b> You can
                inspect every ingredient of that difference, change the selection, and keep the
                comparison you actually made.
              </p>
            </section>

            <section className="grocery-section grocery-save" aria-labelledby="save-heading">
              <p className="grocery-chapter">05 / KEEP THE RECEIPT</p>
              <h2 id="save-heading">
                Same comparison.
                <br />
                Wherever you take it.
              </h2>
              <p>
                The link remembers all six quantities, both dates, and any subset choice. Images
                keep their source date and limitations; the data packet also keeps the original
                price precision.
              </p>
              <a
                className="grocery-permalink"
                href={`${STORY_PATH}${receiptSearch(receipt.state)}`}
              >
                Open a link to this exact comparison
              </a>
              <label className="grocery-export-size">
                Receipt size
                <select aria-label="Receipt size" value={exportSize} onChange={(event) => setExportSize(event.target.value)}>
                  <option value="phone">Phone, 390 pixels wide</option>
                  <option value="print">Print, 760 pixels wide</option>
                </select>
              </label>
              <div className="grocery-downloads">
                {[
                  ["svg", "Download SVG"],
                  ["png", "Download PNG"],
                  ["html", "Accessible HTML"],
                  ["json", "Data packet"],
                ].map(([format, label]) => (
                  <button key={format} disabled={exporting} onClick={() => download(format)}>
                    {label}
                  </button>
                ))}
              </div>
              <p className="grocery-small">
                A saved image cannot update itself. Reopen the source link to see edition and
                correction notes. These are historical observations retrieved on{" "}
                {snapshot.retrievedAt.slice(0, 10)} UTC, not a live price feed.
              </p>
            </section>
          </>
        )}
        <p className="grocery-feedback" role="status" aria-live="polite">
          {message}
        </p>
        <footer className="grocery-section grocery-sources" id="sources">
          <p className="grocery-chapter">SOURCE NOTES / SAVED EDITION</p>
          <h2>Open the books.</h2>
          <p>
            Edition <code>{snapshot.editionId}</code>. Retrieved {snapshot.retrievedAt}. No
            successor or editorial correction is recorded for this first edition. Source publication
            and revision times were not supplied by the API response.
          </p>
          <p>
            <a href="https://www.bls.gov/charts/consumer-price-index/consumer-price-index-average-price-data.htm">
              BLS selected-item price table
            </a>{" "}
            / <a href="https://download.bls.gov/pub/time.series/ap/ap.series">Series dictionary</a>{" "}
            / <a href="https://www.bls.gov/bls/linksite.htm">BLS reuse guidance</a>
          </p>
          <div className="grocery-source-links">
            <a href={`${editionPath}/prices.csv`}>All six price series (CSV)</a>
            <a href={`${editionPath}/manifest.json`}>Source manifest and field dictionary</a>
            <a href={`${editionPath}/default.html`}>Authored comparison as accessible HTML</a>
            <a href={`${editionPath}/default.packet.json`}>Authored data packet</a>
            <a href={`${editionPath}/README.md`}>Reproduction instructions</a>
          </div>
          <details>
            <summary>How this was made, and what remains to be checked</summary>
            <p>
              One pure preparation function supplies the receipts, contribution chart, monthly
              series, accessible tables, and exports. Source prices and quantities are calculated in
              integer units of 1/4000 USD. The downloadable packet includes the price snapshot,
              state, numerical checks, and an Artifact Contract with editorial review still pending.
            </p>
            <p>
              The source builder checks all 504 displayed item/month positions against the BLS
              selected-item table. Missing prices are retained. Raw downloads and SHA-256 checksums
              are in the manifest.{" "}
              <a href={`${editionPath}/raw/prices.json`}>Inspect the original API response</a>.
            </p>
            <p>
              This is the first implementation of E01. Real-phone performance measurements,
              assistive-technology reader sessions, the five-reader study, and the full shared
              acceptance gates remain open. This page does not claim to have passed them.
            </p>
            <p>
              The independent consumer uses <code>semiotic/artifact</code> and{" "}
              <code>semiotic/server</code> with a documented host adapter:{" "}
              <a href={`${editionPath}/adapter.mjs`}>adapter</a> /{" "}
              <a href={`${editionPath}/consumer.mjs`}>consumer</a>.
            </p>
          </details>
        </footer>
      </article>
    </ExamplePageLayout>
  )
}
