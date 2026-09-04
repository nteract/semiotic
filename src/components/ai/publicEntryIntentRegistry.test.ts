import { describe, expect, it } from "vitest"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")
const execFileAsync = promisify(execFile)

describe("custom intent registry across public entry bundles", () => {
  it("shares registrations from semiotic/ai with semiotic/ai/core", async () => {
    // Vitest's DOM setup patches TextEncoder, which esbuild rightly rejects.
    // Bundle in a clean Node realm instead; the script still evaluates two
    // independently emitted public-entry bundles in one globalThis.
    const script = `
      import { build } from "esbuild"
      import { resolve } from "node:path"

      const repoRoot = ${JSON.stringify(repoRoot)}
      async function bundlePublicEntry(source) {
        const result = await build({
          stdin: {
            contents: source,
            resolveDir: repoRoot,
            sourcefile: "intent-registry-public-entry.ts",
            loader: "ts",
          },
          bundle: true,
          format: "esm",
          platform: "node",
          target: "node22",
          treeShaking: true,
          write: false,
          plugins: [{
            name: "semiotic-public-entry-source",
            setup(pluginBuild) {
              pluginBuild.onResolve({ filter: /^semiotic\\/ai$/ }, () => ({
                path: resolve(repoRoot, "src/components/semiotic-ai.ts"),
              }))
              pluginBuild.onResolve({ filter: /^semiotic\\/ai\\/core$/ }, () => ({
                path: resolve(repoRoot, "src/components/semiotic-ai-core.ts"),
              }))
            },
          }],
        })
        const output = result.outputFiles[0]?.text
        if (!output) throw new Error("Expected an in-memory public-entry bundle")
        return import("data:text/javascript;base64," + Buffer.from(output).toString("base64"))
      }

      const ai = await bundlePublicEntry(
        'import { registerIntent } from "semiotic/ai"; export { registerIntent }',
      )
      const core = await bundlePublicEntry(
        'import { getIntent } from "semiotic/ai/core"; export { getIntent }',
      )
      const id = "public-entry-intent-registry-test"
      ai.registerIntent({
        id,
        label: "Public entry intent",
        description: "Test-only intent registered through the AI catalog entry.",
        composes: ["trend"],
      })
      console.log(JSON.stringify(core.getIntent(id)))
    `
    const { stdout } = await execFileAsync(
      process.execPath,
      ["--input-type=module", "--eval", script],
      { cwd: repoRoot, timeout: 30_000 },
    )

    expect(JSON.parse(stdout)).toMatchObject({
      id: "public-entry-intent-registry-test",
      label: "Public entry intent",
    })
  }, 30_000)
})
