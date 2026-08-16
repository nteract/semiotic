import framePropsLast from "./rules/frame-props-last.mjs"
import familySubpathImports from "./rules/family-subpath-imports.mjs"
import interactionTestLayoutControl from "./rules/interaction-test-layout-control.mjs"

export default {
  meta: {
    name: "eslint-plugin-semiotic",
    version: "0.1.0"
  },
  rules: {
    "frame-props-last": framePropsLast,
    "family-subpath-imports": familySubpathImports,
    "interaction-test-layout-control": interactionTestLayoutControl
  }
}
