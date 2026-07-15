# Stable Semiotic MCP on Google Cloud Run

A thin wrapper that runs the published `semiotic-mcp` server in HTTP (Streamable HTTP)
mode as a public, remote MCP server — consumable by ChatGPT, Claude connectors, and any
MCP client.

This is the **stable release channel** (`semiotic-mcp-server` in `us-west1`). It is the official endpoint
for public users, registries, documentation, and app directories. See
[`../README.md`](../README.md) for the stable/nightly channel boundary.

There is **no Dockerfile**. Cloud Run builds this folder's `package.json` directly from
source (Cloud Buildpacks) and runs `npm start`, which launches:

```
semiotic-mcp --http --host 0.0.0.0 --port $PORT --profile public
```

`--profile public` exposes exactly the five task-oriented tools (`createChart`,
`improveChart`, `explainChart`, `auditChart`, `getChartSchema`) — the documented public
surface. Without it the server defaults to the full developer tool set, which should not
be exposed on an unauthenticated public endpoint.

The MCP binary otherwise binds HTTP to `127.0.0.1`. This wrapper deliberately passes
`--host 0.0.0.0`, because Cloud Run's ingress proxy must reach the process over its
container network.

The server runs in **stateless** mode: each request gets a fresh MCP server instance and
holds no session state. Every tool is an independent read-only request/response, so there
is nothing to keep between calls — which is what lets it autoscale on Cloud Run with no
session affinity or single-instance pin.

The wrapper depends on the **published** `semiotic` package from npm — it does not build
from this repo's source. Improvements to the MCP server ship to the live endpoint only
after a new `semiotic` version is published to npm. The dependency is pinned to an **exact**
version (not a caret range) so a redeploy can't silently pick up a different release; bump
it deliberately when upgrading. In particular, this service must not automatically deploy
arbitrary commits from `main`.

### Lockfile status

The wrapper pins the published `semiotic@3.8.0` release and includes a generated
`package-lock.json`. Cloud Buildpacks receives that lockfile because `.gcloudignore` excludes
only `node_modules`.

When upgrading Semiotic, generate and verify a new lock from this directory before deploying:

```sh
npm install --package-lock-only --ignore-scripts --registry=https://registry.npmjs.org
npm ci --ignore-scripts
cd ../..
npm run check:cloud-run-lock
```

The local verifier proves dependency and build-context intent. Retain Cloud Build evidence for the
actual deployed revision to prove that its source upload and image used the committed lockfile.

From the repository root, `npm run check:cloud-run-manifest` always verifies the public-host,
port, profile, exact dependency, and build-context contract; `check:cloud-run-lock` additionally
fails until a fully resolved lockfile is present.

## Deploy

```sh
cd deploy/cloud-run
gcloud run deploy semiotic-mcp-server --source . --region us-west1 \
  --allow-unauthenticated --memory 1Gi \
  --set-env-vars "MCP_ALLOWED_HOSTS=semiotic-mcp-server-481507046413.us-west1.run.app"
```

First run will prompt to enable the Cloud Run / Cloud Build / Artifact Registry APIs —
answer yes. The command prints the service URL when it finishes.

### Deploy an exact published release or tag

Use this wrapper only from the released version that is meant to be public.
Start from a clean checkout of that release tag, then deploy the wrapper directory
itself — never the repository root and never an arbitrary `main` checkout:

```sh
git fetch --tags
git switch --detach vX.Y.Z
git status --short
cd deploy/cloud-run
npm ci --ignore-scripts
npm pkg get dependencies.semiotic
gcloud run deploy semiotic-mcp-server --source . --region us-west1 \
  --allow-unauthenticated --memory 1Gi \
  --set-env-vars "MCP_ALLOWED_HOSTS=YOUR_STABLE_HOST"
```

`git status --short` must be empty, and `npm pkg get dependencies.semiotic` must
print the exact published release version represented by the tag (for example,
`"3.8.0"`, never a range). If deploying from a reviewed release commit instead
of a tag, substitute that full commit SHA for `vX.Y.Z` only after confirming
that the wrapper's exact dependency and lockfile match the intended published
npm artifact. This keeps npm, the stable Cloud Run revision, registry metadata,
the surface manifest, and GitHub Release on one release identity.

### Why these flags

