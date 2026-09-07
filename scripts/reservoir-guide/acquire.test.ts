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
