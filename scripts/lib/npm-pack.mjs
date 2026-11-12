import { spawnSync } from "node:child_process"
import { mkdirSync, readdirSync } from "node:fs"
import { join } from "node:path"

/**
 * Build npm pack arguments for callers that require a real tarball artifact.
 *
 * `npm publish --dry-run` exposes `npm_config_dry_run=true` to lifecycle child
 * processes. Without an explicit command-line override, a nested `npm pack`
 * exits successfully and reports a filename but intentionally writes no file.
 */
export function npmPackArtifactArgs(args = []) {
  return ["pack", ...args, "--dry-run=false"]
}
/** Shared archive acquisition for API and SSR release comparisons.
 * @param {{cwd: string, destination: string, registry: string, packageSpec?: string, env?: NodeJS.ProcessEnv}} options
 */
export function packNpmArtifact({
  cwd,
  destination,
  registry,
  packageSpec = "",
  env = process.env
}) {
  mkdirSync(destination, { recursive: true })
  const packed = spawnSync(
    "npm",
    npmPackArtifactArgs([
      ...(packageSpec ? [packageSpec] : []),
      "--ignore-scripts",
      "--json",
      "--pack-destination",
      destination,
      "--registry",
      registry,
      "--fetch-retries=0"
    ]),
    {
      cwd,
      env,
      encoding: "utf8",
      timeout: 120_000,
      maxBuffer: 16 * 1024 * 1024
    }
  )
  if (packed.error || packed.status !== 0)
    throw new Error(
      `Could not acquire ${packageSpec || "local package"}: ${packed.error?.message || packed.stderr || packed.stdout}`
    )
  let result
  try {
    result = JSON.parse(packed.stdout)
  } catch (error) {
    throw new Error(`Could not parse npm pack output: ${error.message}`)
  }
  const archives = readdirSync(destination).filter((name) =>
    name.endsWith(".tgz")
  )
  if (
    archives.length !== 1 ||
    result?.length !== 1 ||
    archives[0] !== result[0].filename
  )
    throw new Error("npm pack did not produce exactly its reported archive")
  return join(destination, archives[0])
}
