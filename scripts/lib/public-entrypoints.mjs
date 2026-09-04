/**
 * Canonical public JavaScript entry-point inventory.
 *
 * `package.json#exports` remains the publication authority (npm requires it
 * there). This module derives the corresponding source entry, package
 * specifier, emitted bundle name, and API-snapshot name so Vite aliases,
 * declarations, and release checks cannot each quietly maintain a different
 * hand-written list.
 */
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = resolve(__dirname, "../..")

function readPackageJson(repoRoot = REPO_ROOT) {
  return JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"))
}

function isJavaScriptTarget(value) {
  return typeof value === "string" && /\.(?:[cm]?js)$/.test(value)
}

function conditionalTargets(value, conditions = []) {
  if (typeof value === "string") return [{ conditions, target: value }]
  if (!value || typeof value !== "object") return []
  return Object.entries(value).flatMap(([condition, target]) =>
    conditionalTargets(target, [...conditions, condition])
  )
}

function preferredTarget(targets, condition) {
  return (
    targets.find(
      (target) =>
        target.conditions.length === 1 && target.conditions[0] === condition
    ) ?? targets.find((target) => target.conditions.at(-1) === condition)
  )
}

function sourceNameForSubpath(subpath) {
  return subpath === "."
    ? "semiotic"
    : `semiotic-${subpath.slice(2).replaceAll("/", "-")}`
}

function bundleNameForTarget(target) {
  return target.replace(/^\.\/dist\//, "").replace(/\.module\.min\.js$/, "")
}

/**
 * Return every importable JavaScript public entry in package-export order.
 * Experimental remains importable but is explicitly excluded from the stable
 * API snapshot contract.
 */
export function publicJavaScriptEntrypoints(packageJson = readPackageJson()) {
  return Object.entries(packageJson.exports ?? {}).flatMap(
    ([subpath, value]) => {
      const targets = conditionalTargets(value)
      const javascriptTargets = targets.filter(({ target }) =>
        isJavaScriptTarget(target)
      )
      if (javascriptTargets.length === 0) return []

      // Prefer an ordinary browser import, but preserve node-only and
      // condition-only exports in the inventory as well. A new public
      // condition can therefore never quietly bypass Vite/build checks.
      const entryTarget =
        preferredTarget(javascriptTargets, "import") ??
        preferredTarget(javascriptTargets, "default") ??
        preferredTarget(javascriptTargets, "require") ??
        javascriptTargets[0]
      const typesTarget = preferredTarget(targets, "types")

      const sourceName = sourceNameForSubpath(subpath)
      return [
        {
          subpath,
          specifier:
            subpath === "."
              ? packageJson.name
              : `${packageJson.name}/${subpath.slice(2)}`,
          sourceName,
          sourcePath: `src/components/${sourceName}.ts`,
          bundleName: bundleNameForTarget(entryTarget.target),
          declarationPath: typesTarget?.target.replace(/^\.\//, ""),
          artifactTargets: javascriptTargets.map(({ conditions, target }) => ({
            condition: conditions.join("."),
            path: target.replace(/^\.\//, "")
          })),
          apiSnapshotName: sourceName,
          stableApi:
            subpath !== "./experimental" &&
            !subpath.startsWith("./experimental/")
        }
      ]
    }
  )
}

export function stableApiEntrypoints(packageJson = readPackageJson()) {
  const stableEntries = publicJavaScriptEntrypoints(packageJson).filter(
    (entry) => entry.stableApi
  )
  const missingDeclarations = stableEntries.filter(
    (entry) => !entry.declarationPath
  )
  if (missingDeclarations.length > 0) {
    throw new Error(
      "Stable public entries must declare a types target: " +
        missingDeclarations.map((entry) => entry.specifier).join(", ")
    )
  }
  return stableEntries
}
