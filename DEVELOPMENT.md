# Development Guide

## Local Development Setup

### Understanding the Build Process

The docs site imports from `"semiotic"` which resolves to the **built dist bundle**, not the source files. This means:

1. Source changes (`src/`) don't auto-update in the docs
2. You must rebuild `dist/` after making changes
3. Caches can cause stale code to be served

### Development Workflow

#### Option 1: Clean Start (Recommended when switching context)

```bash
npm run website:start:clean
```

This will:
1. Remove all caches (`.parcel-cache`, `docs/build`, `dist`)
2. Rebuild the dist bundle from source
3. Start the dev server with caching disabled
4. Open http://localhost:1234

#### Option 2: Quick Start (When continuing work)

```bash
npm run website:start
```

This will:
1. Rebuild the dist bundle
2. Start the dev server with caching disabled
3. Open http://localhost:1234

#### Option 3: Full Clean (When things go wrong)

```bash
npm run clean        # Clear all caches and build artifacts
npm run dist         # Rebuild dist bundle
npm run website:start # Start dev server
```

### Making Changes to Source Code

When you make changes to `src/` files:

1. **Stop the dev server** (Ctrl+C)
2. **Rebuild the dist bundle**: `npm run dist:prod` (builds production minified bundle)
3. **Restart the dev server**: `npm run website:start`
4. **Hard refresh your browser**: Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows/Linux)

**Note:** The docs use the **production build** (`dist:prod`) which creates minified bundles. This ensures the package.json entry points resolve correctly.

### Troubleshooting

#### Browser shows old/wrong code

1. Stop the dev server
2. Run: `npm run clean`
3. Run: `npm run dist`
4. Run: `npm run website:start`
5. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+F5)
6. Open DevTools > Network tab > Check "Disable cache"

#### Browser freezes or infinite loop

1. Stop the dev server
2. Clear browser cache completely
3. Run: `npm run website:start:clean`
4. Hard refresh browser

#### Changes not appearing

The docs use the **built dist bundle**, not source files. Always rebuild after source changes:

```bash
npm run dist
```

### Available Scripts

- `npm run clean` - Remove all caches and build artifacts
- `npm run dist` - Build non-minified dist bundle (for tests)
- `npm run dist:prod` - Build minified production bundle (for docs)
- `npm run website:start` - Start dev server (rebuilds production dist first, no cache)
- `npm run website:start:clean` - Full clean + rebuild + start dev server
- `npm run website:build` - Build docs for production
- `npm run test` - Run tests
- `npm run lint` - Check code style

### Cache Locations

- `.parcel-cache/` - Parcel's build cache
- `docs/build/` - Built docs website
- `dist/` - Built semiotic bundle (used by docs)

All of these are cleared by `npm run clean`.
