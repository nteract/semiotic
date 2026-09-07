// docs/src/pages/examples/reservoir-guide/edition.ts
import { fingerprintValue } from "semiotic/artifact";

// docs/src/pages/examples/reservoir-guide/calendar.ts
var DAY = 864e5;
function dateTime(date) {
  const time = Date.parse(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== date)
    throw new Error(`Invalid calendar date: ${date}`);
  return time;
}
function dateIndex(date, start) {
  return (dateTime(date) - dateTime(start)) / DAY;
}
function addDays(date, amount) {
  return new Date(dateTime(date) + amount * DAY).toISOString().slice(0, 10);
}
function waterYear(date) {
  dateTime(date);
  return Number(date.slice(0, 4)) + (date.slice(5, 7) >= "10" ? 1 : 0);
}
function dateForWaterYear(year, monthDay) {
  if (!Number.isInteger(year) || year < 1900 || year > 2200 || !/^\d{2}-\d{2}$/.test(monthDay))
    return null;
  const date = `${monthDay.slice(0, 2) >= "10" ? year - 1 : year}-${monthDay}`;
  try {
    dateTime(date);
    return date;
  } catch {
    return null;
  }
}
var SEASON_DAYS = Array.from(
  { length: 366 },
  (_, index) => addDays("1999-10-01", index).slice(5)
);
function sourceObservationStamp(date, offset) {
  const iso = new Date(dateTime(date) + offset * 6e4).toISOString();
  return `${iso.slice(0, 10).replaceAll("-", "")} ${iso.slice(11, 16).replace(":", "")}`;
}

// docs/src/pages/examples/reservoir-guide/state.ts
var STORY_PATH = "/examples/reservoir-guide";
var STORY_URL = `https://semiotic.nteract.io${STORY_PATH}`;
function defaultState(snapshot) {
  return {
    version: 1,
    editionId: snapshot.editionId,
    stationId: "SHA",
    waterYear: 2025,
    comparisonYear: 2021,
    monthDay: "07-30",
    baselineId: snapshot.baseline.id
  };
}
function validateState(value) {
  if (!value || typeof value !== "object") throw new Error("Invalid saved selection");
  const state = value;
  if (state.version !== 1) throw new Error("Unsupported saved-selection version");
  if (typeof state.editionId !== "string" || !/^[a-zA-Z0-9._-]{1,160}$/.test(state.editionId) || typeof state.baselineId !== "string" || state.baselineId.length > 160 || !state.baselineId || typeof state.stationId !== "string" || !/^[A-Z0-9]{3}$/.test(state.stationId) || ![state.waterYear, state.comparisonYear].every(
    (year) => Number.isInteger(year) && year >= 1900 && year <= 2200
  ) || !SEASON_DAYS.includes(state.monthDay))
    throw new Error("Invalid reservoir, year, season date or baseline");
  return {
    version: 1,
    editionId: state.editionId,
    stationId: state.stationId,
    waterYear: state.waterYear,
    comparisonYear: state.comparisonYear,
    monthDay: state.monthDay,
    baselineId: state.baselineId
  };
}
function resolveState(state, snapshot) {
  if (state.editionId !== snapshot.editionId)
    return "This saved edition is unavailable. Your selection has not been replaced.";
  if (state.baselineId !== snapshot.baseline.id)
    return "The saved comparison baseline is unavailable in this edition.";
  if (!snapshot.reservoirs.some((item) => item.id === state.stationId))
    return "The selected reservoir is unavailable in this edition.";
  const first = waterYear(snapshot.startDate);
  const last = waterYear(snapshot.endDate);
  if ([state.waterYear, state.comparisonYear].some((year) => year < first || year > last))
    return "A selected water year is unavailable in this edition. Choose compatible years or retain the old edition.";
  return null;
}
function stateSearch(state) {
  return `?guide=${encodeURIComponent(JSON.stringify(validateState(state)))}`;
}

