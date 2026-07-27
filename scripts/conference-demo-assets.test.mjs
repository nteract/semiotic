import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const recordingsDirectory = join(
  repositoryRoot,
  "docs/public/talk-demo-recordings"
)
const fixturePath = join(
  repositoryRoot,
  "docs/public/talk-demo-fixtures/conference-arc.json"
)

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"))
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex")

test("recorded rehearsal arc covers the defensible-chart path", async () => {
  const arc = await readJson(fixturePath)
  const types = new Set(arc.map(({ type }) => type))

  assert.equal(arc[0].sessionId, "conference-stage-recorded")
  assert.deepEqual(
    arc.map(({ timestamp }) => timestamp),
    arc.map((_, index) => 1_792_000_000_000 + index * 1_000)
  )
  for (const event of arc) {
    assert.equal(event.sessionId, "conference-stage-recorded")
    assert.equal(event.meta.capture, "playwright-rehearsal")
  }
  for (const type of [
    "proposal-refused",
    "chart-edited",
    "audience-set",
    "chart-replaced",
    "interrogation-asked",
    "interrogation-answered",
    "chart-exported",
  ]) {
    assert.ok(types.has(type), `expected ${type} in the recorded arc`)
  }
  assert.deepEqual(
    arc
      .filter(({ type }) => type === "render-evidence")
      .map(({ component }) => component)
      .sort(),
    ["BoxPlot", "RidgelinePlot"]
  )
})

test("fallback manifest authenticates an MP4 and three keyframes", async () => {
  const manifest = await readJson(join(recordingsDirectory, "manifest.json"))
  assert.equal(manifest.version, 1)
  assert.equal(manifest.capture.network, "external requests blocked")
  assert.equal(manifest.capture.sessionId, "conference-stage-recorded")
  assert.equal(manifest.files.length, 4)

  for (const file of manifest.files) {
    const bytes = await readFile(join(recordingsDirectory, file.id))
    assert.equal(bytes.byteLength, file.bytes)
    assert.equal(digest(bytes), file.sha256)
    assert.ok(bytes.byteLength > 1_000, `${file.id} should not be empty`)

    if (file.kind === "video/mp4") {
      assert.equal(bytes.subarray(4, 8).toString("ascii"), "ftyp")
    } else {
      assert.deepEqual(
        [...bytes.subarray(0, 8)],
        [137, 80, 78, 71, 13, 10, 26, 10]
      )
      assert.ok(bytes.readUInt32BE(16) >= 800, `${file.id} width is too small`)
      assert.ok(bytes.readUInt32BE(20) >= 600, `${file.id} height is too small`)
    }
  }
})
