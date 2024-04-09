import { pipeline } from "node:stream/promises"
import { join, relative } from "node:path"
import { readFileSync } from "node:fs"
import { series, src, dest } from "gulp"
import Vinyl from "vinyl"
import { rollup } from "rollup"
import ts from "typescript"

import commonjs from "rollup-plugin-commonjs"
import external from "rollup-plugin-auto-external"
import typescript from "rollup-plugin-typescript2"
import size from "rollup-plugin-bundle-size"

/**
 * Main build task. Bundles the library code using Rollup,
 * emits TypeScript declaration files using tsc.
 */
export const build = series(bundle, decls)

export async function bundle() {
  const bundle = await rollup({
    input: "src/components/semiotic.ts",
    context: "window",
    plugins: [
      external(),
      typescript(),
      commonjs({ include: "node_modules/**" }),
      size()
    ]
  })
  await bundle.write({ format: "cjs", file: "dist/semiotic.js" })
  await bundle.write({ format: "esm", file: "dist/semiotic.module.js" })
}

/** Emit publish-ready TypeScript declaration files to the dist folder. */
export function decls() {
  return pipeline(
    src(["src/components/**/*.ts", "src/components/**/*.tsx"]),
    declarations,
    // flatten folder structure before writing to file system
    async function* stripPath(source) {
      const root = join(process.cwd(), "src", "components")
      for await (const file of source) {
        const clone = file.clone({ contents: false })
        yield Object.assign(clone, { path: relative(root, file.path) })
      }
    },
    dest("dist")
  )
}

/**
 * Stream transformer that uses TypeScript compiler to extract DTS contents.
 * Produces Vinyl files that can be consumed afterwards.
 */
async function* declarations(source) {
  const config = {
    allowJs: true,
    declaration: true,
    emitDeclarationOnly: true
  }
  const host = ts.createCompilerHost(config)
  const roots = new Map()
  const output = new Set()
  host.writeFile = (fileName, contents) => {
    const path = relative(process.cwd(), fileName)
    output.add(new Vinyl({ path, contents: Buffer.from(contents) }))
  }
  host.readFile = (fileName) => {
    return (
      roots.get(fileName)?.contents.toString() ?? readFileSync(fileName, "utf8")
    )
  }
  for await (const file of source) {
    roots.set(relative(process.cwd(), file.path), file)
  }
  ts.createProgram(Array.from(roots.keys()), config, host).emit()
  for (const file of output) yield file
}
