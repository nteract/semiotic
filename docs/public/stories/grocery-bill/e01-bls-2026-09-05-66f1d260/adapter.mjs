// docs/src/pages/examples/grocery-receipt/items.ts
var ITEMS = [
  {
    itemId: "bananas",
    seriesId: "APU0000711211",
    label: "Bananas",
    quantityUnit: "lb",
    defaultQuantity: 2,
    sourceTitle: "Bananas, per lb. (453.6 gm) in U.S. city average, average price, not seasonally adjusted"
  },
  {
    itemId: "bread",
    seriesId: "APU0000702111",
    label: "White pan bread",
    quantityUnit: "lb",
    defaultQuantity: 2,
    sourceTitle: "Bread, white, pan, per lb. (453.6 gm) in U.S. city average, average price, not seasonally adjusted"
  },
  {
    itemId: "eggs",
    seriesId: "APU0000708111",
    label: "Large grade-A eggs",
    quantityUnit: "dozen",
    defaultQuantity: 1,
    sourceTitle: "Eggs, grade A, large, per doz. in U.S. city average, average price, not seasonally adjusted"
  },
  {
    itemId: "milk",
    seriesId: "APU0000709112",
    label: "Whole fortified milk",
    quantityUnit: "gallon",
    defaultQuantity: 1,
    sourceTitle: "Milk, fresh, whole, fortified, per gal. (3.8 lit) in U.S. city average, average price, not seasonally adjusted"
  },
  {
    itemId: "chicken",
    seriesId: "APU0000706111",
    label: "Fresh whole chicken",
    quantityUnit: "lb",
    defaultQuantity: 4,
    sourceTitle: "Chicken, fresh, whole, per lb. (453.6 gm) in U.S. city average, average price, not seasonally adjusted"
  },
  {
    itemId: "chuck",
    seriesId: "APU0000703111",
    label: "Ground chuck",
    quantityUnit: "lb",
    defaultQuantity: 1,
    sourceTitle: "Ground chuck, 100% beef, per lb. (453.6 gm) in U.S. city average, average price, not seasonally adjusted"
  }
];
var STORY_PATH = "/examples/grocery-bill";
var STORY_URL = `https://semiotic.nteract.io${STORY_PATH}`;
var QUALIFICATION = "Illustrative basket using national average prices";

// docs/src/pages/examples/grocery-receipt/state.ts
function defaultState(snapshot) {
  return {
    version: 1,
    editionId: snapshot.editionId,
    before: "2019-06",
    after: "2025-06",
    mode: "basket",
    quantities: snapshot.items.map(({ itemId, quantityUnit, defaultQuantity }) => ({
      itemId,
      quantityUnit,
      quantity: defaultQuantity
    }))
  };
}
function validateState(value, snapshot) {
  if (!value || typeof value !== "object")
    throw new Error("The saved comparison is not a receipt state.");
  const state = value;
  if (state.version !== 1)
    throw new Error("This receipt version is unsupported. Open it in the edition that created it.");
  if (state.editionId !== snapshot.editionId)
    throw new Error(
      "This comparison belongs to another edition. Its quantities have not been reset."
    );
  if (![state.before, state.after].every((month) => snapshot.months.includes(month))) {
    throw new Error("A comparison month is outside this edition's 2019-2025 coverage.");
  }
  if (!["basket", "comparable-subset"].includes(state.mode))
    throw new Error("Unknown comparison scope.");
  if (!Array.isArray(state.quantities) || state.quantities.length !== snapshot.items.length) {
    throw new Error("The saved comparison must identify all six items, including zero quantities.");
  }
  const seen = /* @__PURE__ */ new Set();
  for (const entry of state.quantities) {
    const item = snapshot.items.find((candidate) => candidate.itemId === entry?.itemId);
    if (!item || seen.has(entry.itemId))
      throw new Error("An item is unknown or duplicated. The selection is unresolved.");
    seen.add(entry.itemId);
    if (entry.quantityUnit !== item.quantityUnit)
      throw new Error(`The unit for ${item.label} has changed.`);
    if (!Number.isFinite(entry.quantity) || entry.quantity < 0 || entry.quantity > 100 || !Number.isInteger(entry.quantity * 4)) {
      throw new Error("Quantities must be between 0 and 100 in quarter-unit steps.");
    }
  }
  return {
    version: 1,
    editionId: state.editionId,
    before: state.before,
    after: state.after,
    mode: state.mode,
    quantities: snapshot.items.map((item) => ({
      ...state.quantities.find((entry) => entry.itemId === item.itemId)
    }))
  };
}
function stateIdentity(state) {
  const quantities = [...state.quantities].sort((a, b) => a.itemId.localeCompare(b.itemId, "en"));
  return [
    "e01-v1",
    state.editionId,
    state.before,
    state.after,
    state.mode,
    ...quantities.map((row) => `${row.itemId}:${row.quantity}:${row.quantityUnit}`)
  ].join("|");
}
function receiptSearch(state) {
  return `?receipt=${encodeURIComponent(JSON.stringify(state))}`;
}
function readReceiptSearch(search, snapshot) {
  const params = new URLSearchParams(search);
  if (!params.has("receipt")) return defaultState(snapshot);
  if (params.getAll("receipt").length !== 1 || search.length > 5e3)
    throw new Error("The saved receipt link is malformed.");
  let value;
  try {
    value = JSON.parse(params.get("receipt"));
  } catch {
    throw new Error("The saved receipt could not be read. Choose reset to start a new comparison.");
  }
  return validateState(value, snapshot);
}

