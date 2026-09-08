import { canonicalRows, dateName, monthName, signed, type JobsSnapshot } from "./model"
import type { Briefing } from "./packet"

export const escapeHTML = (text: unknown) =>
  String(text).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  )

export function sourceCSV(snapshot: JobsSnapshot, asOf: string) {
  const rows = canonicalRows(snapshot, asOf)
  const keys = Object.keys(rows[0]) as (keyof (typeof rows)[number])[]
  const quote = (value: unknown) => `"${String(value).replaceAll('"', '""')}"`
  return (
    [keys.join(","), ...rows.map((row) => keys.map((key) => quote(row[key])).join(","))].join(
      "\r\n",
    ) + "\r\n"
  )
}
export function estimateTable(briefing: Briefing) {
  const rows = [
    ["First estimate", briefing.selected.first],
    ["Third estimate", briefing.selected.third],
    [`${dateName(briefing.asOf)} vintage`, briefing.selected.latest],
  ] as const
  return `<table><caption>${escapeHTML(monthName(briefing.month))} · U.S. nonfarm payrolls, seasonally adjusted</caption><thead><tr><th scope="col">Estimate</th><th scope="col">Publication date</th><th scope="col">Monthly change (jobs)</th></tr></thead><tbody>${rows.map(([label, row]) => `<tr><th scope="row">${escapeHTML(label)}</th><td>${row ? dateName(row.releaseDate) : "Unavailable in this edition"}</td><td>${signed(row?.change ?? null)}</td></tr>`).join("")}</tbody></table>`
}
export function graphicSVG(briefing: Briefing, chartSVG: string) {
  const e = escapeHTML
  const first = briefing.selected.first
  const third = briefing.selected.third
  const latest = briefing.selected.latest
  // All visible labels belong to the graphic; an image pasted elsewhere keeps
  // its dates, unit, source and exact endpoint values.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="560" viewBox="0 0 760 560" role="img" aria-labelledby="jobs-title jobs-desc"><title id="jobs-title">${e(briefing.props.title)}</title><desc id="jobs-desc">${e(briefing.selected.summary)} Bars show signed revisions, not changes in different months.</desc><rect width="760" height="560" fill="#faf7ef"/><text x="30" y="32" font-family="sans-serif" font-size="12" fill="#514e46">THE JOBS REPORT HAS A SECOND DRAFT · RECONSTRUCTED HISTORICAL EDITION</text><text x="30" y="66" font-family="Georgia,serif" font-size="26" fill="#24251f">${e(monthName(briefing.month))}: ${signed(latest?.change ?? null)} jobs</text><g transform="translate(0 78)">${chartSVG}</g>${[
    ["First", first],
    ["Third", third],
    ["Named vintage", latest],
  ]
    .map(([label, value], i) => {
      const row = value as typeof first
      return `<g transform="translate(${30 + i * 245} 447)" font-family="sans-serif" fill="#24251f"><text font-size="12">${label} · ${row ? e(dateName(row.releaseDate)) : "unavailable"}</text><text y="29" font-size="23">${signed(row?.change ?? null)}</text></g>`
    })
    .join(
      "",
    )}<text x="30" y="516" font-family="sans-serif" font-size="11" fill="#514e46">U.S. nonfarm payrolls · seasonally adjusted · BLS CES via ALFRED · alfred.stlouisfed.org</text><text x="30" y="537" font-family="sans-serif" font-size="11" fill="#514e46">Vintage ${e(briefing.asOf)} · ${e(briefing.sourceId)} · estimates remain revisable</text></svg>`
}
export function briefingHTML(briefing: Briefing, svg?: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(briefing.props.title)}</title><style>body{max-width:760px;margin:2em auto;padding:0 1em;font:18px/1.6 Georgia,serif;color:#24251f;background:#faf7ef}svg{width:100%;height:auto}table{width:100%;border-collapse:collapse;font:14px/1.5 system-ui}th,td{padding:.7em;text-align:left;border-bottom:1px solid #aaa}caption{text-align:left;font-weight:bold}small{display:block;margin:1em 0}a{color:#215a75}@media(max-width:420px){th,td{padding:.4em;font-size:12px}}@media print{body{margin:0;max-width:none}}</style></head><body><p>THE JOBS REPORT HAS A SECOND DRAFT</p><h1>${escapeHTML(monthName(briefing.month))}: the estimate changed</h1><p>${escapeHTML(briefing.selected.summary)}</p><p>${escapeHTML(briefing.contract.claims[1].text)}</p>${svg ?? ""}${estimateTable(briefing)}<p>Monthly revisions incorporate more responses, corrections and seasonal adjustment. Annual benchmarking can change earlier months too. These bars describe the difference between published estimates; they do not isolate its causes.</p><p>Source: <a href="https://alfred.stlouisfed.org/series?seid=PAYEMS">BLS CES, distributed by ALFRED</a>. Source levels are in thousands; each monthly change subtracts the preceding month in the same vintage, then multiplies by 1,000.</p><p>${escapeHTML(briefing.sourceException)}</p><small>Edition ${escapeHTML(briefing.edition)} · ${escapeHTML(briefing.sourceId)}. Reconstructed from dated exports, not a claim that this article existed on the release date. Export status: conditional; human editorial approval is unrecorded. SVG may be removed by email clients; this text and table stand alone.</small></body></html>`
}
