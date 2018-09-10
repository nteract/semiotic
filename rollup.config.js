import node from "rollup-plugin-node-resolve"
import babel from "rollup-plugin-babel"
import commonjs from "rollup-plugin-commonjs"
import builtins from "rollup-plugin-node-builtins"
import replace from "rollup-plugin-replace"
import regenerator from "rollup-plugin-regenerator"
import nodent from "rollup-plugin-nodent"

import flow from "rollup-plugin-flow"

export default {
  exports: "named",
  input: "src/components/index.js",
  output: {
    format: "umd",
    file: "dist/semiotic.js",
    name: "Semiotic"
  },
  interop: false,
  globals: {
    "react": "React",
    "react-dom": "ReactDOM"
  },
  external: ["react", "react-dom"],
  plugins: [
    flow(),
    node({ jsnext: true, preferBuiltins: false }),
    //    regenerator({ includeRuntime: true, sourceMap: false }),
    builtins(),
    commonjs({
      include: "node_modules/**",
      namedExports: {
        "node_modules/d3-sankey-circular/dist/index.js": [
          "sankeyCircular",
          "sankeyLeft",
          "sankeyCenter",
          "sankeyRight",
          "sankeyJustify"
        ]
      }
    }),
    replace({
      "process.env.NODE_ENV": '"production"'
    }),
    babel({
      babelrc: true,
      runtimeHelpers: true,
      presets: [
        "@babel/preset-flow",
        "@babel/preset-env",
        "@babel/preset-react"
      ]
    }),
    nodent()
  ]
}