// docs/src/pages/examples/grocery-receipt/prepare.ts
function priceMillis(row) {
  if (!row || row.sourceStatus === "unavailable") return null;
  return Math.round(row.priceUSD * 1e3);
}
function prepareBasket(snapshot, input) {
  if (snapshot.schemaVersion !== 1 || snapshot.storyId !== "E01")
    throw new Error("Unsupported source edition.");
  if (snapshot.items.length !== ITEMS.length)
    throw new Error("The six-item source dictionary has changed.");
  for (const expected of ITEMS) {
    const actual = snapshot.items.filter((item) => item.itemId === expected.itemId);
    if (actual.length !== 1 || actual[0].seriesId !== expected.seriesId || actual[0].quantityUnit !== expected.quantityUnit || actual[0].sourceTitle !== expected.sourceTitle) {
      throw new Error(
        `Source definition or unit changed for ${expected.label}. Admit a new edition before calculating.`
      );
    }
  }
  const state = validateState(input, snapshot);
  const lookup = /* @__PURE__ */ new Map();
  for (const row of snapshot.rows) {
    const item = snapshot.items.find((candidate) => candidate.itemId === row.itemId);
    const key = `${row.itemId}|${row.month}`;
    if (!item || row.seriesId !== item.seriesId || row.quantityUnit !== item.quantityUnit || row.snapshotId !== snapshot.editionId || row.id !== `${row.seriesId}:${row.month}` || lookup.has(key)) {
      throw new Error("A source row has a mismatched identity, unit, edition, or duplicate month.");
    }
    if (row.sourceStatus === "observed") {
      if (row.priceUSD === null || !Number.isFinite(row.priceUSD) || row.priceUSD < 0 || row.priceUSD > 1e4 || Math.abs(row.priceUSD * 1e3 - Math.round(row.priceUSD * 1e3)) > 1e-7) {
        throw new Error("An observed source price is invalid or exceeds the admitted precision.");
      }
    } else if (row.sourceStatus !== "unavailable" || row.priceUSD !== null) {
      throw new Error(
        "Missing source prices must be explicitly unavailable, never numeric placeholders."
      );
    }
    lookup.set(key, row);
  }
  const get = (itemId, month) => lookup.get(`${itemId}|${month}`);
  const rows = snapshot.items.map((item) => {
    const quantity = state.quantities.find((entry) => entry.itemId === item.itemId).quantity;
    const before = get(item.itemId, state.before);
    const after = get(item.itemId, state.after);
    const a2 = priceMillis(before);
    const b2 = priceMillis(after);
    const missingMonths = [
      .../* @__PURE__ */ new Set([...a2 === null ? [state.before] : [], ...b2 === null ? [state.after] : []])
    ];
    const included2 = quantity > 0 && (state.mode === "basket" || missingMonths.length === 0);
    const beforeUSD = quantity === 0 ? 0 : !included2 || a2 === null ? null : a2 * (quantity * 4) / 4e3;
    const afterUSD = quantity === 0 ? 0 : !included2 || b2 === null ? null : b2 * (quantity * 4) / 4e3;
    return {
      ...item,
      quantity,
      included: included2,
      missingMonths,
      beforePriceUSD: a2 === null ? null : a2 / 1e3,
      afterPriceUSD: b2 === null ? null : b2 / 1e3,
      beforeUSD,
      afterUSD,
      contributionUSD: quantity === 0 ? 0 : !included2 || a2 === null || b2 === null ? null : (b2 - a2) * (quantity * 4) / 4e3,
      sourceRowIds: [...new Set([before?.id, after?.id].filter((id) => Boolean(id)))]
    };
  });
  const selected = rows.filter((row) => row.quantity > 0);
  const included = rows.filter((row) => row.included);
  const excluded = selected.filter((row) => !row.included);
  const empty = selected.length === 0;
  const unavailable = !empty && (included.length === 0 || included.some((row) => row.missingMonths.length > 0));
  function cost(month) {
    if (empty) return 0;
    if (included.length === 0) return null;
    let amount = 0;
    for (const item of included) {
      const price = priceMillis(get(item.itemId, month));
      if (price === null) return null;
      amount += price * (item.quantity * 4);
    }
    return amount;
  }
  const a = unavailable ? null : cost(state.before);
  const b = unavailable ? null : cost(state.after);
  const contributions = included.filter((row) => row.contributionUSD !== null);
  const largest = contributions.length ? Math.max(...contributions.map((row) => Math.abs(row.contributionUSD))) : 0;
  const scope = state.mode === "comparable-subset" ? `Comparable subset: ${included.map((row) => row.label).join(", ") || "no eligible items"}. Excluded from both dates: ${excluded.map((row) => row.label).join(", ") || "none"}.` : empty ? "Empty basket: all six quantities are zero." : `Fixed basket: ${selected.map((row) => `${row.quantity} ${row.quantityUnit} ${row.label}`).join(", ")}.`;
  return {
    state,
    stateId: stateIdentity(state),
    scope,
    status: empty ? "empty" : unavailable ? "unavailable" : "available",
    rows,
    excludedItemIds: excluded.map((row) => row.itemId),
    beforeUSD: a === null ? null : a / 4e3,
    afterUSD: b === null ? null : b / 4e3,
    differenceUSD: a === null || b === null ? null : (b - a) / 4e3,
    percentageChange: a === null || b === null || a === 0 ? null : (b - a) / a * 100,
    largestContributionIds: largest === 0 ? [] : contributions.filter((row) => Math.abs(row.contributionUSD) === largest).map((row) => row.itemId),
    history: snapshot.months.map((month, monthIndex) => {
      const now = cost(month);
      const previous = cost(`${Number(month.slice(0, 4)) - 1}${month.slice(4)}`);
      return {
        month,
        monthIndex,
        costUSD: now === null ? null : now / 4e3,
        yearChangePct: now === null || previous === null || previous === 0 ? null : (now - previous) / previous * 100
      };
    })
  };
}

