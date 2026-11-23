import { readFileSync, writeFileSync } from "node:fs"

const manifest = JSON.parse(readFileSync("package.json", "utf8"))
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"))

// The hosted application supplies the library's required peers from the build lock.
for (const name of Object.keys(manifest.peerDependencies)) {
  if (!manifest.peerDependenciesMeta?.[name]?.optional) {
    manifest.dependencies[name] = lock.packages[`node_modules/${name}`].version
  }
}
delete manifest.devDependencies
writeFileSync("package.json", JSON.stringify(manifest, null, 2) + "\n")
