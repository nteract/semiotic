# Semiotic nightly Cloud Run deployment

This directory is the repository-built **nightly** deployment path for
`semiotic-mcp-server` in `us-west1`. It is separate from
[`../cloud-run`](../cloud-run), which remains the stable release wrapper around
an exact published `semiotic` npm package. Do not repurpose that stable wrapper
to build repository source.

## Image build

The Node 22 Dockerfile uses the repository lockfile, then runs:

```sh
npm ci --include=dev
npm run check:ai-surface
npm run dist:prod
npm run build:mcp
```

The MCP bundle externalizes `semiotic/server`, `semiotic/ai`, and
`semiotic/geo`; it cannot render from a standalone MCP build. The surface
check rejects stale generated MCP/widget metadata, and `verify-runtime.mjs`
gates both the final image and Cloud Build before push.

Docker always builds from the repository root through an explicit source
allow-list, so local `node_modules`, prior output, and unrelated files cannot
enter the image. It starts:

```sh
node ai/dist/mcp-server.js --http --host 0.0.0.0 --port "${PORT:-8080}" --profile public
```

No released `semiotic` package is installed as application implementation. The
source-built image bakes `SEMIOTIC_DEPLOYMENT_CHANNEL`, `SEMIOTIC_GIT_SHA`,
`SEMIOTIC_BUILD_ID`, and `SEMIOTIC_BUILD_TIME` into its environment.

`cloudbuild.yaml` builds and pushes:

```text
us-west1-docker.pkg.dev/semiotic-mcp/cloud-run-source-deploy/semiotic/semiotic-mcp-server:$COMMIT_SHA
```

This is the existing service convention: the generated trigger's former
`$_AR_HOSTNAME/$_AR_PROJECT_ID/$_AR_REPOSITORY/$REPO_NAME/$_SERVICE_NAME`
expands to this same repository/image path. The nightly config makes it
explicit because it must push before updating Cloud Run; there is no image-path
deviation.

It updates only the nightly image and identity labels
(`commit-sha`, `gcb-build-id`, `gcb-trigger-id`) plus
`deployment-channel=nightly` and `deployment-source=repository-main`.
It does not replace service environment variables, secrets, IAM, ingress,
resources, scaling, concurrency, request timeout, or custom domains.

## Change the existing trigger after review

| Field | Value |
| --- | --- |
| Trigger name | `rmgpgab-semiotic-mcp-server-us-west1-nteract-semiotic--mafcz` |
| Trigger ID | `36c05cdd-221d-4c1b-a383-a8117cea4556` |
| Location | `global` — omit `--region` |
| Repository / branch | Existing GitHub `nteract/semiotic` connection, `^main$` |
| Build service account | `projects/semiotic-mcp/serviceAccounts/481507046413-compute@developer.gserviceaccount.com` |
| New config path | `deploy/cloud-run-nightly/cloudbuild.yaml` |

The current trigger stores a generated inline **Buildpacks** build whose Pack
step uses `--path=deploy/cloud-run`. Replace only that inline build with the
checked-in YAML. Do not set `deploy/cloud-run-nightly` as a source directory:
the YAML deliberately runs `docker build ... .` from the repository root.

```sh
PROJECT_ID=semiotic-mcp
TRIGGER_NAME=rmgpgab-semiotic-mcp-server-us-west1-nteract-semiotic--mafcz
TRIGGER_ID=36c05cdd-221d-4c1b-a383-a8117cea4556
BUILD_CONFIG=deploy/cloud-run-nightly/cloudbuild.yaml

gcloud builds triggers describe "$TRIGGER_NAME" --project="$PROJECT_ID" \
  --format='yaml(name,id,github,serviceAccount,substitutions,filename,build)'
```

The describe command confirms the exact existing build service account. Preserve
that account, GitHub connection, `^main$` rule, and substitutions.

To stage safely, pause only this nightly trigger with a non-matching branch:

```sh
gcloud builds triggers update github "$TRIGGER_NAME" --project="$PROJECT_ID" \
  --branch-pattern='^__semiotic_nightly_paused__$'
```

After the reviewed repository files are on `main`, replace the generated
Buildpacks configuration. `_TRIGGER_ID` already exists on the trigger; retain
the actual UUID rather than the checked-in `manual` default:

