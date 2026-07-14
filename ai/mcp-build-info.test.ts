import {
  mcpServerInfoForBuild,
  resolveSemioticBuildInfo,
} from "./mcp-build-info"

describe("Semiotic MCP build identity", () => {
  const packageVersion = "3.8.0"
  const surfaceVersion = "3.8.0-ai"

  it("reports explicit repository-nightly provenance and a distinct MCP identity", () => {
    const commitSha = "00db062e9ed42be02a9c4f59dbf8396ebd1712cd"
    const buildInfo = resolveSemioticBuildInfo({
      packageVersion,
      surfaceVersion,
      toolProfile: "public",
      nodeVersion: "v22.16.0",
      env: {
        SEMIOTIC_DEPLOYMENT_CHANNEL: "nightly",
        SEMIOTIC_GIT_SHA: commitSha,
        SEMIOTIC_BUILD_ID: "build-123",
        SEMIOTIC_BUILD_TIME: "2026-07-13T12:34:56.000Z",
      },
    })

    expect(buildInfo).toEqual({
      channel: "nightly",
      packageVersion,
      surfaceVersion,
      commitSha,
      shortCommitSha: "00db062",
      buildId: "build-123",
      builtAt: "2026-07-13T12:34:56.000Z",
      toolProfile: "public",
      nodeVersion: "v22.16.0",
    })
    expect(mcpServerInfoForBuild(buildInfo)).toEqual({
      name: "semiotic-nightly",
      version: "3.8.0-nightly+00db062",
    })
  })

  it("keeps a published package on the stable identity when provenance is unavailable", () => {
    const buildInfo = resolveSemioticBuildInfo({
      packageVersion,
      surfaceVersion,
      toolProfile: "developer",
      nodeVersion: "v22.16.0",
      env: {},
    })

    expect(buildInfo).toEqual({
      channel: "stable",
      packageVersion,
      surfaceVersion,
      toolProfile: "developer",
      nodeVersion: "v22.16.0",
    })
    expect(mcpServerInfoForBuild(buildInfo)).toEqual({
      name: "semiotic",
      version: packageVersion,
    })
  })

  it("can attach release provenance without changing the stable MCP identity", () => {
    const commitSha = "fedcba9876543210fedcba9876543210fedcba98"
    const buildInfo = resolveSemioticBuildInfo({
      packageVersion,
      surfaceVersion,
      toolProfile: "public",
      nodeVersion: "v22.16.0",
      env: {
        SEMIOTIC_DEPLOYMENT_CHANNEL: "stable",
        SEMIOTIC_GIT_SHA: commitSha,
        SEMIOTIC_BUILD_ID: "release-build-123",
      },
    })

    expect(buildInfo).toMatchObject({
      channel: "stable",
      commitSha,
      shortCommitSha: "fedcba9",
      buildId: "release-build-123",
    })
    expect(mcpServerInfoForBuild(buildInfo)).toEqual({
      name: "semiotic",
      version: packageVersion,
    })
  })

  it("never formats an unproven nightly build as a released stable version", () => {
    const buildInfo = resolveSemioticBuildInfo({
      packageVersion,
      surfaceVersion,
      toolProfile: "public",
      nodeVersion: "v22.16.0",
      env: { SEMIOTIC_DEPLOYMENT_CHANNEL: "nightly" },
    })

    const serverInfo = mcpServerInfoForBuild(buildInfo)
    expect(serverInfo.name).toBe("semiotic-nightly")
    expect(serverInfo.version).toBe("3.8.0-nightly+unknown")
    expect(serverInfo.version).not.toBe(packageVersion)
  })
})
