import {
  collectionSummary,
  dateLabel,
  escapeMarkup as e,
  guideSummary,
  monthDayLabel,
  number,
  percent,
  readingLabel,
} from "./format"
import { DICTIONARY } from "./dictionary"
import { distributionDescription, distributionReferences } from "./chart-config"
import { stateSearch, STORY_URL } from "./state"
import type { PreparedGuide, ReservoirSnapshot } from "./types"

export type EditionHeader = Omit<ReservoirSnapshot, "series" | "sourceLineOverrides">

/** A fixed selection, with no network dependencies, scripts or external fonts. */
export function renderSavedHTML(header: EditionHeader, guide: PreparedGuide, svg: string, distributionSVG = "") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>How full is full? — ${e(guide.reservoir.name)}</title><style>
  body{max-width:960px;margin:2rem auto;padding:1rem;font:18px/1.6 system-ui;color:#183c40;background:#fffdf5}a{color:inherit}h1{font:700 clamp(2rem,7vw,4rem)/1.1 Georgia,serif}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:12px;border-bottom:1px solid #9baba7}section{overflow-x:auto}code{overflow-wrap:anywhere}svg{width:100%;height:auto}dt{font-weight:bold}dd{margin:0 0 1rem}li{margin:.7rem 0}:focus-visible{outline:3px solid currentColor;outline-offset:4px}@media print{body{font-size:11pt;margin:0;background:white}table{font-size:8pt}section{overflow:visible}a{overflow-wrap:anywhere}}
  </style></head><body><main><p>FIELD GUIDE / SIX CALIFORNIA RESERVOIRS</p><h1>How full is full?</h1>
  <p data-saved-summary>${e(guideSummary(guide))}</p><p><strong>Saved selection:</strong> ${e(guide.reservoir.name)} · water year ${guide.state.waterYear} compared with ${guide.state.comparisonYear} · ${e(monthDayLabel(guide.state.monthDay))}.</p>
  <p>Fixed historical edition <code>${e(header.editionId)}</code>. Retrieved ${e(header.retrievedAt)}. This file includes its chart, tables and system-font styling and opens without a network. It cannot update itself; reopen the online guide to change the selection or check for another edition.</p>
  <h2>Three different comparisons</h2><ul><li>Capacity: ${e(percent(guide.capacity.percent))}; denominator ${e(number(guide.capacity.capacity?.acreFeet ?? null))} AF, ${guide.capacity.mode === "dated" ? "documented for the reporting date" : "July 30, 2025 reference, not reconstructed historical capacity"}.</li><li>Seasonal mean: ${e(number(guide.baseline.mean, 2))} AF; ${guide.baseline.count} eligible years; ${e(percent(guide.baseline.percentOfMean))} of that mean.</li><li>Historical percentile: ${e(number(guide.baseline.percentile, 1))}; ${guide.baseline.less} lower values and ${guide.baseline.equal} ties. ${e(guide.baseline.reason ?? "At least 20 eligible years.")}</li></ul>
  ${guide.capacity.aboveReference ? "<p>This observation exceeds the stated capacity reference; the percentage has not been clamped.</p>" : ""}
  <h2>See the years behind “average”</h2><p>${e(distributionDescription(guide))}</p>${distributionSVG || "<p>Read the eligible observations in the selected-date baseline below.</p>"}
  <ul>${distributionReferences(guide).map((r) => `<li>${e(r.name)}: ${e(number(r.value))} AF (${r.dash === "none" ? "solid teal" : r.dash === "8,4" ? "dashed rust" : "dotted gray"} line when available).</li>`).join("")}</ul>
  <h2>Two water years</h2>${svg}<p>Selected: teal; comparison: rust; compatible 1991–2020 mean: gray. The table gives every value without relying on color. Gaps exclude missing and estimated readings. A nonexistent February 29 is not a missing observation.</p>
  <section tabindex="0" aria-label="Saved two-year storage table"><table><caption>${e(guide.reservoir.name)} · WY ${guide.state.waterYear} / ${guide.state.comparisonYear}. Volume in acre-feet. Unavailable is not zero.</caption><thead><tr><th>Month/day</th><th>Selected</th><th>Comparison</th><th>Compatible baseline mean (N)</th></tr></thead><tbody>${guide.season.map((p) => `<tr><th>${e(monthDayLabel(p.monthDay))}</th><td>${e(readingLabel(p.active))}</td><td>${e(readingLabel(p.comparison))}</td><td>${e(number(p.baselineMean, 2))} (${p.baselineCount})</td></tr>`).join("")}</tbody></table></section>
  <h2>These six reservoirs</h2><p>${e(collectionSummary(guide))}</p><section tabindex="0" aria-label="Saved collection table"><table><caption>${e(dateLabel(guide.date))}; matched storage and capacity membership</caption><thead><tr><th>Reservoir</th><th>Storage AF</th><th>Capacity / reference AF</th><th>Percent</th><th>Included</th></tr></thead><tbody>${guide.collection.members.map((m) => `<tr><th>${e(m.reservoir.name)}</th><td>${e(readingLabel(m.reading))}</td><td>${e(number(m.capacity.capacity?.acreFeet ?? null))}</td><td>${e(percent(m.capacity.percent))}</td><td>${guide.collection.includedIds.includes(m.reservoir.id) ? "Yes" : "No"}</td></tr>`).join("")}</tbody></table></section>
  <h2>What storage leaves unanswered</h2><p>A reservoir is one store of water. Groundwater, snowpack, runoff and local supply have different measurement systems and coverage. These six histories cannot establish whether drought has ended or which reservoir supplies a particular household. <a href="https://cww.water.ca.gov/about-the-data">DWR Water Watch: about the data</a>.</p>
  <ul>${guide.qualifications.map((q) => `<li>${e(q)}</li>`).join("")}</ul>
  <h2>Selected-date baseline</h2><p>${guide.baseline.samples.map((s) => `${s.year}: ${number(s.value)} AF [${e(s.rowId)}]`).join("; ") || "No compatible samples."}</p><p>Excluded: ${guide.baseline.excluded.map((s) => `${s.year}: ${e(s.reason)}`).join("; ") || "None"}.</p>
  <h2>Source fields for the selected observations</h2><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${e(JSON.stringify({ selected: guide.reading, comparison: guide.comparisonReading, capacity: guide.capacity.capacity }, null, 2))}</pre>
  <h2>Data dictionary</h2><dl>${Object.entries(DICTIONARY)
    .map(([key, value]) => `<dt>${e(key)}</dt><dd>${e(value)}</dd>`)
    .join("")}</dl>
  <h2>Sources and edition</h2><ul>${header.sources.map((source) => `<li><a href="${e(source.url)}">${e(source.file)}</a> · retrieved ${e(source.retrievedAt)} · SHA-256 <code>${e(source.sha256)}</code></li>`).join("")}</ul>
  <p><a href="${e(STORY_URL + stateSearch(guide.state))}">Reopen this saved selection online</a> · <a href="${STORY_URL}#sources">Source, correction and update notes</a>. Source data may later be revised. Computational checks do not constitute independent editorial or reader review.</p></main></body></html>`
}
