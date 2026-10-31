import "./typedoc-compat.mjs"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { after, test } from "node:test"
import { pathToFileURL } from "node:url"

const require = createRequire(import.meta.url)
const { glob } = await import(
  new URL("./node-utils.js", pathToFileURL(require.resolve("typedoc"))).href
)
const root = mkdtempSync(join(tmpdir(), "semiotic-typedoc-globs-"))
const normalizedRoot = root.replaceAll("\\", "/")
const files = [
  "src/index.ts",
  "src/widget.tsx",
  "src/nested/leaf.ts",
  "other/helper.ts",
  "node_modules/dependency/index.ts"
]
for (const file of files) {
  const path = join(root, file)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, "export {}\n")
}
after(() => rmSync(root, { recursive: true, force: true }))

function discover(pattern, options) {
  return glob(`${normalizedRoot}/${pattern}`, root, options)
    .map((path) => path.slice(normalizedRoot.length + 1))
    .sort()
}

test("TypeDoc discovers literal entry points through their parent directories", () => {
  assert.deepEqual(discover("src/nested/leaf.ts"), ["src/nested/leaf.ts"])
})

test("TypeDoc retains recursive and brace-expanded entry points", () => {
  assert.deepEqual(discover("{src,other}/**/*.{ts,tsx}"), [
    "other/helper.ts",
    "src/index.ts",
    "src/nested/leaf.ts",
    "src/widget.tsx"
  ])
})

test("TypeDoc skips node_modules unless the pattern explicitly requests it", () => {
  assert.deepEqual(discover("**/*.ts"), [
    "other/helper.ts",
    "src/index.ts",
    "src/nested/leaf.ts"
  ])
  assert.deepEqual(discover("node_modules/**/*.ts"), [
    "node_modules/dependency/index.ts"
  ])
})

test("TypeDoc still includes directories when requested", () => {
  assert.deepEqual(discover("src", { includeDirectories: true }), ["src"])
  assert.deepEqual(discover("src{,/**}", { includeDirectories: true }), [
    "src",
    "src/index.ts",
    "src/nested",
    "src/nested/leaf.ts",
    "src/widget.tsx"
  ])
})
