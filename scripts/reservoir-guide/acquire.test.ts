import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { execFile } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { promisify } from "node:util"

const execute = promisify(execFile)
const script = resolve("scripts/reservoir-guide/acquire.ts")
const tsx = createRequire(resolve("package.json")).resolve("tsx")
const inventory = resolve(
  "docs/public/stories/reservoir-guide/cdec-wy1991-2025-d82c4f62bc35-v1/raw/retrieval.json"
)
let directory: string
let raw: string
let manifest: string

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "reservoir-acquire-test-"))
  raw = join(directory, "raw")
  await mkdir(raw)
  const { sources } = JSON.parse(await readFile(inventory, "utf8"))
  for (const source of sources) {
    const bytes = Buffer.from(`Synthetic source for ${source.file}\n`)
    await writeFile(join(raw, source.file), bytes)
    source.bytes = bytes.length
    source.sha256 = createHash("sha256").update(bytes).digest("hex")
  }
  manifest = JSON.stringify({ sources }, null, 2) + "\n"
  await writeFile(join(raw, "retrieval.json"), manifest)
})

afterEach(async () => {
  await rm(directory, { recursive: true, force: true })
})

function acquire(args: string[]) {
  return execute(process.execPath, ["--import", tsx, script, ...args], {
    cwd: directory,
    // A complete resume must never invoke curl or access the network.
    env: { ...process.env, PATH: directory },
    timeout: 10_000
  })
}

describe("reservoir acquisition CLI", () => {
  it.each(["before", "after"])(
    "resumes with the flag %s the directory and retains source bytes and retrieval dates",
    async (position) => {
      const args = position === "before" ? ["--resume", raw] : [raw, "--resume"]
      await acquire(args)
      expect(await readFile(join(raw, "retrieval.json"), "utf8")).toBe(manifest)
      for (const source of JSON.parse(manifest).sources) {
        expect(await readFile(join(raw, source.file), "utf8")).toBe(
          `Synthetic source for ${source.file}\n`
        )
      }
      expect(await readdir(directory)).toEqual(["raw"])
    }
  )

  it("refuses changed pinned bytes during resume", async () => {
    await writeFile(join(raw, "SHA.csv"), "altered")
    await expect(acquire(["--resume", raw])).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining("Pinned raw source changed: SHA.csv")
    })
    expect(await readFile(join(raw, "SHA.csv"), "utf8")).toBe("altered")
    expect(await readFile(join(raw, "retrieval.json"), "utf8")).toBe(manifest)
  })

  it("requires explicit resume to retain an existing acquisition", async () => {
    await expect(acquire([raw])).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining("Refusing to replace existing raw source: SHA.csv")
    })
    expect(await readFile(join(raw, "retrieval.json"), "utf8")).toBe(manifest)
  })

  it.each(["first", "later"])(
    "recovers from a partial %s download without changing completed sources",
    async (attempt) => {
      const original = JSON.parse(manifest)
      const pending = attempt === "first" ? "SHA.csv" : "ORO.csv"
      const retained = attempt === "first"
        ? []
        : original.sources.filter((source: { file: string }) => source.file !== pending)
      const destination = attempt === "first" ? join(directory, "fresh") : raw
      const retainedManifest = JSON.stringify({ sources: retained }, null, 2) + "\n"
      if (attempt === "first") await mkdir(destination)
      else {
        await rm(join(raw, pending))
        await writeFile(join(raw, "retrieval.json"), retainedManifest)
      }
      // A real child process writes partial bytes and fails once, then succeeds.
      // PATH contains only this stub, so these tests cannot reach CDEC.
      await writeFile(join(directory, "curl"), [
        `#!${process.execPath}`,
        'const { existsSync, writeFileSync } = require("node:fs")',
        'const { basename } = require("node:path")',
        `const marker = ${JSON.stringify(join(directory, "failed-once"))}`,
        'const output = process.argv[process.argv.indexOf("-o") + 1]',
        'if (!existsSync(marker)) {',
        '  writeFileSync(output, "partial transfer")',
        '  writeFileSync(marker, "failed")',
        '  process.exit(28)',
        '}',
        'writeFileSync(output, "Synthetic source for " + basename(output) + "\\n")'
      ].join("\n"), { mode: 0o755 })

      const args = attempt === "first" ? [destination] : ["--resume", destination]
      await expect(acquire(args)).rejects.toMatchObject({ code: 1 })
      await expect(readFile(join(destination, pending))).rejects.toMatchObject({ code: "ENOENT" })
      expect((await readdir(destination)).some((file) => file.startsWith(".acquire-"))).toBe(false)
      if (attempt === "first")
        await expect(readFile(join(destination, "retrieval.json"))).rejects.toMatchObject({ code: "ENOENT" })
      else
        expect(await readFile(join(destination, "retrieval.json"), "utf8")).toBe(retainedManifest)

      await acquire(["--resume", destination])
      const completed = JSON.parse(await readFile(join(destination, "retrieval.json"), "utf8"))
      expect(completed.sources).toHaveLength(original.sources.length)
      for (const source of retained) expect(completed.sources).toContainEqual(source)
      for (const source of completed.sources) {
        const bytes = await readFile(join(destination, source.file))
        expect(bytes.toString()).toBe(`Synthetic source for ${source.file}\n`)
        expect(source.bytes).toBe(bytes.length)
        expect(source.sha256).toBe(createHash("sha256").update(bytes).digest("hex"))
      }
      expect((await readdir(destination)).sort()).toEqual([
        ...original.sources.map((source: { file: string }) => source.file), "retrieval.json"
      ].sort())
    },
    15_000
  )

  it("removes a completed download if its manifest cannot be published", async () => {
    const destination = join(directory, "manifest-failure")
    const blocked = join(destination, "retrieval.json")
    await mkdir(blocked, { recursive: true })
    await writeFile(join(blocked, "retained"), "keep this existing entry")
    await writeFile(join(directory, "curl"), [
      `#!${process.execPath}`,
      'const { writeFileSync } = require("node:fs")',
      'writeFileSync(process.argv[process.argv.indexOf("-o") + 1], "complete transfer")'
    ].join("\n"), { mode: 0o755 })
    await expect(acquire([destination])).rejects.toMatchObject({ code: 1 })
    expect(await readdir(destination)).toEqual(["retrieval.json"])
    expect(await readFile(join(blocked, "retained"), "utf8")).toBe("keep this existing entry")
  })

  it.each([
    { args: [], error: "Usage:" },
    { args: [""], error: "Usage:" },
    { args: ["--resume"], error: "Usage:" },
    { args: ["--resuem", "new-raw"], error: "Unknown option" },
    { args: ["new-raw", "extra-directory"], error: "Usage:" }
  ])("rejects invalid arguments $args before creating output", async ({ args, error }) => {
    await expect(acquire(args)).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining(error)
    })
    expect(await readdir(directory)).toEqual(["raw"])
  })
})
