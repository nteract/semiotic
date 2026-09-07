import { build } from "esbuild"
import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { resolve, join } from "node:path"
import groceryJSON from "../../docs/src/pages/examples/grocery-receipt/snapshot.json"
import planeJSON from "../../docs/src/pages/examples/plane-day/snapshot.json"
import { prepareBasket } from "../../docs/src/pages/examples/grocery-receipt/prepare"
import { defaultState as basketState } from "../../docs/src/pages/examples/grocery-receipt/state"
import { buildReceiptPacket } from "../../docs/src/pages/examples/grocery-receipt/packet"
import { renderBasketHTML } from "../../docs/src/pages/examples/grocery-receipt/export-runtime"
import { defaultState as planeState } from "../../docs/src/pages/examples/plane-day/state"
import { buildNotePacket } from "../../docs/src/pages/examples/plane-day/packet"
import { renderFlightHTML } from "../../docs/src/pages/examples/plane-day/export-runtime"
import type { GrocerySnapshot } from "../../docs/src/pages/examples/grocery-receipt/types"
import type { PlaneSnapshot } from "../../docs/src/pages/examples/plane-day/types"

async function main() {
  const grocery = groceryJSON as GrocerySnapshot
  const plane = planeJSON as PlaneSnapshot
  const state = planeState(plane)
  const day = plane.cases.find((d) => d.id === state.selected.dayId)!
  const root = resolve(process.argv[2] ?? "docs/public/stories")
  for (const item of [
    {
      route: "grocery-bill",
      adapter: "grocery",
      edition: grocery.editionId,
      packet: buildReceiptPacket(grocery, basketState(grocery)),
      html: renderBasketHTML(
        prepareBasket(grocery, basketState(grocery)),
        grocery
      )
    },
    {
      route: "plane-day",
      adapter: "plane",
      edition: plane.editionId,
      packet: buildNotePacket(plane, day, state),
      html: renderFlightHTML(plane, day, state)
    }
  ]) {
    const directory = join(root, item.route, "reading-v2")
    await mkdir(directory, { recursive: true })
    const adapter = await build({
      entryPoints: [`scripts/story-charts/${item.adapter}-adapter.ts`],
      bundle: true,
      platform: "neutral",
      format: "esm",
      write: false,
      external: ["semiotic/*", "react"]
    })
    const files: Record<string, string> = {
      "adapter.mjs": adapter.outputFiles[0].text,
      "snapshot.json": JSON.stringify(item.route === "grocery-bill" ? grocery : plane) + "\n",
      "default.html": item.html,
      "default.packet.json": JSON.stringify(item.packet) + "\n",
      "README.md": `# ${item.route}: reading revision 2\n\nThis presentation revision uses the unchanged source edition ${item.edition}. The original edition's raw files and downloads remain available. This adapter accepts the current story state and generates its expanded self-contained HTML.\n\nReproduce both presentations from the repository with:\n\n\`node --import tsx scripts/story-charts/build-previews.ts <empty-output-root>\`\n\nAn independent consumer needs React and the Semiotic build containing the horizontal distribution and custom-layout color fixes. Import adapter.mjs; read default.packet.json. For groceries, verifyReceiptPacket(packet), then renderBasketHTML(prepareBasket(packet.snapshot, packet.state), packet.snapshot). For planes, importNotePacket(packet, the pinned source snapshot), then renderFlightHTML(snapshot, the imported day, the imported state). Source snapshots are in the named source-edition directory.\n\nChart shapes express data from the packet; they do not add source observations or numerical claims. Historical data is not refreshed by this presentation revision.\n`
    }
    const inventory = Object.entries(files).map(([file, text]) => ({
      file,
      bytes: Buffer.byteLength(text),
      sha256: createHash("sha256").update(text).digest("hex")
    }))
    files["manifest.json"] =
      JSON.stringify({
        presentationVersion: 2,
        sourceEdition: item.edition,
        inventory
      }) + "\n"
    for (const [file, text] of Object.entries(files)) {
      const path = join(directory, file)
      try {
        if ((await readFile(path, "utf8")) !== text)
          throw new Error(
            `Presentation differs: ${path}; use a new output directory or revision.`
          )
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
        await writeFile(path, text)
      }
    }
    console.log(
      `${item.route}: ${Object.keys(files).length} presentation files, source ${item.edition}`
    )
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
