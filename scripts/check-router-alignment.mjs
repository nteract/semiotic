import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const readJson = (path) => JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"))

const packageJson = readJson("package.json")
const packageLock = readJson("package-lock.json")
const packages = packageLock.packages || {}
const directDependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
}

const majorVersion = (version, label) => {
  const match = String(version || "").match(/(?:^|\D)(\d+)\./)
  if (!match) throw new Error(`Cannot determine ${label} major version from ${JSON.stringify(version)}`)
  return Number(match[1])
}

const routerRange = directDependencies["react-router"]
const routerDomRange = directDependencies["react-router-dom"]
const errors = []

if (!routerRange || !routerDomRange) {
  errors.push("package.json must directly declare both react-router and react-router-dom")
} else if (majorVersion(routerRange, "react-router") !== majorVersion(routerDomRange, "react-router-dom")) {
  errors.push(`package.json mixes router majors: react-router ${routerRange}, react-router-dom ${routerDomRange}`)
}

for (const dependency of ["react-router", "react-router-dom"]) {
  const declaredRange = directDependencies[dependency]
  const lockedRange = packages[""]?.dependencies?.[dependency]
    || packages[""]?.devDependencies?.[dependency]
  const lockedVersion = packages[`node_modules/${dependency}`]?.version

  if (declaredRange !== lockedRange) {
    errors.push(`package-lock.json records ${dependency} as ${lockedRange || "missing"}; expected ${declaredRange}`)
  }
  if (!lockedVersion) {
    errors.push(`package-lock.json has no root resolution for ${dependency}`)
  } else if (declaredRange && majorVersion(lockedVersion, dependency) !== majorVersion(declaredRange, dependency)) {
    errors.push(`${dependency} resolves to ${lockedVersion}, outside declared major ${declaredRange}`)
  }
}

const routerInstallations = Object.entries(packages)
  .filter(([path]) => path === "node_modules/react-router" || path.endsWith("/node_modules/react-router"))
  .map(([path, entry]) => ({ path, version: entry.version }))
const installedMajors = new Set(routerInstallations.map(({ version }) => majorVersion(version, "installed react-router")))

if (installedMajors.size > 1) {
  errors.push(`package-lock.json installs multiple react-router majors: ${routerInstallations.map(({ path, version }) => `${path}=${version}`).join(", ")}`)
}

if (errors.length) {
  console.error("React Router dependency alignment failed:\n" + errors.map((error) => `- ${error}`).join("\n"))
  process.exitCode = 1
} else {
  console.log(`React Router dependencies are aligned on major ${majorVersion(routerRange, "react-router")}.`)
}
