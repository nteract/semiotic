// The MCP server imports a few sibling modules authored as CommonJS (.cjs) —
// componentMetadata, chartSuggestions, behaviorContracts — which ship no
// generated .d.ts. Declare their default export as `unknown`; each call site
// casts it to the precise shape it consumes. `unknown` (not `any`) keeps the
// cast explicit and satisfies no-explicit-any.
declare module "*.cjs" {
  const moduleExports: unknown
  export default moduleExports
}