```sh
gcloud builds triggers update github "$TRIGGER_NAME" --project="$PROJECT_ID" \
  --build-config="$BUILD_CONFIG" \
  --branch-pattern='^__semiotic_nightly_paused__$' \
  --update-substitutions="_TRIGGER_ID=$TRIGGER_ID"

gcloud builds triggers describe "$TRIGGER_NAME" --project="$PROJECT_ID" \
  --format='yaml(filename,github.push.branch,serviceAccount,substitutions)'
```

Do not pass `--repo-owner`, `--repo-name`, `--repository`,
`--service-account`, `--clear-substitutions`, or Dockerfile/Buildpacks flags
to that update: omitting them preserves the existing connection and unrelated
settings.

Run one manual test from the checked-out `main` while automatic matching is
still paused. It uses the existing trigger service account and runs the
post-deployment smoke test:

```sh
gcloud builds triggers run "$TRIGGER_NAME" --project="$PROJECT_ID" --branch=main

gcloud builds list --project="$PROJECT_ID" \
  --filter="buildTriggerId=$TRIGGER_ID" --sort-by='~createTime' --limit=1

gcloud run services describe semiotic-mcp-server --project="$PROJECT_ID" \
  --region=us-west1 \
  --format='yaml(status.latestReadyRevisionName,spec.template.spec.containers[0].image,spec.template.metadata.labels)'
```

The image must end in the tested commit SHA. Labels must include
`commit-sha`, `gcb-build-id`, `gcb-trigger-id`,
`deployment-channel=nightly`, and `deployment-source=repository-main`.
Use the hosted smoke script to inspect `/health`, `/healthz`, initialize
metadata, and `semiotic://build-info`. Its default canonical `status.url`
host must remain allowed by `MCP_ALLOWED_HOSTS`; for a future
custom-domain-only allowlist, smoke an allowed public endpoint instead of
changing that environment variable in this deployment.

Re-enable only after the test is accepted:

```sh
gcloud builds triggers update github "$TRIGGER_NAME" --project="$PROJECT_ID" \
  --branch-pattern='^main$'
```

To disable nightly later, restore the no-match branch pattern above. It affects
only this trigger, does not delete either service, and does not change stable
traffic.

## IAM, logging, and rollback

Retrieve the trigger's build identity locally:

```sh
BUILD_SERVICE_ACCOUNT="$(gcloud builds triggers describe "$TRIGGER_NAME" \
  --project="$PROJECT_ID" --format='value(serviceAccount)')"
printf '%s\n' "$BUILD_SERVICE_ACCOUNT"
```

For least privilege, give that account `roles/artifactregistry.writer` on the
existing `us-west1` `cloud-run-source-deploy` repository (it also supplies the
image-read permission), `roles/run.developer` on `semiotic-mcp-server`, and
`roles/iam.serviceAccountUser` on the service's runtime identity. The developer
role supplies the service update/read permissions used by deployment and smoke
endpoint discovery. The Cloud Run service agent must retain Artifact Registry
Reader access to the same repository (normally already present for a same-
project service). `CLOUD_LOGGING_ONLY` also needs `roles/logging.logWriter`
when it is not already supplied by the build role. `roles/run.admin` works but
is broader than needed. The human making these changes needs the corresponding
Cloud Build trigger-update/run permissions.

For a nightly rollback, prefer earlier revision traffic so its baked identity
stays coherent:

```sh
gcloud run revisions list --service=semiotic-mcp-server --project="$PROJECT_ID" \
  --region=us-west1 --sort-by='~metadata.creationTimestamp'

gcloud run services update-traffic semiotic-mcp-server --project="$PROJECT_ID" \
  --region=us-west1 --to-revisions=EARLIER_READY_REVISION=100
```

If a new revision is required, retrieve the earlier immutable image digest, then
use `gcloud run services update` with only `--image=IMAGE@sha256:...` and
matching identity labels. Never use `--set-env-vars`, `--clear-env-vars`,
`--clear-labels`, or resource flags for this rollback.

`legacy-buildpacks-cloudbuild.yaml` is the exact prior generated Buildpacks
configuration, retained only for trigger rollback. Restore it with:

```sh
gcloud builds triggers update github "$TRIGGER_NAME" --project="$PROJECT_ID" \
  --inline-config=deploy/cloud-run-nightly/legacy-buildpacks-cloudbuild.yaml \
  --branch-pattern='^main$' \
  --update-substitutions="_TRIGGER_ID=$TRIGGER_ID"
```

That restores the old Pack Buildpacks path at `deploy/cloud-run`; it does not
change the stable Cloud Run service.
