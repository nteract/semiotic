import node from "rollup-plugin-node-resolve";
import babel from "rollup-plugin-babel";
import commonjs from "rollup-plugin-commonjs";

export default {
  input: "src/components/index.js",
  output: {
    format: "umd",
    file: 'dist/semioitic.js',
    name: 'semiotic'
  },
  globals: {
    react: "React",
    "react-dom": "ReactDOM"
  },
  external: ["react", "react-dom"],
  plugins: [
    node({jsnext: true}),
    commonjs({
      include: "node_modules/**",
      ignore: [
        "./cjs/react-dom.production.min.js",
        "./cjs/react.production.min.js"
      ]
    }),
    babel({
      babelrc: false,
      'presets': [
        ['es2015',
          { modules: false }
        ],
        'react',
        'stage-0'
      ],
      'plugins': [
        'transform-decorators-legacy',
        'add-module-exports',
        'transform-object-assign',
        'react-require',
        'external-helpers'
      ]
    })
  ]
};