| Flag | Reason |
|---|---|
| `--allow-unauthenticated` | Public endpoint. The server is read-only (every tool is `readOnlyHint: true`) and now enforces a request-body ceiling (`MCP_MAX_BODY_BYTES`, default 4 MB), but you should still add rate limiting (e.g. Cloud Armor / API Gateway) to prevent abuse and unexpected rendering cost. |
| `--memory 1Gi` | Headroom for `sharp` PNG rendering. |
| `MCP_ALLOWED_HOSTS=...` | DNS-rebinding defense — the server rejects requests whose `Host` header isn't in this list. Set it to your Cloud Run hostname (and any custom domain, comma-separated). |

Because it's stateless, Cloud Run can scale it horizontally with default settings. It
scales to zero when idle (≈no cost; a few-second cold start on the next request). Optional:
add `--max-instances N` as a cost ceiling, or `--min-instances 1` to keep it always warm
(~$10–20/mo). Neither is required for correctness.

## Separate nightly deployment

`semiotic-mcp-nightly` in `us-central1` is the separate **nightly** channel. It is not
this wrapper and must not share this Buildpacks configuration. Nightly builds the
checked-out repository root with the deterministic Dockerfile and Cloud Build YAML in
[`../cloud-run-nightly`](../cloud-run-nightly), then updates only the image and
deployment labels on that new service. The existing `semiotic-mcp` service is
legacy and remains untouched until the nightly service passes hosted smoke tests.

The stable `semiotic-mcp-server` service remains manual/tagged-release only. Its deployment
path stays suitable for exact version parity between npm, the MCP Registry, the Cloud
Run stable endpoint, the surface manifest, and GitHub Releases.

## Endpoints

| Path | Method | Behavior |
|---|---|---|
| `/` , `/mcp` | POST | MCP Streamable HTTP (JSON-RPC). `/mcp` is the canonical URL to give clients; `POST /` is a compatibility alias. Returns a JSON response. Bodies or nested tool arguments over their configured limits get 413. |
| `/mcp` | GET | **405** (`Allow: POST`). Per the Streamable HTTP spec, a stateless server with no SSE stream rejects GET on the transport endpoint. |
| `/` | GET | 200 JSON info blob (human/service info — outside the MCP transport contract). |
| `/healthz`, `/health` | GET | 200 health JSON (for uptime checks). |
| `/.well-known/openai-apps-challenge` | GET | 200 plain-text OpenAI Apps domain verification token when `OPENAI_APPS_CHALLENGE_TOKEN` is set. |
| anything else (`/favicon.ico`, other `/.well-known/*` probes) | any | 404. The 404 on `/.well-known/oauth-protected-resource` is the correct signal that this is an unauthenticated server. |

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `8080` (Cloud Run sets this) | Listen port. |
| `MCP_HOST` | `127.0.0.1` | HTTP listen host. The start command deliberately overrides this with `--host 0.0.0.0` for Cloud Run ingress. |
| `MCP_TOOL_PROFILE` | `developer` | Tool surface. `--profile public` (set in `npm start`) overrides this to the five-tool public set. Prefer the flag; this env var is the fallback. |
| `MCP_ALLOWED_HOSTS` | unset (disabled) | Comma-separated `Host` allowlist (DNS-rebinding defense). Unset → no host check (fine for local dev). Set in production. |
| `MCP_ALLOWED_ORIGINS` | unset (disabled) | Comma-separated browser `Origin` allowlist. When set, a disallowed `Origin` is rejected (403) and CORS echoes only an allowed origin instead of `*`. Non-browser clients send no Origin and are unaffected. |
| `MCP_AUTH_TOKEN` | unset (disabled) | Optional bearer token required in `Authorization: Bearer <token>` for transport requests. Unset disables auth and preserves public health/challenge behavior. |
| `MCP_AUTH_SCHEME` | `Bearer` | Optional auth scheme matcher. Keep as `Bearer` unless your front proxy rewrites credentials. |
| `MCP_SUPPORTED_PROTOCOL_VERSIONS` | unset (disabled) | Optional comma-separated allowlist for inbound `MCP-Protocol-Version`. If unset, the server accepts any protocol value and still returns `MCP-Protocol-Version: 2024-11-05`. |
| `MCP_MAX_BODY_BYTES` | `4194304` (4 MB) | Hard request-body ceiling; larger bodies get 413 before any tool runs. |
| `MCP_MAX_ROWS` | `10000` | Maximum combined entries across all nested array-valued tool arguments. Requests over the ceiling get 413 before MCP dispatch. |
| `MCP_MAX_CELLS` | `100000` | Maximum combined object fields across nested tool arguments. Requests over the ceiling get 413 before MCP dispatch. |
| `MCP_MAX_NESTING_DEPTH` | `64` | Maximum nested argument depth. Requests over the ceiling get 413 before MCP dispatch. |
| `MCP_LOG_LEVEL` | `info` | Process log threshold: `info` records bounded completion metadata; `warn` records rejections/failures; `error` records failures; `silent` is an explicit process-level opt-out. |
| `MCP_LOG_MAX_EVENT_BYTES` | `1024` | Maximum UTF-8 bytes in one process log record. Values are clamped to 256–4096 bytes. |
| `MCP_LOG_RETENTION_DAYS` | `30` | Declared maximum retention policy, clamped to 1–90 days. This value is not self-enforcing; configure the Cloud Logging bucket/sink to match or shorten it. |
| `OPENAI_APPS_CHALLENGE_TOKEN` | unset | Raw token shown by ChatGPT Apps domain verification. When set, the server serves it from `/.well-known/openai-apps-challenge`. |
| `SEMIOTIC_DEPLOYMENT_CHANNEL` | `stable` when unset | Optional explicit build-identity channel. The released MCP server defaults any non-nightly value to stable. |
| `SEMIOTIC_GIT_SHA` | unset | Optional full release commit SHA for `/health` and `semiotic://build-info`. |
| `SEMIOTIC_BUILD_ID` | unset | Optional release/build identifier for build identity. |
| `SEMIOTIC_BUILD_TIME` | unset | Optional UTC ISO build timestamp for build identity. |

