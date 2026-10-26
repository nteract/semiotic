// @vitest-environment node
import { execFileSync } from "node:child_process"
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  artifactFileNames,
  buildReleaseArtifact,
  releaseArtifactPaths,
  sha512File,
  verifyReleaseArtifact
} from "./release-artifact.mjs"

vi.mock("node:child_process", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:child_process")>()
  return { ...original, execFileSync: vi.fn(original.execFileSync) }
})
vi.mock("node:fs", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs")>()
  return { ...original, copyFileSync: vi.fn(original.copyFileSync) }
})

const originalProcess =
  await vi.importActual<typeof import("node:child_process")>(
    "node:child_process"
  )
const originalFs = await vi.importActual<typeof import("node:fs")>("node:fs")
const temporaryDirectories: string[] = []
const npm = process.platform === "win32" ? "npm.cmd" : "npm"

afterEach(() => {
  vi.mocked(execFileSync).mockImplementation(originalProcess.execFileSync)
  vi.mocked(copyFileSync).mockImplementation(originalFs.copyFileSync)
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

function fixture(name = "artifact-fixture", lockfile = "package-lock.json") {
  const directory = mkdtempSync(join(tmpdir(), "semiotic-release-build-test-"))
  temporaryDirectories.push(directory)
  const repoRoot = join(directory, "renamed checkout")
  const outDir = join(directory, "output")
  mkdirSync(repoRoot)
  mkdirSync(outDir)
  const packageJson = {
    name,
    version: "1.2.3",
    license: "MIT",
    files: ["index.js"],
    scripts: {
      prepack: "node -e \"throw new Error('must not run prepack')\"",
      postpack: "node -e \"throw new Error('must not run postpack')\""
    },
    dependencies: {
      "runtime-helper": "1.0.0",
      "local-helper": "file:packages/local-helper"
    },
    devDependencies: { "build-helper": "1.0.0" },
    workspaces: ["packages/*"]
  }
  const lock = {
    name,
    version: "1.2.3",
    lockfileVersion: 3,
    requires: true,
    packages: {
      "": packageJson,
      "node_modules/runtime-helper": { version: "1.0.0", license: "MIT" },
      "node_modules/build-helper": { version: "1.0.0", dev: true },
      "node_modules/local-helper": {
        resolved: "packages/local-helper",
        link: true
      },
      "packages/local-helper": { name: "local-helper", version: "1.0.0" }
    }
  }
  writeFileSync(join(repoRoot, "package.json"), JSON.stringify(packageJson))
  writeFileSync(join(repoRoot, lockfile), JSON.stringify(lock))
  writeFileSync(join(repoRoot, "index.js"), "module.exports = 42\n")
  mkdirSync(join(repoRoot, "packages/local-helper"), { recursive: true })
  writeFileSync(
    join(repoRoot, "packages/local-helper/package.json"),
    JSON.stringify(lock.packages["packages/local-helper"])
  )
  // A competing lock must not take precedence over npm-shrinkwrap.json.
  if (lockfile === "npm-shrinkwrap.json") {
    writeFileSync(
      join(repoRoot, "package-lock.json"),
      "invalid ignored lockfile"
    )
  }
  return { directory, repoRoot, outDir, packageJson, lock }
}

describe("release artifact construction", () => {
  it.each([
    ["artifact-fixture", "package-lock.json"],
    ["@scope/chart-kit", "npm-shrinkwrap.json"]
  ])(
    "builds %s from a renamed checkout using %s",
    (name, lockfile) => {
      const { directory, repoRoot, outDir, packageJson } = fixture(
        name,
        lockfile
      )
      const control = join(directory, "control")
      mkdirSync(control)
      execFileSync(
        npm,
        [
          "pack",
          "--ignore-scripts",
          "--json",
          "--dry-run=false",
          "--pack-destination",
          control
        ],
        {
          cwd: repoRoot,
          env: {
            ...process.env,
            npm_config_cache: join(directory, "control-cache")
          },
          stdio: "pipe"
        }
      )
      const before = readdirSync(repoRoot)
      const result = buildReleaseArtifact({
        repoRoot,
        outDir,
        env: {
          npm_config_dry_run: "true",
          GITHUB_SHA: "original-commit",
          GITHUB_REF_NAME: "v1.2.3"
        }
      })
      const verified = verifyReleaseArtifact({ repoRoot, outDir })
      expect(verified.manifest).toEqual(result.manifest)
      expect(result.manifest.tarball.digest.value).toBe(
        sha512File(join(control, artifactFileNames(packageJson).tarball))
      )
      expect(result.manifest.provenance.source).toMatchObject({
        commit: "original-commit",
        ref: "v1.2.3"
      })
      const sbom = JSON.parse(readFileSync(result.paths.sbom, "utf8"))
      expect(sbom.metadata.component).toMatchObject({
        name,
        version: "1.2.3",
        "bom-ref": `${name}@1.2.3`
      })
      expect(
        sbom.components
          .map((component: { name: string }) => component.name)
          .sort()
      ).toEqual(["local-helper", "runtime-helper"])
      expect(
        sbom.dependencies
          .find((entry: { ref: string }) => entry.ref === `${name}@1.2.3`)
          .dependsOn.sort()
      ).toEqual(["local-helper@1.0.0", "runtime-helper@1.0.0"])
      expect(readdirSync(repoRoot)).toEqual(before)
      expect(readdirSync(outDir).sort()).toEqual(
        Object.values(artifactFileNames(packageJson)).sort()
      )

      const originalBytes = Object.values(result.paths).map((path) =>
        readFileSync(path as string)
      )
      expect(() => buildReleaseArtifact({ repoRoot, outDir })).toThrow(
        "Refusing to overwrite"
      )
      expect(
        Object.values(result.paths).map((path) => readFileSync(path as string))
      ).toEqual(originalBytes)
    },
    20_000
  )

  it("leaves no partial artifacts after npm fails and allows a repaired retry", () => {
    const { repoRoot, outDir, lock } = fixture()
    const sentinel = join(outDir, "keep.txt")
    writeFileSync(sentinel, "unrelated artifact")
    rmSync(join(repoRoot, "package-lock.json"))
    expect(() => buildReleaseArtifact({ repoRoot, outDir })).toThrow(/npm sbom/)
    expect(readdirSync(outDir)).toEqual(["keep.txt"])
    expect(readFileSync(sentinel, "utf8")).toBe("unrelated artifact")

    writeFileSync(join(repoRoot, "package-lock.json"), JSON.stringify(lock))
    buildReleaseArtifact({ repoRoot, outDir })
    expect(
      verifyReleaseArtifact({ repoRoot, outDir }).manifest.package.name
    ).toBe("artifact-fixture")
  }, 20_000)

  it("rejects an incorrect SBOM identity without leaving release outputs", () => {
    const { repoRoot, outDir } = fixture()
    let sbomProject = ""
    vi.mocked(execFileSync).mockImplementation((file, args, options) => {
      const output = originalProcess.execFileSync(file, args, options)
      if (args?.[0] !== "sbom") return output
      sbomProject = String(options?.cwd)
      const sbom = JSON.parse(String(output))
      sbom.metadata.component.name = "another-package"
      return JSON.stringify(sbom)
    })
    expect(() => buildReleaseArtifact({ repoRoot, outDir })).toThrow(
      "unexpected package document"
    )
    expect(readdirSync(outDir)).toEqual([])
    expect(sbomProject).not.toBe("")
    expect(existsSync(sbomProject)).toBe(false)
  }, 20_000)

  it("rolls back an interrupted installation without overwriting a concurrent artifact", () => {
    const { repoRoot, outDir, packageJson } = fixture()
    const paths = releaseArtifactPaths(outDir, packageJson)
    vi.mocked(copyFileSync).mockImplementation((source, destination, flags) => {
      // Simulate another writer between the initial guard and installation.
      if (destination === paths.sbom) writeFileSync(destination, "other writer")
      originalFs.copyFileSync(source, destination, flags)
    })
    expect(() => buildReleaseArtifact({ repoRoot, outDir })).toThrow(/EEXIST/)
    expect(readdirSync(outDir)).toEqual([artifactFileNames(packageJson).sbom])
    expect(readFileSync(paths.sbom, "utf8")).toBe("other writer")
    expect(existsSync(paths.tarball)).toBe(false)
    expect(existsSync(paths.manifest)).toBe(false)
  }, 20_000)
})
