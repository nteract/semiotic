#!/usr/bin/env node
import { readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

const DEFAULT_REGISTRY = "https://registry.npmjs.org"
const NPM_OIDC_AUDIENCE = "npm:registry.npmjs.org"

function responseMessage(payload, fallback) {
  if (
    payload &&
    typeof payload === "object" &&
    typeof payload.message === "string"
  ) {
    return payload.message
  }
  return typeof payload === "string" && payload.trim()
    ? payload.trim()
    : fallback
}

async function readResponse(response) {
  const body = await response.text()
  if (!body) return null
  try {
    return JSON.parse(body)
  } catch {
    return body
  }
}

export function githubOidcRequestUrl(requestUrl) {
  const url = new URL(requestUrl)
  url.searchParams.set("audience", NPM_OIDC_AUDIENCE)
  return url
}

export async function requestGithubOidcToken({
  env = process.env,
  fetchImpl = fetch
} = {}) {
  const requestUrl = env.ACTIONS_ID_TOKEN_REQUEST_URL
  const requestToken = env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
  if (!requestUrl || !requestToken) {
    throw new Error(
      "GitHub OIDC is unavailable. The release preflight job must run on a GitHub-hosted runner with id-token: write."
    )
  }

  const response = await fetchImpl(githubOidcRequestUrl(requestUrl), {
    headers: { Authorization: `Bearer ${requestToken}` },
    signal: AbortSignal.timeout(15_000)
  })
  const payload = await readResponse(response)
  if (!response.ok || !payload?.value) {
    throw new Error(
      `GitHub did not issue an npm OIDC identity token: ${responseMessage(payload, response.statusText)}`
    )
  }
  return payload.value
}

export async function exchangeNpmPublishToken({
  packageName,
  oidcToken,
  registry = DEFAULT_REGISTRY,
  fetchImpl = fetch
}) {
  const endpoint = new URL(
    `/-/npm/v1/oidc/token/exchange/package/${encodeURIComponent(packageName)}`,
    registry
  )
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${oidcToken}` },
    signal: AbortSignal.timeout(15_000)
  })
  const payload = await readResponse(response)
  if (!response.ok || !payload?.token) {
    throw new Error(
      [
        `npm rejected the trusted-publisher identity for ${packageName}: ${responseMessage(payload, response.statusText)}`,
        "In npm package settings, configure GitHub Actions trusted publishing for repository nteract/semiotic, workflow release.yml, environment release, and allow npm publish.",
        "Do not add NODE_AUTH_TOKEN or NPM_TOKEN to the publish step; a configured token takes precedence over OIDC."
      ].join("\n")
    )
  }
  return payload.token
}

export async function checkNpmTrustedPublisher({
  packageName,
  env = process.env,
  fetchImpl = fetch,
  registry = DEFAULT_REGISTRY
} = {}) {
  if (env.GITHUB_ACTIONS !== "true") {
    throw new Error(
      "npm trusted-publisher preflight only runs inside GitHub Actions"
    )
  }
  if (env.GITHUB_REPOSITORY !== "nteract/semiotic") {
    throw new Error(
      `Refusing npm credential exchange from unexpected repository ${env.GITHUB_REPOSITORY || "(missing)"}`
    )
  }
  if (env.NODE_AUTH_TOKEN || env.NPM_TOKEN) {
    throw new Error(
      "Remove NODE_AUTH_TOKEN/NPM_TOKEN from the release job; token authentication can mask or override trusted publishing."
    )
  }

  const oidcToken = await requestGithubOidcToken({ env, fetchImpl })
  await exchangeNpmPublishToken({ packageName, oidcToken, registry, fetchImpl })
}

async function main() {
  const packageJson = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  )
  await checkNpmTrustedPublisher({ packageName: packageJson.name })
  console.log(
    `✓ npm trusted-publisher authentication is ready for ${packageJson.name}`
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
