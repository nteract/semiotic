import React, { lazy, Suspense } from "react"
import ExamplePageLayout from "./ExamplePageLayout"
import { SEASON_DAYS, waterYear } from "./reservoir-guide/calendar"
import {
  collectionSummary,
  dateLabel,
  guideSummary,
  monthDayLabel,
  number,
  percent,
  readingLabel,
} from "./reservoir-guide/format"
import { GuideTable, ReservoirLocator, SourceDetails } from "./reservoir-guide/GuideDetails"
import { bootstrap, useGuideHost } from "./reservoir-guide/useGuideHost"
import { DICTIONARY } from "./reservoir-guide/dictionary"
import { stateSearch, STORY_URL } from "./reservoir-guide/state"
import "./ReservoirGuideExamplePage.css"
import { distributionDescription, distributionReferences } from "./reservoir-guide/chart-config"

const GuideCharts = lazy(() => import("./reservoir-guide/GuideCharts"))

export default function ReservoirGuideExamplePage() {
  return (
    <ExamplePageLayout
      prevPage={undefined}
      nextPage={undefined}
      title="How full is full?"
      showPageHeader={false}
      showViewToggle={false}
      showContractPanels={false}
      useFullCodeFallback={false}
    >
      <ReservoirGuideStory />
    </ExamplePageLayout>
  )
}

