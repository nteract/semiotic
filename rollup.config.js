import node from "rollup-plugin-node-resolve"
import babel from "rollup-plugin-babel"
import commonjs from "rollup-plugin-commonjs"
import builtins from "rollup-plugin-node-builtins"
import replace from "rollup-plugin-replace"
import nodent from "rollup-plugin-nodent"
import typescript from "rollup-plugin-typescript"

export default {
  input: "src/components/index.js",
  output: {
    format: "umd",
    file: "dist/semiotic.js",
    name: "Semiotic",
    globals: {
      "react": "React",
      "react-dom": "ReactDOM"
    }
  },
  /*  exports: "named",
  interop: false,
  , */
  external: ["react", "react-dom"],
  plugins: [
    typescript(),
    node({ jsnext: true, preferBuiltins: false }),
    babel({
      babelrc: true,
      runtimeHelpers: true,
      presets: ["@babel/react"],
      plugins: ["@babel/external-helpers"]
    }),
    nodent({ includeruntime: true, sourcemap: false }),
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
    })
  ]
}
