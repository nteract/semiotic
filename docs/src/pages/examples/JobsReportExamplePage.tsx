import ExamplePageLayout from "./ExamplePageLayout"
import { ThemeProvider } from "semiotic/themes/react"
import BriefingDesk from "./jobs-report/BriefingDesk"
import snapshotJSON from "./jobs-report/snapshot.json"
import bootstrap from "./jobs-report/bootstrap.json"
import {
  dateName,
  monthName,
  months,
  prepareMonth,
  signed,
  type JobsSnapshot,
} from "./jobs-report/model"
import "./JobsReportExamplePage.css"

const snapshot = snapshotJSON as JobsSnapshot
const comparisons = months.map((month) => prepareMonth(snapshot, month))

export default function JobsReportExamplePage() {
  return (
    <ExamplePageLayout
      title="The jobs report has a second draft"
      prevPage={undefined}
      nextPage={undefined}
      showPageHeader={false}
      showViewToggle={false}
    >
      <article className="jobs-story">
        <section data-server-opening>
          <header className="jobs-opening">
            <p className="jobs-kicker">The revision desk · A guide to reading the numbers</p>
            <h1>
              The jobs report has
              <br />a <em>second draft.</em>
            </h1>
            <p className="jobs-deck">
              A month’s jobs number gets a headline on release day. It also gets later drafts.
              Sometimes they sharpen the picture. Sometimes they change what the picture says.
            </p>
            <p className="jobs-dateline">
              U.S. nonfarm payrolls · January 2024–December 2025
              <br />
              Historical estimates, compared with the March 6, 2026 vintage
            </p>
          </header>
          <div className="jobs-prose">
            <p>
              On July 3, 2025, the first estimate for June showed{" "}
              <strong>147,000 added jobs</strong>. By the third estimate, published September 5, the
              figure was a <strong>13,000 decline</strong>. A later release, on March 6, 2026, put
              the decline at 20,000.
            </p>
            <p>
              Those are three readings of the <em>same employment month</em>. The difference
              matters: “payrolls grew” and “payrolls shrank” are different descriptions of June.
              Neither, on its own, can tell us why the change happened—or settle whether a recession
              was underway.
            </p>
          </div>
          <figure className="jobs-hero">
            <picture>
              <source
                media="(max-width: 520px)"
                srcSet={`${bootstrap.base}/tools/opening-waterfall.phone.svg`}
              />
              <img
                src={`${bootstrap.base}/edition-b/graphic.svg`}
                width="760"
                height="560"
                alt="June 2025: first estimate plus 147,000 jobs on July 3; third estimate minus 13,000 on September 5; March 6, 2026 vintage minus 20,000. A downward revision of 160,000 crosses zero, followed by another 7,000 downward."
              />
            </picture>
            <div className="jobs-estimates jobs-opening-estimates">
              {(
                [
                  ["First estimate", bootstrap.opening.first],
                  ["Third estimate", bootstrap.opening.third],
                  ["March 6 vintage", bootstrap.opening.latest],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{signed(value?.change ?? null)}</strong>
                  <small>{value ? dateName(value.releaseDate) : "Unavailable"}</small>
                </div>
              ))}
            </div>
            <figcaption>
              <strong>Read the steps, then the endpoint.</strong> The blue bar starts with the first
              estimate. Red bars subtract later revisions. Their lengths show how much the estimate
              changed; the final endpoint shows where it landed. These are jobs, not percentages.
            </figcaption>
          </figure>
          <div className="jobs-prose">
            <h2>A fast answer, with more evidence to come</h2>
            <p>
              The jobs report solves an awkward problem. People need to know what is happening
              before every employer has reported it. The first payroll estimate gives a timely
              reading from the information available. Later responses, corrections and another pass
              through seasonal adjustment can change that reading. It is useful precisely because it
              arrives early—and that makes its publication date part of its meaning.
            </p>
            <p>
              There is another, broader revision. Each year, BLS benchmarks the payroll survey
              against more comprehensive employment records, principally unemployment-insurance tax
              records. Seasonal adjustments can change earlier months as well. A revision that
              crosses that update cannot be explained simply as “late surveys came in.” The chart
              above describes the arithmetic between releases; it does not divide responsibility
              among those processes.
              <a href="https://www.bls.gov/opub/hom/ces/presentation.htm#revisions">
                {" "}
                BLS explains the revision process.
              </a>
            </p>
            <h2>Most useful is the contrast</h2>
            <p>
              June is worth noticing. So is the month after it. <strong>July 2025</strong> began at
              73,000 added jobs and reached 72,000 at the third estimate: a difference of just
              1,000. The March 6 vintage puts it at 64,000. All three retain the same estimated
              direction.
            </p>
            <p>
              Revisions also move upward. <strong>March 2024</strong> went from 303,000 added jobs
              to 310,000 at the third estimate. Its March 6, 2026 reading is lower, at 228,000. “The
              next estimate” and “a much later estimate” are different comparisons. A revision has
              both a starting point and a destination.
              <a href="https://www.bls.gov/web/empsit/cesnaicsrev.htm">
                {" "}
                Check the BLS first and third estimates.
              </a>
            </p>
          </div>
          <section className="jobs-comparison" aria-labelledby="jobs-comparison-title">
            <p className="jobs-kicker">Twenty-four months, kept in view</p>
            <h2 id="jobs-comparison-title">How far did the estimate move?</h2>
            <p>
              Each row is one reference month. Blue dots mark the first estimate; red dots mark the
              March 6, 2026 vintage. More distance means a larger revision. Both panels use the same
              scale.
            </p>
            <div className="jobs-paired">
              {["2024", "2025"].map((year) => (
                <figure key={year}>
                  <img
                    src={`${bootstrap.base}/tools/paired-${year}.svg`}
                    width="760"
                    height="500"
                    loading="lazy"
                    alt={`${year} first and March 6, 2026 estimates. Exact values and release dates follow in the comparison table.`}
                  />
                </figure>
              ))}
            </div>
            <details className="jobs-all-values">
              <summary>Read all 24 months, with exact values and publication dates</summary>
              <table>
                <caption>
                  Monthly employment change · jobs, seasonally adjusted. “Later” means March 6,
                  2026.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Reference month</th>
                    <th scope="col">First</th>
                    <th scope="col">Third</th>
                    <th scope="col">Later</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((row) => (
                    <tr key={row.month}>
                      <th scope="row">{monthName(row.month)}</th>
                      {(
                        [
                          ["First", row.first],
                          ["Third", row.third],
                          ["Later", row.latest],
                        ] as const
                      ).map(([label, value]) => (
                        <td key={label} data-label={label}>
                          <strong>{signed(value?.change ?? null)}</strong>
                          <small>{value ? dateName(value.releaseDate) : "No first estimate"}</small>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </section>
          <div className="jobs-prose">
            <h2>The blank is part of the story</h2>
            <p>
              October 2025 has no blue dot. The lapse in federal appropriations disrupted
              publication. BLS lists no first preliminary estimate for that month. October data
              first appeared in the December 16 release, but BLS classifies that estimate as{" "}
              <em>second preliminary</em>. Calling it “first” here would make a tidy chart and a
              misleading comparison.
            </p>
            <p>
              The interruption also delayed August’s third estimate until December 16. Normally, the
              third estimate arrives two months after the first; the dates here show when it
              actually arrived. A blank is not zero, and a regular-looking calendar is not evidence
              of a regular release schedule.
              <a href="https://www.bls.gov/bls/news-release/empsit.htm">
                {" "}
                See the release archive
              </a>{" "}
              and
              <a href="https://www.bls.gov/news.release/archives/empsit_12162025.htm">
                {" "}
                the December 16 explanation
              </a>
              .
            </p>
            <h2>A year is more than twelve headlines</h2>
            <p>
              The January 9, 2026 vintage showed <strong>584,000 jobs added during 2025</strong>.
              The February 11 benchmark release lowered that to 181,000. After the next release
              revised December again, the March 6 vintage showed 116,000.
            </p>
            <p>
              Those totals each subtract December’s employment level from the previous December’s
              level in <em>one</em> dated edition. Adding twelve first-release changes would stitch
              together twelve different versions of history. It would answer a different question.
              <a href="https://www.bls.gov/news.release/archives/empsit_02112026.htm">
                {" "}
                The benchmark release
              </a>{" "}
              and
              <a href="https://www.bls.gov/news.release/archives/empsit_03062026.htm">
                {" "}
                March 6 release
              </a>{" "}
              show the changes.
            </p>
            <p>
              The practical habit is small: keep the date attached. Read the first estimate for its
              timely information. Return for the later draft. And when the draft changes, let the
              explanation change with it—without pretending the earlier reading never existed.
            </p>
          </div>
          <aside className="jobs-source" aria-labelledby="jobs-source-title">
            <h2 id="jobs-source-title">About this edition</h2>
            <p>
              These are U.S. total nonfarm payroll estimates, seasonally adjusted: BLS series
              CES0000000001, distributed as PAYEMS by{" "}
              <a href="https://alfred.stlouisfed.org/series?seid=PAYEMS">ALFRED</a>. They count
              jobs, not unique people. The capture began{" "}
              {dateName(bootstrap.capturedAt.slice(0, 10))}; its 25 dated CSVs reconstruct
              historical releases. March 6, 2026 is this article’s named later vintage, not a claim
              to be the current estimate.
            </p>
            <p>
              BLS’s vintage workbook download was inaccessible during acquisition. Dated ALFRED CSVs
              provide the levels used here; separately read BLS release tables supply independent
              numerical checks. Verification against the original workbook remains pending. Every
              monthly difference uses two levels from the same vintage, with an explicit conversion
              from thousands to jobs.
            </p>
            <p>
              <a href={`${bootstrap.base}/raw/retrieval.json`}>Source and retrieval ledger</a> ·
              <a href={`${bootstrap.base}/tools/source-checks.json`}>
                {" "}
                Independent BLS table checks
              </a>{" "}
              ·<a href={`${bootstrap.base}/tools/dictionary.json`}> Field dictionary</a> ·
              <a href={`${bootstrap.base}/edition-b/email.html`}> Plain email edition</a>
            </p>
          </aside>
        </section>
        <ThemeProvider theme="light">
          <BriefingDesk snapshot={snapshot} />
        </ThemeProvider>
      </article>
    </ExamplePageLayout>
  )
}
