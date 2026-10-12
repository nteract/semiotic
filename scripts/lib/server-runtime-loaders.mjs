import { readFileSync } from "node:fs"
import { transform } from "esbuild"

/** Static renderers register these engines before using the scene stores. */
export function serverRuntimeLoadersPlugin() {
  return {
    name: "synchronous-server-runtime-loaders",
    setup(build) {
      build.onLoad(
        {
          filter:
            /[/\\](?:networkPerspectiveLoader|pipelineTransitionEngine)\.ts$/
        },
        async ({ path }) => {
          // Erase TypeScript's typeof import() queries before replacing runtime imports.
          const { code } = await transform(readFileSync(path, "utf8"), {
            loader: "ts",
            format: "esm",
            sourcefile: path,
            target: "es2020"
          })
          return {
            contents: code.replace(
              /import\("\.\/(?:networkPerspectiveRuntime|networkPerspectiveExtras|pipelineTransitions)"\)/g,
              'Promise.reject(new Error("Server runtime requires synchronous engine registration"))'
            ),
            loader: "js"
          }
        }
      )
    }
  }
}
