// scripts/jobs-report/cli.ts
import { readFileSync as readFileSync3 } from "node:fs";
import { resolve as resolve2 } from "node:path";

// docs/src/pages/examples/jobs-report/packet.ts
import {
  buildArtifactContract,
  buildArtifactGrounding,
  createArtifactPacket,
  fingerprintValue as fingerprintValue2,
  prepareArtifactRevision
} from "semiotic/artifact";

// docs/src/pages/examples/jobs-report/model.ts
import { fingerprintValue } from "semiotic/artifact";
var laterEdition = "2026-03-06";
var months = Array.from({ length: 24 }, (_, i) => shiftMonth("2024-01", i));
function shiftMonth(month, offset) {
  const [year, part] = month.split("-").map(Number);
  return new Date(Date.UTC(year, part - 1 + offset, 1)).toISOString().slice(0, 7);
}
function monthName(month) {
  return (/* @__PURE__ */ new Date(`${month}-01T12:00:00Z`)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });
}
function dateName(date) {
  return (/* @__PURE__ */ new Date(`${date}T12:00:00Z`)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}
function jobs(thousands) {
  if (!Number.isFinite(thousands)) throw new Error("A jobs value must be finite");
  return thousands * 1e3;
}
function signed(value) {
  if (value === null) return "Unavailable";
  return `${value > 0 ? "+" : value < 0 ? "\u2212" : ""}${Math.abs(value).toLocaleString("en-US")}`;
}
function estimate(snapshot, month, date) {
  const vintage = snapshot.vintages.find((entry) => entry.releaseDate === date);
  if (!vintage) return null;
  const level = vintage.levels[month];
  const previousLevel = vintage.levels[shiftMonth(month, -1)];
  if (level === void 0 || previousLevel === void 0) return null;
  return {
    referenceMonth: month,
    releaseDate: date,
    level,
    previousLevel,
    change: jobs(level - previousLevel),
    file: vintage.file
  };
}
function stageDate(snapshot, month, stage) {
  if (stage === "first" && month === "2025-10") return void 0;
  if (stage === "third" && month === "2025-08") return "2025-12-16";
  return snapshot.vintages.find(
    ({ featuredMonth }) => featuredMonth === shiftMonth(month, stage === "first" ? 0 : 2)
  )?.releaseDate;
}
function prepareMonth(snapshot, month, asOf = laterEdition) {
  if (!months.includes(month)) throw new Error("Choose a reference month in 2024\u20132025");
  if (!snapshot.vintages.some(({ releaseDate }) => releaseDate === asOf))
    throw new Error("Choose a captured publication date");
  const stage = (kind) => {
    const date = stageDate(snapshot, month, kind);
    return date && date <= asOf ? estimate(snapshot, month, date) : null;
  };
  const first = stage("first");
  const third = stage("third");
  const latest = estimate(snapshot, month, asOf);
  const reversal = first && latest && first.change * latest.change < 0;
  return {
    month,
    asOf,
    first,
    third,
    latest,
    revision: first && latest ? latest.change - first.change : null,
    reversal: Boolean(reversal),
    summary: `${monthName(month)} employment change: first ${signed(first?.change ?? null)}; third ${signed(third?.change ?? null)}; ${dateName(asOf)} vintage ${signed(latest?.change ?? null)} jobs.`
  };
}
function annualChange(snapshot, year, asOf) {
  const levels = snapshot.vintages.find(({ releaseDate }) => releaseDate === asOf)?.levels;
  const end = levels?.[`${year}-12`];
  const start = levels?.[`${year - 1}-12`];
  return end === void 0 || start === void 0 ? null : jobs(end - start);
}
function canonicalRows(snapshot, asOf = laterEdition) {
  return snapshot.vintages.filter((v) => v.releaseDate <= asOf).flatMap(
    (v) => Object.entries(v.levels).flatMap(([referenceMonth, level]) => {
      const estimateKind = stageDate(snapshot, referenceMonth, "first") === v.releaseDate ? "first" : stageDate(snapshot, referenceMonth, "third") === v.releaseDate ? "third" : "dated-vintage";
      const base = {
        seriesId: "CES0000000001",
        referenceMonth,
        releaseDate: v.releaseDate,
        seasonalAdjustment: "seasonally adjusted",
        estimateKind,
        unit: "thousand jobs",
        snapshotId: snapshot.id,
        sourceFile: v.file
      };
      const change = estimate(snapshot, referenceMonth, v.releaseDate);
      return [
        { ...base, measure: "employment-level", value: level },
        ...change ? [{ ...base, measure: "monthly-change", value: change.change / 1e3 }] : []
      ];
    })
  );
}
function snapshotDigest(vintages) {
  return fingerprintValue(vintages).fingerprint;
}

// docs/src/pages/examples/jobs-report/chart-config.ts
function waterfallProps(selected) {
  const { first, third, latest } = selected;
  const data = first && latest ? [
    { step: "First estimate", change: first.change },
    ...third ? [{ step: "Revision to third", change: third.change - first.change }] : [],
    {
      step: third ? "Since the third" : "Revision since first",
      change: latest.change - (third ?? first).change
    }
  ] : [];
  return {
    data,
    xAccessor: "step",
    yAccessor: "change",
    pointIdAccessor: "step",
    width: 760,
    height: 340,
    margin: { top: 32, right: 25, bottom: 56, left: 80 },
    title: `${monthName(selected.month)}: revisions`,
    description: "Each floating bar adds or subtracts a revision. Its endpoint is the running estimate, in jobs; bar length is the change between drafts, not another month's employment.",
    summary: selected.summary,
    accessibleTable: true,
    enableHover: false,
    positiveColor: "#215a75",
    negativeColor: "#a53f30",
    connectorStroke: "#716b61",
    yLabel: "Jobs",
    showGrid: true,
    showLegend: false
  };
}

// docs/src/pages/examples/jobs-report/packet.ts
function buildBriefing(snapshot, month, asOf, reading = "direction") {
  if (reading !== "direction" && reading !== "size")
    throw new Error("Choose a supported briefing emphasis");
  if (snapshotDigest(snapshot.vintages) !== snapshot.sourceDigest)
    throw new Error("Snapshot content does not match its source identity");
  const selected = prepareMonth(snapshot, month, asOf);
  if (!selected.latest) throw new Error("No estimate was available for this month on that date");
  const props = waterfallProps(selected);
  if (!selected.first)
    props.data = [{ step: "Dated estimate only", change: selected.latest.change }];
  const edition = `${asOf}-${month}-${reading === "direction" ? "v1" : "size-v1"}`;
  const evidenceId = `source-${snapshot.id}-${asOf}`;
  const values = [
    { key: "first", value: selected.first?.change ?? null },
    { key: "third", value: selected.third?.change ?? null },
    { key: "dated", value: selected.latest.change },
    { key: "revision", value: selected.revision },
    { key: "annual-2025", value: annualChange(snapshot, 2025, asOf) }
  ];
  const bindings = ["first", "third", "latest"].flatMap((kind) => {
    const value = selected[kind];
    if (!value) return [];
    const rowId = (referenceMonth) => `CES0000000001:${value.releaseDate}:${referenceMonth}:employment-level`;
    return [
      {
        target: `selected.${kind}.change`,
        operation: "within-vintage-difference",
        sourceFile: value.file,
        sourceRows: [rowId(month), rowId(shiftMonth(month, -1))],
        inputValues: [value.level, value.previousLevel],
        sourceUnit: "thousand jobs",
        multiplier: 1e3,
        resultUnit: "jobs",
        expected: value.change,
        tolerance: 0,
        eligibility: "Both levels must exist in the same dated export; missing values are never zero-filled.",
        releaseDate: value.releaseDate,
        referenceMonth: month,
        claimId: `estimate-${edition}`,
        rounding: "Integer jobs; no additional rounding."
      }
    ];
  });
  const claims = [
    { id: `estimate-${edition}`, text: selected.summary, kind: "observation", status: "supported" },
    {
      id: `interpretation-${edition}`,
      text: reading === "size" ? selected.revision === null ? "The revision's size cannot be assessed because the first estimate is unavailable." : `The estimate moved ${signed(selected.revision)} jobs between the first and named dated release.` : selected.reversal ? "The estimated monthly change switched sign between the first and named dated estimate. This alone does not establish a recession or a cause." : selected.first ? "The first and named dated estimate do not show a strict sign reversal." : "A first-to-later reversal cannot be assessed because the first estimate is unavailable.",
      kind: "inference",
      status: "supported"
    }
  ].map((claim) => ({
    ...claim,
    kind: claim.kind,
    status: "supported",
    evidenceIds: [evidenceId],
    scope: {
      unit: "jobs",
      coverage: monthName(month),
      metric: "Seasonally adjusted U.S. nonfarm payroll employment change"
    },
    authoredBy: { kind: "system", name: "Deterministic jobs-briefing adapter" },
    review: { status: "proposed" },
    asOf
  }));
  const contract = buildArtifactContract("WaterfallChart", props, {
    id: `jobs-report-${month}`,
    revision: edition,
    kind: "chart",
    title: props.title,
    intents: ["comparison"],
    purpose: {
      stakes: "informational",
      communicativeAct: "Compare successive estimates of one employment month.",
      prohibitedUses: ["Investment advice", "A causal or recession claim from a revision alone"]
    },
    claims,
    evidence: [
      {
        id: evidenceId,
        role: "source-data",
        label: "BLS CES via dated ALFRED exports",
        source: {
          uri: "https://alfred.stlouisfed.org/series?seid=PAYEMS",
          version: asOf,
          retrievedAt: snapshot.capturedAt
        },
        fingerprint: snapshot.sourceDigest,
        dataVersion: snapshot.id
      }
    ],
    time: {
      observedAt: asOf,
      snapshotAt: snapshot.capturedAt,
      freshness: {
        status: "fresh",
        checkedAt: snapshot.capturedAt,
        basis: "Pinned historical vintage checked on retrieval; not a claim of current labor-market conditions."
      },
      presentation: { state: "historical", label: `Estimates published by ${dateName(asOf)}` },
      completeness: {
        status: "provisional",
        basis: "Employment estimates remain revisable; October 2025 has no first estimate."
      },
      revision: { status: "original" },
      snapshot: { id: snapshot.id, format: "other" }
    },
    reception: {
      channels: [{ channel: "visual" }, { channel: "screen-reader" }, { channel: "agent" }],
      description: props.description,
      dataFallback: true
    },
    form: {
      chartFamily: "waterfall",
      whyThisForm: "Floating signed revisions show how the running estimate changes; exact labeled estimates travel alongside."
    },
    contestability: { sourceRequestsAllowed: true, corrections: [] },
    accountability: {
      authors: [{ kind: "system", name: "Semiotic jobs-briefing adapter" }],
      reviews: [{ id: "editorial-review", status: "pending" }]
    },
    inheritance: {
      privacy: "public",
      rawDataDefault: "exclude",
      preservation: "claim-evidence-preserved",
      requiredPaths: ["claims", "evidence", "time", "accountability"]
    },
    fieldStatus: {
      "accountability.reviews": {
        status: "manual",
        suppliedBy: "system",
        reason: "No human editorial approval is recorded. Inspect the dates, prose, chart and source exception."
      }
    }
  });
  return {
    schemaVersion: 1,
    edition,
    sourceId: snapshot.id,
    sourceDigest: snapshot.sourceDigest,
    month,
    asOf,
    selected,
    values,
    bindings,
    reading,
    component: "WaterfallChart",
    props,
    contract,
    sourceException: "ALFRED dated CSVs substitute for the inaccessible BLS workbook. Independent BLS release-table checks are supplied; workbook-cell admission remains pending."
  };
}
function handoff(briefing) {
  const packet = {
    ...briefing,
    artifact: createArtifactPacket(briefing.contract, {
      format: "static-package",
      includeEvidenceSamples: false
    }),
    grounding: buildArtifactGrounding(briefing.component, briefing.props, briefing.contract, {
      channel: "agent"
    }),
    publication: {
      status: "conditional",
      publishable: false,
      reason: "Requires source-exception and editorial review; a completed export is not approval."
    }
  };
  return JSON.parse(JSON.stringify(packet));
}
function compareBriefings(before, after, reason = "source-update") {
  if (before.month !== after.month) throw new Error("Compare the same reference month");
  if (!["source-update", "editorial-interpretation"].includes(reason))
    throw new Error("Name a supported revision reason");
  const sourceChanged = before.asOf !== after.asOf || before.sourceDigest !== after.sourceDigest;
  if (sourceChanged && reason !== "source-update")
    throw new Error("Changed evidence requires a source-update reason");
  if (sourceChanged && after.asOf < before.asOf)
    throw new Error("A source update must not move the publication vintage backward");
  if (!sourceChanged && reason !== "editorial-interpretation")
    throw new Error("Unchanged evidence requires an editorial-interpretation reason");
  if (before.edition === after.edition) throw new Error("A revision needs a distinct edition");
  const changed = after.values.filter(
    (row) => row.value !== before.values.find((old) => old.key === row.key)?.value
  );
  const revised = prepareArtifactRevision(before.component, before.props, before.contract, {
    revision: after.edition,
    data: after.props.data,
    propUpdates: after.props,
    evidence: [...before.contract.evidence, ...after.contract.evidence].filter(
      (entry, index, all) => all.findIndex((other) => other.id === entry.id) === index
    ),
    presentation: {
      title: after.props.title,
      description: after.props.description,
      summary: after.props.summary
    },
    time: {
      ...after.contract.time,
      revision: {
        status: "corrected",
        correctionId: `revision-${after.edition}-0`,
        reason: sourceChanged ? "A later statistical vintage revises the estimate; this is not a claim of a publication error." : "An editorial interpretation was amended without a source change."
      }
    },
    claimTransitions: before.contract.claims.map((claim, index) => ({
      action: "supersede",
      previousClaimId: claim.id,
      replacement: after.contract.claims[index],
      correction: {
        id: `revision-${after.edition}-${index}`,
        reason,
        createdBy: { kind: "system", name: "Jobs edition comparison" }
      }
    })),
    policy: "exploratory",
    now: after.asOf,
    recommendRepresentation: false,
    groundingChannels: ["agent"]
  });
  return {
    reason,
    reasons: [
      ...sourceChanged ? ["source-update"] : [],
      ...before.reading !== after.reading ? ["editorial-interpretation"] : []
    ],
    before: before.edition,
    after: after.edition,
    changed,
    affectedClaims: revised.changedClaimIds,
    previousClaims: before.contract.claims,
    nextClaims: after.contract.claims,
    contract: revised.contract,
    grounding: revised.grounding,
    previousReviewApplies: false,
    publicationStatus: "conditional"
  };
}
function verifyBriefing(snapshot, briefing) {
  const expected = buildBriefing(snapshot, briefing.month, briefing.asOf, briefing.reading);
  if (fingerprintValue2(expected).fingerprint !== fingerprintValue2(briefing).fingerprint)
    throw new Error("Briefing source, values, configuration or claims do not reproduce");
}

// scripts/jobs-report/ingest.ts
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

// scripts/jobs-report/calendar.json
var calendar_default = [
  [
    "2024-01",
    "2024-02-02"
  ],
  [
    "2024-02",
    "2024-03-08"
  ],
  [
    "2024-03",
    "2024-04-05"
  ],
  [
    "2024-04",
    "2024-05-03"
  ],
  [
    "2024-05",
    "2024-06-07"
  ],
  [
    "2024-06",
    "2024-07-05"
  ],
  [
    "2024-07",
    "2024-08-02"
  ],
  [
    "2024-08",
    "2024-09-06"
  ],
  [
    "2024-09",
    "2024-10-04"
  ],
  [
    "2024-10",
    "2024-11-01"
  ],
  [
    "2024-11",
    "2024-12-06"
  ],
  [
    "2024-12",
    "2025-01-10"
  ],
  [
    "2025-01",
    "2025-02-07"
  ],
  [
    "2025-02",
    "2025-03-07"
  ],
  [
    "2025-03",
    "2025-04-04"
  ],
  [
    "2025-04",
    "2025-05-02"
  ],
  [
    "2025-05",
    "2025-06-06"
  ],
  [
    "2025-06",
    "2025-07-03"
  ],
  [
    "2025-07",
    "2025-08-01"
  ],
  [
    "2025-08",
    "2025-09-05"
  ],
  [
    "2025-09",
    "2025-11-20"
  ],
  [
    "2025-11",
    "2025-12-16"
  ],
  [
    "2025-12",
    "2026-01-09"
  ],
  [
    "2026-01",
    "2026-02-11"
  ],
  [
    "2026-02",
    "2026-03-06"
  ]
];

// scripts/jobs-report/ingest.ts
function ingest(directory) {
  const raw = readFileSync(resolve(directory, "retrieval.json"), "utf8");
  const manifest = JSON.parse(raw);
  if (manifest.schemaVersion !== 1 || manifest.seriesId !== "CES0000000001" || manifest.distributorSeriesId !== "PAYEMS" || manifest.unit !== "thousand jobs" || manifest.seasonalAdjustment !== "seasonally adjusted" || manifest.files?.length !== 25)
    throw new Error(
      "Unexpected source series, unit, adjustment or capture count"
    );
  const dates = /* @__PURE__ */ new Set();
  const vintages = manifest.files.map((entry) => {
    if (!/^PAYEMS-\d{4}-\d{2}-\d{2}\.csv$/.test(entry.file) || entry.file !== `PAYEMS-${entry.releaseDate}.csv` || dates.has(entry.releaseDate))
      throw new Error("Invalid or duplicate source filename/date");
    dates.add(entry.releaseDate);
    if (!calendar_default.some(
      ([month, date]) => month === entry.referenceMonth && date === entry.releaseDate
    ))
      throw new Error(
        "Source reference month and publication date disagree with the BLS calendar"
      );
    const expectedURL = `https://alfred.stlouisfed.org/graph/alfredgraph.csv?id=PAYEMS&cosd=2023-12-01&coed=2025-12-01&vintage_date=${entry.releaseDate}`;
    if (entry.url !== expectedURL)
      throw new Error("Unexpected source URL or vintage parameter");
    if (!Number.isFinite(Date.parse(entry.retrievedAt)))
      throw new Error("Missing retrieval time");
    const bytes = readFileSync(resolve(directory, entry.file));
    if (bytes.length !== entry.bytes || createHash("sha256").update(bytes).digest("hex") !== entry.sha256)
      throw new Error(`Source checksum mismatch: ${entry.file}`);
    const [header, ...rows] = bytes.toString("utf8").trim().split(/\r?\n/);
    if (header !== `observation_date,PAYEMS_${entry.releaseDate.replaceAll("-", "")}`)
      throw new Error(
        `Source did not identify requested vintage: ${entry.file}`
      );
    const levels = {};
    for (const row of rows) {
      const match = /^(\d{4}-\d{2})-01,(\d+)$/.exec(row);
      if (!match || !["2023-12", ...months].includes(match[1]) || levels[match[1]] !== void 0)
        throw new Error(`Invalid, duplicate or unexpected level: ${row}`);
      const month = match[1];
      if (month > entry.referenceMonth)
        throw new Error("An export contains a future reference month");
      levels[month] = Number(match[2]);
    }
    const last = entry.referenceMonth > "2025-12" ? "2025-12" : entry.referenceMonth;
    for (let month = "2023-12"; month <= last; month = shiftMonth(month, 1)) {
      if (levels[month] === void 0)
        throw new Error(`Missing level ${month} in ${entry.file}`);
    }
    return {
      releaseDate: entry.releaseDate,
      featuredMonth: entry.referenceMonth,
      file: entry.file,
      url: entry.url,
      sha256: entry.sha256,
      retrievedAt: entry.retrievedAt,
      levels
    };
  });
  if (readdirSync(directory).filter((file) => file.endsWith(".csv")).length !== vintages.length)
    throw new Error("Every CSV must have a retrieval checksum");
  vintages.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
  const sourceDigest = snapshotDigest(vintages);
  return {
    schemaVersion: 1,
    id: `ces-2024-2025-${sourceDigest.slice(7, 19)}-v1`,
    sourceDigest,
    capturedAt: manifest.captureStartedAt,
    vintages
  };
}

// scripts/jobs-report/bundle.ts
import { createHash as createHash2 } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync as readFileSync2,
  readdirSync as readdirSync2,
  renameSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { renderChartWithEvidence as renderChartWithEvidence2 } from "semiotic/server";

// docs/src/pages/examples/jobs-report/exports.ts
var escapeHTML = (text) => String(text).replace(
  /[&<>"']/g,
  (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]
);
function sourceCSV(snapshot, asOf) {
  const rows = canonicalRows(snapshot, asOf);
  const keys = Object.keys(rows[0]);
  const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
  return [keys.join(","), ...rows.map((row) => keys.map((key) => quote(row[key])).join(","))].join(
    "\r\n"
  ) + "\r\n";
}
function estimateTable(briefing) {
  const rows = [
    ["First estimate", briefing.selected.first],
    ["Third estimate", briefing.selected.third],
    [`${dateName(briefing.asOf)} vintage`, briefing.selected.latest]
  ];
  return `<table><caption>${escapeHTML(monthName(briefing.month))} \xB7 U.S. nonfarm payrolls, seasonally adjusted</caption><thead><tr><th scope="col">Estimate</th><th scope="col">Publication date</th><th scope="col">Monthly change (jobs)</th></tr></thead><tbody>${rows.map(([label, row]) => `<tr><th scope="row">${escapeHTML(label)}</th><td>${row ? dateName(row.releaseDate) : "Unavailable in this edition"}</td><td>${signed(row?.change ?? null)}</td></tr>`).join("")}</tbody></table>`;
}
function graphicSVG(briefing, chartSVG) {
  const e = escapeHTML;
  const first = briefing.selected.first;
  const third = briefing.selected.third;
  const latest = briefing.selected.latest;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="560" viewBox="0 0 760 560" role="img" aria-labelledby="jobs-title jobs-desc"><title id="jobs-title">${e(briefing.props.title)}</title><desc id="jobs-desc">${e(briefing.selected.summary)} Bars show signed revisions, not changes in different months.</desc><rect width="760" height="560" fill="#faf7ef"/><text x="30" y="32" font-family="sans-serif" font-size="12" fill="#514e46">THE JOBS REPORT HAS A SECOND DRAFT \xB7 RECONSTRUCTED HISTORICAL EDITION</text><text x="30" y="66" font-family="Georgia,serif" font-size="26" fill="#24251f">${e(monthName(briefing.month))}: ${signed(latest?.change ?? null)} jobs</text><g transform="translate(0 78)">${chartSVG}</g>${[
    ["First", first],
    ["Third", third],
    ["Named vintage", latest]
  ].map(([label, value], i) => {
    const row = value;
    return `<g transform="translate(${30 + i * 245} 447)" font-family="sans-serif" fill="#24251f"><text font-size="12">${label} \xB7 ${row ? e(dateName(row.releaseDate)) : "unavailable"}</text><text y="29" font-size="23">${signed(row?.change ?? null)}</text></g>`;
  }).join(
    ""
  )}<text x="30" y="516" font-family="sans-serif" font-size="11" fill="#514e46">U.S. nonfarm payrolls \xB7 seasonally adjusted \xB7 BLS CES via ALFRED \xB7 alfred.stlouisfed.org</text><text x="30" y="537" font-family="sans-serif" font-size="11" fill="#514e46">Vintage ${e(briefing.asOf)} \xB7 ${e(briefing.sourceId)} \xB7 estimates remain revisable</text></svg>`;
}
function briefingHTML(briefing, svg) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(briefing.props.title)}</title><style>body{max-width:760px;margin:2em auto;padding:0 1em;font:18px/1.6 Georgia,serif;color:#24251f;background:#faf7ef}svg{width:100%;height:auto}table{width:100%;border-collapse:collapse;font:14px/1.5 system-ui}th,td{padding:.7em;text-align:left;border-bottom:1px solid #aaa}caption{text-align:left;font-weight:bold}small{display:block;margin:1em 0}a{color:#215a75}@media(max-width:420px){th,td{padding:.4em;font-size:12px}}@media print{body{margin:0;max-width:none}}</style></head><body><p>THE JOBS REPORT HAS A SECOND DRAFT</p><h1>${escapeHTML(monthName(briefing.month))}: the estimate changed</h1><p>${escapeHTML(briefing.selected.summary)}</p><p>${escapeHTML(briefing.contract.claims[1].text)}</p>${svg ?? ""}${estimateTable(briefing)}<p>Monthly revisions incorporate more responses, corrections and seasonal adjustment. Annual benchmarking can change earlier months too. These bars describe the difference between published estimates; they do not isolate its causes.</p><p>Source: <a href="https://alfred.stlouisfed.org/series?seid=PAYEMS">BLS CES, distributed by ALFRED</a>. Source levels are in thousands; each monthly change subtracts the preceding month in the same vintage, then multiplies by 1,000.</p><p>${escapeHTML(briefing.sourceException)}</p><small>Edition ${escapeHTML(briefing.edition)} \xB7 ${escapeHTML(briefing.sourceId)}. Reconstructed from dated exports, not a claim that this article existed on the release date. Export status: conditional; human editorial approval is unrecorded. SVG may be removed by email clients; this text and table stand alone.</small></body></html>`;
}

// scripts/jobs-report/publication.ts
import { evaluateArtifact, fingerprintValue as fingerprintValue3 } from "semiotic/artifact";
import { renderChartWithEvidence } from "semiotic/server";
function publicationCheck(snapshot, briefing, review, now = (/* @__PURE__ */ new Date()).toISOString(), outputFingerprint) {
  verifyBriefing(snapshot, briefing);
  const evaluation = evaluateArtifact(
    briefing.component,
    briefing.props,
    briefing.contract,
    {
      policy: "exploratory",
      now: briefing.asOf,
      render: renderChartWithEvidence,
      recommendRepresentation: false
    }
  );
  const open = evaluation.obligations.filter(({ status: status2 }) => status2 !== "pass");
  const requirements = [
    .../^sha256:[a-f0-9]{64}$/.test(outputFingerprint ?? "") ? [] : [
      {
        id: "host.output-identity",
        status: "unknown",
        message: "The complete exported files must be identified before their review can be accepted."
      }
    ],
    ...open.map(({ id, status: status2, message }) => ({ id, status: status2, message })),
    {
      id: "host.source-substitution",
      status: "manual",
      message: briefing.sourceException
    },
    {
      id: "host.editorial-review",
      status: "manual",
      message: "Review the complete rendered graphic, exact values and prose for this edition."
    }
  ];
  const subject = fingerprintValue3({
    briefing,
    requirements,
    sceneHash: evaluation.render?.sceneHash,
    outputFingerprint: outputFingerprint ?? null
  }).fingerprint;
  const hardFailure = evaluation.status === "refuse" || open.some(({ status: status2 }) => status2 === "fail") || !evaluation.render || evaluation.render.empty;
  const reviewMatches = review?.schemaVersion === 1 && review.scope === "demonstration-only" && review.subject === subject && Boolean(review.reviewer.trim()) && Number.isFinite(Date.parse(now)) && Date.parse(review.reviewedAt) <= Date.parse(now) && Date.parse(review.expiresAt) > Date.parse(now) && Date.parse(review.reviewedAt) < Date.parse(review.expiresAt);
  const unresolved = requirements.filter(
    (requirement) => requirement.status === "unknown" || !reviewMatches || !review?.decisions.some(
      (decision) => decision.id === requirement.id && decision.outcome === "checked" && decision.rationale.trim().length >= 12
    )
  );
  const status = hardFailure ? "refuse" : unresolved.length ? "conditional" : "ready-for-demo";
  return {
    status,
    artifactStatus: evaluation.status,
    publishable: false,
    demoReady: status === "ready-for-demo",
    subject,
    outputFingerprint,
    requirements,
    unresolved,
    reviewMatches: Boolean(reviewMatches),
    evaluation,
    reason: status === "ready-for-demo" ? "A matching demonstration receipt satisfies the example host check. It is not authenticated editorial approval." : "Export completion and CLI exit zero do not authorize publication. Open checks remain attached."
  };
}

// scripts/jobs-report/bundle.ts
var json = (value) => JSON.stringify(value, null, 2) + "\n";
var inventoryFor = (files) => Object.entries(files).map(([file, value]) => ({
  file,
  bytes: Buffer.byteLength(value),
  sha256: createHash2("sha256").update(value).digest("hex")
}));
async function bundle(snapshot, month, asOf, reading = "direction") {
  const briefing = buildBriefing(snapshot, month, asOf, reading);
  const rendered = renderChartWithEvidence2(briefing.component, briefing.props, {
    artifactContract: briefing.contract
  });
  if (rendered.evidence.empty || rendered.evidence.markCountByType.rect !== briefing.props.data.length)
    throw new Error("The graphic did not render every revision step");
  const svg = graphicSVG(briefing, rendered.svg);
  const files = {
    "briefing.json": json(briefing),
    "packet.json": json(handoff(briefing)),
    "audit-input.json": json({
      component: briefing.component,
      props: briefing.props,
      contract: briefing.contract,
      policy: "exploratory",
      now: asOf
    }),
    "graphic.svg": svg,
    "graphic.png": await sharp(Buffer.from(svg), { density: 144 }).png().toBuffer(),
    "briefing.html": briefingHTML(briefing, svg),
    "email.html": briefingHTML(briefing),
    "source.csv": sourceCSV(snapshot, asOf),
    "source-snapshot.json": json(snapshot),
    "render-evidence.json": json(rendered.evidence)
  };
  const outputFingerprint = `sha256:${createHash2("sha256").update(
    json(
      Object.entries(files).map(([file, value]) => ({
        file,
        sha256: createHash2("sha256").update(value).digest("hex")
      }))
    )
  ).digest("hex")}`;
  const check = publicationCheck(
    snapshot,
    briefing,
    void 0,
    snapshot.capturedAt,
    outputFingerprint
  );
  if (check.status === "refuse")
    throw new Error(`Artifact refused: ${json(check.unresolved)}`);
  files["publication.json"] = json(check);
  files["review-template.json"] = json({
    schemaVersion: 1,
    scope: "demonstration-only",
    subject: check.subject,
    reviewedAt: "",
    expiresAt: "",
    reviewer: "",
    decisions: check.requirements.map(({ id, message }) => ({
      id,
      outcome: "pending",
      rationale: "",
      check: message
    }))
  });
  return { briefing, check, files };
}
function writeEdition(directory, files) {
  const inventory = inventoryFor(files);
  const outputs = { ...files, "outputs.json": json(inventory) };
  if (existsSync(directory)) {
    if (readdirSync2(directory).length !== Object.keys(outputs).length)
      throw new Error("Immutable output inventory changed");
    for (const [file, value] of Object.entries(outputs)) {
      if (!readFileSync2(join(directory, file)).equals(Buffer.from(value)))
        throw new Error(`Refusing to replace immutable output: ${file}`);
    }
    return;
  }
  mkdirSync(dirname(directory), { recursive: true });
  const temporary = `${directory}.partial-${process.pid}`;
  mkdirSync(temporary);
  try {
    for (const [file, value] of Object.entries(outputs))
      writeFileSync(join(temporary, file), value);
    renameSync(temporary, directory);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
async function checkSaved(snapshot, directory, review) {
  const briefing = JSON.parse(
    readFileSync2(join(directory, "briefing.json"), "utf8")
  );
  const rebuilt = await bundle(
    snapshot,
    briefing.month,
    briefing.asOf,
    briefing.reading
  );
  for (const [file, value] of Object.entries(rebuilt.files)) {
    if (!readFileSync2(join(directory, file)).equals(Buffer.from(value)))
      throw new Error(`Output does not reproduce: ${file}`);
  }
  const inventory = JSON.parse(
    readFileSync2(join(directory, "outputs.json"), "utf8")
  );
  if (json(inventory) !== json(inventoryFor(rebuilt.files)))
    throw new Error("Output inventory does not reproduce");
  for (const entry of inventory) {
    if (!/^[a-z][a-z0-9.-]+$/.test(entry.file))
      throw new Error("Invalid inventory filename");
    const bytes = readFileSync2(join(directory, entry.file));
    if (bytes.length !== entry.bytes || createHash2("sha256").update(bytes).digest("hex") !== entry.sha256)
      throw new Error(`Output checksum mismatch: ${entry.file}`);
  }
  return publicationCheck(
    snapshot,
    briefing,
    review,
    void 0,
    rebuilt.check.outputFingerprint
  );
}

// scripts/jobs-report/cli.ts
async function main() {
  const [command, ...args] = process.argv.slice(2);
  const options = /* @__PURE__ */ new Map();
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (![
      "--source",
      "--month",
      "--vintage",
      "--output",
      "--before",
      "--after",
      "--review",
      "--reading",
      "--reason",
      "--json"
    ].includes(key) || options.has(key))
      throw new Error(`Unknown or duplicate option: ${key}`);
    if (key === "--json") options.set(key, "true");
    else {
      const value = args[++i];
      if (!value || value.startsWith("--"))
        throw new Error(`Missing value for ${key}`);
      options.set(key, value);
    }
  }
  const required = (key) => {
    const value = options.get(key);
    if (!value)
      throw new Error(
        `Missing ${key}; see README.md for build, compare and check recipes`
      );
    return value;
  };
  const snapshot = ingest(resolve2(required("--source")));
  const output = resolve2(required("--output"));
  if (command === "build") {
    const result = await bundle(
      snapshot,
      required("--month"),
      required("--vintage"),
      options.get("--reading") ?? "direction"
    );
    writeEdition(output, result.files);
    console.log(
      options.has("--json") ? json(result.check) : `${result.check.status}: ${result.briefing.edition}
${result.check.reason}
Bundle: ${output}`
    );
  } else if (command === "compare") {
    const month = required("--month");
    const before = buildBriefing(snapshot, month, required("--before"));
    const after = buildBriefing(
      snapshot,
      month,
      required("--after"),
      options.get("--reading") ?? "direction"
    );
    const report = compareBriefings(
      before,
      after,
      options.get("--reason") ?? "source-update"
    );
    writeEdition(output, {
      "change-report.json": json(report),
      "before.json": json(before),
      "after.json": json(after),
      "README.txt": `${before.edition} \u2192 ${after.edition}
Reason: ${report.reason}
${report.changed.map((row) => `${row.key}: ${before.values.find((old) => old.key === row.key)?.value} \u2192 ${row.value} jobs`).join("\n")}
Reassessed claims: ${report.affectedClaims.join(", ")}
The earlier review does not apply. Human editorial review remains pending.
`
    });
    console.log(
      options.has("--json") ? json(report) : `conditional: ${report.before} \u2192 ${report.after}
${report.changed.length} changed value bindings; earlier review does not apply.`
    );
  } else if (command === "check") {
    const review = options.get("--review");
    const result = await checkSaved(
      snapshot,
      output,
      review ? JSON.parse(readFileSync3(resolve2(review), "utf8")) : void 0
    );
    console.log(
      options.has("--json") ? json(result) : `${result.status}: ${result.reason}`
    );
    process.exitCode = result.status === "ready-for-demo" ? 0 : result.status === "refuse" ? 1 : 2;
  } else throw new Error("Choose build, compare or check; see README.md");
}
main().catch((error) => {
  console.error(
    process.argv.includes("--json") ? json({ status: "refuse", publishable: false, error: error.message }) : `refuse: ${error.message}`
  );
  process.exitCode = 1;
});
