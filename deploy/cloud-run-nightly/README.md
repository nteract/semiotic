# Semiotic nightly Cloud Run deployment

This directory deploys the repository-built **nightly** MCP service:

| Channel | Service | Region | Source |
| --- | --- | --- | --- |
| Official/stable | `semiotic-mcp-server` | `us-west1` | Exact published `semiotic` npm release via [`../cloud-run`](../cloud-run) |
| Nightly | `semiotic-mcp-nightly` | `us-central1` | Checked-out repository `main` source |
| Legacy | `semiotic-mcp` | Existing service | Leave untouched until nightly passes hosted smoke tests |

Only `semiotic-mcp-nightly` is in scope for this configuration. Never update,
attach a trigger to, delete, or copy settings from either existing service.

## Image and source-build contract

The expected nightly image is:

```text
us-central1-docker.pkg.dev/semiotic-mcp/cloud-run-source-deploy/semiotic/semiotic-mcp-nightly:$COMMIT_SHA
```

The Node 22 Dockerfile builds from the repository root with an explicit source
allow-list and runs:

```sh
npm ci --include=dev
npm run check:ai-surface
npm run dist:prod
npm run build:mcp
```

The final image is runtime-verified before push. It starts the five-tool public
MCP profile:

```sh
node ai/dist/mcp-server.js --http --host 0.0.0.0 --port "${PORT:-8080}" --profile public
```

The immutable image bakes in the nightly build identity environment values:
`SEMIOTIC_DEPLOYMENT_CHANNEL=nightly`, `SEMIOTIC_GIT_SHA`,
`SEMIOTIC_BUILD_ID`, and `SEMIOTIC_BUILD_TIME`. Do not override those values
as Cloud Run service environment variables, because later image-only updates
must report the new commit and build identity.

## First deployment: safe two-stage service creation

`semiotic-mcp-nightly` is new. Its initial settings cannot be inherited from
either existing service. Supply and review all of these values before the first
build:

- `ingress=all`, followed by public unauthenticated invocation only after the
  host-valid revision is ready;
- runtime service account (the account email is required, not guessed);
- CPU `1`, memory `1Gi`, request timeout `300s`, concurrency `80`, minimum
  instances `0`, and maximum instances `3` (change only through a reviewed
  substitution); and
- `MCP_ALLOWED_HOSTS`, which must contain the generated Cloud Run hostname.

The build solves the hostname bootstrap without ever serving a public revision
with host validation disabled:

1. It creates the service privately with `MCP_ALLOWED_HOSTS=bootstrap.invalid`
   and the explicit initial service settings. Cloud Run does not support
   `--no-traffic` when creating a service, so this command deliberately omits
   both `--no-traffic` and `--allow-unauthenticated`.
2. It reads `status.url`, requires an HTTPS `*.run.app` URL, and validates the
   extracted hostname.
3. It creates a host-valid revision with that exact hostname in
   `MCP_ALLOWED_HOSTS`.
4. It routes traffic to that latest host-valid revision.
5. Only then it enables public invocation with `--no-invoker-iam-check`.
6. It resolves the endpoint and runs the hosted smoke test.

For a first manual build, work from the reviewed repository commit. Substitute
the approved runtime service-account email; do not use either existing
service's account without an IAM review.

```sh
PROJECT_ID=semiotic-mcp
GIT_SHA="$(git rev-parse HEAD)"
RUNTIME_SERVICE_ACCOUNT=APPROVED_RUNTIME_SERVICE_ACCOUNT

gcloud builds submit . \
  --project="$PROJECT_ID" \
  --config=deploy/cloud-run-nightly/cloudbuild.yaml \
  --substitutions="COMMIT_SHA=$GIT_SHA,_TRIGGER_ID=manual,_NIGHTLY_RUNTIME_SERVICE_ACCOUNT=$RUNTIME_SERVICE_ACCOUNT,_NIGHTLY_CPU=1,_NIGHTLY_MEMORY=1Gi,_NIGHTLY_TIMEOUT=300s,_NIGHTLY_CONCURRENCY=80,_NIGHTLY_MIN_INSTANCES=0,_NIGHTLY_MAX_INSTANCES=3,_NIGHTLY_BOOTSTRAP_HOST=bootstrap.invalid"
```

The create/update step in that build runs the following update for an existing
nightly service; it changes only the image and nightly identity labels:

```sh
gcloud run services update semiotic-mcp-nightly \
  --project=semiotic-mcp \
  --region=us-central1 \
  --image=us-central1-docker.pkg.dev/semiotic-mcp/cloud-run-source-deploy/semiotic/semiotic-mcp-nightly:$COMMIT_SHA \
  --update-labels=commit-sha=$COMMIT_SHA,gcb-build-id=$BUILD_ID,gcb-trigger-id=${_TRIGGER_ID},deployment-channel=nightly,deployment-source=repository-main \
  --quiet
```

Do not run either command as part of this repository change.

For clarity, the first-create branch inside that build is this exact sequence;
it is private until the final command:

