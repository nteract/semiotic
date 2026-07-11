/**
 * Static checks for the deploy/cloud-run wrapper. The wrapper is intentionally
 * small, so its deployment contract is more reliable when checked as data than
 * when inferred from a running server.
 */

export const CLOUD_RUN_START_COMMAND = "semiotic-mcp --http --host 0.0.0.0 --port ${PORT:-8080} --profile public"

const REQUIRED_DEPENDENCIES = ["react", "react-dom", "semiotic"]
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isExactVersion(value) {
  return typeof value === "string" && EXACT_VERSION.test(value)
}

function gcloudIgnorePatterns(source) {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
}

function ignoresLockfile(patterns) {
  return patterns.some((pattern) => {
    if (pattern.startsWith("!")) return false
    return pattern === "*.json"
      || pattern.includes("package-lock")
      || pattern.includes("npm-shrinkwrap")
  })
}

function validateLockfile(lockfile, dependencies, requireLockfile, errors, warnings) {
  if (lockfile === null) {
    const message = "no deploy/cloud-run/package-lock.json is present; deployment dependencies are not reproducibly locked"
    if (requireLockfile) errors.push(message)
    else warnings.push(message)
    return { state: "missing" }
  }

  const errorsBeforeLockValidation = errors.length

  if (!isRecord(lockfile)) {
    errors.push("deploy/cloud-run/package-lock.json must contain a JSON object")
    return { state: "invalid" }
  }
  if (lockfile.lockfileVersion !== 3) {
    errors.push(`deploy/cloud-run/package-lock.json must use lockfileVersion 3 (received ${JSON.stringify(lockfile.lockfileVersion)})`)
  }

  const packages = lockfile.packages
  const root = isRecord(packages) ? packages[""] : undefined
  if (!isRecord(root) || !isRecord(root.dependencies)) {
    errors.push("deploy/cloud-run/package-lock.json must contain packages[\"\"].dependencies")
    return { state: "invalid" }
  }

  for (const [dependency, expected] of Object.entries(dependencies)) {
    if (root.dependencies[dependency] !== expected) {
      errors.push(`lockfile root dependency ${dependency} must equal package.json (${expected})`)
    }

    const entry = packages[`node_modules/${dependency}`]
    if (!isRecord(entry)) {
      errors.push(`lockfile is missing node_modules/${dependency}`)
      continue
    }
    if (entry.version !== expected) {
      errors.push(`lockfile ${dependency} version must equal package.json (${expected}, received ${JSON.stringify(entry.version)})`)
    }
    if (typeof entry.resolved !== "string" || !entry.resolved.startsWith("https://")) {
      errors.push(`lockfile ${dependency} must have a resolved HTTPS tarball URL`)
    }
    if (typeof entry.integrity !== "string" || !/^sha(?:1|256|384|512)-/.test(entry.integrity)) {
      errors.push(`lockfile ${dependency} must have an integrity hash`)
    }
  }

  return { state: errors.length === errorsBeforeLockValidation ? "valid" : "invalid" }
}

/**
 * Validate the static deployment contract. Missing locks are a warning by
 * default so this can report an unpublished package without falsely claiming
 * that a lock was generated; pass requireLockfile to turn that into a failure.
 */
export function validateCloudRunManifest({
  wrapperManifest,
  rootManifest,
  gcloudignore,
  lockfile = null,
  requireLockfile = false,
}) {
  const errors = []
  const warnings = []

  if (!isRecord(wrapperManifest)) {
    return { errors: ["deploy/cloud-run/package.json must contain a JSON object"], warnings: [], lockfile: { state: "invalid" } }
  }
  if (!isRecord(rootManifest)) {
    return { errors: ["root package.json must contain a JSON object"], warnings: [], lockfile: { state: "invalid" } }
  }

  if (wrapperManifest.private !== true) {
    errors.push("deploy/cloud-run/package.json must be private")
  }
  if (wrapperManifest.engines?.node !== "22") {
    errors.push('deploy/cloud-run/package.json must constrain Node to the Cloud Run Node 22 line ("22")')
  }

  const start = wrapperManifest.scripts?.start
  if (start !== CLOUD_RUN_START_COMMAND) {
    errors.push(`Cloud Run start script must be exactly: ${CLOUD_RUN_START_COMMAND}`)
  }

  const dependencies = wrapperManifest.dependencies
  if (!isRecord(dependencies)) {
    errors.push("deploy/cloud-run/package.json must declare dependencies")
  } else {
    for (const dependency of REQUIRED_DEPENDENCIES) {
      if (!(dependency in dependencies)) {
        errors.push(`deploy/cloud-run/package.json is missing required dependency ${dependency}`)
      }
    }
    for (const [dependency, version] of Object.entries(dependencies)) {
      if (!isExactVersion(version)) {
        errors.push(`${dependency} must use an exact published version, not ${JSON.stringify(version)}`)
      }
    }
    if (dependencies.react !== dependencies["react-dom"]) {
      errors.push("react and react-dom must use the same exact version")
    }
    if (dependencies.semiotic !== rootManifest.version) {
      errors.push(`Cloud Run semiotic version must equal the root package version (${JSON.stringify(rootManifest.version)})`)
    }
  }

  if (typeof gcloudignore !== "string") {
    errors.push("deploy/cloud-run/.gcloudignore must be readable")
  } else {
    const patterns = gcloudIgnorePatterns(gcloudignore)
    if (!patterns.some((pattern) => pattern === "node_modules" || pattern === "node_modules/")) {
      errors.push("deploy/cloud-run/.gcloudignore must exclude node_modules")
    }
    if (ignoresLockfile(patterns)) {
      errors.push("deploy/cloud-run/.gcloudignore must not exclude package-lock.json or npm-shrinkwrap.json")
    }
  }

  const lockfileStatus = validateLockfile(
    lockfile,
    isRecord(dependencies) ? dependencies : {},
    requireLockfile,
    errors,
    warnings,
  )

  return {
    errors,
    warnings,
    lockfile: lockfileStatus,
    manifest: {
      semiotic: dependencies?.semiotic,
      start,
      node: wrapperManifest.engines?.node,
    },
  }
}
