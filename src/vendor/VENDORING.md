# Maintaining the vendored Sankey layout

The network layout plugin imports the engine from `sankey-plus/index.js`.
The JavaScript implements the layout, `index.d.ts` declares its internal
TypeScript interface, and `feedbackOrder.ts` and `columnOccupancy.ts`
implement Semiotic’s cycle ordering and routing indexes. Public Sankey
options are defined by Semiotic’s network charts and layout plugin.

When porting an upstream change, compare the affected files against the
[recorded upstream revision](./sankey-plus/ATTRIBUTION.md). Preserve the
local cycle ordering, DAG layering, and viewport fitting covered by the
vendor and layout plugin tests. Update the revision and [license
notices](./sankey-plus/LICENSE) when the source or notices change.

Run `npm run lint` and the focused layout tests:

```sh
npx vitest run src/vendor/sankey-plus src/components/stream/layouts/sankeyLayoutPlugin.test.ts
```

The library build copies the notices into `dist/sankey-plus.LICENSE.txt`.
After `npm run dist:prod`, run `npm run check:pack` to verify that the
installed npm tarball contains the complete notices.
