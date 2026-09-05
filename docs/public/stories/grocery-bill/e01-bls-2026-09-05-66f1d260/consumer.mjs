import { readFile, writeFile } from "node:fs/promises"
import assert from "node:assert/strict"
import { renderChartWithEvidence } from "semiotic/server"
import { serializeArtifactContract } from "semiotic/artifact"
import {
  prepareBasket,
  renderReceiptSVG,
  verifyReceiptPacket
} from "./adapter.mjs"

// Run this file beside adapter.mjs in any installed Semiotic consumer.
// No docs application, React page, private package path, API key, or network
// request is required. The checked-in adapter is host code, not a public API.
const packet = JSON.parse(
  await readFile(process.argv[2] || "default.packet.json", "utf8")
)
verifyReceiptPacket(packet)
const receipt = prepareBasket(packet.snapshot, packet.state)
// Independently calculate in exact 1/4000-USD units, not through the adapter.
for (const [month, target] of [
  [packet.state.before, "beforeUSD"],
  [packet.state.after, "afterUSD"]
]) {
  if (receipt.status === "unavailable") {
    assert.equal(receipt[target], null)
    continue
  }
  let total = 0
  for (const quantity of packet.state.quantities) {
    if (
      quantity.quantity === 0 ||
      receipt.excludedItemIds.includes(quantity.itemId)
    )
      continue
    const source = packet.snapshot.rows.find(
      (row) => row.itemId === quantity.itemId && row.month === month
    )
    assert.equal(source?.sourceStatus, "observed")
    total += Math.round(source.priceUSD * 1000) * quantity.quantity * 4
  }
  assert.equal(total / 4000, receipt[target])
}
assert.equal(
  serializeArtifactContract(packet.artifact.contract).transfer.status,
  "preserved"
)
await writeFile(
  "reproduced-receipt.svg",
  renderReceiptSVG(receipt, packet.snapshot)
)
const result = renderChartWithEvidence(
  packet.chart.component,
  packet.chart.props,
  { artifactContract: packet.artifact.contract }
)
await writeFile("reproduced-contributions.svg", result.svg)
await writeFile(
  "render-evidence.json",
  JSON.stringify(result.evidence, null, 2) + "\n"
)
console.log(
  JSON.stringify(
    {
      stateId: receipt.stateId,
      beforeUSD: receipt.beforeUSD,
      afterUSD: receipt.afterUSD,
      differenceUSD: receipt.differenceUSD,
      numericalChecks: packet.numericalChecks,
      evidence: result.evidence
    },
    null,
    2
  )
)
