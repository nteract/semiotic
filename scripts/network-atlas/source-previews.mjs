import { dirname, relative, resolve } from "node:path"

// NA3/NA4 deliberately deliver source recipes before NA5 publishes the API.
// These exact page/module pairs are the preview boundary, not a general
// exemption for examples to consume private library internals. Remove the
// pairs when the NA5 public-import gate in the atlas strategy is complete.
const previewImports = {
  "DependencyXRayExamplePage.tsx": [
    "supplierStory",
    "DependencyForestChart",
    "DependencyMatrix",
    "dependencyForest",
    "dependencyQueries"
  ],
  "FlowCircuitExamplePage.tsx": [
    "FlowCircuitChart",
    "flowCircuitChartProps",
    "flowCircuitStories",
    "flowCircuitTape",
    "flowCircuitTypes"
  ],
  "flow-circuit/CircuitGrammar.tsx": [
    "flowCircuitGrammar",
    "FlowCircuitChart",
    "flowCircuitTape"
  ],
  "flow-circuit/CircuitInspector.tsx": [
    "DependencyMatrix",
    "dependencyForest",
    "flowCircuit",
    "dependencyQueries",
    "flowCircuitTypes"
  ]
}

export function isAtlasSourcePreviewImport(root, filePath, specifier) {
  const page = relative(resolve(root, "docs/src/pages/examples"), filePath)
  const target = relative(root, resolve(dirname(filePath), specifier))
  return (previewImports[page] ?? []).some(
    (name) => target === `src/components/recipes/atlas/${name}`
  )
}
