import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  checkNpmTrustedPublisher,
  exchangeNpmPublishToken,
  githubOidcRequestUrl
} from "./check-npm-trusted-publisher.mjs"

function jsonResponse(payload, { status = 200, statusText = "OK" } = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    statusText,
    headers: { "content-type": "application/json" }
  })
}

test("adds the npm audience without discarding GitHub request parameters", () => {
  const url = githubOidcRequestUrl(
    "https://actions.example/id-token?api-version=2.0"
  )
  assert.equal(url.searchParams.get("api-version"), "2.0")
  assert.equal(url.searchParams.get("audience"), "npm:registry.npmjs.org")
})

test("exchanges GitHub OIDC for a package-scoped npm token without logging it", async () => {
  const requests = []
  const fetchImpl = async (url, options) => {
    requests.push({ url: String(url), options })
    return jsonResponse({ token: "short-lived-secret" })
  }

  const token = await exchangeNpmPublishToken({
    packageName: "semiotic",
    oidcToken: "github-identity",
    fetchImpl
  })

  assert.equal(token, "short-lived-secret")
  assert.equal(
    requests[0].url,
    "https://registry.npmjs.org/-/npm/v1/oidc/token/exchange/package/semiotic"
  )
  assert.equal(requests[0].options.method, "POST")
  assert.deepEqual(requests[0].options.headers, {
    Authorization: "Bearer github-identity"
  })
  assert.ok(requests[0].options.signal instanceof AbortSignal)
})

test("fails with trusted-publisher setup instructions when npm rejects the identity", async () => {
  await assert.rejects(
    exchangeNpmPublishToken({
      packageName: "semiotic",
      oidcToken: "github-identity",
      fetchImpl: async () =>
        jsonResponse(
          { message: "OIDC token exchange error - package not found" },
          { status: 404, statusText: "Not Found" }
        )
    }),
    /repository nteract\/semiotic, workflow release\.yml, environment release, and allow npm publish/
  )
})

test("rejects long-lived npm credentials before requesting an OIDC token", async () => {
  await assert.rejects(
    checkNpmTrustedPublisher({
      packageName: "semiotic",
      env: {
        GITHUB_ACTIONS: "true",
        GITHUB_REPOSITORY: "nteract/semiotic",
        NODE_AUTH_TOKEN: "stale-token"
      },
      fetchImpl: async () => {
        throw new Error("fetch should not run")
      }
    }),
    /token authentication can mask or override trusted publishing/
  )
})

test("preflights both GitHub identity issuance and npm package authorization", async () => {
  const requests = []
  await checkNpmTrustedPublisher({
    packageName: "semiotic",
    env: {
      GITHUB_ACTIONS: "true",
      GITHUB_REPOSITORY: "nteract/semiotic",
      ACTIONS_ID_TOKEN_REQUEST_URL:
        "https://actions.example/id-token?api-version=2.0",
      ACTIONS_ID_TOKEN_REQUEST_TOKEN: "actions-request-token"
    },
    fetchImpl: async (url, options) => {
      requests.push({ url: String(url), options })
      return requests.length === 1
        ? jsonResponse({ value: "github-identity" })
        : jsonResponse({ token: "short-lived-secret" })
    }
  })

  assert.equal(requests.length, 2)
  assert.match(requests[0].url, /audience=npm%3Aregistry\.npmjs\.org/)
  assert.deepEqual(requests[0].options.headers, {
    Authorization: "Bearer actions-request-token"
  })
  assert.equal(
    requests[1].options.headers.Authorization,
    "Bearer github-identity"
  )
})

test("release workflow gates expensive jobs on OIDC preflight and never uses NPM_TOKEN", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/release.yml", import.meta.url),
    "utf8"
  )
  assert.match(workflow, /^  npm-publish-preflight:\n/m)
  assert.match(
    workflow,
    /^  npm-publish-preflight:\n(?:.*\n){1,5}    environment: release$/m
  )
  assert.match(workflow, /node scripts\/check-npm-trusted-publisher\.mjs/)
  assert.match(workflow, /npm install --global npm@11\.6\.2/)
  assert.doesNotMatch(workflow, /^  visual-contracts:/m)
  assert.match(
    workflow,
    /^  docs-examples:\n    needs: npm-publish-preflight$/m
  )
  assert.match(
    workflow,
    /^  publish:\n    needs: docs-examples\n    runs-on: ubuntu-latest\n    environment: release$/m
  )
  assert.match(
    workflow,
    /release_tag: \$\{\{ github\.event_name == 'workflow_dispatch'/
  )
  assert.doesNotMatch(workflow, /NPM_TOKEN|NODE_AUTH_TOKEN/)
  assert.doesNotMatch(workflow, /run: npm run release:check/)
})

test("publish gates exclude PR-only baselines", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/release.yml", import.meta.url),
    "utf8"
  )
  const packageJson = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  )
  const baselineCommands = [
    "check:visual-baseline-capabilities",
    "check:cold-consumer",
    "check:machine-baseline",
    "check:browser-baseline"
  ]

  assert.match(workflow, /const prOnlyBaselines = new Set/)
  for (const baselineCommand of baselineCommands) {
    assert.match(
      workflow,
      new RegExp(`"npm run ${baselineCommand.replaceAll(":", "\\:")}"`),
      `manual recovery must filter ${baselineCommand} from an older tag's release:check`
    )
  }

  for (const scriptName of ["release:check", "prepublishOnly"]) {
    for (const baselineCommand of baselineCommands) {
      assert.doesNotMatch(
        packageJson.scripts[scriptName],
        new RegExp(`npm run ${baselineCommand.replaceAll(":", "\\:")}`),
        `${scriptName} must not gate publication on ${baselineCommand}`
      )
    }
  }

  for (const diagnostic of [
    "packed cold-consumer baseline",
    "packed machine baseline",
    "benchmarks versus previous tag"
  ]) {
    assert.match(
      workflow,
      new RegExp(
        `- name: "Release diagnostics: ${diagnostic}"\\n` +
          `        run: [^\\n]+\\n` +
          `        continue-on-error: true`
      )
    )
  }
})
