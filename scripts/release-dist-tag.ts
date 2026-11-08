import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

// This runs before npm ci, including recovery of tags without this script or
// installed dependencies. Validate the complete SemVer grammar here; numeric
// prerelease identifiers cannot have leading zeroes, while build metadata can.
const releaseVersion =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/

export function resolveReleaseDistTag(
  version: unknown
): "latest" | "beta" | "next" {
  const match = typeof version === "string" && releaseVersion.exec(version)
  if (
    typeof version !== "string" ||
    !match ||
    match[0] !== version ||
    // Match npm's version length and core numeric limits as well as SemVer.
    version.length > 256 ||
    match.slice(1, 4).some((part) => !Number.isSafeInteger(Number(part))) ||
    match[4]?.split(".").some((part) => /^0\d+$/.test(part))
  ) {
    throw new Error(`Invalid release version: ${JSON.stringify(version)}`)
  }

  if (!match[4]) return "latest"
  const channel = match[4].split(".")[0]
  switch (channel) {
    case "alpha":
    case "beta":
    case "rc":
      return "beta"
    case "next":
      return "next"
    default:
      throw new Error(
        `Unsupported prerelease channel ${JSON.stringify(channel)} in ${version}; expected alpha, beta, rc, or next`
      )
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const [releaseTag, ...extra] = process.argv.slice(2)
    if (!releaseTag || extra.length) {
      throw new Error(
        "Usage: node --experimental-strip-types scripts/release-dist-tag.ts <release-tag> < package.json"
      )
    }
    // Read the explicitly supplied manifest, never the tooling checkout's.
    const { version } = JSON.parse(readFileSync(0, "utf8"))
    const distTag = resolveReleaseDistTag(version)
    if (releaseTag !== `v${version}`) {
      throw new Error(
        `Release tag mismatch: expected v${version} for package.json version ${version}, got ${releaseTag}`
      )
    }
    // Emit an Actions output only after every validation succeeds.
    console.log(`tag=${distTag}`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
