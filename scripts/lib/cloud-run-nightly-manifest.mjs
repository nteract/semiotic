/**
 * Static checks for the repository-built nightly Cloud Run deployment.
 *
 * The YAML is intentionally checked as narrow deployment data instead of being
 * interpreted or deployed in tests. This protects the important distinction:
 * the stable wrapper consumes an exact published package, while nightly builds
 * this repository and updates only the existing nightly service image/labels.
 */

export const NIGHTLY_IMAGE =
  "us-central1-docker.pkg.dev/semiotic-mcp/cloud-run-source-deploy/semiotic/semiotic-mcp-nightly:$COMMIT_SHA"
export const NIGHTLY_SERVICE = "semiotic-mcp-nightly"
export const NIGHTLY_REGION = "us-central1"

function has(source, fragment) {
  return typeof source === "string" && source.includes(fragment)
}

function requireFragment(errors, source, fragment, message) {
  if (!has(source, fragment)) errors.push(message)
}

function inOrder(source, fragments) {
  let position = -1
  for (const fragment of fragments) {
    position = source.indexOf(fragment, position + 1)
    if (position === -1) return false
  }
  return true
}

function between(source, start, end) {
  const startIndex = source.indexOf(start)
  if (startIndex === -1) return ""
  const endIndex = source.indexOf(end, startIndex)
  return endIndex === -1 ? "" : source.slice(startIndex, endIndex)
}

/**
 * Validate the checked-in Dockerfile, Cloud Build configuration, final-image
 * verifier, and archived stable Buildpacks payload. Inputs are strings to
 * make regression tests safe and completely independent of Google Cloud
 * access.
 */