### Logging, redaction, and retention

The HTTP process emits newline-delimited JSON records using the
`semiotic-mcp-log/v1` schema. A record is deliberately limited to a fixed event
name and normalized operational metadata: severity, route category, HTTP method
category, status, duration, request byte count, and fixed rejection/error
reason codes. Each record is capped by `MCP_LOG_MAX_EVENT_BYTES`.

The process never serializes request headers (including `Authorization`,
cookies, or API keys), query strings, JSON-RPC bodies/IDs, tool names or
arguments, chart data/configuration/output, raw `Error` messages, or stack
traces. Unknown metadata fields are dropped by the logging boundary rather than
stringified. Semiotic does not include a telemetry exporter for these events;
adding one requires an explicit privacy and retention review.

`MCP_LOG_RETENTION_DAYS` expresses the deployment's maximum intended retention,
but application code cannot delete records already accepted by Cloud Logging or
other proxies. Before deployment, configure the provider's log bucket, sink,
and any request-log product to retain these records for no longer than the
declared value, and verify that setting operationally. Provider-level logs and
load-balancer logs are outside this process boundary and need the same review.

## Verify a ChatGPT Apps domain

In the OpenAI domain verification dialog, use the Cloud Run origin as the Challenge Base
URL, not the MCP path:

```
https://semiotic-mcp-server-481507046413.us-west1.run.app
```

Then put the dialog's token into Cloud Run without committing it:

```sh
gcloud run services update semiotic-mcp-server --region us-west1 \
  --update-env-vars "OPENAI_APPS_CHALLENGE_TOKEN=PASTE_TOKEN_HERE"
```

Check that Cloud Run is serving the token before clicking Verify:

```sh
curl https://YOUR-SERVICE-URL.run.app/.well-known/openai-apps-challenge
```

## Connect a client

```sh
# Claude Code
claude mcp add --transport http semiotic-cloud https://YOUR-URL.run.app/mcp
```

ChatGPT: add it as a connector / app using the `/mcp` URL.

## Updating

When a new `semiotic` is published, bump the pinned `semiotic` version in `package.json`,
generate and verify the lockfile as above, then re-run the same `gcloud run deploy` command.
Cloud Buildpacks will receive the committed lockfile and install the exact dependency graph.
If release provenance is available, set the `SEMIOTIC_*` build-identity variables with an
additive `gcloud run services update --update-env-vars ...` command after the manual stable
release deploy; this does not require building repository source and should never make the
stable service track `main`.
