import { readFile, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

const root = resolve(process.argv[2])
const results = []
for (const route of ["grocery-bill", "plane-day"]) {
  const directory = join(root, route, "reading-v2")
  const manifest = JSON.parse(await readFile(join(directory, "manifest.json"), "utf8"))
  for (const entry of manifest.inventory) {
    const bytes = await readFile(join(directory, entry.file))
    if (bytes.length !== entry.bytes || createHash("sha256").update(bytes).digest("hex") !== entry.sha256)
      throw new Error(`Checksum differs: ${route}/${entry.file}`)
  }
  const adapter = await import(pathToFileURL(join(directory, "adapter.mjs")).href)
  const snapshot = JSON.parse(await readFile(join(directory, "snapshot.json"), "utf8"))
  const packetText = await readFile(join(directory, "default.packet.json"), "utf8")
  let html
  if (route === "grocery-bill") {
    const packet = adapter.importReceiptPacket(packetText, snapshot)
    html = adapter.renderBasketHTML(adapter.prepareBasket(snapshot, packet.state), snapshot)
  } else {
    const imported = adapter.importNotePacket(JSON.parse(packetText), snapshot)
    if (imported.issue) throw new Error(imported.issue)
    html = adapter.renderFlightHTML(snapshot, imported.day, imported.state)
  }
  if (html !== await readFile(join(directory, "default.html"), "utf8"))
    throw new Error(`Independent HTML differs: ${route}`)
  results.push({ route, sourceEdition: manifest.sourceEdition, verifiedFiles: manifest.inventory.length,
    identicalHTML: true, svgCount: (html.match(/<svg\b/g) ?? []).length,
    hatchPatterns: (html.match(/<pattern\b/g) ?? []).length })
}
if (process.argv[3]) await writeFile(process.argv[3], JSON.stringify(results, null, 2) + "\n")
console.log(JSON.stringify(results))
