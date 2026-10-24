import { isAuthorizedRequest } from "./mcp-http-auth"

describe("MCP authorization", () => {
  it("allows unconfigured auth and accepts a matching credential", () => {
    expect(isAuthorizedRequest(undefined, "")).toBe(true)
    expect(isAuthorizedRequest("bEaReR secret", "secret")).toBe(true)
    expect(isAuthorizedRequest("Custom secret", "secret", "Custom")).toBe(true)
  })

  it.each([
    undefined,
    "",
    "Bearer",
    "Bearer ",
    "Basic secret",
    "Bearer wrong!",
    "Bearer short",
    "Bearer secret extra",
    " Bearer secret",
    "Bearer secret\n",
    "Bearer\nsecret",
    "Bearer secret\r\n",
    "Bearer secret ",
    "Bearer sécret"
  ])("rejects malformed or incorrect credentials: %j", (header) => {
    expect(isAuthorizedRequest(header, "secret")).toBe(false)
  })
})