// docs/src/pages/examples/reservoir-guide/edition.ts
function verifySnapshot(value) {
  if (!value || typeof value !== "object") throw new Error("Invalid reservoir edition");
  const snapshot = value;
  if (snapshot.version !== 1 || snapshot.storyId !== "E03")
    throw new Error("Unsupported reservoir edition version");
  if (typeof snapshot.editionId !== "string" || !/^[a-zA-Z0-9._-]{1,160}$/.test(snapshot.editionId))
    throw new Error("Invalid edition identity");
  dateTime(snapshot.startDate);
  dateTime(snapshot.endDate);
  const length = dateIndex(snapshot.endDate, snapshot.startDate) + 1;
  if (length < 1 || length > 5e4 || !Array.isArray(snapshot.reservoirs) || snapshot.reservoirs.length < 1 || snapshot.reservoirs.length > 50)
    throw new Error("Unsupported edition coverage");
  const seen = /* @__PURE__ */ new Set();
  if (!Number.isFinite(Date.parse(snapshot.retrievedAt)) || typeof snapshot.transformVersion !== "string")
    throw new Error("Invalid edition retrieval or transform metadata");
  dateTime(snapshot.referenceCapacityDate);
  if (!snapshot.baseline || typeof snapshot.baseline.id !== "string" || !snapshot.baseline.id || snapshot.baseline.id.length > 160 || snapshot.baseline.startWaterYear !== 1991 || snapshot.baseline.endWaterYear !== 2020 || snapshot.baseline.minimumPercentileYears !== 20)
    throw new Error(
      "Unsupported seasonal baseline; this guide supports water years 1991\u20132020 with a 20-year percentile minimum"
    );
  if (!Array.isArray(snapshot.sources) || !snapshot.sources.length || snapshot.sources.length > 100)
    throw new Error("Missing source inventory");
  const files = /* @__PURE__ */ new Set();
  for (const source of snapshot.sources) {
    if (!/^[a-zA-Z0-9._-]+$/.test(source.file) || files.has(source.file) || !/^https:\/\//.test(source.url) || !/^[a-f0-9]{64}$/.test(source.sha256) || !Number.isInteger(source.bytes) || source.bytes < 0 || !Number.isFinite(Date.parse(source.retrievedAt)))
      throw new Error("Invalid or duplicate source metadata");
    files.add(source.file);
  }
  for (const reservoir of snapshot.reservoirs) {
    if (!/^[A-Z0-9]{3}$/.test(reservoir.id) || seen.has(reservoir.id))
      throw new Error("Duplicate or invalid reservoir identity");
    seen.add(reservoir.id);
    if (typeof reservoir.name !== "string" || !reservoir.name || reservoir.name.length > 100 || typeof reservoir.river !== "string" || !Number.isFinite(reservoir.latitude) || Math.abs(reservoir.latitude) > 90 || !Number.isFinite(reservoir.longitude) || Math.abs(reservoir.longitude) > 180 || !files.has(reservoir.sourceFile) || !files.has(reservoir.metadataFile) || !Array.isArray(reservoir.changes))
      throw new Error("Invalid reservoir metadata");
    const changes = /* @__PURE__ */ new Set();
    for (const change of reservoir.changes) {
      dateTime(change.from);
      if (typeof change.id !== "string" || !change.id || typeof change.explanation !== "string" || changes.has(change.from))
        throw new Error("Ambiguous measurement change");
      changes.add(change.from);
    }
    if (!snapshot.sourceLineOverrides?.[reservoir.id] || !snapshot.counts?.[reservoir.id])
      throw new Error("Missing row provenance or coverage counts");
    for (const [date, line] of Object.entries(snapshot.sourceLineOverrides[reservoir.id])) {
      dateTime(date);
      if (date < snapshot.startDate || date > snapshot.endDate || !Number.isInteger(line) || line < 2)
        throw new Error("Invalid source record reference");
    }
    const rows = snapshot.series?.[reservoir.id];
    if (!Array.isArray(rows) || rows.length !== length)
      throw new Error("Edition date coverage is incomplete");
    for (const row of rows) {
      if (!Array.isArray(row) || row.length < 2 || row.length > 3 || row[0] !== null && (!Number.isFinite(row[0]) || row[0] < 0) || row[1] !== null && !Number.isInteger(row[1]) || row[2] !== void 0 && (typeof row[2] !== "string" || row[2].length > 20))
        throw new Error("Invalid packed storage observation");
    }
  }
  if (!Array.isArray(snapshot.capacities)) throw new Error("Missing capacity metadata");
  const capacityIds = /* @__PURE__ */ new Set();
  for (const capacity of snapshot.capacities) {
    dateTime(capacity.validFrom);
    dateTime(capacity.validTo);
    if (!seen.has(capacity.stationId) || typeof capacity.id !== "string" || !capacity.id || capacityIds.has(capacity.id) || !Number.isFinite(capacity.acreFeet) || capacity.acreFeet <= 0 || capacity.validFrom > capacity.validTo || !files.has(capacity.sourceFile) || !/^https:\/\//.test(capacity.sourceURL))
      throw new Error("Invalid capacity metadata");
    if (snapshot.capacities.some(
      (other) => other !== capacity && other.stationId === capacity.stationId && other.validFrom <= capacity.validTo && other.validTo >= capacity.validFrom
    ))
      throw new Error("Overlapping capacity applicability intervals");
    capacityIds.add(capacity.id);
  }
  if (fingerprintValue({ ...snapshot, fingerprint: "" }).fingerprint !== snapshot.fingerprint)
    throw new Error("Edition values differ from its fingerprint");
  return snapshot;
}
function compareEditions(before, after, state) {
  const changes = [];
  const ids = [
    ...new Set([...before.reservoirs, ...after.reservoirs].map((item) => item.id))
  ].sort();
  const first = before.startDate < after.startDate ? before.startDate : after.startDate;
  const last = before.endDate > after.endDate ? before.endDate : after.endDate;
  const days = dateIndex(last, first) + 1;
  for (const id of ids) {
    for (let index = 0; index < days; index++) {
      const date = new Date(dateTime(first) + index * 864e5).toISOString().slice(0, 10);
      const a = before.series[id]?.[dateIndex(date, before.startDate)];
      const b = after.series[id]?.[dateIndex(date, after.startDate)];
      if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null))
        changes.push({
          stationId: id,
          date,
          before: a?.[0] ?? null,
          after: b?.[0] ?? null,
          detail: a?.[0] !== b?.[0] ? "Storage or coverage changed" : "Observation timestamp or quality flag changed"
        });
    }
  }
  const nextState = { ...state, editionId: after.editionId };
  const metadataChanged = fingerprintValue({
    capacities: before.capacities,
    baseline: before.baseline,
    reservoirs: before.reservoirs
  }).fingerprint !== fingerprintValue({
    capacities: after.capacities,
    baseline: after.baseline,
    reservoirs: after.reservoirs
  }).fingerprint;
  return {
    from: before.editionId,
    to: after.editionId,
    changes,
    metadataChanged,
    nextState,
    selectionIssue: resolveState(nextState, after)
  };
}

