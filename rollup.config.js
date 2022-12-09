import commonjs from "rollup-plugin-commonjs"
import size from "rollup-plugin-bundle-size"
import external from "rollup-plugin-auto-external"
import typescript from "rollup-plugin-typescript2"

export default {
  input: "src/components/semiotic.ts",
  output: [
    { format: "cjs", file: "dist/semiotic.js" },
    { format: "esm", file: "dist/semiotic.module.js" }
  ],
  context: "window",
  plugins: [
    external(),
    typescript(),
    commonjs({ include: "node_modules/**" }),
    size()
  ]
}
