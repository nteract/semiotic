# Development Guide

## Local Development Setup

### Understanding the Build Process

The library is built with **tsup/esbuild** (`npm run dist` / `npm run dist:prod`) into `dist/`.

The **docs site** (Vite) aliases `semiotic/*` to source via `vite.shared.mjs` for many packages, but production docs builds and some workflows still consume built `dist/` artifacts. When in doubt:

1. Rebuild `dist/` after library source changes that affect packaged entry points
2. Prefer `npm run docs:dev` for day-to-day docs work
3. Use `npm run website:start` when you need the production-dist path the docs historically used

### Development Workflow

#### Option 1: Docs from source (fastest day-to-day)

```bash
npm run docs:dev
```

Opens the Vite docs server (default http://127.0.0.1:3000). Source aliases apply for most `semiotic/*` imports.

#### Option 2: Clean start against production dist

```bash
npm run website:start:clean
```

This will:

1. Remove caches (`.vite`, `docs/build`, `dist`)
2. Rebuild production dist from source
3. Start the docs dev server

#### Option 3: Quick start (continuing work on dist-backed docs)

```bash
npm run website:start
```

Rebuilds production dist, then starts the docs server.

#### Option 4: Full clean (when things go wrong)

```bash
npm run clean        # Clear caches and build artifacts
npm run dist         # Rebuild dist (unminified; fine for tests)
npm run docs:dev     # Or website:start for dist-backed docs
```

### Making Changes to Source Code

**Library (`src/`):**

1. Edit source under `src/`
2. Run focused tests: `npx vitest run path/to/file.test.tsx`
3. Rebuild dist when testing packaged consumers or MCP: `npm run dist`
4. Typecheck: `npm run typescript`

**Docs (`docs/src/`):**

1. Edit docs source
2. `npm run docs:dev` and hard-refresh if needed
3. Route / coverage checks when adding pages: `npm run check:docs-routes`

### Troubleshooting

#### Browser shows old/wrong code

1. Stop the dev server
2. Run: `npm run clean`
3. Run: `npm run dist` or `npm run dist:prod`
4. Restart: `npm run docs:dev` or `npm run website:start`
5. Hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)
6. DevTools → Network → Disable cache

#### Changes not appearing in dist consumers

`npm run dist` writes **unminified** bundles that still use the `*.min.js` filename convention for package exports compatibility. Production minification is `npm run dist:prod` only. Always rebuild after library changes before testing packed entry points.

### Available Scripts

- `npm run clean` — Remove caches and build artifacts
- `npm run dist` — Build library bundles (unminified)
- `npm run dist:prod` — Build minified production bundles
- `npm run docs:dev` — Vite docs server
- `npm run website:start` — Rebuild prod dist + docs server
- `npm run website:start:clean` — Full clean + rebuild + docs server
- `npm run website:build` — Production docs build + prerender
- `npm run test` — Vitest unit/integration suite
- `npm run lint` — ESLint on `src` (CI runs `eslint src --quiet` for hard errors)
- `npm run check:file-size` — hard line limits + ratchet allowlist (`scripts/file-size-policy.json`)
- `npm run check:test-quality` — mount-only assertion baseline (no new bare mount asserts)

### Cache Locations

- `node_modules/.vite` / `.vite` — Vite caches
- `docs/build/` — Built docs website
- `dist/` — Built library bundles

All of these are cleared by `npm run clean`.

### Bundle entry points

Prefer subpath imports in apps:

| Import | Contents |
|--------|----------|
| `semiotic/xy` | XY charts + StreamXYFrame |
| `semiotic/ordinal` | Ordinal charts |
| `semiotic/network` | Network charts |
| `semiotic/geo` | Geo charts (isolates d3-geo / map data) |
| `semiotic/realtime` | Streaming HOCs |
| `semiotic/physics` | Physics charts only (not on root `semiotic`; optional Matter/Rapier peers) |
| `semiotic/server` | SSR / static render |
| `semiotic/ai` | Tooling / codegen surface (large; not for production UI) |
| `semiotic/value` | BigNumber |
| `semiotic/recipes` | Pure layout kit |

`world-atlas` is an optional peer for built-in reference geographies (`resolveReferenceGeography`). Install it when using string map names like `"world-110m"`.