// docs/src/pages/examples/reservoir-guide/prepare.ts
var SCOPE = "Six selected reservoirs, not all California storage. Historical storage alone cannot establish whether drought has ended.";
function regimeAt(reservoir, date) {
  return [...reservoir.changes].filter((change) => change.from <= date).sort((a, b) => b.from.localeCompare(a.from))[0]?.id ?? "original-reported-series";
}
function readingAt(snapshot, stationId, date) {
  if (!date || date < snapshot.startDate || date > snapshot.endDate) return null;
  const reservoir = snapshot.reservoirs.find((item) => item.id === stationId);
  if (!reservoir) return null;
  const index = dateIndex(date, snapshot.startDate);
  const packed = snapshot.series[stationId]?.[index];
  if (!packed) return null;
  const [value, offset, flag = ""] = packed;
  const status = value === null || offset === null ? "missing" : flag === "e" ? "estimated" : flag === "r" ? "revised" : flag ? "unsupported-flag" : "reported";
  const capacity = snapshot.capacities.find(
    (item) => item.stationId === stationId && item.validFrom <= date && item.validTo >= date
  );
  return {
    id: `${stationId}:${date}`,
    stationId,
    observationDate: date,
    sourceDateTime: `${date.replaceAll("-", "")} 0000`,
    sourceObservationDateTime: offset === null ? null : sourceObservationStamp(date, offset),
    sourceRecordLine: offset === null ? null : snapshot.sourceLineOverrides[stationId]?.[date] ?? index + 2,
    storageAcreFeet: value,
    qualityFlag: flag,
    status,
    eligible: value !== null && value >= 0 && ["reported", "revised"].includes(status),
    measurementRegime: regimeAt(reservoir, date),
    snapshotId: snapshot.editionId,
    capacityId: capacity?.id ?? null
  };
}
function capacityComparison(snapshot, stationId, reading) {
  const exact = reading && snapshot.capacities.find((item) => item.id === reading.capacityId);
  const reference = snapshot.capacities.find(
    (item) => item.stationId === stationId && item.validFrom <= snapshot.referenceCapacityDate && item.validTo >= snapshot.referenceCapacityDate
  );
  const capacity = exact || reference || null;
  const percent2 = reading?.eligible && capacity && capacity.acreFeet > 0 ? reading.storageAcreFeet / capacity.acreFeet * 100 : null;
  return {
    capacity,
    mode: exact ? "dated" : reference ? "reference" : "unavailable",
    percent: percent2,
    aboveReference: percent2 !== null && percent2 > 100
  };
}
function seasonalComparison(snapshot, stationId, year, monthDay) {
  const reservoir = snapshot.reservoirs.find((item) => item.id === stationId);
  const date = dateForWaterYear(year, monthDay);
  const target = readingAt(snapshot, stationId, date);
  const regime = regimeAt(reservoir, date ?? dateForWaterYear(year, "02-28"));
  const samples = [];
  const excluded = [];
  for (let baselineYear = snapshot.baseline.startWaterYear; baselineYear <= snapshot.baseline.endWaterYear; baselineYear++) {
    const baselineDate = dateForWaterYear(baselineYear, monthDay);
    const reading = readingAt(snapshot, stationId, baselineDate);
    const reason = !baselineDate ? "No February 29 in this water year" : !reading?.eligible ? reading?.status ?? "missing" : reading.measurementRegime !== regime ? "Different documented measurement regime" : null;
    if (reason) excluded.push({ year: baselineYear, reason });
    else samples.push({ year: baselineYear, value: reading.storageAcreFeet, rowId: reading.id });
  }
  const count = samples.length;
  const mean = count ? samples.reduce((sum, sample) => sum + sample.value, 0) / count : null;
  const less = target?.eligible ? samples.filter((sample) => sample.value < target.storageAcreFeet).length : 0;
  const equal = target?.eligible ? samples.filter((sample) => sample.value === target.storageAcreFeet).length : 0;
  const enough = count >= snapshot.baseline.minimumPercentileYears;
  return {
    count,
    samples,
    excluded,
    mean,
    less,
    equal,
    percentOfMean: target?.eligible && mean !== null && mean > 0 ? target.storageAcreFeet / mean * 100 : null,
    percentile: target?.eligible && enough ? 100 * (less + equal / 2) / count : null,
    reason: !date ? "This water year has no February 29." : !target?.eligible ? "The selected storage observation is missing, estimated or unsupported." : !count ? "No eligible baseline years use the same documented measurement regime." : !enough ? `Only ${count} eligible baseline years; a percentile requires ${snapshot.baseline.minimumPercentileYears}.` : null
  };
}
function prepareGuide(snapshot, input) {
  const state = validateState(input);
  const issue = resolveState(state, snapshot);
  if (issue) throw new Error(issue);
  const reservoir = snapshot.reservoirs.find((item) => item.id === state.stationId);
  const date = dateForWaterYear(state.waterYear, state.monthDay);
  const comparisonDate = dateForWaterYear(state.comparisonYear, state.monthDay);
  const reading = readingAt(snapshot, reservoir.id, date);
  const members = snapshot.reservoirs.map((item) => {
    const row = readingAt(snapshot, item.id, date);
    return { reservoir: item, reading: row, capacity: capacityComparison(snapshot, item.id, row) };
  });
  const included = members.filter(
    (member) => member.reading?.eligible && member.capacity.capacity && member.capacity.percent !== null
  );
  const storage = included.length ? included.reduce((sum, member) => sum + member.reading.storageAcreFeet, 0) : null;
  const capacity = included.length ? included.reduce((sum, member) => sum + member.capacity.capacity.acreFeet, 0) : null;
  return {
    state,
    reservoir,
    date,
    comparisonDate,
    reading,
    comparisonReading: readingAt(snapshot, reservoir.id, comparisonDate),
    capacity: capacityComparison(snapshot, reservoir.id, reading),
    baseline: seasonalComparison(snapshot, reservoir.id, state.waterYear, state.monthDay),
    season: SEASON_DAYS.map((monthDay, day) => {
      const baseline = seasonalComparison(snapshot, reservoir.id, state.waterYear, monthDay);
      return {
        day,
        monthDay,
        active: readingAt(snapshot, reservoir.id, dateForWaterYear(state.waterYear, monthDay)),
        comparison: readingAt(
          snapshot,
          reservoir.id,
          dateForWaterYear(state.comparisonYear, monthDay)
        ),
        baselineMean: baseline.mean,
        baselineCount: baseline.count
      };
    }),
    collection: {
      date,
      members,
      includedIds: included.map((member) => member.reservoir.id),
      excludedIds: members.filter((member) => !included.includes(member)).map((member) => member.reservoir.id),
      storage,
      capacity,
      percent: storage !== null && capacity !== null && capacity > 0 ? storage / capacity * 100 : null,
      status: !included.length ? "unavailable" : included.length === members.length ? "complete" : "partial",
      mode: !included.length ? "unavailable" : included.every((member) => member.capacity.mode === "dated") ? "dated" : "reference"
    },
    qualifications: [
      SCOPE,
      "The fixed baseline uses water years 1991\u20132020 and matches month/day, not ordinary day-of-year integers.",
      "Revised readings are eligible. Estimated readings remain visible in source details but are excluded from calculations; missing readings never become zero.",
      "Capacity is documented for July 30, 2025. Other dates use that explicitly labeled reference, not a reconstructed history of reservoir capacity.",
      ...reservoir.changes.map((change) => `${change.from}: ${change.explanation}`)
    ]
  };
}

