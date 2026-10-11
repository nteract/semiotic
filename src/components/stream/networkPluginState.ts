const states = /* @__PURE__ */ new WeakMap<object, Map<string, unknown>>()

export function networkPluginState<T>(
  config: object,
  name: string,
  create: () => T
): T {
  let plugins = states.get(config)
  if (!plugins) {
    plugins = new Map()
    states.set(config, plugins)
  }
  if (!plugins.has(name)) plugins.set(name, create())
  return plugins.get(name) as T
}

/** Configuration replacement retains store-owned plugin state. */
export function transferNetworkPluginState(
  previous: object,
  next: object
): void {
  const plugins = states.get(previous)
  if (plugins) states.set(next, plugins)
}
