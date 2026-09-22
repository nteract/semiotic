import { execFileSync, spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { createRequire } from "node:module"
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { transform } from "esbuild"
import { chromium } from "playwright-chromium"
import { npmPackArtifactArgs } from "../lib/npm-pack.mjs"
import { consumerEntries, namespaceProbe, parseOptions } from "./contracts.ts"
import { checkBundler, html } from "./builders.ts"

async function main() {
  const here = dirname(resolve(process.argv[1]))
  const repoRoot = resolve(here, "../..")
  const options = parseOptions(process.argv.slice(2))
  const temp = realpathSync(
    mkdtempSync(join(tmpdir(), "semiotic-consumer-compatibility-"))
  )
  const report: Record<string, unknown> = {
    latest: options.latest,
    results: []
  }
  const results: Record<string, unknown>[] = []
  report.results = results
  const npm = process.platform === "win32" ? "npm.cmd" : "npm"

  function command(executable: string, args: string[], cwd: string) {
    return execFileSync(executable, args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, npm_config_update_notifier: "false" },
      timeout: 300_000
    })
  }

  try {
    const tarball = options.tarball
      ? resolve(repoRoot, options.tarball)
      : (() => {
          const packed = JSON.parse(
            command(
              npm,
              npmPackArtifactArgs([
                "--json",
                "--ignore-scripts",
                "--pack-destination",
                temp
              ]),
              repoRoot
            )
          )
          return join(temp, packed[0].filename)
        })()
    report.tarball = {
      path: tarball,
      sha512: createHash("sha512").update(readFileSync(tarball)).digest("hex")
    }
    const fixture = JSON.parse(
      readFileSync(join(here, "toolchain.json"), "utf8")
    )
    if (options.latest) {
      for (const name of ["webpack", "@rspack/core", "vite"])
        fixture.dependencies[name] = "latest"
    }
    writeFileSync(join(temp, "package.json"), JSON.stringify(fixture, null, 2))
    console.log(`Installing packed consumer in ${temp}`)
    command(
      npm,
      [
        "install",
        "--dry-run=false",
        "--ignore-scripts",
        "--no-save",
        "--package-lock=false",
        "--no-legacy-peer-deps",
        "--fetch-retries=0",
        `--registry=${process.env.SEMIOTIC_PACK_REGISTRY || "https://registry.npmjs.org"}`,
        tarball
      ],
      temp
    )
    const require = createRequire(join(temp, "package.json"))
    report.versions = Object.fromEntries(
      ["webpack", "@rspack/core", "vite", "react", "react-dom"].map((name) => [
        name,
        require(`${name}/package.json`).version
      ])
    )
    console.log(report.versions)
    const pkg = require("semiotic/package.json")
    const sourcePkg = JSON.parse(
      readFileSync(join(repoRoot, "package.json"), "utf8")
    )
    if (pkg.name !== sourcePkg.name || pkg.version !== sourcePkg.version)
      throw new Error("Tarball identity does not match checkout")
    const entries = consumerEntries(pkg)
    report.entries = Object.fromEntries(
      Object.entries(entries).map(([target, entries]) => [
        target,
        entries.map((entry) => entry.specifier)
      ])
    )
    writeFileSync(
      join(temp, "surface.mjs"),
      namespaceProbe(entries.browser) +
        '\nimport { peerChecks } from "./peers.mjs";\nglobalThis.__semioticPeerChecks = peerChecks;\n'
    )
    writeFileSync(
      join(temp, "server.mjs"),
      namespaceProbe(entries.server) +
        `
    for (const [name, entry] of Object.entries(globalThis.__semioticConsumerEntries)) {
      const result = entry.renderChartWithEvidence("LineChart", {
        data: [{x: 0, y: 2}, {x: 1, y: 5}, {x: 2, y: 3}],
        xAccessor: "x", yAccessor: "y", width: 400, height: 240,
        title: "Consumer SSR", description: "Three observations"
      });
      if (!result.svg.includes("<svg") || result.evidence.empty || result.evidence.markCount < 1 || result.evidence.warnings.length) {
        throw new Error(name + ": invalid SSR evidence " + JSON.stringify(result.evidence));
      }
    }
    console.log("SSR consumer imports passed");
  `
    )
    const fixtureSource = readFileSync(join(here, "browser.tsx"), "utf8")
    const app = await transform(fixtureSource, {
      loader: "tsx",
      jsx: "automatic",
      format: "esm",
      target: "es2022"
    })
    writeFileSync(join(temp, "browser.mjs"), app.code)
    const peers = await transform(
      readFileSync(join(here, "peers.ts"), "utf8"),
      {
        loader: "ts",
        format: "esm",
        target: "es2022"
      }
    )
    writeFileSync(join(temp, "peers.mjs"), peers.code)
    writeFileSync(join(temp, "index.html"), html("/browser.mjs"))

    const browser = await chromium.launch({ headless: true })
    try {
      for (const bundler of options.bundlers) {
        for (const mode of ["development", "production"] as const) {
          const label = `${bundler}/${mode}`
          console.log(
            `Checking ${label}: ${entries.browser.length} browser entries, ${entries.server.length} server entries`
          )
          try {
            const evidence = await checkBundler({
              bundler,
              mode,
              root: temp,
              browser
            })
            const server = spawnSync(process.execPath, [evidence.serverFile], {
              cwd: temp,
              encoding: "utf8",
              timeout: 30_000
            })
            if (
              server.error ||
              server.status !== 0 ||
              server.stderr.trim() ||
              !server.stdout.includes("SSR consumer imports passed")
            ) {
              throw new Error(
                `SSR probe failed: ${server.error ?? ""}\n${server.stderr}\n${server.stdout}`
              )
            }
            results.push({ bundler, mode, status: "passed", ...evidence })
            console.log(
              `✓ ${label}: no unexpected warnings; charts, workers, optional peers, and SSR passed`
            )
          } catch (error) {
            const message =
              error instanceof Error
                ? (error.stack ?? error.message)
                : String(error)
            results.push({ bundler, mode, status: "failed", error: message })
            console.error(`✗ ${label}: ${message}`)
          }
        }
      }
    } finally {
      await browser.close()
    }
    if (results.some((result) => result.status === "failed"))
      process.exitCode = 1
  } catch (error) {
    report.error =
      error instanceof Error ? (error.stack ?? error.message) : String(error)
    console.error(report.error)
    process.exitCode = 1
  } finally {
    const reportPath = resolve(repoRoot, options.report)
    mkdirSync(dirname(reportPath), { recursive: true })
    writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n")
    console.log(`Consumer compatibility report: ${reportPath}`)
    if (process.exitCode)
      console.error(`Consumer retained for diagnosis: ${temp}`)
    else rmSync(temp, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