// docs/src/pages/examples/reservoir-guide/packet.ts
import {
  adaptHistoricalSnapshotMetadata,
  auditTemporalContext,
  buildArtifactContract,
  fingerprintValue as fingerprintValue2,
  requireSerializableArtifactContract
} from "semiotic/artifact";

// docs/src/pages/examples/reservoir-guide/format.ts
var number = (value, decimals = 0) => value === null ? "Unavailable" : value.toLocaleString("en-US", {
  minimumFractionDigits: decimals,
  maximumFractionDigits: decimals
});
var percent = (value) => value === null ? "Unavailable" : `${number(value, 1)}%`;
var dateLabel = (date) => date ? new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC"
}).format(dateTime(date)) : "No such calendar date in this water year";
var monthDayLabel = (monthDay) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
  dateTime(`2000-${monthDay}`)
);
function readingLabel(reading) {
  if (!reading || reading.storageAcreFeet === null) return "Unavailable";
  return `${number(reading.storageAcreFeet)} acre-feet${reading.status === "reported" ? "" : ` (${reading.status})`}`;
}
function guideSummary(guide) {
  const prefix = `${guide.reservoir.name}, ${dateLabel(guide.date)}: `;
  if (!guide.reading?.eligible)
    return `${prefix}${readingLabel(guide.reading)}. Missing or estimated readings are not used in the comparisons.`;
  const capacity = guide.capacity.percent === null ? "No supported capacity comparison." : `${percent(guide.capacity.percent)} of ${guide.capacity.mode === "dated" ? "documented capacity" : "the July 30, 2025 capacity reference"}.`;
  const average = guide.baseline.percentOfMean === null ? "A compatible seasonal average is unavailable." : `${percent(guide.baseline.percentOfMean)} of the mean of ${guide.baseline.count} eligible 1991\u20132020 observations for this month and day.`;
  const rank = guide.baseline.percentile === null ? guide.baseline.reason ?? "A percentile is unavailable." : `Historical percentile ${number(guide.baseline.percentile, 1)}; ${guide.baseline.less} of ${guide.baseline.count} values were lower, with ${guide.baseline.equal} ties.`;
  return `${prefix}${readingLabel(guide.reading)}. ${capacity} ${average} ${rank}`;
}
function collectionSummary(guide) {
  const { collection } = guide;
  const included = collection.members.filter((item) => collection.includedIds.includes(item.reservoir.id)).map((item) => item.reservoir.name).join(", ");
  const missing = collection.members.filter((item) => collection.excludedIds.includes(item.reservoir.id)).map((item) => item.reservoir.name).join(", ");
  if (!collection.includedIds.length)
    return "No eligible reservoir/capacity pairs for this date; the collection is unavailable.";
  return `${collection.status === "partial" ? "Partial collection" : "These six reservoirs"}: ${number(collection.storage)} acre-feet / ${number(collection.capacity)} acre-feet = ${percent(collection.percent)}${collection.mode === "reference" ? " of the July 30, 2025 capacity references" : " of their documented capacity"}. Included: ${included}.${missing ? ` Excluded: ${missing}.` : ""} This is not a statewide total.`;
}
var escapeMarkup = (value) => String(value).replace(
  /[&<>"']/g,
  (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]
);

// docs/src/pages/examples/reservoir-guide/chart-config.ts
function seasonRenderProps(guide) {
  return {
    ...seasonChartProps(guide),
    xFormat: (value) => {
      const day = SEASON_DAYS[Math.round(Number(value))];
      return day ? monthDayLabel(day) : "";
    }
  };
}
function seasonChartProps(guide) {
  const roles = [
    `Selected WY ${guide.state.waterYear}`,
    `Compare WY ${guide.state.comparisonYear}`,
    "1991\u20132020 compatible mean"
  ];
  const data = [];
  for (const [index, role] of roles.entries()) {
    let segment = 0;
    for (const point of guide.season) {
      const reading = index === 0 ? point.active : point.comparison;
      const value = index === 2 ? point.baselineMean : reading?.eligible ? reading.storageAcreFeet : null;
      if (value === null || value === void 0) {
        if (index === 2 || reading !== null) segment++;
        continue;
      }
      data.push({
        day: point.day,
        storageMAF: value / 1e6,
        role,
        segment: `${role}:${segment}`,
        monthDay: point.monthDay,
        rowId: index === 2 ? null : reading?.id ?? null
      });
    }
  }
  return {
    data,
    xAccessor: "day",
    yAccessor: "storageMAF",
    lineBy: "segment",
    colorBy: "role",
    colorScheme: { [roles[0]]: "#096d76", [roles[1]]: "#9c4525", [roles[2]]: "#666452" },
    width: 740,
    height: 340,
    margin: { left: 64, right: 30, top: 28, bottom: 56 },
    yExtent: [0, void 0],
    xExtent: [0, 365],
    xLabel: "Water year \xB7 October through September",
    yLabel: "Million acre-feet",
    title: `${guide.reservoir.name}: two water years`,
    description: guideSummary(guide),
    summary: "Lines compare reported storage volume. Gaps mark missing or estimated observations; February 29 keeps its own calendar slot. The historical mean uses only compatible measurement regimes.",
    accessibleTable: true,
    showLegend: false,
    enableHover: false,
    curve: "linear"
  };
}
function collectionChartProps(guide) {
  return {
    data: guide.collection.members.filter((item) => item.reading?.eligible).map((item) => ({
      stationId: item.reservoir.id,
      reservoir: item.reservoir.name,
      storageMAF: item.reading.storageAcreFeet / 1e6
    })),
    categoryAccessor: "reservoir",
    valueAccessor: "storageMAF",
    orientation: "horizontal",
    width: 740,
    height: 320,
    margin: { left: 115, right: 35, top: 20, bottom: 48 },
    title: "Stored volume (million AF)",
    description: collectionSummary(guide),
    summary: "Bars compare stored volume in million acre-feet. Their percentages of capacity use different denominators; the collection calculation pairs storage and capacity for the identical eligible membership.",
    accessibleTable: true,
    enableHover: false,
    sort: false,
    colorScheme: ["#096d76"]
  };
}
function distributionReferences(guide) {
  return [
    {
      name: "Selected reading",
      value: guide.reading?.eligible ? guide.reading.storageAcreFeet : null,
      color: "#096d76",
      dash: "none"
    },
    { name: "Compatible seasonal mean", value: guide.baseline.mean, color: "#9c4525", dash: "8,4" },
    {
      name: guide.capacity.mode === "dated" ? "Documented capacity" : "July 30, 2025 capacity reference",
      value: guide.capacity.capacity?.acreFeet ?? null,
      color: "#50534c",
      dash: "2,4"
    }
  ];
}
function distributionDescription(guide) {
  return `Each dot is one of ${guide.baseline.count} eligible readings for ${monthDayLabel(guide.state.monthDay)} in water years 1991\u20132020, using the selected measurement regime. Dots spread vertically only to avoid overlap; height has no numerical meaning. Reference lines mark the selected reading, compatible mean and capacity when available. ${guide.baseline.excluded.length} baseline years are excluded. ${guide.baseline.reason ?? `${guide.baseline.less} observations are lower and ${guide.baseline.equal} tie the selected value.`}`;
}
function distributionChartProps(guide) {
  const references = distributionReferences(guide);
  const data = guide.baseline.samples.map((s) => ({
    year: s.year,
    rowId: s.rowId,
    population: "1991\u20132020",
    storageMAF: s.value / 1e6
  }));
  const maximum = Math.max(
    1,
    ...data.map((d) => d.storageMAF),
    ...references.map((r) => (r.value ?? 0) / 1e6)
  );
  return {
    data,
    categoryAccessor: "population",
    valueAccessor: "storageMAF",
    orientation: "horizontal",
    width: 740,
    height: 260,
    margin: { left: 28, right: 28, top: 24, bottom: 58 },
    pointRadius: 4,
    pointOpacity: 1,
    colorScheme: ["#626857"],
    showCategoryTicks: false,
    showLegend: false,
    valueExtent: [0, maximum * 1.06],
    valueLabel: "Stored volume (million AF)",
    title: "Where this reading sits",
    description: distributionDescription(guide),
    summary: guideSummary(guide),
    accessibleTable: true,
    annotations: references.filter((r) => r.value !== null).map((r) => ({
      type: "x-threshold",
      value: r.value / 1e6,
      color: r.color,
      strokeDasharray: r.dash,
      strokeWidth: 2
    }))
  };
}

// docs/src/pages/examples/reservoir-guide/packet.ts
function numericalBindings(guide) {
  const selected = guide.reading?.eligible ? guide.reading.storageAcreFeet : null;
  const base = { state: guide.state, unit: "percent", tolerance: 1e-10 };
  return [
    {
      ...base,
      id: "capacity",
      operation: "ratio-times-100",
      numerator: selected,
      denominator: guide.capacity.capacity?.acreFeet ?? null,
      expected: guide.capacity.percent,
      baseline: guide.capacity.capacity?.id ?? "unknown capacity",
      inputs: guide.reading ? [guide.reading.id] : []
    },
    {
      ...base,
      id: "seasonal-mean",
      operation: "ratio-times-100",
      numerator: selected,
      denominator: guide.baseline.mean,
      expected: guide.baseline.percentOfMean,
      baseline: guide.state.baselineId,
      inputs: guide.baseline.samples.map((sample) => sample.rowId)
    },
    {
      ...base,
      id: "historical-percentile",
      operation: "midrank-times-100",
      numerator: guide.baseline.less + guide.baseline.equal / 2,
      denominator: guide.baseline.count,
      expected: guide.baseline.percentile,
      baseline: guide.state.baselineId,
      inputs: guide.baseline.samples.map((sample) => sample.rowId)
    },
    {
      ...base,
      id: "collection",
      operation: "ratio-of-sums-times-100",
      numerator: guide.collection.storage,
      denominator: guide.collection.capacity,
      expected: guide.collection.percent,
      baseline: guide.collection.mode === "dated" ? "dated matched capacities" : "2025-07-30 matched capacity references",
      inputs: guide.collection.members.filter((member) => guide.collection.includedIds.includes(member.reservoir.id)).map((member) => member.reading.id)
    }
  ];
}
function evaluateBindings(guide, input) {
  return numericalBindings(guide).map((binding) => {
    const matches = input.filter((item) => item.id === binding.id);
    if (matches.length !== 1)
      return { id: binding.id, status: "fail", reason: "Missing or duplicate numerical binding" };
    const candidate = matches[0];
    if (fingerprintValue2({ ...binding, expected: null }).fingerprint !== fingerprintValue2({ ...candidate, expected: null }).fingerprint)
      return {
        id: binding.id,
        status: "fail",
        reason: "Units, inputs, identities, formula or baseline differ"
      };
    if (binding.expected === null)
      return {
        id: binding.id,
        status: candidate.expected === null ? "unknown" : "fail",
        reason: "The required value, denominator or eligible history is unavailable"
      };
    const actual = binding.numerator / binding.denominator * 100;
    return {
      id: binding.id,
      status: candidate.expected !== null && Math.abs(candidate.expected - actual) <= binding.tolerance ? "pass" : "fail",
      reason: "Recomputed from the declared numerator, denominator and source rows"
    };
  }).concat(
    input.filter((item) => !numericalBindings(guide).some((binding) => binding.id === item.id)).map((item) => ({ id: item.id, status: "fail", reason: "Unknown binding" }))
  );
}
function buildGuidePacket(snapshot, state) {
  const guide = prepareGuide(snapshot, state);
  const bindings = numericalBindings(guide);
  const checks = evaluateBindings(guide, bindings);
  const time = adaptHistoricalSnapshotMetadata({
    id: snapshot.editionId,
    version: snapshot.editionId,
    snapshotAt: snapshot.retrievedAt,
    timezone: "Etc/GMT+8",
    granularity: "day",
    format: "other",
    schemaVersion: "1",
    freshness: {
      status: "unknown",
      basis: "Historical source retrieval; no live freshness or per-row publication time is claimed."
    },
    completeness: {
      status: guide.collection.status === "complete" ? "provisional" : "partial",
      basis: "Membership is explicit. CDEC readings may be revised after this saved edition."
    },
    presentationLabel: "Saved historical reservoir edition"
  });
  const artifact = buildArtifactContract("LineChart", seasonChartProps(guide), {
    id: "E03-reservoir-guide",
    revision: snapshot.editionId,
    createdAt: snapshot.retrievedAt,
    title: "How full is full?",
    intents: ["compare", "explain"],
    time,
    purpose: {
      allowedUses: ["Compare reported historical reservoir storage with explicit baselines"],
      prohibitedUses: [
        "Statewide drought classification",
        "Water-allocation advice",
        "Treating current reference capacity as reconstructed historical capacity"
      ]
    },
    claims: bindings.map((binding) => ({
      id: binding.id,
      kind: "aggregation",
      status: binding.expected === null ? "unknown" : "provisional",
      text: `${binding.id}: ${binding.expected ?? "unavailable"} percent`,
      evidenceIds: ["cdec-edition"],
      authoredBy: { kind: "system", id: snapshot.transformVersion },
      scope: {
        unit: binding.unit,
        baseline: binding.baseline,
        stationId: state.stationId,
        reportingDate: guide.date,
        membership: guide.collection.includedIds
      }
    })),
    evidence: [
      {
        id: "cdec-edition",
        role: "source-data",
        fingerprint: snapshot.fingerprint,
        dataVersion: snapshot.editionId,
        source: {
          name: "California Data Exchange Center daily storage and dated capacity report",
          uri: `${STORY_URL}#sources`,
          retrievedAt: snapshot.retrievedAt,
          version: snapshot.editionId,
          publisher: "California Department of Water Resources"
        }
      }
    ],
    accountability: {
      generatedBy: snapshot.transformVersion,
      reviews: [
        {
          id: "editorial-review",
          status: "pending",
          rationale: "Calculation and renderer checks do not constitute independent source interpretation or reader acceptance."
        }
      ]
    },
    extensions: {
      "semiotic.e03.guide.v1": JSON.parse(
        JSON.stringify({ state, bindings, checks, qualifications: guide.qualifications })
      )
    }
  });
  return {
    packetVersion: 1,
    storyId: "E03",
    editionId: snapshot.editionId,
    snapshotFingerprint: snapshot.fingerprint,
    retrievedAt: snapshot.retrievedAt,
    state: guide.state,
    guide,
    bindings,
    checks,
    summary: guideSummary(guide),
    scope: SCOPE,
    artifact: requireSerializableArtifactContract(artifact),
    temporalAudit: JSON.parse(JSON.stringify(auditTemporalContext(time))),
    sources: snapshot.sources,
    omissions: [
      "This packet contains the selected two-year table, seasonal means, selected-date baseline samples and collection. Full raw history is a separate pinned download.",
      "Reader selection is preserved; this saved edition does not refresh itself.",
      "Source OBS DATE is retained as a source timestamp, not treated as a publication or revision timestamp."
    ]
  };
}
function importGuidePacket(input, snapshot) {
  if (!input || typeof input !== "object") throw new Error("Invalid guide packet");
  const packet = input;
  if (packet.packetVersion !== 1 || packet.storyId !== "E03")
    throw new Error("Unsupported guide-packet version");
  const state = validateState(packet.state);
  const issue = resolveState(state, snapshot);
  if (issue) return { state, issue, guide: null };
  const expected = buildGuidePacket(snapshot, state);
  if (fingerprintValue2(expected).fingerprint !== fingerprintValue2(packet).fingerprint)
    throw new Error("Packet values, units, scope or evidence differ from the pinned edition");
  return { state, issue: null, guide: expected.guide };
}

// docs/src/pages/examples/reservoir-guide/dictionary.ts
var DICTIONARY = {
  stationId: "CDEC station identity; SHA, ORO, FOL, NML, DNP or CLE in the factual edition.",
  observationDate: "Calendar reporting day from DATE TIME, daily sensor 15, in the service's fixed Pacific Standard Time convention.",
  sourceDateTime: "Original DATE TIME calendar label, reformatted with a space before HHmm. It assigns the daily row; it is not a publication time.",
  sourceObservationDateTime: "Separate OBS DATE from CDEC. Retained as a fixed-PST wall-clock timestamp, not a retrieval, publication or revision timestamp.",
  storageAcreFeet: "Reported volume in acre-feet (AF). Missing --- is null, never zero. No interpolation.",
  qualityFlag: "Blank: reported; r: revised; e: estimated. Revised is eligible; estimated and unknown flags are retained but excluded from calculations.",
  capacityId: "Documented capacity whose applicability interval includes the reporting date, or null. A separately labeled July 30, 2025 reference may still be compared.",
  snapshotId: "Immutable edition identity. Raw source checksums and actual retrieval times are in the manifest.",
  sourceRecordLine: "One-based CSV record line including the header. Stable row identity is stationId:observationDate, not this line number.",
  packedSeries: "Each station's array covers every date from startDate through endDate. Each row is [storageAF|null, OBS DATE offset in minutes from DATE TIME|null, optional quality flag]. Null offset means the source row was absent; explicit --- rows retain their source timestamp.",
  seasonalMean: "Arithmetic mean of eligible same-month/day observations in water years 1991\u20132020 using a compatible documented measurement regime. Coverage N is always shown.",
  percentile: "100 \xD7 (number lower + half the ties) / N. Requires at least 20 eligible baseline years. February 29 has only eight possible baseline years.",
  collection: "Sum storage / sum capacity for exactly the same eligible members. Partial membership names exclusions. Not a statewide total."
};

// docs/src/pages/examples/reservoir-guide/exports.ts
function renderSavedHTML(header, guide, svg, distributionSVG = "") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>How full is full? \u2014 ${escapeMarkup(guide.reservoir.name)}</title><style>
  body{max-width:960px;margin:2rem auto;padding:1rem;font:18px/1.6 system-ui;color:#183c40;background:#fffdf5}a{color:inherit}h1{font:700 clamp(2rem,7vw,4rem)/1.1 Georgia,serif}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:12px;border-bottom:1px solid #9baba7}section{overflow-x:auto}code{overflow-wrap:anywhere}svg{width:100%;height:auto}dt{font-weight:bold}dd{margin:0 0 1rem}li{margin:.7rem 0}:focus-visible{outline:3px solid currentColor;outline-offset:4px}@media print{body{font-size:11pt;margin:0;background:white}table{font-size:8pt}section{overflow:visible}a{overflow-wrap:anywhere}}
  </style></head><body><main><p>FIELD GUIDE / SIX CALIFORNIA RESERVOIRS</p><h1>How full is full?</h1>
  <p data-saved-summary>${escapeMarkup(guideSummary(guide))}</p><p><strong>Saved selection:</strong> ${escapeMarkup(guide.reservoir.name)} \xB7 water year ${guide.state.waterYear} compared with ${guide.state.comparisonYear} \xB7 ${escapeMarkup(monthDayLabel(guide.state.monthDay))}.</p>
  <p>Fixed historical edition <code>${escapeMarkup(header.editionId)}</code>. Retrieved ${escapeMarkup(header.retrievedAt)}. This file includes its chart, tables and system-font styling and opens without a network. It cannot update itself; reopen the online guide to change the selection or check for another edition.</p>
  <h2>Three different comparisons</h2><ul><li>Capacity: ${escapeMarkup(percent(guide.capacity.percent))}; denominator ${escapeMarkup(number(guide.capacity.capacity?.acreFeet ?? null))} AF, ${guide.capacity.mode === "dated" ? "documented for the reporting date" : "July 30, 2025 reference, not reconstructed historical capacity"}.</li><li>Seasonal mean: ${escapeMarkup(number(guide.baseline.mean, 2))} AF; ${guide.baseline.count} eligible years; ${escapeMarkup(percent(guide.baseline.percentOfMean))} of that mean.</li><li>Historical percentile: ${escapeMarkup(number(guide.baseline.percentile, 1))}; ${guide.baseline.less} lower values and ${guide.baseline.equal} ties. ${escapeMarkup(guide.baseline.reason ?? "At least 20 eligible years.")}</li></ul>
  ${guide.capacity.aboveReference ? "<p>This observation exceeds the stated capacity reference; the percentage has not been clamped.</p>" : ""}
  <h2>See the years behind \u201Caverage\u201D</h2><p>${escapeMarkup(distributionDescription(guide))}</p>${distributionSVG || "<p>Read the eligible observations in the selected-date baseline below.</p>"}
  <ul>${distributionReferences(guide).map((r) => `<li>${escapeMarkup(r.name)}: ${escapeMarkup(number(r.value))} AF (${r.dash === "none" ? "solid teal" : r.dash === "8,4" ? "dashed rust" : "dotted gray"} line when available).</li>`).join("")}</ul>
  <h2>Two water years</h2>${svg}<p>Selected: teal; comparison: rust; compatible 1991\u20132020 mean: gray. The table gives every value without relying on color. Gaps exclude missing and estimated readings. A nonexistent February 29 is not a missing observation.</p>
  <section tabindex="0" aria-label="Saved two-year storage table"><table><caption>${escapeMarkup(guide.reservoir.name)} \xB7 WY ${guide.state.waterYear} / ${guide.state.comparisonYear}. Volume in acre-feet. Unavailable is not zero.</caption><thead><tr><th>Month/day</th><th>Selected</th><th>Comparison</th><th>Compatible baseline mean (N)</th></tr></thead><tbody>${guide.season.map((p) => `<tr><th>${escapeMarkup(monthDayLabel(p.monthDay))}</th><td>${escapeMarkup(readingLabel(p.active))}</td><td>${escapeMarkup(readingLabel(p.comparison))}</td><td>${escapeMarkup(number(p.baselineMean, 2))} (${p.baselineCount})</td></tr>`).join("")}</tbody></table></section>
  <h2>These six reservoirs</h2><p>${escapeMarkup(collectionSummary(guide))}</p><section tabindex="0" aria-label="Saved collection table"><table><caption>${escapeMarkup(dateLabel(guide.date))}; matched storage and capacity membership</caption><thead><tr><th>Reservoir</th><th>Storage AF</th><th>Capacity / reference AF</th><th>Percent</th><th>Included</th></tr></thead><tbody>${guide.collection.members.map((m) => `<tr><th>${escapeMarkup(m.reservoir.name)}</th><td>${escapeMarkup(readingLabel(m.reading))}</td><td>${escapeMarkup(number(m.capacity.capacity?.acreFeet ?? null))}</td><td>${escapeMarkup(percent(m.capacity.percent))}</td><td>${guide.collection.includedIds.includes(m.reservoir.id) ? "Yes" : "No"}</td></tr>`).join("")}</tbody></table></section>
  <h2>What storage leaves unanswered</h2><p>A reservoir is one store of water. Groundwater, snowpack, runoff and local supply have different measurement systems and coverage. These six histories cannot establish whether drought has ended or which reservoir supplies a particular household. <a href="https://cww.water.ca.gov/about-the-data">DWR Water Watch: about the data</a>.</p>
  <ul>${guide.qualifications.map((q) => `<li>${escapeMarkup(q)}</li>`).join("")}</ul>
  <h2>Selected-date baseline</h2><p>${guide.baseline.samples.map((s) => `${s.year}: ${number(s.value)} AF [${escapeMarkup(s.rowId)}]`).join("; ") || "No compatible samples."}</p><p>Excluded: ${guide.baseline.excluded.map((s) => `${s.year}: ${escapeMarkup(s.reason)}`).join("; ") || "None"}.</p>
  <h2>Source fields for the selected observations</h2><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${escapeMarkup(JSON.stringify({ selected: guide.reading, comparison: guide.comparisonReading, capacity: guide.capacity.capacity }, null, 2))}</pre>
  <h2>Data dictionary</h2><dl>${Object.entries(DICTIONARY).map(([key, value]) => `<dt>${escapeMarkup(key)}</dt><dd>${escapeMarkup(value)}</dd>`).join("")}</dl>
  <h2>Sources and edition</h2><ul>${header.sources.map((source) => `<li><a href="${escapeMarkup(source.url)}">${escapeMarkup(source.file)}</a> \xB7 retrieved ${escapeMarkup(source.retrievedAt)} \xB7 SHA-256 <code>${escapeMarkup(source.sha256)}</code></li>`).join("")}</ul>
  <p><a href="${escapeMarkup(STORY_URL + stateSearch(guide.state))}">Reopen this saved selection online</a> \xB7 <a href="${STORY_URL}#sources">Source, correction and update notes</a>. Source data may later be revised. Computational checks do not constitute independent editorial or reader review.</p></main></body></html>`;
}
export {
  DICTIONARY,
  buildGuidePacket,
  capacityComparison,
  collectionChartProps,
  collectionSummary,
  compareEditions,
  defaultState,
  distributionChartProps,
  evaluateBindings,
  guideSummary,
  importGuidePacket,
  numericalBindings,
  prepareGuide,
  readingAt,
  renderSavedHTML,
  resolveState,
  seasonChartProps,
  seasonRenderProps,
  seasonalComparison,
  validateState,
  verifySnapshot
};
