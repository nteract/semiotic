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
  assert.match(workflow, /^ {2}npm-publish-preflight:\n/m)
  assert.match(
    workflow,
    /^ {2}npm-publish-preflight:\n(?:.*\n){1,5} {4}environment: release$/m
  )
  assert.match(workflow, /node scripts\/check-npm-trusted-publisher\.mjs/)
  assert.match(workflow, /npm install --global npm@11\.6\.2/)
  assert.doesNotMatch(workflow, /^ {2}visual-contracts:/m)
  assert.match(
    workflow,
    /^ {2}docs-examples:\n {4}needs: npm-publish-preflight$/m
  )
  assert.match(
    workflow,
    /^ {2}publish:\n {4}needs: docs-examples\n {4}runs-on: ubuntu-latest\n {4}environment: release$/m
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

// Post-publication processing shares the release's public-registry boundary.
const { readNpmPublication, waitForNpmPublication } =
  await import("./wait-for-npm-publication.mjs")
const publishedManifest = {
  name: "semiotic",
  version: "3.10.0",
  dist: {
    integrity: "sha512-expected",
    signatures: [{ keyid: "registry-key" }],
    attestations: { url: "https://registry.npmjs.org/attestation" }
  }
}

function publicationClock(read, overrides = {}) {
  let elapsed = 0
  const pauses = []
  const messages = []
  return {
    pauses,
    messages,
    options: {
      packageName: "semiotic",
      version: "3.10.0",
      expectedIntegrity: "sha512-expected",
      read,
      now: () => elapsed,
      pause: async (ms) => {
        pauses.push(ms)
        elapsed += ms
      },
      log: (message) => messages.push(message),
      ...overrides
    }
  }
}

test("publication processing can exceed the old 75-second window", async () => {
  let requests = 0
  const clock = publicationClock(async () =>
    ++requests <= 6
      ? { pending: "E404: version is still processing" }
      : { manifest: publishedManifest }
  )
  assert.equal(await waitForNpmPublication(clock.options), publishedManifest)
  assert.equal(requests, 7)
  assert.equal(
    clock.pauses.reduce((sum, ms) => sum + ms, 0),
    90_000
  )
  assert.match(
    clock.messages.at(-1),
    /exact integrity, registry signatures and provenance/
  )
})

test("publication waits for provenance after version and integrity become visible", async () => {
  const manifests = [
    { ...publishedManifest, dist: { integrity: "sha512-expected" } },
    {
      ...publishedManifest,
      dist: { ...publishedManifest.dist, attestations: [] }
    },
    publishedManifest
  ]
  const clock = publicationClock(async () => ({ manifest: manifests.shift() }))
  await waitForNpmPublication(clock.options)
  assert.equal(clock.pauses.length, 2)
})

test("publication stops immediately on mismatched integrity or package identity", async () => {
  for (const manifest of [
    {
      ...publishedManifest,
      dist: { ...publishedManifest.dist, integrity: "sha512-other" }
    },
    { ...publishedManifest, version: "3.9.0" },
    { ...publishedManifest, name: "other-package" }
  ]) {
    const clock = publicationClock(async () => ({ manifest }))
    await assert.rejects(
      waitForNpmPublication(clock.options),
      /integrity|identity/
    )
    assert.deepEqual(clock.pauses, [])
  }
})

test("publication timeout includes the last registry failure and caps the final sleep", async () => {
  const clock = publicationClock(
    async ({ timeoutMs }) => {
      assert.ok(timeoutMs <= 100)
      return { pending: "E503: registry unavailable" }
    },
    { timeoutMs: 100, intervalMs: 40 }
  )
  await assert.rejects(
    waitForNpmPublication(clock.options),
    /Last registry status: E503: registry unavailable/
  )
  assert.deepEqual(clock.pauses, [40, 40, 20])
})

test("registry reads force fresh public metadata with a bounded request", async () => {
  const result = await readNpmPublication({
    packageName: "semiotic",
    version: "3.10.0",
    timeoutMs: 1234,
    exec: async (command, args, options) => {
      assert.equal(command, "npm")
      assert.deepEqual(args, [
        "view",
        "semiotic@3.10.0",
        "--json",
        "--registry=https://registry.npmjs.org",
        "--prefer-online",
        "--offline=false",
        "--fetch-retries=0",
        "--fetch-timeout=1234"
      ])
      assert.equal(options.timeout, 1234)
      return { stdout: JSON.stringify(publishedManifest) }
    }
  })
  assert.deepEqual(result.manifest, publishedManifest)
})

test("registry reads distinguish retryable failures from authentication and malformed responses", async () => {
  for (const code of [
    "E404",
    "ETARGET",
    "E429",
    "E503",
    "ENOTFOUND",
    "ETIMEDOUT"
  ]) {
    const result = await readNpmPublication({
      packageName: "semiotic",
      version: "3.10.0",
      timeoutMs: 1000,
      exec: async () => {
        throw {
          stdout: JSON.stringify({ error: { code, summary: "unavailable" } })
        }
      }
    })
    assert.equal(result.code, code)
    assert.equal(result.pending, `${code}: unavailable`)
  }
  await assert.rejects(
    readNpmPublication({
      packageName: "semiotic",
      version: "3.10.0",
      timeoutMs: 1000,
      exec: async () => {
        throw {
          stdout: JSON.stringify({
            error: { code: "E403", summary: "forbidden" }
          })
        }
      }
    }),
    /npm registry query failed \(E403\): forbidden/
  )
  await assert.rejects(
    readNpmPublication({
      packageName: "semiotic",
      version: "3.10.0",
      timeoutMs: 1000,
      exec: async () => ({ stdout: "not JSON" })
    }),
    SyntaxError
  )
})

test("a hung npm request is retryable, but a missing npm executable fails", async () => {
  const options = {
    packageName: "semiotic",
    version: "3.10.0",
    timeoutMs: 1000
  }
  assert.equal(
    (
      await readNpmPublication({
        ...options,
        exec: async () => {
          throw Object.assign(new Error("timed out"), { killed: true })
        }
      })
    ).code,
    "ETIMEDOUT"
  )
  await assert.rejects(
    readNpmPublication({
      ...options,
      exec: async () => {
        throw Object.assign(new Error("missing executable"), { code: "ENOENT" })
      }
    }),
    /ENOENT/
  )
})

test("release workflow waits for the exact artifact before installing its public version", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/release.yml", import.meta.url),
    "utf8"
  )
  assert.match(
    workflow,
    /timeout-minutes: 16\n {8}run: node scripts\/wait-for-npm-publication\.mjs --expected-integrity/
  )
  assert.ok(
    workflow.indexOf("Wait for published artifact and provenance") <
      workflow.indexOf("Post-publish smoke test")
  )
  assert.match(
    workflow,
    /readNpmPublication\(\{ packageName, version, timeoutMs: 10_000 \}\)/
  )
  assert.doesNotMatch(workflow, /npm view.*2>\/dev\/null/)
})
