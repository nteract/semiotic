#!/usr/bin/env node
//
// Generate/update Playwright visual baselines on Linux, locally, in a
// container — so CI's Linux baselines don't have to be downloaded from a CI
// artifact and committed back. Requires a running Docker-compatible runtime
// (Docker Desktop, or `colima start` which exposes a docker socket + CLI).
//
// Examples:
//   npm run test:visual:bootstrap:docker                                   # default specs, all browsers, missing-only
//   npm run test:visual:update:docker                                      # default specs, all browsers, --update-snapshots=all
//   node scripts/run-playwright-linux-bootstrap.mjs integration-tests/ssr-parity.spec.ts -- -g bar-gradient
//
// The repo is bind-mounted, but `node_modules` is shadowed by an anonymous
// volume so the in-container `npm ci` (which installs Linux-native binaries)
// can NOT overwrite the host's macOS `node_modules`. `--rm` discards that
// volume when the run finishes. Only the generated `*-snapshots/*.png` and
// `dist/` (platform-independent bundles) are written back to the host.
import { spawnSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, "..")

// Preflight: a container CLI must be reachable. Fail early with guidance
// rather than letting spawnSync surface a raw ENOENT.
const probe = spawnSync("docker", ["version", "--format", "{{.Server.Version}}"], { stdio: "ignore" })
if (probe.error || probe.status !== 0) {
  console.error(
    "docker CLI + a running daemon are required.\n" +
    "  • Docker Desktop: launch it, then re-run.\n" +
    "  • Colima: `colima start` (installs/boots a Linux VM with a docker socket), then re-run.\n" +
    "Override the image with PW_DOCKER_IMAGE if needed."
  )
  process.exit(1)
}

const image = process.env.PW_DOCKER_IMAGE || "mcr.microsoft.com/playwright:v1.61.1-jammy"
const defaultSpecs = [
  "integration-tests/mobile-visualization-harness.spec.ts",
  "integration-tests/physics-frame.spec.ts",
]

const args = process.argv.slice(2)
const forwardArgs = args[0] === "--" ? args.slice(1) : args

const commandParts = forwardArgs.length ? [...forwardArgs] : []

const specs = []
const options = []
for (let i = 0; i < commandParts.length; i++) {
  const arg = commandParts[i]
  if (arg === "--") continue

  if (arg.startsWith("--")) {
    options.push(arg)
    if (arg === "--project" && commandParts[i + 1]) {
      i += 1
      options.push(commandParts[i])
    }
    continue
  }

  specs.push(arg)
}

const hasProjectArg = options.some((arg) => arg === "--project" || arg.startsWith("--project="))
const hasUpdateArg = options.some((arg) => arg.startsWith("--update-snapshots"))

const playwrightArgs = [...(specs.length > 0 ? specs : defaultSpecs), ...options]

if (!hasProjectArg) {
  playwrightArgs.push("--project=chromium", "--project=firefox", "--project=webkit")
}

if (!hasUpdateArg) {
  playwrightArgs.push("--update-snapshots=all")
}

const command = [
  "npm ci",
  "npm run dist",
  "npx playwright install --with-deps chromium firefox webkit",
  `npx playwright test ${playwrightArgs.join(" ")}`,
].join(" && ")

const dockerArgs = [
  "run",
  "--rm",
  "--shm-size=2g",
  "-v",
  `${repoRoot}:/workspace`,
  // Anonymous volume shadows the bind-mounted node_modules so the container's
  // `npm ci` installs Linux binaries into throwaway storage instead of
  // clobbering the host's macOS install. `--rm` removes it after the run.
  "-v",
  "/workspace/node_modules",
  "-w",
  "/workspace",
  "-e",
  "CI=1",
  "-e",
  "PLAYWRIGHT_BROWSERS_PATH=/ms-playwright",
  image,
  "bash",
  "-lc",
  command,
]

console.log("Running:", ["docker", ...dockerArgs].join(" "))
const result = spawnSync("docker", dockerArgs, { stdio: "inherit" })

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