```sh
gcloud run deploy semiotic-mcp-nightly \
  --project=semiotic-mcp --region=us-central1 \
  --image=us-central1-docker.pkg.dev/semiotic-mcp/cloud-run-source-deploy/semiotic/semiotic-mcp-nightly:$COMMIT_SHA \
  --service-account="$RUNTIME_SERVICE_ACCOUNT" \
  --ingress=all --cpu=1 --memory=1Gi --timeout=300s --concurrency=80 \
  --min-instances=0 --max-instances=3 \
  --set-env-vars="MCP_ALLOWED_HOSTS=bootstrap.invalid" \
  --update-labels="commit-sha=$COMMIT_SHA,gcb-build-id=$BUILD_ID,gcb-trigger-id=manual,deployment-channel=nightly,deployment-source=repository-main" \
  --quiet

NIGHTLY_URL="$(gcloud run services describe semiotic-mcp-nightly \
  --project=semiotic-mcp --region=us-central1 --format='value(status.url)')"
NIGHTLY_HOST="${NIGHTLY_URL#https://}"
case "$NIGHTLY_URL" in
  https://*.run.app) ;;
  *) echo "Cloud Run did not return a generated HTTPS run.app URL" >&2; exit 1 ;;
esac
case "$NIGHTLY_HOST" in
  "" | .* | *. | *[!A-Za-z0-9.-]*) echo "Cloud Run returned an invalid hostname" >&2; exit 1 ;;
esac

gcloud run services update semiotic-mcp-nightly \
  --project=semiotic-mcp --region=us-central1 \
  --update-env-vars="MCP_ALLOWED_HOSTS=$NIGHTLY_HOST" \
  --update-labels="commit-sha=$COMMIT_SHA,gcb-build-id=$BUILD_ID,gcb-trigger-id=manual,deployment-channel=nightly,deployment-source=repository-main" \
  --quiet
gcloud run services update-traffic semiotic-mcp-nightly \
  --project=semiotic-mcp --region=us-central1 --to-latest --quiet
gcloud run services update semiotic-mcp-nightly \
  --project=semiotic-mcp --region=us-central1 --no-invoker-iam-check --quiet
```

### Find and confirm the generated hostname

After the first build succeeds, retrieve the URL and host explicitly:

```sh
NIGHTLY_URL="$(gcloud run services describe semiotic-mcp-nightly \
  --project=semiotic-mcp --region=us-central1 --format='value(status.url)')"
NIGHTLY_HOST="${NIGHTLY_URL#https://}"
printf '%s\n%s\n' "$NIGHTLY_URL" "$NIGHTLY_HOST"
```

The build already creates the host-valid revision, routes traffic to it, and
only then enables public invocation. If a manual recovery is needed before
public access is enabled, use only the new service:

```sh
gcloud run services update semiotic-mcp-nightly \
  --project=semiotic-mcp --region=us-central1 \
  --update-env-vars="MCP_ALLOWED_HOSTS=$NIGHTLY_HOST"
gcloud run services update-traffic semiotic-mcp-nightly \
  --project=semiotic-mcp --region=us-central1 --to-latest
gcloud run services update semiotic-mcp-nightly \
  --project=semiotic-mcp --region=us-central1 --no-invoker-iam-check --quiet
```

Never leave `MCP_ALLOWED_HOSTS` unset, and never set it to a stable or legacy
service hostname.

## Verify the manually deployed service

The post-deployment smoke test uses `/health` as the canonical Cloud Run health
endpoint, then exercises `GET /mcp` (405), `initialize`, `tools/list`,
`resources/list`, `resources/read` for `semiotic://build-info`, and a
`createChart` render:

```sh
node scripts/smoke-hosted-mcp.mjs \
  --endpoint "$NIGHTLY_URL" \
  --expected-channel nightly \
  --expected-sha "$GIT_SHA" \
  --expected-build-id CLOUD_BUILD_ID
```

Use the Cloud Build ID printed by the first-build output. The Cloud Build
configuration runs this same smoke test automatically after every deployment.
Do not enable automatic deployment until this manual smoke passes.

## Enable automation only after validation

Repository files do not establish whether a Cloud Build trigger already exists
for `semiotic-mcp-nightly`. Before creating or updating one, inspect the
following Google Cloud state read-only:

```sh
gcloud builds triggers list --project=semiotic-mcp \
  --format='table(name,id,github.push.branch,filename,serviceAccount,disabled)'

gcloud run services describe semiotic-mcp-nightly --project=semiotic-mcp \
  --region=us-central1 \
  --format='yaml(metadata.labels,status.url,spec.template.spec.serviceAccountName,spec.template.spec.containers[0].resources)'

gcloud artifacts repositories describe cloud-run-source-deploy \
  --project=semiotic-mcp --location=us-central1 \
  --format='yaml(name,format,location)'
```

Confirm the trigger's exact name/ID, location, GitHub connection and repository,
`^main$` push rule, enabled state, repository-root config filename, build
service account, substitutions, and approval/filter settings. Confirm that the
build account can write the `us-central1` Artifact Registry repository, update
only `semiotic-mcp-nightly`, impersonate the approved runtime service account,
and write Cloud Logging.

If no such trigger exists, create a new clearly named one for
`semiotic-mcp-nightly` only after the manual smoke passes. It must use
`deploy/cloud-run-nightly/cloudbuild.yaml`, pass its real trigger ID as
`_TRIGGER_ID`, and supply the reviewed initial-service substitutions above.
Do not repurpose a stable or legacy trigger.

## Rollback and legacy retirement

Roll back only `semiotic-mcp-nightly` in `us-central1`, either to a known-good
revision or an immutable image digest with matching nightly labels. The archived
[`historical-stable-buildpacks-cloudbuild.yaml`](./historical-stable-buildpacks-cloudbuild.yaml)
targets the stable service and is never a nightly rollback option.

Leave `semiotic-mcp` running and untouched until `semiotic-mcp-nightly` passes
the hosted smoke test and its public endpoint has been accepted. Deleting the
legacy service, if desired, is a separate manual follow-up and is not part of
this deployment or trigger workflow.
