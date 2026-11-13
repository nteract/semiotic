import { execFileSync, spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from "node:fs"
import { basename, join, resolve } from "node:path"
import { packNpmArtifact } from "../lib/npm-pack.mjs"
import type { Artifact } from "./types"

export const digest = (bytes: string | Buffer) =>
  createHash("sha256").update(bytes).digest("hex")
export const json = (path: string) => JSON.parse(readFileSync(path, "utf8"))

export function command(
  executable: string,
  args: string[],
  cwd: string,
  cache: string
): string {
  const result = spawnSync(executable, args, {
    cwd,
    encoding: "utf8",
    timeout: 180_000,
    maxBuffer: 16 * 1024 * 1024,
    env: {
      ...process.env,
      npm_config_cache: cache,
      npm_config_update_notifier: "false"
    }
  })
  if (result.error || result.status !== 0)
    throw new Error(
      `${executable} ${args[0]} failed: ${result.error?.message || result.stderr || result.stdout}`
    )
  return result.stdout
}

export function checkoutIdentity(root: string) {
  const commit = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8"
  })
  if (commit.status !== 0) return undefined
  const status = execFileSync("git", ["status", "--porcelain"], {
    cwd: root,
    encoding: "utf8"
  })
  return { commit: commit.stdout.trim(), dirty: !!status.trim() }
}

/** Use npm's authoritative archive, including the dry-run override shared with
 * API compatibility. Never substitute a git tag or the working source tree.
 */
export function acquireArtifact(
  input: string,
  side: "previous" | "current",
  work: string,
  registry: string
): Artifact {
  const archiveDir = join(work, side, "archive")
  const extraction = join(work, side, "extracted")
  mkdirSync(archiveDir, { recursive: true })
  mkdirSync(extraction, { recursive: true })
  const cache = join(work, "npm-cache")
  const local = resolve(input)
  const exactVersion =
    /^(?:v)?(\d+\.\d+\.\d+(?:-[\da-zA-Z.-]+)?(?:\+[\da-zA-Z.-]+)?)$/.exec(
      input
    )?.[1]
  let published:
    | {
        name: string
        version: string
        gitHead?: string
        dist: { integrity: string }
      }
    | undefined
  let kind: Artifact["kind"]
  let checkout: Artifact["checkout"]
  let tarball: string
  if (exactVersion && side === "previous") {
    kind = "published"
    published = JSON.parse(
      command(
        "npm",
        [
          "view",
          `semiotic@${exactVersion}`,
          "--json",
          "--fetch-retries=0",
          "--registry",
          registry
        ],
        work,
        cache
      )
    )
    if (
      published?.name !== "semiotic" ||
      published.version !== exactVersion ||
      !published.dist?.integrity
    )
      throw new Error(
        `Registry returned no authoritative identity for semiotic@${exactVersion}`
      )
  } else if (
    existsSync(local) &&
    statSync(local).isFile() &&
    local.endsWith(".tgz")
  ) {
    kind = "tarball"
  } else if (
    side === "current" &&
    existsSync(join(local, "package.json")) &&
    existsSync(join(local, "dist"))
  ) {
    kind = "built"
    checkout = checkoutIdentity(local)
  } else {
    throw new Error(
      `${side}: expected ${side === "previous" ? "an exact published version or" : "a built package directory or"} a .tgz artifact; received ${input}`
    )
  }
  if (kind === "tarball") {
    tarball = join(archiveDir, basename(local))
    cpSync(local, tarball)
  } else {
    tarball = packNpmArtifact({
      packageSpec: published ? `semiotic@${exactVersion}` : undefined,
      cwd: published ? work : local,
      destination: archiveDir,
      registry,
      env: {
        ...process.env,
        npm_config_cache: cache,
        npm_config_update_notifier: "false"
      }
    })
  }
  const bytes = readFileSync(tarball)
  const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`
  if (published && published.dist.integrity !== integrity)
    throw new Error("Downloaded archive does not match registry integrity")
  const paths = command("tar", ["-tzf", tarball], work, cache)
    .trim()
    .split("\n")
  const listing = command("tar", ["-tvzf", tarball], work, cache)
    .trim()
    .split("\n")
  if (
    paths.some(
      (path) => !path.startsWith("package/") || path.split("/").includes("..")
    ) ||
    listing.some((line) => !/^[-d]/.test(line))
  )
    throw new Error(
      "Archive contains an escaping path, link, or unsupported entry"
    )
  command("tar", ["-xzf", tarball, "-C", extraction], work, cache)
  const packageRoot = join(extraction, "package")
  const pkg = json(join(packageRoot, "package.json"))
  if (
    pkg.name !== "semiotic" ||
    typeof pkg.version !== "string" ||
    (published && pkg.version !== exactVersion) ||
    !existsSync(join(packageRoot, "dist"))
  )
    throw new Error("Artifact is not the requested built semiotic package")
  return {
    source: input,
    kind,
    name: pkg.name,
    version: pkg.version,
    integrity,
    sha256: digest(bytes),
    tarball,
    packageRoot,
    ...(published
      ? { registry, publishedIntegrity: published.dist.integrity }
      : {}),
    ...(published?.gitHead || pkg.gitHead
      ? { gitHead: published?.gitHead || pkg.gitHead }
      : {}),
    ...(checkout ? { checkout } : {})
  }
}

/** Pin the consumer-owned runtime from the checkout lock, without borrowing its
 * node_modules or allowing either package to resolve the checkout's Semiotic.
 * npm still checks peer/dependency ranges; differing resolved trees are errors.
 */
export function runtimePins(root: string): Record<string, string> {
  const manifest = json(join(root, "package.json"))
  const lock = json(join(root, "package-lock.json"))
  return Object.fromEntries(
    [...Object.keys(manifest.dependencies), "react", "react-dom"]
      .sort()
      .map((name) => {
        const version = lock.packages?.[`node_modules/${name}`]?.version
        if (!version)
          throw new Error(`Runtime dependency is not locked: ${name}`)
        return [name, version]
      })
  )
}

export function installConsumer(
  artifact: Artifact,
  work: string,
  side: string,
  registry: string,
  pins: Record<string, string>
) {
  const consumer = join(work, side, "consumer")
  mkdirSync(consumer, { recursive: true })
  writeFileSync(
    join(consumer, "package.json"),
    JSON.stringify(
      {
        name: "ssr-evidence-consumer",
        version: "0.0.0",
        private: true,
        type: "module",
        dependencies: { ...pins, semiotic: `file:${artifact.tarball}` }
      },
      null,
      2
    )
  )
  command(
    "npm",
    [
      "install",
      "--dry-run=false",
      "--ignore-scripts",
      "--include=prod",
      "--omit=optional",
      "--no-legacy-peer-deps",
      "--fetch-retries=0",
      "--registry",
      registry
    ],
    consumer,
    join(work, "npm-cache")
  )
  const lock = json(join(consumer, "package-lock.json"))
  const runtime = Object.fromEntries(
    Object.entries(
      lock.packages as Record<string, { version?: string; integrity?: string }>
    )
      .filter(([path]) => path && path !== "node_modules/semiotic")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, pkg]) => [
        path,
        { version: pkg.version, integrity: pkg.integrity }
      ])
  )
  return { consumer, runtime }
}
