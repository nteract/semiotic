import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import type { Plugin } from "esbuild"

/** Keep original-edition presentation code and its emitted source paths stable. */
export function pinnedStorySources(story: string, files: string[]): Plugin {
  const pinned = new Map(
    files.map((file) => [
      resolve("docs/src/pages/examples", story, file),
      resolve("scripts", story, "v1", file)
    ])
  )
  return {
    name: `pinned-${story}-v1`,
    setup(builder) {
      builder.onLoad({ filter: /\.ts$/ }, async ({ path }) => {
        const source = pinned.get(path)
        if (!source) return undefined
        return {
          contents: await readFile(source, "utf8"),
          loader: "ts",
          resolveDir: dirname(source)
        }
      })
    }
  }
}
