import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), "semiotic-registry-invocation-"))
  try {
    for (const file of [
      "package.json", "server.json", "README.md",
      "scripts/check-mcp-registry.mjs", "scripts/check-mcp-registry-live.mjs",
      ".github/workflows/publish-mcp-registry.yml", ".github/workflows/release.yml"
    ]) {
      mkdirSync(dirname(join(root, file)), { recursive: true })
      copyFileSync(join(repoRoot, file), join(root, file))
    }
    execFileSync("git", ["init", "--quiet"], { cwd: root })
    execFileSync("git", ["add", "."], { cwd: root })
    const check = () => spawnSync(process.execPath, ["scripts/check-mcp-registry.mjs"], {
      cwd: root, encoding: "utf8"
    })
    run(root, check)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test("explicit package commands pass and historical changelog commands are exempt", () => {
  fixture((root, check) => {
    writeFileSync(join(root, "CHANGELOG.md"), ["npx", "semiotic-mcp"].join(" "))
    writeFileSync(join(root, "commands.md"), "npx -y -p semiotic semiotic-mcp\nnpx -p semiotic semiotic-ai --help\n")
    execFileSync("git", ["add", "."], { cwd: root })
    const result = check()
    assert.equal(result.status, 0, result.stderr)
  })
})

test("bare CLI and MCP commands and client configs fail with file evidence", () => {
  fixture((root, check) => {
    for (const command of [
      ["npx", "semiotic-mcp --http"].join(" "),
      ["npx", "semiotic-ai --help"].join(" "),
      JSON.stringify({ args: ["semiotic-mcp"] }).replace(":", ": ")
    ]) {
      writeFileSync(join(root, "commands.md"), command)
      execFileSync("git", ["add", "commands.md"], { cwd: root })
      const result = check()
      assert.equal(result.status, 1)
      assert.match(result.stderr, /commands\.md:1/)
      assert.match(result.stderr, /Use "npx -y -p semiotic/)
    }
  })
})

test("Registry installs require a package-name MCP executable", () => {
  fixture((root, check) => {
    const path = join(root, "package.json")
    const pkg = JSON.parse(readFileSync(path, "utf8"))
    delete pkg.bin.semiotic
    writeFileSync(path, JSON.stringify(pkg))
    const result = check()
    assert.equal(result.status, 1)
    assert.match(result.stderr, /package\.json#bin must map "semiotic"/)
  })
})
