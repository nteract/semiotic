# Semiotic MCP on Google Cloud Run

A thin wrapper that runs the published `semiotic-mcp` server in HTTP (Streamable HTTP)
mode as a public, remote MCP server — consumable by ChatGPT, Claude connectors, and any
MCP client.

There is **no Dockerfile**. Cloud Run builds this folder's `package.json` directly from
source (Cloud Buildpacks) and runs `npm start`, which launches:

```
semiotic-mcp --http --port $PORT
```

The server runs in **stateless** mode: each request gets a fresh MCP server instance and
holds no session state. Every tool is an independent read-only request/response, so there
is nothing to keep between calls — which is what lets it autoscale on Cloud Run with no
session affinity or single-instance pin.

The wrapper depends on the **published** `semiotic` package from npm — it does not build
from this repo's source. Improvements to the MCP server ship to the live endpoint only
after a new `semiotic` version is published to npm.

## Deploy

```sh
cd deploy/cloud-run
gcloud run deploy semiotic-mcp --source . --region us-central1 \
  --allow-unauthenticated --memory 1Gi \
  --set-env-vars "MCP_ALLOWED_HOSTS=semiotic-mcp-481507046413.us-central1.run.app"
```

First run will prompt to enable the Cloud Run / Cloud Build / Artifact Registry APIs —
answer yes. The command prints the service URL when it finishes.

### Why these flags

| Flag | Reason |
|---|---|
| `--allow-unauthenticated` | Public endpoint. The server is read-only (every tool is `readOnlyHint: true`), but you should still add request size caps + rate limiting (e.g. Cloud Armor / API Gateway) to prevent abuse and unexpected rendering cost. |
| `--memory 1Gi` | Headroom for `sharp` PNG rendering. |
| `MCP_ALLOWED_HOSTS=...` | DNS-rebinding defense — the server rejects requests whose `Host` header isn't in this list. Set it to your Cloud Run hostname (and any custom domain, comma-separated). |

Because it's stateless, Cloud Run can scale it horizontally with default settings. It
scales to zero when idle (≈no cost; a few-second cold start on the next request). Optional:
add `--max-instances N` as a cost ceiling, or `--min-instances 1` to keep it always warm
(~$10–20/mo). Neither is required for correctness.

## Continuous deployment (us-west1)

In addition to the manually-deployed `us-central1` service above, a second service —
**`semiotic-mcp-server`** in **`us-west1`** — auto-deploys on every push to `main` via a Cloud
Build trigger (`rmgpgab-semiotic-mcp-server-…`). It builds the **same way** as the manual
deploy — Cloud Buildpacks, no Dockerfile — so two trigger settings are load-bearing:

| Setting | Must be | Why |
|---|---|---|
| Build type | **Buildpacks**, not Dockerfile | There is no Dockerfile in this repo. A Dockerfile build fails immediately with `lstat /workspace/Dockerfile: no such file or directory`. |
| Build context / source directory | **`deploy/cloud-run`**, not the repo root | The root `package.json`'s `start` script is the docs website (`parcel serve`), not the MCP server. |

If the trigger is ever recreated, set both in the Cloud Run console (service → *Edit continuous
deployment* → Build type: buildpacks, Build context directory: `/deploy/cloud-run`). The
`us-central1` service has no trigger — deploy it manually with the command above.

## Endpoints

| Path | Method | Behavior |
|---|---|---|
| `/` , `/mcp` | POST | MCP Streamable HTTP (JSON-RPC). `/mcp` is the canonical URL to give clients. Returns a JSON response. |
| `/` , `/mcp` | GET | 200 JSON info blob (for humans/browsers — stateless mode has no session SSE stream). |
| `/healthz`, `/health` | GET | 200 health JSON (for uptime checks). |
| `/.well-known/openai-apps-challenge` | GET | 200 plain-text OpenAI Apps domain verification token when `OPENAI_APPS_CHALLENGE_TOKEN` is set. |
| anything else (`/favicon.ico`, other `/.well-known/*` probes) | any | 404. The 404 on `/.well-known/oauth-protected-resource` is the correct signal that this is an unauthenticated server. |

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `8080` (Cloud Run sets this) | Listen port. |
| `MCP_ALLOWED_HOSTS` | unset (disabled) | Comma-separated `Host` allowlist. Unset → no host check (fine for local dev). Set in production. |
| `OPENAI_APPS_CHALLENGE_TOKEN` | unset | Raw token shown by ChatGPT Apps domain verification. When set, the server serves it from `/.well-known/openai-apps-challenge`. |

## Verify a ChatGPT Apps domain

In the OpenAI domain verification dialog, use the Cloud Run origin as the Challenge Base
URL, not the MCP path:

```
https://semiotic-mcp-481507046413.us-central1.run.app
```

Then put the dialog's token into Cloud Run without committing it:

```sh
gcloud run services update semiotic-mcp --region us-central1 \
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

When a new `semiotic` is published, re-run the same `gcloud run deploy` command — the
build does a fresh `npm install` and picks up the latest `^3.7.5`-compatible release.
