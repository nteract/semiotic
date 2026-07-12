#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, "..")

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
