// jsdom ships no bundled types and @types/jsdom is not a project dependency.
// mcp-server.ts only touches the constructor and its `window` (a standard DOM
// Window per lib.dom.d.ts), so declare just that surface instead of `any`.
declare module "jsdom" {
  class JSDOM {
    constructor(html?: string, options?: { contentType?: string; url?: string })
    window: Window & { XMLSerializer: typeof XMLSerializer }
  }
}
