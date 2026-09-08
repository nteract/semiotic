import { createHash } from "node:crypto"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { dirname, join } from "node:path"
import sharp from "sharp"
import { renderChartWithEvidence } from "semiotic/server"
import {
  buildBriefing,
  handoff,
  type BriefingReading
} from "../../docs/src/pages/examples/jobs-report/packet"
import {
  briefingHTML,
  graphicSVG,
  sourceCSV
} from "../../docs/src/pages/examples/jobs-report/exports"
import type { JobsSnapshot } from "../../docs/src/pages/examples/jobs-report/model"
import { publicationCheck, type DemoReview } from "./publication"

export const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n"
const inventoryFor = (files: Record<string, string | Buffer>) =>
  Object.entries(files).map(([file, value]) => ({
    file,
    bytes: Buffer.byteLength(value),
    sha256: createHash("sha256").update(value).digest("hex")
  }))
function verifyOutputEntries(directory: string, expectedFiles: string[]) {
  const expected = new Set(expectedFiles)
  const entries = readdirSync(directory, { withFileTypes: true })
  if (
    entries.length !== expected.size ||
    entries.some((entry) => !entry.isFile() || !expected.has(entry.name))
  )
    throw new Error(
      "Output directory contains missing, unexpected or non-regular files"
    )
}
export async function bundle(
  snapshot: JobsSnapshot,
  month: string,
  asOf: string,
  reading: BriefingReading = "direction"
) {
  const briefing = buildBriefing(snapshot, month, asOf, reading)
  const rendered = renderChartWithEvidence(briefing.component, briefing.props, {
    artifactContract: briefing.contract
  })
  if (
    rendered.evidence.empty ||
    rendered.evidence.markCountByType.rect !== briefing.props.data.length
  )
    throw new Error("The graphic did not render every revision step")
  const svg = graphicSVG(briefing, rendered.svg)
  const files: Record<string, string | Buffer> = {
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
    "graphic.png": await sharp(Buffer.from(svg), { density: 144 })
      .png()
      .toBuffer(),
    "briefing.html": briefingHTML(briefing, svg),
    "email.html": briefingHTML(briefing),
    "source.csv": sourceCSV(snapshot, asOf),
    "source-snapshot.json": json(snapshot),
    "render-evidence.json": json(rendered.evidence)
  }
  // Bind the receipt to every actual deliverable, including captions, HTML and
  // PNG bytes. The receipt and inventory themselves are excluded to avoid a cycle.
  const outputFingerprint = `sha256:${createHash("sha256")
    .update(
      json(
        Object.entries(files).map(([file, value]) => ({
          file,
          sha256: createHash("sha256").update(value).digest("hex")
        }))
      )
    )
    .digest("hex")}`
  const check = publicationCheck(
    snapshot,
    briefing,
    undefined,
    snapshot.capturedAt,
    outputFingerprint
  )
  if (check.status === "refuse")
    throw new Error(`Artifact refused: ${json(check.unresolved)}`)
  files["publication.json"] = json(check)
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
  })
  return { briefing, check, files }
}
/** Stage every output, then admit it as a unit. An existing edition is byte-checked. */
export function writeEdition(
  directory: string,
  files: Record<string, string | Buffer>
) {
  const inventory = inventoryFor(files)
  const outputs = { ...files, "outputs.json": json(inventory) }
  if (existsSync(directory)) {
    verifyOutputEntries(directory, Object.keys(outputs))
    for (const [file, value] of Object.entries(outputs)) {
      if (!readFileSync(join(directory, file)).equals(Buffer.from(value)))
        throw new Error(`Refusing to replace immutable output: ${file}`)
    }
    return
  }
  mkdirSync(dirname(directory), { recursive: true })
  const temporary = `${directory}.partial-${process.pid}`
  mkdirSync(temporary)
  try {
    for (const [file, value] of Object.entries(outputs))
      writeFileSync(join(temporary, file), value)
    renameSync(temporary, directory)
  } finally {
    rmSync(temporary, { recursive: true, force: true })
  }
}
export async function checkSaved(
  snapshot: JobsSnapshot,
  directory: string,
  review?: DemoReview
) {
  const briefing = JSON.parse(
    readFileSync(join(directory, "briefing.json"), "utf8")
  )
  const rebuilt = await bundle(
    snapshot,
    briefing.month,
    briefing.asOf,
    briefing.reading
  )
  // Check the actual exported bytes against reproduced outputs, not merely an
  // editable inventory. A changed graphic cannot reuse the original review.
  verifyOutputEntries(directory, [...Object.keys(rebuilt.files), "outputs.json"])
  for (const [file, value] of Object.entries(rebuilt.files)) {
    if (!readFileSync(join(directory, file)).equals(Buffer.from(value)))
      throw new Error(`Output does not reproduce: ${file}`)
  }
  const inventory = JSON.parse(
    readFileSync(join(directory, "outputs.json"), "utf8")
  )
  if (json(inventory) !== json(inventoryFor(rebuilt.files)))
    throw new Error("Output inventory does not reproduce")
  for (const entry of inventory) {
    if (!/^[a-z][a-z0-9.-]+$/.test(entry.file))
      throw new Error("Invalid inventory filename")
    const bytes = readFileSync(join(directory, entry.file))
    if (
      bytes.length !== entry.bytes ||
      createHash("sha256").update(bytes).digest("hex") !== entry.sha256
    )
      throw new Error(`Output checksum mismatch: ${entry.file}`)
  }
  return publicationCheck(
    snapshot,
    briefing,
    review,
    undefined,
    rebuilt.check.outputFingerprint
  )
}