// docs/src/pages/examples/grocery-receipt/format.ts
function money(value, digits = 2) {
  return value === null ? "Unavailable" : `$${value.toFixed(digits)}`;
}
function signedMoney(value) {
  return value === null ? "Unavailable" : `${value < 0 ? "-" : value > 0 ? "+" : ""}$${Math.abs(value).toFixed(2)}`;
}
function percent(value) {
  return value === null ? "Unavailable" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}
function monthName(month) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  return `${months[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`;
}
function summary(receipt) {
  const dates = `${monthName(receipt.state.before)} to ${monthName(receipt.state.after)}`;
  if (receipt.status === "unavailable")
    return `${dates}: the comparison total is unavailable because required prices are missing. No item has been silently dropped. ${receipt.scope}`;
  if (receipt.status === "empty")
    return `${dates}: an empty basket costs $0.00 in both months. Percentage change is unavailable because the baseline is zero.`;
  return `${dates}: ${money(receipt.beforeUSD)} becomes ${money(receipt.afterUSD)}, a change of ${signedMoney(receipt.differenceUSD)} (${percent(receipt.percentageChange)}). ${receipt.scope} ${QUALIFICATION}.`;
}
function contributionSummary(receipt) {
  if (receipt.status === "unavailable")
    return "Available item changes are shown below, but they do not establish a complete basket difference.";
  const leaders = receipt.rows.filter((row) => receipt.largestContributionIds.includes(row.itemId));
  if (!leaders.length)
    return "No selected item contributes a price difference between these months.";
  return `${leaders.map((row) => row.label).join(" and ")} ${leaders.length > 1 ? "tie for" : "has"} the largest contribution by absolute dollar amount: ${leaders.map((row) => signedMoney(row.contributionUSD)).join(" and ")}. Quantities matter as well as unit-price changes.`;
}

