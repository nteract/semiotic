import { monthName, money, percent, signedMoney, summary } from "./format"
import { QUALIFICATION, STORY_URL } from "./items"
import { receiptSearch } from "./state"
import type { GrocerySnapshot, PreparedBasket } from "./types"

export const PNG_EXPORT_SCALE = 2

export function escapeMarkup(value: unknown): string {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  )
}

// This representation is also embedded in SVG metadata and the HTML export.
// It carries exact values separately from the receipt's display rounding.
export function receiptValues(receipt: PreparedBasket) {
  const { history: _history, ...values } = receipt
  return values
}

function wrap(text: string, columns: number): string[] {
  const lines: string[] = []
  for (const word of text.split(/\s+/)) {
    if (!lines.length || `${lines.at(-1)} ${word}`.length > columns) lines.push(word)
    else lines[lines.length - 1] += ` ${word}`
  }
  return lines
}

export function renderReceiptSVG(
  receipt: PreparedBasket,
  snapshot: GrocerySnapshot,
  size: "phone" | "print" = "phone",
): string {
  const width = size === "phone" ? 390 : 760
  const pad = size === "phone" ? 22 : 40
  const textSize = size === "phone" ? 13 : 17
  const lines = wrap(receipt.scope, size === "phone" ? 47 : 75)
  const footerY = 674
  const height = footerY + lines.length * 20 + 152
  const text = (x: number, y: number, value: unknown, extra = "") =>
    `<text x="${x}" y="${y}" ${extra}>${escapeMarkup(value)}</text>`
  const rows = receipt.rows
    .map((row, index) => {
      const y = 180 + index * 65
      const note =
        row.quantity === 0
          ? "Not in basket"
          : !row.included
            ? "Excluded from both dates"
            : row.missingMonths.length
              ? "Required price missing"
              : `Change ${signedMoney(row.contributionUSD)}`
      return `${text(pad, y, `${row.quantity} ${row.quantityUnit} ${row.label}`, 'font-weight="bold"')}
      ${text(pad, y + 21, `${money(row.beforeUSD)} / ${money(row.afterUSD)}`)}
      ${text(width - pad, y + 21, note, 'text-anchor="end" font-size="11"')}
      ${text(pad, y + 39, `Unit prices: ${money(row.beforePriceUSD, 3)} / ${money(row.afterPriceUSD, 3)} per ${row.quantityUnit}`, 'font-size="11"')}`
    })
    .join("")
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
  </svg>`
}

export function renderReceiptHTML(receipt: PreparedBasket, snapshot: GrocerySnapshot): string {
  const rows = receipt.rows
    .map(
      (row) =>
        `<tr><th scope="row">${escapeMarkup(row.label)}</th><td>${row.quantity} ${row.quantityUnit}</td><td>${money(row.beforePriceUSD, 3)}</td><td>${money(row.afterPriceUSD, 3)}</td><td>${money(row.beforeUSD)}</td><td>${money(row.afterUSD)}</td><td>${signedMoney(row.contributionUSD)}</td><td>${row.quantity === 0 ? "Not in basket" : !row.included ? "Excluded from both dates" : row.missingMonths.length ? "Required price missing" : "Included"}</td></tr>`,
    )
    .join("")
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Your grocery bill has a memory</title><style>body{max-width:850px;margin:40px auto;padding:20px;background:#fffdf5;color:#23372c;font:18px/1.65 Georgia,serif}a{color:inherit}table{border-collapse:collapse;width:100%;font:14px/1.6 monospace}th,td{padding:12px 8px;border-bottom:1px solid;text-align:left}section{overflow-x:auto}svg{max-width:100%;height:auto}a:focus-visible,section:focus-visible{outline:3px solid}@media print{body{margin:0;font-size:12pt}section{overflow:visible}table{font-size:8pt}}</style></head><body>
    <h1>Your grocery bill has a memory</h1><p>${escapeMarkup(summary(receipt))}</p>
    <p>${QUALIFICATION}. BLS U.S. city average, not seasonally adjusted. This is neither a store quote nor the official CPI.</p>
    <section tabindex="0" aria-label="Comparison table; scroll horizontally if needed"><table><caption>${escapeMarkup(monthName(receipt.state.before))} / ${escapeMarkup(monthName(receipt.state.after))}. Unit prices in USD per listed unit; line costs in USD. ${escapeMarkup(receipt.scope)} Missing required prices make the full comparison unavailable.</caption><thead><tr><th scope="col">Item</th><th scope="col">Quantity</th><th scope="col">Before unit price</th><th scope="col">After unit price</th><th scope="col">Before cost</th><th scope="col">After cost</th><th scope="col">Contribution</th><th scope="col">Status</th></tr></thead><tbody>${rows}</tbody></table></section>
    <p>Total: ${money(receipt.beforeUSD)} / ${money(receipt.afterUSD)}. Difference: ${signedMoney(receipt.differenceUSD)} (${percent(receipt.percentageChange)}).</p>
    <p>Calculated at source precision; amounts rounded only for display. Individually rounded lines can differ from the rounded total.</p>
    <p>Source retrieved ${snapshot.retrievedAt}. Edition ${escapeMarkup(snapshot.editionId)}. Saved editions cannot update themselves.</p>
    <p><a href="${escapeMarkup(STORY_URL + receiptSearch(receipt.state))}">Reopen this exact comparison</a> | <a href="${STORY_URL}#sources">Sources and corrections</a></p>
    <details><summary>Exact calculation values</summary><pre id="receipt-values">${escapeMarkup(JSON.stringify(receiptValues(receipt), null, 2))}</pre></details>
  </body></html>`
}

export async function receiptPNG(svg: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error("The receipt image could not be prepared."))
      image.src = url
    })
    const canvas = document.createElement("canvas")
    canvas.width = image.naturalWidth * PNG_EXPORT_SCALE
    canvas.height = image.naturalHeight * PNG_EXPORT_SCALE
    const context = canvas.getContext("2d")
    if (!context)
      throw new Error(
        "PNG export is unavailable in this browser. The SVG and HTML exports remain available.",
      )
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("PNG export failed."))),
        "image/png",
      ),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}
