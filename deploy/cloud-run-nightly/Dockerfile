# The nightly image is deliberately built from the checked-out repository.
# `deploy/cloud-run` remains the separate stable wrapper around a published npm
# release; do not use that wrapper for this image.
FROM node:22-bookworm-slim AS build

WORKDIR /app

# npm ci is the repository's lockfile-backed install command.  Keep dev
# dependencies available: the package and MCP build tools live there, and the
# checked-out package also uses some of them at runtime.
COPY package.json package-lock.json .npmrc ./
RUN npm ci --include=dev

# Use an explicit source allow-list rather than COPY . . so local node_modules,
# existing build output, and unrelated untracked files can never become part of
# a repository-built nightly image. These are the complete inputs for the
# library build, MCP bundle, generated AI resources, and artifact verifier.
COPY src ./src
COPY ai ./ai
COPY scripts/build.mjs scripts/build-mcp.mjs scripts/generate-ai-surface-manifest.mjs ./scripts/
COPY tsconfig.json tsconfig.declarations.json ./
COPY deploy/cloud-run-nightly ./deploy/cloud-run-nightly

# build:mcp externalizes the package self-imports, so the library artifacts
# must be built first. A standalone MCP build is insufficient for rendering.
RUN npm run check:ai-surface \
  && npm run dist:prod \
  && npm run build:mcp

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

# The current package declares runtime imports used by the repository-built
# MCP bundle under devDependencies as well as dependencies. Copy the exact
# lockfile installation from the build stage instead of pruning it and
# accidentally replacing repository code with a published semiotic package.
COPY --from=build /app/package.json /app/package-lock.json /app/.npmrc ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/ai ./ai
COPY --from=build /app/deploy/cloud-run-nightly/verify-runtime.mjs ./deploy/cloud-run-nightly/verify-runtime.mjs

# Cloud Build supplies immutable build identity. Values are intentionally
# baked into the image so the deploy command only updates the image and
# deployment labels, preserving all existing Cloud Run env vars and secrets.
ARG SEMIOTIC_DEPLOYMENT_CHANNEL=nightly
ARG SEMIOTIC_GIT_SHA
ARG SEMIOTIC_BUILD_ID
ARG SEMIOTIC_BUILD_TIME

ENV NODE_ENV=production \
    SEMIOTIC_DEPLOYMENT_CHANNEL="${SEMIOTIC_DEPLOYMENT_CHANNEL}" \
    SEMIOTIC_GIT_SHA="${SEMIOTIC_GIT_SHA}" \
    SEMIOTIC_BUILD_ID="${SEMIOTIC_BUILD_ID}" \
    SEMIOTIC_BUILD_TIME="${SEMIOTIC_BUILD_TIME}"

LABEL org.opencontainers.image.source="https://github.com/nteract/semiotic" \
      org.opencontainers.image.revision="${SEMIOTIC_GIT_SHA}" \
      org.opencontainers.image.version="nightly"

# Fail the image build before it is tagged or pushed if its MCP executable,
# source-built self-import targets, resource files, or identity are incomplete.
RUN node deploy/cloud-run-nightly/verify-runtime.mjs --require-nightly-build-info

EXPOSE 8080

# Cloud Run sets PORT. The explicit public profile is the five-tool profile;
# no application implementation is installed from the published semiotic npm
# package.
CMD ["sh", "-c", "exec node ai/dist/mcp-server.js --http --host 0.0.0.0 --port \"${PORT:-8080}\" --profile public"]