export function validateNightlyCloudRunDeployment({
  dockerfile,
  cloudbuild,
  verifier,
  historicalStableBuildpacks,
  activeHealthAliasReferences = []
}) {
  const errors = []

  if (activeHealthAliasReferences.length > 0) {
    errors.push(
      `unsupported legacy health endpoint references: ${activeHealthAliasReferences.join(", ")}`
    )
  }

  if (typeof dockerfile !== "string") {
    errors.push("deploy/cloud-run-nightly/Dockerfile must be readable")
  } else {
    const node22Stages =
      dockerfile.match(/FROM node:22-bookworm-slim AS /g) ?? []
    if (node22Stages.length < 2) {
      errors.push(
        "nightly Dockerfile must use Node.js 22 for both build and runtime stages"
      )
    }
    requireFragment(
      errors,
      dockerfile,
      "COPY package.json package-lock.json .npmrc ./",
      "nightly Dockerfile must copy the repository package manifest, lockfile, and npm configuration before install"
    )
    requireFragment(
      errors,
      dockerfile,
      "RUN npm ci --include=dev",
      "nightly Dockerfile must install exact lockfile dependencies with npm ci"
    )
    for (const fragment of [
      "COPY src ./src",
      "COPY ai ./ai",
      "scripts/build.mjs",
      "scripts/build-mcp.mjs",
      "scripts/generate-ai-surface-manifest.mjs",
      "COPY tsconfig.json tsconfig.declarations.json ./"
    ]) {
      requireFragment(
        errors,
        dockerfile,
        fragment,
        `nightly Dockerfile is missing required repository build input: ${fragment}`
      )
    }
    if (
      !inOrder(dockerfile, [
        "npm run check:ai-surface",
        "npm run dist:prod",
        "npm run build:mcp"
      ])
    ) {
      errors.push(
        "nightly Dockerfile must check the generated AI surface, build package runtime artifacts, then build the MCP executable"
      )
    }
    for (const fragment of [
      "COPY --from=build /app/node_modules ./node_modules",
      "COPY --from=build /app/dist ./dist",
      "COPY --from=build /app/ai ./ai",
      "ARG SEMIOTIC_DEPLOYMENT_CHANNEL=nightly",
      "ARG SEMIOTIC_GIT_SHA",
      "ARG SEMIOTIC_BUILD_ID",
      "ARG SEMIOTIC_BUILD_TIME",
      'SEMIOTIC_DEPLOYMENT_CHANNEL="${SEMIOTIC_DEPLOYMENT_CHANNEL}"',
      'SEMIOTIC_GIT_SHA="${SEMIOTIC_GIT_SHA}"',
      'SEMIOTIC_BUILD_ID="${SEMIOTIC_BUILD_ID}"',
      'SEMIOTIC_BUILD_TIME="${SEMIOTIC_BUILD_TIME}"',
      "RUN node deploy/cloud-run-nightly/verify-runtime.mjs --require-nightly-build-info",
      'node ai/dist/mcp-server.js --http --host 0.0.0.0 --port \\"${PORT:-8080}\\" --profile public'
    ]) {
      requireFragment(
        errors,
        dockerfile,
        fragment,
        `nightly Dockerfile is missing required runtime contract: ${fragment}`
      )
    }
    if (/npm\s+(?:install|i)\s+[^\n]*\bsemiotic\b/.test(dockerfile)) {
      errors.push(
        "nightly Dockerfile must not install a published semiotic package as its application implementation"
      )
    }
  }

  if (typeof verifier !== "string") {
    errors.push("deploy/cloud-run-nightly/verify-runtime.mjs must be readable")
  } else {
    for (const fragment of [
      '"ai/dist/mcp-server.js"',
      '"dist/server.min.js"',
      '"dist/semiotic-ai.min.js"',
      '"dist/geo.min.js"',
      '"ai/surface-manifest.json"',
      '"ai/system-prompt.md"',
      '"ai/examples.md"',
      '"unexpected-published-semiotic-package"',
      'requireFromRoot("semiotic/server")',
      'requireFromRoot("semiotic/ai")',
      'requireFromRoot("semiotic/geo")',
      '"--require-nightly-build-info"'
    ]) {
      requireFragment(
        errors,
        verifier,
        fragment,
        `nightly runtime verifier is missing required artifact/self-import check: ${fragment}`
      )
    }
  }

  if (typeof cloudbuild !== "string") {
    errors.push("deploy/cloud-run-nightly/cloudbuild.yaml must be readable")
  } else {
    for (const fragment of [
      "_TRIGGER_ID: manual",
      "_NIGHTLY_RUNTIME_SERVICE_ACCOUNT: REQUIRED",
      "_NIGHTLY_BOOTSTRAP_HOST: bootstrap.invalid",
      "id: build-nightly-image",
      "docker build \\",
      "--file deploy/cloud-run-nightly/Dockerfile",
      `--tag ${NIGHTLY_IMAGE}`,
      "--build-arg SEMIOTIC_DEPLOYMENT_CHANNEL=nightly",
      "--build-arg SEMIOTIC_GIT_SHA=$COMMIT_SHA",
      "--build-arg SEMIOTIC_BUILD_ID=$BUILD_ID",
      "--build-arg SEMIOTIC_BUILD_TIME=$$build_time",
      "id: verify-nightly-runtime-image",
      "--require-nightly-build-info",
      "id: push-nightly-image",
      "- push",
      "id: create-or-update-nightly-revision",
      `service=${NIGHTLY_SERVICE}`,
      `region=${NIGHTLY_REGION}`,
      `image=${NIGHTLY_IMAGE}`,
      'gcloud run services update "$$service"',
      'gcloud run deploy "$$service"',
      '--service-account="${_NIGHTLY_RUNTIME_SERVICE_ACCOUNT}"',
      "--ingress=all",
      '--set-env-vars="MCP_ALLOWED_HOSTS=${_NIGHTLY_BOOTSTRAP_HOST}"',
      'case "$$endpoint" in',
      "https://*.run.app)",
      'hostname="$${endpoint#https://}"',
      '--update-env-vars="MCP_ALLOWED_HOSTS=$$hostname"',
      'gcloud run services update-traffic "$$service"',
      "--to-latest",
      "--no-invoker-iam-check",
      "labels=commit-sha=$COMMIT_SHA,gcb-build-id=$BUILD_ID,gcb-trigger-id=${_TRIGGER_ID},deployment-channel=nightly,deployment-source=repository-main",
      '--update-labels="$$labels"',
      "node scripts/smoke-hosted-mcp.mjs",
      "--expected-channel nightly",
      '--expected-sha "$COMMIT_SHA"',
      '--expected-build-id "$BUILD_ID"',
      "timeout: 1800s",
      "logging: CLOUD_LOGGING_ONLY"
    ]) {
      requireFragment(
        errors,
        cloudbuild,
        fragment,
        `nightly Cloud Build configuration is missing required deployment contract: ${fragment}`
      )
    }
    if (
      !inOrder(cloudbuild, [
        "id: build-nightly-image",
        "id: verify-nightly-runtime-image",
        "id: push-nightly-image",
        "id: create-or-update-nightly-revision",
        "id: smoke-nightly-deployment"
      ])
    ) {
      errors.push(
        "nightly Cloud Build steps must build, verify, push, deploy, then smoke test in that order"
      )
    }
    const existingServiceUpdate = between(
      cloudbuild,
      'if gcloud run services describe "$$service"',
      "exit 0"
    )
    if (!existingServiceUpdate) {
      errors.push(
        "nightly Cloud Build must retain an existing-service image-only update branch"
      )
    } else {
      for (const forbidden of [
        "--set-env-vars",
        "--update-env-vars",
        "--clear-env-vars",
        "--set-secrets",
        "--update-secrets",
        "--clear-secrets",
        "--clear-labels",
        "--labels=",
        "--memory=",
        "--cpu=",
        "--concurrency=",
        "--timeout=",
        "--min-instances=",
        "--max-instances=",
        "--service-account=",
        "--ingress=",
        "--allow-unauthenticated"
      ]) {
        if (has(existingServiceUpdate, forbidden)) {
          errors.push(
            `nightly existing-service update must preserve settings and may not use ${forbidden}`
          )
        }
      }
    }
    const newServiceBootstrap = between(
      cloudbuild,
      'test "${_NIGHTLY_RUNTIME_SERVICE_ACCOUNT}" != REQUIRED',
      "\n\n  # Resolve the configured service URL"
    )
    if (!newServiceBootstrap) {
      errors.push(
        "nightly Cloud Build must retain a private new-service bootstrap branch"
      )
    } else {
      for (const forbidden of ["--no-traffic", "--allow-unauthenticated"]) {
        if (has(newServiceBootstrap, forbidden)) {
          errors.push(`nightly new-service bootstrap must not use ${forbidden}`)
        }
      }
      if (
        !inOrder(newServiceBootstrap, [
          'gcloud run deploy "$$service"',
          '--set-env-vars="MCP_ALLOWED_HOSTS=${_NIGHTLY_BOOTSTRAP_HOST}"',
          'case "$$endpoint" in',
          'hostname="$${endpoint#https://}"',
          '--update-env-vars="MCP_ALLOWED_HOSTS=$$hostname"',
          'gcloud run services update-traffic "$$service"',
          "--to-latest",
          "--no-invoker-iam-check"
        ])
      ) {
        errors.push(
          "nightly new-service bootstrap must validate the generated hostname, route the host-valid revision, then enable public access"
        )
      }
      for (const fragment of [
        "https://*.run.app)",
        '"" | .* | *. | *[!A-Za-z0-9.-]*)',
        "Cloud Run returned an invalid hostname"
      ]) {
        requireFragment(
          errors,
          newServiceBootstrap,
          fragment,
          `nightly new-service bootstrap must validate generated hostname: ${fragment}`
        )
      }
    }
    if (has(cloudbuild, "service=semiotic-mcp-server")) {
      errors.push("nightly Cloud Build must not target the stable service")
    }
    if (
      has(cloudbuild, "service=semiotic-mcp\n") ||
      has(cloudbuild, "/semiotic-mcp:$COMMIT_SHA")
    ) {
      errors.push("nightly Cloud Build must not target the legacy service")
    }
    if (
      has(cloudbuild, "us-west1-docker.pkg.dev") ||
      has(cloudbuild, "region=us-west1")
    ) {
      errors.push("nightly Cloud Build must not target the stable region")
    }
  }

  if (typeof historicalStableBuildpacks !== "string") {
    errors.push(
      "deploy/cloud-run-nightly/historical-stable-buildpacks-cloudbuild.yaml must be readable"
    )
  } else {
    for (const fragment of [
      "HISTORICAL STABLE TRIGGER PAYLOAD — NEVER USE FOR NIGHTLY",
      "gcr.io/k8s-skaffold/pack",
      "--builder=gcr.io/buildpacks/builder:google-22",
      "--path=deploy/cloud-run",
      "_SERVICE_NAME: semiotic-mcp-server",
      "_DEPLOY_REGION: us-west1",
      "_TRIGGER_ID: 36c05cdd-221d-4c1b-a383-a8117cea4556"
    ]) {
      requireFragment(
        errors,
        historicalStableBuildpacks,
        fragment,
        `historical stable trigger payload is missing: ${fragment}`
      )
    }
  }

  return {
    errors,
    manifest: {
      image: NIGHTLY_IMAGE,
      service: NIGHTLY_SERVICE,
      region: NIGHTLY_REGION
    }
  }
}
