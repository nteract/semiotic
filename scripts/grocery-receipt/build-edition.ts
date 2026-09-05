import { readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { createHash } from "node:crypto"
import { build } from "esbuild"
import sharp from "sharp"
import { ingest, writeImmutable } from "./ingest"
import { defaultState } from "../../docs/src/pages/examples/grocery-receipt/state"
import { prepareBasket } from "../../docs/src/pages/examples/grocery-receipt/prepare"
import {
  renderReceiptSVG,
  renderReceiptHTML
} from "../../docs/src/pages/examples/grocery-receipt/exports"

async function main() {
  const sourceIndex = process.argv.indexOf("--source")
  if (sourceIndex < 0 || !process.argv[sourceIndex + 1])
    throw new Error(
      "Usage: npx tsx scripts/grocery-receipt/build-edition.ts --source <pinned-raw-directory>"
    )
  const { snapshot, output } = await ingest(
    resolve(process.argv[sourceIndex + 1])
  )
  // Resolve public package imports against source for this development build.
  // The delivered adapter retains bare public imports for independent consumers.
  const artifactEntry = resolve("src/components/semiotic-artifact.ts")
  const packetBuild = await build({
    entryPoints: [resolve("docs/src/pages/examples/grocery-receipt/packet.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    alias: { "semiotic/artifact": artifactEntry }
  })
  const packetModule = await import(
    `data:text/javascript;base64,${Buffer.from(packetBuild.outputFiles[0].text).toString("base64")}`
  )
  const initial = defaultState(snapshot)
  const states = {
    default: initial,
    "meat-free": {
      ...initial,
      quantities: initial.quantities.map((row) => ({
        ...row,
        quantity: ["chicken", "chuck"].includes(row.itemId) ? 0 : row.quantity
      }))
    },
    "high-egg": {
      ...initial,
      quantities: initial.quantities.map((row) => ({
        ...row,
        quantity: row.itemId === "eggs" ? 4 : row.quantity
      }))
    },
    "missing-price": { ...initial, after: "2020-05" },
    "comparable-subset": {
      ...initial,
      after: "2020-05",
      mode: "comparable-subset" as const
    }
  }
  const inventory: { file: string; sha256: string; bytes: number }[] = []
  async function emit(file: string, value: string | Buffer) {
    const bytes = Buffer.from(value)
    await writeImmutable(join(output, file), bytes)
    inventory.push({
      file,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length
    })
  }
  for (const [name, state] of Object.entries(states)) {
    const receipt = prepareBasket(snapshot, state)
    await emit(
      `${name}.packet.json`,
      JSON.stringify(
        packetModule.buildReceiptPacket(snapshot, state),
        null,
        2
      ) + "\n"
    )
    await emit(`${name}.html`, renderReceiptHTML(receipt, snapshot))
    for (const size of ["phone", "print"] as const) {
      const svg = renderReceiptSVG(receipt, snapshot, size)
      await emit(`${name}.${size}.svg`, svg)
      await emit(
        `${name}.${size}.png`,
        await sharp(Buffer.from(svg), { density: 144 }).png().toBuffer()
      )
    }
  }
  const portable = await build({
    entryPoints: [
      resolve("docs/src/pages/examples/grocery-receipt/portable.ts")
    ],
    bundle: true,
    platform: "neutral",
    format: "esm",
    external: ["semiotic/artifact"],
    write: false
  })
  await emit("adapter.mjs", portable.outputFiles[0].text)
  await emit(
    "consumer.mjs",
    await readFile(resolve("scripts/grocery-receipt/consumer.mjs"))
  )
  await emit(
    "README.md",
    await readFile(resolve("scripts/grocery-receipt/README.md"))
  )
  await writeImmutable(
    join(output, "outputs.json"),
    JSON.stringify({ editionId: snapshot.editionId, inventory }, null, 2) + "\n"
  )
  // Change the current edition only after every promised output succeeds.
  // A failed refresh must leave the last complete page snapshot available.
  await writeFile(
    resolve("docs/src/pages/examples/grocery-receipt/snapshot.json"),
    JSON.stringify(snapshot) + "\n"
  )
  // This is an index of the current authored edition, not an immutable output.
  await writeFile(
    resolve("docs/public/stories/grocery-bill/current.json"),
    JSON.stringify(
      {
        editionId: snapshot.editionId,
        correctionURL:
          "https://semiotic.nteract.io/examples/grocery-bill#sources",
        successor: null
      },
      null,
      2
    ) + "\n"
  )
  console.log(
    JSON.stringify({
      outputs: inventory.length,
      beforeUSD: prepareBasket(snapshot, initial).beforeUSD,
      afterUSD: prepareBasket(snapshot, initial).afterUSD
    })
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
