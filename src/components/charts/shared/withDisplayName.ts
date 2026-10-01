/**
 * Name a component without a module-scope side effect.
 *
 * Library chunks merge many modules, and consumer bundlers must retain any
 * top-level `Component.displayName = "..."` assignment together with the
 * component it mutates. Call this as the component's initializer with a
 * `/* @__PURE__ *\/` annotation so an unused component can still be dropped:
 *
 * ```ts
 * export const Chart = /* @__PURE__ *\/ withDisplayName(
 *   /* @__PURE__ *\/ forwardRef(function Chart(props, ref) { ... }),
 *   "Chart"
 * )
 * ```
 *
 * Minified bundles rename function expressions, so the explicit name keeps
 * React DevTools and error messages readable.
 */
export function withDisplayName<T extends object>(component: T, displayName: string): T {
  ;(component as T & { displayName?: string }).displayName = displayName
  return component
}
