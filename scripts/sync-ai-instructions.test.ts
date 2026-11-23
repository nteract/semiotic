import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "vitest"

test("the instruction gate rejects unowned files throughout the Git index", ({ onTestFinished }) => {
  const directory = mkdtempSync(join(tmpdir(), "semiotic-instruction-index-"))
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }))
  const env = { ...process.env, GIT_INDEX_FILE: join(directory, "index") }
  const git = (args: string[]) => execFileSync("git", args, { env, encoding: "utf8" }).trim()
  const check = () => spawnSync(process.execPath, ["scripts/sync-ai-instructions.mjs", "--check"], {
    env, encoding: "utf8",
  })

  const blob = git(["rev-parse", "HEAD:AGENTS.md"])
  const track = (file: string) => git(["update-index", "--add", "--cacheinfo", `100644,${blob},${file}`])
  track("nested/notes.txt")
  track("rules/semiotic.mdc")
  assert.equal(check().status, 0)

  const unexpected = ["editor.mdc", ".hidden/nested/SKILL.md", "extra/llms-reference.txt"]
  for (const file of unexpected) track(file)
  const result = check()
  assert.equal(result.status, 1)
  for (const file of unexpected) assert.ok(result.stderr.includes(`${file} (instruction file has no declared owner)`))
})