// docs/src/pages/examples/grocery-receipt/exports.ts
function escapeMarkup(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]
  );
}
function receiptValues(receipt) {
  const { history: _history, ...values } = receipt;
  return values;
}
function wrap(text, columns) {
  const lines = [];
  for (const word of text.split(/\s+/)) {
    if (!lines.length || `${lines.at(-1)} ${word}`.length > columns) lines.push(word);
    else lines[lines.length - 1] += ` ${word}`;
  }
  return lines;
}
function renderReceiptSVG(receipt, snapshot, size = "phone") {
  const width = size === "phone" ? 390 : 760;
  const pad = size === "phone" ? 22 : 40;
  const textSize = size === "phone" ? 13 : 17;
  const lines = wrap(receipt.scope, size === "phone" ? 47 : 75);
  const footerY = 674;
  const height = footerY + lines.length * 20 + 152;
  const text = (x, y, value, extra = "") => `<text x="${x}" y="${y}" ${extra}>${escapeMarkup(value)}</text>`;
  const rows = receipt.rows.map((row, index) => {
    const y = 180 + index * 65;
    const note = row.quantity === 0 ? "Not in basket" : !row.included ? "Excluded from both dates" : row.missingMonths.length ? "Required price missing" : `Change ${signedMoney(row.contributionUSD)}`;
    return `${text(pad, y, `${row.quantity} ${row.quantityUnit} ${row.label}`, 'font-weight="bold"')}
      ${text(pad, y + 21, `${money(row.beforeUSD)} / ${money(row.afterUSD)}`)}
      ${text(width - pad, y + 21, note, 'text-anchor="end" font-size="11"')}
      ${text(pad, y + 39, `Unit prices: ${money(row.beforePriceUSD, 3)} / ${money(row.afterPriceUSD, 3)} per ${row.quantityUnit}`, 'font-size="11"')}`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="receipt-title receipt-description">
    <title id="receipt-title">Your grocery bill has a memory</title>
    <desc id="receipt-description">${escapeMarkup(summary(receipt))}</desc>
    <metadata id="receipt-values">${escapeMarkup(JSON.stringify(receiptValues(receipt)))}</metadata>
    <rect width="${width}" height="${height}" fill="#fffdf5"/>
    <g fill="#23372c" font-family="monospace" font-size="${textSize}">
      ${text(pad, 36, "THE SAME BASKET", 'font-size="12" letter-spacing="2"')}
      ${text(pad, 73, "A receipt remembers.", `font-family="Georgia,serif" font-size="${size === "phone" ? 29 : 42}"`)}
      ${text(pad, 109, `${monthName(receipt.state.before)} / ${monthName(receipt.state.after)}`)}
      ${text(pad, 131, "Before / after | USD | same quantities", 'font-size="11"')}
      <path d="M${pad} 147H${width - pad} M${pad} 572H${width - pad}" stroke="#23372c" stroke-dasharray="3 4"/>
      ${rows}
      ${text(pad, 604, "TOTAL", 'font-weight="bold"')}
      ${text(width - pad, 604, `${money(receipt.beforeUSD)} / ${money(receipt.afterUSD)}`, 'text-anchor="end" font-weight="bold"')}
      ${text(pad, 637, `Difference ${signedMoney(receipt.differenceUSD)} (${percent(receipt.percentageChange)})`)}
      ${lines.map((line, index) => text(pad, footerY + index * 20, line, 'font-size="11"')).join("")}
      ${text(pad, height - 118, "Illustrative basket using national average prices", 'font-size="11"')}
      ${text(pad, height - 98, "BLS U.S. city average; not the official CPI.", 'font-size="11"')}
      ${text(pad, height - 78, `Source retrieved ${snapshot.retrievedAt.slice(0, 10)} UTC`, 'font-size="11"')}
      ${text(pad, height - 58, snapshot.editionId, 'font-size="10"')}
      <a href="${STORY_URL}">${text(pad, height - 36, "semiotic.nteract.io/examples/grocery-bill", 'font-size="11" text-decoration="underline"')}</a>
      ${text(pad, height - 17, "Saved edition. Reopen for source and correction notes.", 'font-size="10"')}
    </g>
  </svg>`;
}
function renderReceiptHTML(receipt, snapshot) {
  const rows = receipt.rows.map(
    (row) => `<tr><th scope="row">${escapeMarkup(row.label)}</th><td>${row.quantity} ${row.quantityUnit}</td><td>${money(row.beforePriceUSD, 3)}</td><td>${money(row.afterPriceUSD, 3)}</td><td>${money(row.beforeUSD)}</td><td>${money(row.afterUSD)}</td><td>${signedMoney(row.contributionUSD)}</td><td>${row.quantity === 0 ? "Not in basket" : !row.included ? "Excluded from both dates" : row.missingMonths.length ? "Required price missing" : "Included"}</td></tr>`
  ).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Your grocery bill has a memory</title><style>body{max-width:850px;margin:40px auto;padding:20px;background:#fffdf5;color:#23372c;font:18px/1.65 Georgia,serif}a{color:inherit}table{border-collapse:collapse;width:100%;font:14px/1.6 monospace}th,td{padding:12px 8px;border-bottom:1px solid;text-align:left}section{overflow-x:auto}svg{max-width:100%;height:auto}a:focus-visible,section:focus-visible{outline:3px solid}@media print{body{margin:0;font-size:12pt}section{overflow:visible}table{font-size:8pt}}</style></head><body>
    <h1>Your grocery bill has a memory</h1><p>${escapeMarkup(summary(receipt))}</p>
    <p>${QUALIFICATION}. BLS U.S. city average, not seasonally adjusted. This is neither a store quote nor the official CPI.</p>
    <section tabindex="0" aria-label="Comparison table; scroll horizontally if needed"><table><caption>${escapeMarkup(monthName(receipt.state.before))} / ${escapeMarkup(monthName(receipt.state.after))}. Unit prices in USD per listed unit; line costs in USD. ${escapeMarkup(receipt.scope)} Missing required prices make the full comparison unavailable.</caption><thead><tr><th scope="col">Item</th><th scope="col">Quantity</th><th scope="col">Before unit price</th><th scope="col">After unit price</th><th scope="col">Before cost</th><th scope="col">After cost</th><th scope="col">Contribution</th><th scope="col">Status</th></tr></thead><tbody>${rows}</tbody></table></section>
    <p>Total: ${money(receipt.beforeUSD)} / ${money(receipt.afterUSD)}. Difference: ${signedMoney(receipt.differenceUSD)} (${percent(receipt.percentageChange)}).</p>
    <p>Calculated at source precision; amounts rounded only for display. Individually rounded lines can differ from the rounded total.</p>
    <p>Source retrieved ${snapshot.retrievedAt}. Edition ${escapeMarkup(snapshot.editionId)}. Saved editions cannot update themselves.</p>
    <p><a href="${escapeMarkup(STORY_URL + receiptSearch(receipt.state))}">Reopen this exact comparison</a> | <a href="${STORY_URL}#sources">Sources and corrections</a></p>
    <details><summary>Exact calculation values</summary><pre id="receipt-values">${escapeMarkup(JSON.stringify(receiptValues(receipt), null, 2))}</pre></details>
  </body></html>`;
}

// docs/src/pages/examples/grocery-receipt/packet.ts
import {
  buildArtifactContract,
  fingerprintValue,
  requireSerializableArtifactContract
} from "semiotic/artifact";

// docs/src/pages/examples/grocery-receipt/chart-config.ts
function contributionChartProps(receipt) {
  return {
    data: receipt.rows.filter((row) => row.quantity > 0 && row.included && row.contributionUSD !== null).map((row) => ({ itemId: row.itemId, item: row.label, change: row.contributionUSD })),
    categoryAccessor: "item",
    valueAccessor: "change",
    orientation: "horizontal",
    width: 720,
    height: 330,
    margin: { left: 155, right: 35, top: 20, bottom: 50 },
    title: "What changed the receipt",
    description: contributionSummary(receipt),
    summary: summary(receipt),
    accessibleTable: true,
    sort: false,
    enableHover: false
  };
}

// docs/src/pages/examples/grocery-receipt/packet.ts
function numericalBindings(receipt) {
  const rowIds = [
    ...new Set(receipt.rows.filter((row) => row.included).flatMap((row) => row.sourceRowIds))
  ].sort();
  const base = { stateId: receipt.stateId, baseline: receipt.state.before, tolerance: 1e-10 };
  return [
    ...["beforeUSD", "afterUSD", "differenceUSD", "percentageChange"].map((target) => ({
      ...base,
      id: `receipt:${target}`,
      target,
      itemId: null,
      operation: target === "differenceUSD" ? "difference" : target === "percentageChange" ? "percentage-change" : "sum",
      unit: target === "percentageChange" ? "percent" : "USD",
      inputRowIds: rowIds,
      expected: receipt[target],
      displayDecimals: target === "percentageChange" ? 1 : 2
    })),
    ...receipt.rows.map((row) => ({
      ...base,
      id: `receipt:contribution:${row.itemId}`,
      target: "contributionUSD",
      itemId: row.itemId,
      operation: "item-contribution",
      unit: "USD",
      inputRowIds: [...row.sourceRowIds].sort(),
      expected: row.contributionUSD,
      displayDecimals: 2
    }))
  ];
}
function evaluateNumericalBindings(snapshot, state, bindings) {
  const actual = numericalBindings(prepareBasket(snapshot, state));
  return actual.map((binding) => {
    const candidates = bindings.filter((candidate) => candidate.id === binding.id);
    if (candidates.length !== 1)
      return {
        id: binding.id,
        status: "fail",
        reason: "Missing or duplicated numerical binding."
      };
    const expected = candidates[0];
    const { expected: assertion, ...meaning } = expected;
    const { expected: result, ...actualMeaning } = binding;
    if (fingerprintValue(meaning).fingerprint !== fingerprintValue(actualMeaning).fingerprint)
      return {
        id: binding.id,
        status: "fail",
        reason: "Identity, operation, units, inputs, or baseline differ."
      };
    if (result === null)
      return {
        id: binding.id,
        status: assertion === null ? "unknown" : "fail",
        reason: "Required price or eligible denominator is unavailable."
      };
    return {
      id: binding.id,
      status: typeof assertion === "number" && Number.isFinite(assertion) && Math.abs(assertion - result) <= binding.tolerance ? "pass" : "fail",
      reason: "Recomputed from the named source rows and fixed quantities."
    };
  }).concat(
    bindings.filter((binding) => !actual.some((candidate) => candidate.id === binding.id)).map((binding) => ({ id: binding.id, status: "fail", reason: "Unknown numerical claim." }))
  );
}
function buildReceiptPacket(snapshot, state) {
  const receipt = prepareBasket(snapshot, state);
  const bindings = numericalBindings(receipt);
  const props = contributionChartProps(receipt);
  const json = (value) => JSON.parse(JSON.stringify(value));
  const contract = buildArtifactContract("BarChart", props, {
    id: "E01-receipt-contributions",
    title: "Your grocery bill has a memory",
    revision: receipt.stateId,
    createdAt: snapshot.retrievedAt,
    intents: ["compare", "explain"],
    purpose: {
      allowedUses: ["Compare a fixed illustrative basket across two observation months"],
      prohibitedUses: [
        "Official CPI estimate",
        "Local store quote",
        "Household inflation estimate",
        "Causal attribution"
      ]
    },
    claims: bindings.map((binding) => ({
      id: binding.id,
      kind: "aggregation",
      status: binding.expected === null ? "unknown" : "provisional",
      text: `${binding.id}: ${binding.expected === null ? "unavailable" : binding.expected} ${binding.unit}`,
      evidenceIds: ["basket-calculation"],
      authoredBy: { kind: "system", id: "e01-basket-adapter" },
      scope: {
        unit: binding.unit,
        geography: snapshot.geography,
        baseline: state.before,
        comparisonMonth: state.after,
        basket: receipt.stateId,
        denominator: binding.target === "percentageChange" ? "Positive fixed-basket cost in the baseline month" : "not applicable"
      }
    })),
    evidence: [
      {
        id: "bls-snapshot",
        role: "source-data",
        dataVersion: snapshot.editionId,
        fingerprint: fingerprintValue(snapshot.rows).fingerprint,
        source: {
          name: "BLS average-price series",
          uri: `${STORY_URL}#sources`,
          version: snapshot.editionId,
          retrievedAt: snapshot.retrievedAt,
          publisher: "U.S. Bureau of Labor Statistics"
        }
      },
      {
        id: "basket-calculation",
        role: "transformation",
        transformation: {
          id: snapshot.transformVersion,
          kind: "aggregation",
          inputEvidenceIds: ["bls-snapshot"],
          description: "Integer thousandths of USD multiplied by quarter-unit quantities; round only for display.",
          parameters: json(state),
          assumptions: [
            QUALIFICATION,
            "The same quantities and eligible item identities are used at both dates.",
            "A missing required price makes the total unavailable."
          ]
        }
      }
    ],
    accountability: {
      generatedBy: "e01-basket-adapter",
      reviews: [
        {
          id: "editorial-review",
          status: "pending",
          rationale: "Numerical checks verify arithmetic. Source interpretation and publication still require human editorial review."
        }
      ]
    },
    extensions: {
      "semiotic.e01.numerical-bindings.v1": json({
        bindings,
        scope: receipt.scope,
        eligibility: "Fixed selected quantities; comparable subset requires both endpoint prices; percentage denominator must be positive."
      })
    }
  });
  const serialized = requireSerializableArtifactContract(contract);
  return {
    packetVersion: 1,
    storyId: "E01",
    editionId: snapshot.editionId,
    sourceFingerprint: fingerprintValue(snapshot).fingerprint,
    snapshot,
    state: receipt.state,
    receipt: receiptValues(receipt),
    history: receipt.history,
    summary: summary(receipt),
    qualification: QUALIFICATION,
    correctionURL: `${STORY_URL}#sources`,
    chart: { component: "BarChart", props },
    artifact: serialized,
    numericalBindings: bindings,
    numericalChecks: evaluateNumericalBindings(snapshot, state, bindings),
    omissions: [
      "This packet does not confer editorial or publication approval.",
      "Static exports cannot discover future corrections without reopening the source link.",
      "BLS average prices do not identify the causes of price changes."
    ]
  };
}
function verifyReceiptPacket(packet) {
  if (packet.packetVersion !== 1 || packet.storyId !== "E01" || packet.editionId !== packet.snapshot.editionId)
    throw new Error("Unsupported packet or mismatched edition.");
  const rebuilt = buildReceiptPacket(packet.snapshot, packet.state);
  if (fingerprintValue(packet).fingerprint !== fingerprintValue(rebuilt).fingerprint)
    throw new Error(
      "Packet identity, calculations, claims, or representations differ from the named source and state."
    );
  return rebuilt;
}
export {
  buildReceiptPacket,
  defaultState,
  prepareBasket,
  readReceiptSearch,
  receiptSearch,
  receiptValues,
  renderReceiptHTML,
  renderReceiptSVG,
  verifyReceiptPacket
};
