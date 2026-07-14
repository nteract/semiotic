/**
 * Deployment identity shared by the HTTP health endpoint, MCP initialize
 * response, and the read-only build-info resource. Keep this deliberately
 * small: deployment metadata is supplied by the wrapper/container rather than
 * inferred from a checkout at runtime.
 */

export type McpToolProfile = "developer" | "public"
export type SemioticDeploymentChannel = "stable" | "nightly"

export type SemioticBuildInfo = {
  channel: SemioticDeploymentChannel
  packageVersion: string
  surfaceVersion: string
  commitSha?: string
  shortCommitSha?: string
  buildId?: string
  builtAt?: string
  toolProfile: McpToolProfile
  nodeVersion: string
}

type BuildInfoOptions = {
  packageVersion: string
  surfaceVersion: string
  toolProfile: McpToolProfile
  env?: Record<string, string | undefined>
  nodeVersion?: string
}

function nonEmptyEnvValue(
  env: Record<string, string | undefined>,
  name: string,
): string | undefined {
  const value = env[name]?.trim()
  return value || undefined
}

function normalizeGitSha(value: string | undefined): string | undefined {
  // Cloud Build supplies a full hexadecimal commit SHA. Reject malformed
  // values so they cannot leak into the semver-shaped MCP server version.
  return value && /^[0-9a-f]{40,128}$/i.test(value) ? value.toLowerCase() : undefined
}

/** Resolve only the explicit nightly channel; all other execution stays stable. */
function resolveDeploymentChannel(value: string | undefined): SemioticDeploymentChannel {
  return value?.toLowerCase() === "nightly" ? "nightly" : "stable"
}

/**
 * Resolve deployment identity from the small allowlist of non-secret runtime
 * values set by a release wrapper or repository-built deployment.
 */
export function resolveSemioticBuildInfo(
  options: BuildInfoOptions,
): SemioticBuildInfo {
  const env = options.env ?? process.env
  const commitSha = normalizeGitSha(nonEmptyEnvValue(env, "SEMIOTIC_GIT_SHA"))

  return {
    channel: resolveDeploymentChannel(
      nonEmptyEnvValue(env, "SEMIOTIC_DEPLOYMENT_CHANNEL"),
    ),
    packageVersion: options.packageVersion,
    surfaceVersion: options.surfaceVersion,
    ...(commitSha
      ? { commitSha, shortCommitSha: commitSha.slice(0, 7) }
      : {}),
    ...(nonEmptyEnvValue(env, "SEMIOTIC_BUILD_ID")
      ? { buildId: nonEmptyEnvValue(env, "SEMIOTIC_BUILD_ID") }
      : {}),
    ...(nonEmptyEnvValue(env, "SEMIOTIC_BUILD_TIME")
      ? { builtAt: nonEmptyEnvValue(env, "SEMIOTIC_BUILD_TIME") }
      : {}),
    toolProfile: options.toolProfile,
    nodeVersion: options.nodeVersion ?? process.version,
  }
}

/**
 * MCP serverInfo is intentionally distinct for nightly builds. The nightly
 * suffix makes an unreleased repository build impossible to mistake for the
 * exact stable package version advertised by the release channel.
 */
export function mcpServerInfoForBuild(
  buildInfo: SemioticBuildInfo,
): { name: string; version: string } {
  if (buildInfo.channel !== "nightly") {
    return { name: "semiotic", version: buildInfo.packageVersion }
  }

  // Package versions do not normally carry build metadata, but remove it if
  // present before appending the nightly metadata required by semver.
  const packageVersion = buildInfo.packageVersion.split("+", 1)[0]
  const nightlyVersion = packageVersion.includes("-nightly")
    ? packageVersion
    : `${packageVersion}-nightly`

  return {
    name: "semiotic-nightly",
    version: `${nightlyVersion}+${buildInfo.shortCommitSha || "unknown"}`,
  }
}
