/**
 * Static checks for the repository-built nightly Cloud Run deployment.
 *
 * The YAML is intentionally checked as narrow deployment data instead of being
 * interpreted or deployed in tests. This protects the important distinction:
 * the stable wrapper consumes an exact published package, while nightly builds
 * this repository and updates only the existing nightly service image/labels.
 */

export const NIGHTLY_IMAGE = "us-west1-docker.pkg.dev/semiotic-mcp/cloud-run-source-deploy/semiotic/semiotic-mcp-server:$COMMIT_SHA"
export const NIGHTLY_SERVICE = "semiotic-mcp-server"
export const NIGHTLY_REGION = "us-west1"

function has(source, fragment) {
  return typeof source === "string" && source.includes(fragment)
}

function requireFragment(errors, source, fragment, message) {
  if (!has(source, fragment)) errors.push(message)
}

function forbidYamlArgument(errors, source, argument, message) {
  const escaped = argument.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  if (new RegExp(`^\\s*-\\s+${escaped}(?:=|\\s|$)`, "m").test(source)) {
    errors.push(message)
  }
}

function inOrder(source, fragments) {
  let position = -1
  for (const fragment of fragments) {
    position = source.indexOf(fragment, position + 1)
    if (position === -1) return false
  }
  return true
}

/**
 * Validate the checked-in Dockerfile, Cloud Build configuration, final-image
 * verifier, and rollback payload. Inputs are strings to make regression tests
 * safe and completely independent of Google Cloud access.
 */
