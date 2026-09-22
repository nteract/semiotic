import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  assertCleanCompilation,
  assertNoDiagnostics,
  consumerEntries,
  isExpectedClientDirective,
  namespaceProbe,
  parseOptions
} from "./contracts.ts"
import { runCompiler } from "./builders.ts"

test("consumer inventory covers browser and Node exports without bundling Node-only APIs for browsers", () => {
  const pkg = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8")
  )
  const entries = consumerEntries(pkg)
  assert.equal(entries.browser.length, 37)
  assert.deepEqual(
    entries.server.map((entry) => entry.specifier),
    ["semiotic/server", "semiotic/server/node", "semiotic/server/edge"]
  )
  assert.ok(
    entries.browser.some((entry) => entry.specifier === "semiotic/server/edge")
  )
  assert.ok(
    !entries.browser.some((entry) => entry.specifier === "semiotic/server/node")
  )
  const specifiers = new Set(
    [...entries.browser, ...entries.server].map((entry) => entry.specifier)
  )
  assert.equal(specifiers.size, 39)
})

test("new public browser entries automatically enter the census and escape tree shaking", () => {
  const { browser } = consumerEntries({
    name: "semiotic",
    exports: {
      "./future": {
        import: "./dist/future.module.min.js",
        require: "./dist/future.min.js"
      }
    }
  })
  assert.equal(browser[0].specifier, "semiotic/future")
  assert.match(
    namespaceProbe(browser),
    /import \* as entry0 from "semiotic\/future"/
  )
  assert.match(namespaceProbe(browser), /globalThis\.__semioticConsumerEntries/)
  assert.match(namespaceProbe(browser), /"semiotic\/future": entry0/)
})

for (const kind of ["errors", "warnings"]) {
  test(`compiler ${kind} fail the gate with the offending module and message`, () => {
    const stats = {
      hasErrors: () => kind === "errors",
      hasWarnings: () => kind === "warnings",
      toJson: () => ({
        [kind]: [{ moduleName: "semiotic/shared.js", message: "regression" }]
      })
    }
    assert.throws(
      () => assertCleanCompilation("webpack/development", stats),
      /semiotic\/shared.js: regression/
    )
  })
}

test("a compiler reporting warnings without detailed statistics still fails", () => {
  assert.throws(
    () =>
      assertCleanCompilation("rspack", {
        hasErrors: () => false,
        hasWarnings: () => true,
        toJson: () => ({})
      }),
    /compiler errors\/warnings/
  )
})

test("compiler resources close on warnings and fatal errors", async () => {
  for (const fatal of [false, true]) {
    let closed = false
    await assert.rejects(
      runCompiler(
        () => ({
          run(callback) {
            callback(fatal ? new Error("fatal") : null, {
              hasErrors: () => false,
              hasWarnings: () => true,
              toJson: () => ({ warnings: ["injected warning"] })
            })
          },
          close(callback) {
            closed = true
            callback()
          }
        }),
        {},
        "fixture"
      ),
      fatal ? /fatal/ : /injected warning/
    )
    assert.equal(closed, true)
  }
})

test("runtime and Vite warnings cannot silently pass", () => {
  assert.throws(
    () => assertNoDiagnostics("browser", ["worker failed"]),
    /worker failed/
  )
  assert.throws(
    () => assertNoDiagnostics("vite", ["ambiguous export"]),
    /ambiguous export/
  )
  assert.doesNotThrow(() => assertNoDiagnostics("clean", []))
})

test("CLI defaults to the pinned full matrix and validates selections", () => {
  assert.deepEqual(parseOptions([]).bundlers, ["webpack", "rspack", "vite"])
  assert.equal(parseOptions([]).latest, false)
  assert.equal(
    parseOptions(["--latest", "--tarball", "/tmp/release.tgz"]).tarball,
    "/tmp/release.tgz"
  )
  assert.deepEqual(parseOptions(["--bundler", "rspack"]).bundlers, ["rspack"])
  assert.throws(() => parseOptions(["--tarball"]), /Missing/)
  assert.throws(() => parseOptions(["--bundler", "unknown"]), /Unknown bundler/)
  assert.throws(() => parseOptions(["--ignore-warnings"]), /Unknown option/)
})

test("every consumer dependency has an exact pin", () => {
  const toolchain = JSON.parse(
    readFileSync(new URL("toolchain.json", import.meta.url), "utf8")
  )
  for (const [name, version] of Object.entries(toolchain.dependencies)) {
    assert.match(version, /^\d+\.\d+\.\d+$/, name)
  }
})

test("Vite's intentional RSC directive exception cannot hide other diagnostics", () => {
  const warning = {
    code: "MODULE_LEVEL_DIRECTIVE",
    message:
      'The semantics of the module level directive "use client" in "/tmp/node_modules/semiotic/dist/xy.module.min.js" may not be preserved when bundling.'
  }
  assert.equal(isExpectedClientDirective(warning), true)
  assert.equal(
    isExpectedClientDirective({ ...warning, code: "MISSING_EXPORT" }),
    false
  )
  assert.equal(
    isExpectedClientDirective({
      ...warning,
      message: warning.message.replace("use client", "use server")
    }),
    false
  )
  assert.equal(
    isExpectedClientDirective({
      ...warning,
      message: warning.message.replace("semiotic/dist", "another-library/dist")
    }),
    false
  )
  assert.equal(
    isExpectedClientDirective({
      code: "MODULE_LEVEL_DIRECTIVE",
      message: "__filename is mocked"
    }),
    false
  )
})

test("PR and release gates remain blocking, with the release checking its exact archive", () => {
  const read = (path) =>
    readFileSync(new URL(`../../${path}`, import.meta.url), "utf8")
  const pr = read(".github/workflows/node.js.yml")
  const release = read(".github/workflows/release.yml")
  const step = release.match(
    /- name: Check consumer compatibility \(exact tarball\)\n([\s\S]*?)(?=\n {6}- name:)/
  )?.[1]
  assert.ok(step)
  assert.match(
    step,
    /npm run check:consumer-compatibility -- --tarball "\$\{\{ steps\.release-artifact\.outputs\.tarball \}\}"/
  )
  assert.doesNotMatch(step, /continue-on-error/)
  assert.ok(
    release.indexOf("Create immutable release artifact") <
      release.indexOf("Check consumer compatibility (exact tarball)")
  )
  assert.ok(
    release.indexOf("Check consumer compatibility (exact tarball)") <
      release.indexOf("Reverify immutable release artifact before publication")
  )
  assert.match(pr, /run: npm run check:consumer-compatibility\n/)
  assert.match(
    read(".github/workflows/consumer-compatibility.yml"),
    /npm run check:consumer-compatibility -- --latest/
  )
  const pkg = JSON.parse(read("package.json"))
  for (const name of ["release:check", "prepublishOnly"])
    assert.ok(
      pkg.scripts[name].includes("npm run check:consumer-compatibility")
    )
})