function ReservoirGuideStory() {
  const host = useGuideHost()
  const { guide, header, state, snapshot } = host
  const editionRoot = `/stories/reservoir-guide/${header.editionId}`
  const years = Array.from(
    { length: waterYear(header.endDate) - waterYear(header.startDate) + 1 },
    (_, i) => waterYear(header.endDate) - i,
  )
  const set = (patch: Partial<typeof state>) => host.select({ ...state, ...patch })
  return (
    <article className="reservoir-story">
      <header className="reservoir-opening" data-server-opening>
        <p className="reservoir-eyebrow">Field notes / California water / 03</p>
        <h1>
          How full
          <br />
          is full?
        </h1>
        <p className="reservoir-deck">
          A reservoir can be above average and still have plenty of room. Three numbers tell three
          different stories about the same water.
        </p>
        <div className="reservoir-opening-values" aria-label="Shasta on July 30, 2025">
          <p>
            <strong>
              72<span>%</span>
            </strong>
            <span>of capacity</span>
          </p>
          <p>
            <strong>
              105<span>%</span>
            </strong>
            <span>of the seasonal mean</span>
          </p>
          <p>
            <strong>
              50<span>th</span>
            </strong>
            <span>historical percentile</span>
          </p>
        </div>
        <p className="reservoir-opening-caption">
          Shasta · July 30, 2025 · 3,258,792 acre-feet. Seasonal comparisons use 30 eligible
          observations for this calendar date in water years 1991–2020. Rounded for this opening.
        </p>
        <p>
          A lake can look reassuringly blue while a water chart asks a more precise question. How
          much space is left? How does this date compare with other years? And what can one
          reservoir tell us about drought?
        </p>
        <p className="reservoir-edition-label">
          Historical edition · observations through September 30, 2025 · retrieved September 5,
          2026. These are six selected reservoirs, not all California storage.
        </p>
      </header>

      <section className="reservoir-reading" aria-labelledby="reservoir-first-finding">
        <p className="reservoir-section-number">01 / A denominator changes the story</p>
        <h2 id="reservoir-first-finding">Above average does not mean almost full.</h2>
        <p>
          On July 30, 2025, Shasta held 3.26 million acre-feet. Divide that by its documented
          4.55-million-acre-foot capacity and you get 71.6%. The first number describes room in a
          reservoir.
        </p>
        <p>
          Divide the same water by the mean for July 30 in our fixed historical window—3.12 million
          acre-feet—and you get 104.6%. That second number describes a seasonal comparison. Neither
          denominator cancels the other.
        </p>
        <p>
          The third number asks about order, not size. Fifteen of the 30 eligible historical values
          were lower, and none tied: a 50th-percentile reading. A few particularly low years can
          pull down a mean. Being above that mean does not automatically put a reading high in the
          historical ranking.
        </p>
        <p>
          That is why “above average” is a useful observation, but a poor substitute for naming the
          question.
        </p>
      </section>

      <section className="reservoir-guide" aria-labelledby="reservoir-guide-title">
        <div className="reservoir-section-heading">
          <div>
            <p className="reservoir-section-number">Your field guide</p>
            <h2 id="reservoir-guide-title">One reservoir. Two years.</h2>
          </div>
          <span>October → September</span>
        </div>
        <p>
          Choose a reporting date inside a water year. The seasonal comparison always matches the
          month and day, including February 29.
        </p>
        <fieldset disabled={!snapshot || host.busy}>
          <legend>Choose the reservoir and comparison</legend>
          <div className="reservoir-controls">
            <label>
              Reservoir
              <select
                aria-label="Reservoir"
                value={state.stationId}
                onChange={(e) => set({ stationId: e.target.value })}
              >
                {header.reservoirs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Selected water year
              <select
                aria-label="Selected water year"
                value={state.waterYear}
                onChange={(e) => set({ waterYear: Number(e.target.value) })}
              >
                {years.map((year) => (
                  <option key={year}>{year}</option>
                ))}
              </select>
            </label>
            <label>
              Comparison water year
              <select
                aria-label="Comparison water year"
                value={state.comparisonYear}
                onChange={(e) => set({ comparisonYear: Number(e.target.value) })}
              >
                {years.map((year) => (
                  <option key={year}>{year}</option>
                ))}
              </select>
            </label>
            <label>
              Calendar date
              <select
                aria-label="Calendar date"
                value={state.monthDay}
                onChange={(e) => set({ monthDay: e.target.value })}
              >
                {SEASON_DAYS.map((day) => (
                  <option key={day} value={day}>
                    {monthDayLabel(day)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
        <div className="reservoir-actions">
          <button disabled={!snapshot || host.busy} onClick={host.reset}>
            Shasta opening
          </button>
          <button
            disabled={!snapshot || host.busy}
            onClick={() =>
              set({ stationId: "ORO", waterYear: 2025, comparisonYear: 2021, monthDay: "07-30" })
            }
          >
            Oroville’s changed measure
          </button>
          <button
            disabled={!snapshot || host.busy}
            onClick={() =>
              set({ stationId: "DNP", waterYear: 1993, comparisonYear: 2025, monthDay: "07-30" })
            }
          >
            Inspect a missing reading
          </button>
          <button
            disabled={!snapshot || host.busy}
            onClick={() =>
              set({ stationId: "SHA", waterYear: 2024, comparisonYear: 2025, monthDay: "02-29" })
            }
          >
            Try leap day
          </button>
        </div>
        {host.issue && (
          <div role="alert" className="reservoir-notice">
            <p>{host.issue}</p>
            <p>
              Saved selection: {state.stationId}, water years {state.waterYear} /{" "}
              {state.comparisonYear}, {state.monthDay}, baseline {state.baselineId}, edition{" "}
              {state.editionId}.
            </p>
            <button onClick={host.reset}>Choose the opening selection in this edition</button>
          </div>
        )}
        {!snapshot && (
          <p>
            <button onClick={host.retry}>Retry loading the history</button>
          </p>
        )}
        {guide && (
          <div
            data-testid="reservoir-active-guide"
            data-station={state.stationId}
            data-year={state.waterYear}
            data-month-day={state.monthDay}
          >
            <div className="reservoir-active-heading">
              <h3>{guide.reservoir.name}</h3>
              <p>{dateLabel(guide.date)}</p>
            </div>
            <p className="reservoir-volume" data-testid="reservoir-storage">
              {readingLabel(guide.reading)}
            </p>
            <div className="reservoir-metrics">
              <div>
                <span>How full?</span>
                <strong>{percent(guide.capacity.percent)}</strong>
                <p>
                  {guide.capacity.mode === "dated"
                    ? "of documented capacity"
                    : "of the July 30, 2025 capacity reference"}
                </p>
                <small>{number(guide.capacity.capacity?.acreFeet ?? null)} AF denominator</small>
              </div>
              <div>
                <span>How much versus the mean?</span>
                <strong>{percent(guide.baseline.percentOfMean)}</strong>
                <p>of the compatible seasonal mean</p>
                <small>
                  {number(guide.baseline.mean, 2)} AF · {guide.baseline.count} eligible years
                </small>
              </div>
              <div>
                <span>Where in the historical order?</span>
                <strong>
                  {guide.baseline.percentile === null
                    ? "Unavailable"
                    : `${number(guide.baseline.percentile, 1)}`}
                </strong>
                <p>percentile · minimum 20 years</p>
                <small>
                  {guide.baseline.less} lower · {guide.baseline.equal} ties
                </small>
              </div>
            </div>
            {guide.baseline.reason && <p className="reservoir-notice">{guide.baseline.reason}</p>}
            <figure className="reservoir-distribution" data-testid="reservoir-distribution">
              <figcaption>
                <h3>See the years behind “average”</h3>
              </figcaption>
              <p>{distributionDescription(guide)}</p>
              {snapshot && guide.baseline.count > 0 ? (
                <Suspense
                  fallback={
                    <p>
                      Preparing the historical dots. Baseline readings remain in the source details
                      below.
                    </p>
                  }
                >
                  <GuideCharts guide={guide} kind="distribution" />
                </Suspense>
              ) : (
                <p>No eligible historical dots to draw for this comparison.</p>
              )}
              <ul className="reservoir-distribution-key">
                {distributionReferences(guide).map((r) => (
                  <li key={r.name}>
                    <svg width="30" height="12" aria-hidden="true">
                      <line
                        x1="0"
                        x2="30"
                        y1="6"
                        y2="6"
                        stroke={r.color}
                        strokeWidth="2"
                        strokeDasharray={r.dash}
                      />
                    </svg>
                    {r.name}: {number(r.value)} AF
                  </li>
                ))}
              </ul>
              <p>
                Fullness compares the reading with capacity. Percent of average compares it with the
                mean. Percentile counts its place among these dots. A few very low years can pull
                the mean below a reading that sits near the middle of the ordering.
              </p>
            </figure>
            {guide.capacity.aboveReference && (
              <p className="reservoir-notice">
                Storage exceeds the stated capacity reference. This comparison has not been clamped
                to 100%.
              </p>
            )}
            {guide.capacity.mode === "reference" && (
              <p>
                The capacity report supports July 30, 2025 only. This reference comparison does not
                reconstruct how full the reservoir was relative to its capacity on another date.
              </p>
            )}
            <p className="reservoir-sr-summary" data-testid="reservoir-summary">
              {guideSummary(guide)}
            </p>
            {guide.reservoir.changes.map((change) => (
              <p key={change.id} className="reservoir-notice">
                {change.explanation} The two reported volume traces may use different measurement
                bases.
              </p>
            ))}
            <div className="reservoir-line-key">
              <span>━ Selected WY {state.waterYear}</span>
              <span>━ Compare WY {state.comparisonYear}</span>
              <span>━ Compatible 1991–2020 mean</span>
            </div>
            {snapshot && (
              <Suspense
                fallback={
                  <p>Preparing the seasonal chart. The values and table remain available.</p>
                }
              >
                <GuideCharts guide={guide} kind="season" />
              </Suspense>
            )}
            <p>
              Lines show stored volume in million acre-feet. Missing and estimated observations
              break a line. The mean can use a different number of eligible years on each date; the
              table records that count.
            </p>
            {snapshot && <GuideTable guide={guide} />}
            <SourceDetails guide={guide} />
          </div>
        )}
        <p className="reservoir-status" role="status">
          {host.status}
        </p>
      </section>

      <section className="reservoir-reading" aria-labelledby="reservoir-second-finding">
        <p className="reservoir-section-number">02 / Six reservoirs are not six equal shares</p>
        <h2 id="reservoir-second-finding">A percentage does not tell you the size of the lake.</h2>
        <p>
          Folsom stood at about 60% of capacity on the opening date; Don Pedro at about 87%. Those
          percentages describe different-sized stores. Adding percentages would give each reservoir
          the same weight regardless of the water it can hold.
        </p>
        <p>
          For these six reservoirs on July 30, sum the stored water first: 12,164,697 acre-feet.
          Then sum the matching capacities: 15,831,403 acre-feet. Their ratio is 76.8%. Both sums
          must include exactly the same members.
        </p>
        <p>
          A missing reading changes what the collection represents. In the guide below, an excluded
          reservoir leaves both sums and is named. An absent observation never contributes a
          reassuring zero—or an invented full reservoir.
        </p>
      </section>
      {guide && (
        <section className="reservoir-collection" aria-labelledby="reservoir-collection-title">
          <div className="reservoir-section-heading">
            <div>
              <p className="reservoir-section-number">The selected collection</p>
              <h2 id="reservoir-collection-title">These six reservoirs</h2>
            </div>
            <span>{dateLabel(guide.date)}</span>
          </div>
          <p data-testid="reservoir-collection-summary">{collectionSummary(guide)}</p>
          <div className="reservoir-comparison-grid">
            <div>
              {snapshot && (
                <Suspense fallback={<p>Preparing the volume comparison…</p>}>
                  <GuideCharts guide={guide} kind="collection" />
                </Suspense>
              )}
            </div>
            <ReservoirLocator reservoirs={header.reservoirs} selected={state.stationId} />
          </div>
          <div className="reservoir-member-grid">
            {guide.collection.members.map((m) => (
              <div key={m.reservoir.id} className="reservoir-member">
                <h3>{m.reservoir.name}</h3>
                <p>{readingLabel(m.reading)}</p>
                <strong>{percent(m.capacity.percent)}</strong>
                <p>
                  {m.capacity.mode === "dated"
                    ? "of documented capacity"
                    : "of July 30, 2025 reference"}
                  : {number(m.capacity.capacity?.acreFeet ?? null)} AF
                </p>
                <p>
                  {guide.collection.includedIds.includes(m.reservoir.id)
                    ? "Included in both sums"
                    : "Excluded from both sums"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="reservoir-reading" aria-labelledby="reservoir-third-finding">
        <p className="reservoir-section-number">03 / Sometimes the ruler changes</p>
        <h2 id="reservoir-third-finding">
          A long history is not always one continuous comparison.
        </h2>
        <p>
          Oroville’s station metadata records a recalculated capacity rating curve: storage values
          from July 1, 2024 use the new curve. This matters because storage is a measured estimate
          of volume, not simply the water’s visible height.
        </p>
        <p>
          Our 1991–2020 baseline predates that change. For recent Oroville dates, this guide
          therefore withholds the seasonal ratio and percentile. You can still see the reported
          volumes and read both years in the table, with the change in measurement basis stated
          alongside them.
        </p>
        <p>
          That is a limitation of this comparison, not evidence that the reservoir has no water. Don
          Pedro poses another limit: 1,122 daily readings are missing in the downloaded history. For
          July 30, only 26 of the 30 baseline years qualify. An uninterrupted-looking line would
          hide that uncertainty.
        </p>
        <h2>And is the drought over?</h2>
        <p>
          These storage numbers cannot settle that question. A reservoir is one store in a larger
          water system. Snowpack, groundwater, runoff and local supplies have different observation
          systems and coverage, as{" "}
          <a href="https://cww.water.ca.gov/about-the-data">DWR’s Water Watch guide</a> explains.
        </p>
        <p>
          The useful conclusion is smaller and more precise: Shasta’s July 30 reading was above this
          seasonal mean, around the middle of the historical ordering, and about 72% of its
          documented capacity. All three statements can be true. The next time a headline calls a
          reservoir “above average,” look for the date, the denominator and the missing part of the
          picture.
        </p>
      </section>

      <section className="reservoir-save" aria-labelledby="reservoir-save-title">
        <p className="reservoir-section-number">Take this view with you</p>
        <h2 id="reservoir-save-title">Keep the context when the signal goes.</h2>
        <ol className="reservoir-save-exercise">
          <li>
            <b>Choose a guide.</b> Set a reservoir, two water years and a date above.
          </li>
          <li>
            <b>Save and disconnect.</b> Save an offline address below, open it, then turn off your
            connection and reload. The historical dots, values and full table stay readable.
          </li>
          <li>
            <b>Reconnect and compare.</b> Return here and check for another edition. Review any
            changed records before accepting; compatible reservoir, year and date choices stay
            selected. If no newer edition exists, the guide says so.
          </li>
        </ol>
        <p>
          Save a fixed edition with this reservoir, both years, the complete two-year table, source
          notes and date. The HTML includes its chart and system-font styling. It opens without an
          internet connection.
        </p>
        <div className="reservoir-actions">
          <button
            disabled={!snapshot || !!host.issue || host.busy}
            onClick={() => host.exportView("html")}
          >
            Download offline HTML
          </button>
          <button
            disabled={!snapshot || !!host.issue || host.busy}
            onClick={() => host.exportView("offline")}
          >
            Save an offline address
          </button>
          <button
            disabled={!snapshot || !!host.issue || host.busy}
            onClick={() => host.exportView("packet")}
          >
            Download data packet
          </button>
        </div>
        {host.savedURL && (
          <p>
            <a data-testid="saved-offline-link" href={host.savedURL}>
              Open this saved offline edition
            </a>
            . Bookmark this exact address. Browser storage can be cleared or evicted; keep the HTML
            download for an independent copy.
          </p>
        )}
        <p>
          Saved files and offline addresses preserve a fixed view. They do not refresh themselves.
          Reopen this online guide to change the selection or check for another edition.
        </p>
        <p>
          <a href={`${STORY_URL}${stateSearch(state)}`}>Permalink to this selection</a>
        </p>
        <label className="reservoir-import">
          Reopen a saved data packet
          <input
            type="file"
            accept="application/json,.json"
            disabled={!snapshot || host.busy}
            onChange={(e) => {
              void host.importPacket(e.target.files?.[0])
              e.target.value = ""
            }}
          />
        </label>
        <p className="reservoir-edition-id">
          Active edition: <code>{header.editionId}</code>
          <br />
          Retrieved: <time>{header.retrievedAt}</time>. Reporting window: {header.startDate} through{" "}
          {header.endDate}. Source publication times are unavailable.
        </p>
        <button disabled={!snapshot || host.busy} onClick={host.refresh}>
          Check for another edition
        </button>
        {host.offer && (
          <div className="reservoir-notice" data-testid="reservoir-update-offer">
            <h3>Review the offered edition</h3>
            <p>
              {host.offer.comparison.changes.length} changed daily records.{" "}
              {host.offer.comparison.metadataChanged
                ? "Capacity, baseline or station metadata also changed."
                : "Capacity, baseline and station metadata are unchanged."}
            </p>
            <p>
              From {host.offer.comparison.from} to {host.offer.comparison.to}. New retrieval:{" "}
              {host.offer.snapshot.retrievedAt}.
            </p>
            <p>{host.offer.comparison.selectionIssue ?? "Your current selection is compatible."}</p>
            <p>
              Accepting recalculates the selected ratios, seasonal traces, collection and future
              downloads. Previously saved files remain the earlier edition. Interpretation of
              changed source values still requires review.
            </p>
            <details>
              <summary>Changed dates and values</summary>
              <ul>
                {host.offer.comparison.changes.slice(0, 100).map((change) => (
                  <li key={`${change.stationId}:${change.date}`}>
                    {change.stationId} · {change.date}: {number(change.before)} →{" "}
                    {number(change.after)} AF. {change.detail}.
                  </li>
                ))}
              </ul>
              {host.offer.comparison.changes.length > 100 && (
                <p>
                  Showing the first 100 records.{" "}
                  <button
                    onClick={() => {
                      const value = JSON.stringify(host.offer!.comparison)
                      void import("./reservoir-guide/host").then(({ download }) =>
                        download(value, "reservoir-edition-changes.json", "application/json"),
                      )
                    }}
                  >
                    Download every change
                  </button>
                </p>
              )}
            </details>
            <button onClick={host.acceptUpdate}>Accept this edition</button>
          </div>
        )}
      </section>

      <section id="sources" className="reservoir-sources">
        <h2>Sources, methods and corrections</h2>
        <p>
          This guide uses CDEC sensor 15 daily storage in acre-feet at six verified stations. The
          baseline matches calendar month/day in water years 1991–2020. Revised values are eligible;
          estimated, missing and unsupported-flag readings are excluded. Percentile is 100 × (lower
          values + half the ties) / eligible years, with a minimum of 20 years. Leap day has only
          eight possible baseline years.
        </p>
        <p>
          Capacity comes from{" "}
          <a href="https://cdec.water.ca.gov/reportapp/javareports?name=RES.20250731">
            the archived report ending July 30, 2025
          </a>
          . For other dates, its values are explicitly reference capacities. Our fixed-window mean
          is not CDEC’s separately published historical-average statistic.
        </p>
        <p>
          <a href="https://cdec.water.ca.gov/dynamicapp/wsSensorData">
            CDEC service and time convention
          </a>{" "}
          ·{" "}
          <a href="https://cdec.water.ca.gov/reportapp/javareports?name=FlagList">
            Quality flag definitions
          </a>{" "}
          ·{" "}
          <a href="https://cdec.water.ca.gov/dynamicapp/staMeta?station_id=ORO">
            Oroville measurement-change metadata
          </a>{" "}
          · <a href="https://water.ca.gov/Conditions-of-Use">DWR conditions of use</a>. Data may be
          revised; agency links do not imply endorsement.
        </p>
        <p>
          <a href={`${editionRoot}/manifest.json`}>Source manifest, checksums and counts</a> ·{" "}
          <a href={`${editionRoot}/snapshot.json`}>Full pinned history (about 1 MB)</a> ·{" "}
          <a href={`${editionRoot}/adapter.mjs`}>Portable source adapter</a> ·{" "}
          <a href={`${editionRoot}/README.md`}>
            Reproduction and independent-consumer instructions
          </a>{" "}
          · <a href={`${editionRoot}/default-season.csv`}>Opening two-year table CSV</a>.
        </p>
        <details>
          <summary>Data dictionary</summary>
          <dl>
            {Object.entries(DICTIONARY).map(([key, value]) => (
              <React.Fragment key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </React.Fragment>
            ))}
          </dl>
        </details>
        <details>
          <summary>Coverage and source files</summary>
          <ul>
            {header.reservoirs.map((r) => (
              <li key={r.id}>
                {r.name}: {number(header.counts[r.id].rows)} rows;{" "}
                {number(header.counts[r.id].missing)} missing;{" "}
                {number(header.counts[r.id].estimated)} estimated;{" "}
                {number(header.counts[r.id].eligible)} eligible.{" "}
                <a href={`${editionRoot}/raw/${r.sourceFile}`}>Raw CSV</a> ·{" "}
                <a href={`https://cdec.water.ca.gov/dynamicapp/staMeta?station_id=${r.id}`}>
                  Station metadata
                </a>
                .
              </li>
            ))}
          </ul>
        </details>
        <p>
          Corrections and newer editions belong here; a revision creates a new edition and leaves
          saved files intact. Computational evidence is downloadable with the edition. Independent
          editorial review, reader testing, manual assistive-technology checks and measurements on
          real Android hardware remain pending.
        </p>
        <p className="reservoir-footnote">
          Opening findings are pinned to {bootstrap.header.editionId}; an accepted update changes
          the exploratory guide and its exports, not the historical article above.
        </p>
      </section>
    </article>
  )
}
