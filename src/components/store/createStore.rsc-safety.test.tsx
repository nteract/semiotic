/**
 * Regression: `createStore` must not call `createContext` at module
 * load. React Server Components ship a build of `react` that omits
 * `createContext` entirely; if any store file's top-level
 * `createStore(...)` call invoked it eagerly, importing
 * `semiotic/server` from a Server Component would crash with
 * `(0, p.createContext) is not a function` before `renderChart` ever
 * ran.
 *
 * The test mocks `react` so `createContext` throws, then dynamically
 * imports `createStore` and calls it. The factory call must succeed —
 * only `Provider` / `useSelector` (neither of which runs in a Server
 * Component) should ever invoke `createContext`.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

describe("createStore — RSC import safety", () => {
  beforeEach(() => {
    // Reset module cache + mocks so each test re-imports `createStore`
    // against a fresh `vi.doMock("react", ...)` call. `vi.unmock` would
    // be hoisted to run before tests by vitest, so cleanup happens via
    // `vi.resetModules` rather than an `afterEach` block.
    vi.resetModules()
  })

  it("calling createStore() does not invoke createContext", async () => {
    let createContextCalls = 0

    // Mock `react` so `createContext` throws if called. In the real
    // RSC build, `createContext` is undefined entirely — same
    // observable failure mode (TypeError before renderChart ever runs).
    vi.doMock("react", async () => {
      const actual = await vi.importActual<typeof import("react")>("react")
      return {
        ...actual,
        default: actual,
        createContext: (...args: unknown[]) => {
          createContextCalls++
          throw new Error("createContext is not available in this environment")
        },
      }
    })

    // Dynamic import after the mock is registered. `vi.resetModules`
    // in beforeEach guarantees the import sees the mocked module.
    const { createStore } = await import("./createStore")

    // Factory call: must not touch createContext. (Pre-fix: line 25
    // of the old createStore.tsx called createContext eagerly here.)
    const [Provider, useSelector] = createStore(() => ({ count: 0 }))
    expect(createContextCalls).toBe(0)

    // The returned bindings are functions ready to consume — the lazy
    // createContext fires only when Provider / useSelector actually
    // runs inside a React render. Server Components never reach that
    // path because they don't render the Provider tree.
    expect(typeof Provider).toBe("function")
    expect(typeof useSelector).toBe("function")
  })
})