export function validateNightlyCloudRunDeployment({
  dockerfile,
  cloudbuild,
  verifier,
  legacyBuildpacks,
}) {
  const errors = []

  if (typeof dockerfile !== "string") {
    errors.push("deploy/cloud-run-nightly/Dockerfile must be readable")
  } else {
    const node22Stages = dockerfile.match(/FROM node:22-bookworm-slim AS /g) ?? []
    if (node22Stages.length < 2) {
      errors.push("nightly Dockerfile must use Node.js 22 for both build and runtime stages")
    }
    requireFragment(
      errors,
      dockerfile,
      "COPY package.json package-lock.json .npmrc ./",
      "nightly Dockerfile must copy the repository package manifest, lockfile, and npm configuration before install",
    )
    requireFragment(
      errors,
      dockerfile,
      "RUN npm ci --include=dev",
      "nightly Dockerfile must install exact lockfile dependencies with npm ci",
    )
    for (const fragment of [
      "COPY src ./src",
      "COPY ai ./ai",
      "scripts/build.mjs",
      "scripts/build-mcp.mjs",
      "scripts/generate-ai-surface-manifest.mjs",
      "COPY tsconfig.json tsconfig.declarations.json ./",
    ]) {
      requireFragment(
        errors,
        dockerfile,
        fragment,
        `nightly Dockerfile is missing required repository build input: ${fragment}`,
      )
    }
    if (!inOrder(dockerfile, ["npm run check:ai-surface", "npm run dist:prod", "npm run build:mcp"])) {
      errors.push("nightly Dockerfile must check the generated AI surface, build package runtime artifacts, then build the MCP executable")
    }
    for (const fragment of [
      "COPY --from=build /app/node_modules ./node_modules",
      "COPY --from=build /app/dist ./dist",
      "COPY --from=build /app/ai ./ai",
      "ARG SEMIOTIC_DEPLOYMENT_CHANNEL=nightly",
      "ARG SEMIOTIC_GIT_SHA",
      "ARG SEMIOTIC_BUILD_ID",
      "ARG SEMIOTIC_BUILD_TIME",
      "SEMIOTIC_DEPLOYMENT_CHANNEL=\"${SEMIOTIC_DEPLOYMENT_CHANNEL}\"",
      "SEMIOTIC_GIT_SHA=\"${SEMIOTIC_GIT_SHA}\"",
      "SEMIOTIC_BUILD_ID=\"${SEMIOTIC_BUILD_ID}\"",
      "SEMIOTIC_BUILD_TIME=\"${SEMIOTIC_BUILD_TIME}\"",
      "RUN node deploy/cloud-run-nightly/verify-runtime.mjs --require-nightly-build-info",
      "node ai/dist/mcp-server.js --http --host 0.0.0.0 --port \\\"${PORT:-8080}\\\" --profile public",
    ]) {
      requireFragment(
        errors,
        dockerfile,
        fragment,
        `nightly Dockerfile is missing required runtime contract: ${fragment}`,
      )
    }
    if (/npm\s+(?:install|i)\s+[^\n]*\bsemiotic\b/.test(dockerfile)) {
      errors.push("nightly Dockerfile must not install a published semiotic package as its application implementation")
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
      '"--require-nightly-build-info"',
    ]) {
      requireFragment(
        errors,
        verifier,
        fragment,
        `nightly runtime verifier is missing required artifact/self-import check: ${fragment}`,
      )
    }
  }

  if (typeof cloudbuild !== "string") {
    errors.push("deploy/cloud-run-nightly/cloudbuild.yaml must be readable")
  } else {
    for (const fragment of [
      "_TRIGGER_ID: manual",
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
      "id: deploy-nightly-revision",
      "- run",
      "- services",
      "- update",
      `- ${NIGHTLY_IMAGE}`,
      `--image=${NIGHTLY_IMAGE}`,
      `- ${NIGHTLY_SERVICE}`,
      `- --region=${NIGHTLY_REGION}`,
      "--update-labels=commit-sha=$COMMIT_SHA,gcb-build-id=$BUILD_ID,gcb-trigger-id=${_TRIGGER_ID},deployment-channel=nightly,deployment-source=repository-main",
      "node scripts/smoke-hosted-mcp.mjs",
      "--expected-channel nightly",
      '--expected-sha "$COMMIT_SHA"',
      '--expected-build-id "$BUILD_ID"',
      "timeout: 1800s",
      "logging: CLOUD_LOGGING_ONLY",
    ]) {
      requireFragment(
        errors,
        cloudbuild,
        fragment,
        `nightly Cloud Build configuration is missing required deployment contract: ${fragment}`,
      )
    }
    if (!inOrder(cloudbuild, [
      "id: build-nightly-image",
      "id: verify-nightly-runtime-image",
      "id: push-nightly-image",
      "id: deploy-nightly-revision",
      "id: smoke-nightly-deployment",
    ])) {
      errors.push("nightly Cloud Build steps must build, verify, push, deploy, then smoke test in that order")
    }
    for (const fragment of [
      "deploy",
      "--set-env-vars",
      "--update-env-vars",
      "--clear-env-vars",
      "--set-secrets",
      "--update-secrets",
      "--clear-secrets",
      "--clear-labels",
      "--memory=",
      "--cpu=",
      "--concurrency=",
      "--ingress=",
      "--allow-unauthenticated",
    ]) {
      forbidYamlArgument(
        errors,
        cloudbuild,
        fragment,
        `nightly Cloud Build must preserve existing service settings and may not use ${fragment}`,
      )
    }
    if (/^\s*-\s+--labels=/m.test(cloudbuild)) {
      errors.push("nightly Cloud Build must add/update identity labels instead of replacing all service labels")
    }
  }

  if (typeof legacyBuildpacks !== "string") {
    errors.push("deploy/cloud-run-nightly/legacy-buildpacks-cloudbuild.yaml must be readable")
  } else {
    for (const fragment of [
      "gcr.io/k8s-skaffold/pack",
      "--builder=gcr.io/buildpacks/builder:google-22",
      "--path=deploy/cloud-run",
      "_TRIGGER_ID: 36c05cdd-221d-4c1b-a383-a8117cea4556",
    ]) {
      requireFragment(
        errors,
        legacyBuildpacks,
        fragment,
        `nightly legacy trigger rollback payload is missing: ${fragment}`,
      )
    }
  }

  return {
    errors,
    manifest: {
      image: NIGHTLY_IMAGE,
      service: NIGHTLY_SERVICE,
      region: NIGHTLY_REGION,
    },
  }
}
