# Hosted Semiotic MCP deployment channels

Semiotic has two intentionally separate hosted MCP channels. They have the
same five-tool public profile, but they are different servers with different
provenance and compatibility expectations.

| Channel | Cloud Run service | Source | Deployment trigger | Intended users |
| --- | --- | --- | --- | --- |
| Stable | `semiotic-mcp-server` (`us-west1`) | Exact published npm release | Manual/tagged release | Public users and registries |
| Nightly | `semiotic-mcp-nightly` (`us-central1`) | Repository `main` commit | Automatic after merge, after manual smoke approval | Maintainers and live validation |
| Legacy | `semiotic-mcp` | Existing deployment | None in this workflow | Leave untouched until nightly verification completes |

The stable implementation is [`cloud-run`](./cloud-run/). It is a thin,
release-oriented wrapper: it installs an exact published `semiotic` npm
version and starts that package's `semiotic-mcp` binary. It must never be
changed to build arbitrary repository commits. A stable release is the only
channel that may be advertised through the MCP Registry, ChatGPT/App
directories, documentation, or other public discovery channels.

The nightly implementation is
[`cloud-run-nightly`](./cloud-run-nightly/). It builds the checked-out
repository with Node.js 22 and runs the resulting source-built MCP bundle.
Nightly is deliberately not covered by the stable compatibility guarantee: it
can change between commits and must never be submitted as the official MCP
Registry endpoint.

## Client configuration

Configure the endpoints as distinct MCP servers even though both expose the
same public tool names:

```json
{
  "mcpServers": {
    "Semiotic": {
      "url": "https://STABLE-SERVICE-URL/mcp"
    },
    "Semiotic Nightly": {
      "url": "https://NIGHTLY-SERVICE-URL/mcp"
    }
  }
}
```

The MCP initialize response makes this distinction machine-visible: stable
uses the `semiotic` server name and its exact package version; nightly uses
`semiotic-nightly` and a version such as `3.8.1-nightly+00db062`. No `channel`
argument is added to `tools/call`: server selection is transport-level
identity, and making a tool argument choose a channel would let an individual
request misrepresent the server that actually executed it.

## Inspect a deployment

`GET /health` returns server health and deployment identity. A repository-built
nightly response has this shape (the values are illustrative):

```json
{
  "status": "ok",
  "name": "semiotic-mcp",
  "version": "3.8.1",
  "transport": "streamable-http",
  "mode": "stateless",
  "channel": "nightly",
  "packageVersion": "3.8.1",
  "surfaceVersion": "3.8.1-ai",
  "commitSha": "00db062e9ed42be02a9c4f59dbf8396ebd1712cd",
  "buildId": "CLOUD_BUILD_ID",
  "builtAt": "2026-07-13T12:34:56Z"
}
```

Use MCP `resources/read` with `{"uri":"semiotic://build-info"}` for the
corresponding structured identity:

```json
{
  "channel": "nightly",
  "packageVersion": "3.8.1",
  "surfaceVersion": "3.8.1-ai",
  "commitSha": "00db062e9ed42be02a9c4f59dbf8396ebd1712cd",
  "shortCommitSha": "00db062",
  "buildId": "CLOUD_BUILD_ID",
  "builtAt": "2026-07-13T12:34:56Z",
  "toolProfile": "public",
  "nodeVersion": "v22.x.x"
}
```

Stable reports the same structural fields with `channel: "stable"` and the
exact published package version. It may omit Git/build fields when the release
deployment genuinely has no provenance metadata; a release deployment can set
`SEMIOTIC_GIT_SHA`, `SEMIOTIC_BUILD_ID`, and `SEMIOTIC_BUILD_TIME` without
requiring the wrapper to build this repository.

Run the hosted nightly contract check after a deployment:

```sh
node scripts/smoke-hosted-mcp.mjs \
  --endpoint https://NIGHTLY-SERVICE-URL \
  --expected-channel nightly \
  --expected-sha FULL_COMMIT_SHA \
  --expected-build-id CLOUD_BUILD_ID
```

It uses bounded readiness retries and emits only a compact result by default.
Use `--verbose` only for deliberate debugging because it can print truncated
response bodies.

## Operational boundaries

Nightly remains publicly reachable for now, without `MCP_AUTH_TOKEN`, and
retains its existing `MCP_ALLOWED_HOSTS` configuration. The deployment flow
does not relax request-size limits, cancellation behavior, concurrency,
scaling, request timeout, memory, CPU, ingress, IAM, secrets, or custom-domain
settings. It writes only bounded metadata to Cloud Logging; application logs
must not include prompts, chart data, SVG, props, authorization headers, user
identifiers, or request bodies.

No nightly-specific rate limiting or cost ceiling is introduced here. If it is
needed, add provider-level infrastructure such as Cloud Armor, API Gateway, or
Cloud Run instance limits through a separate reviewed change rather than an
application-level substitute.

## Rollback and promotion

To roll back **nightly**, either send all nightly traffic to a previously known
good revision, or update only the nightly service image to a previously known
Artifact Registry digest. These actions do not alter the stable
`semiotic-mcp-server` service:

```sh
gcloud run revisions list --project semiotic-mcp --region us-central1 \
  --service semiotic-mcp-nightly

gcloud run services update-traffic semiotic-mcp-nightly \
  --project semiotic-mcp --region us-central1 \
  --to-revisions=KNOWN_GOOD_REVISION=100
```

For an image-digest rollback, use `gcloud run services update` with only
`--image=...@sha256:...` and the matching provenance labels; do not use a
service-replacement command or copy settings from the stable service. The
nightly deployment README has the exact image path and trigger procedure.

To promote a validated nightly commit, make a normal stable patch release from
that commit: tag and publish the exact npm package, update the exact
`semiotic` version and lockfile in `deploy/cloud-run`, run the release checks,
then manually deploy `semiotic-mcp-server`. Update the registry/surface manifest and
GitHub Release as the same release operation. Promotion is never an image copy
from nightly and never changes stable traffic automatically.

To pause nightly automation without affecting stable, disable only its Cloud
Build trigger; do not delete either Cloud Run service. The exact reversible
trigger procedure is in
[`cloud-run-nightly/README.md`](./cloud-run-nightly/README.md).
