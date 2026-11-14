export function encodeConfigURL(config: unknown, maxLength?: number): string {
  const json = JSON.stringify(config)
  const encoded = btoa(
    Array.from(new TextEncoder().encode(json), (byte) =>
      String.fromCharCode(byte)
    ).join("")
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
  const query = `sc=${encoded}`
  if (
    maxLength !== undefined &&
    query.length > Math.max(0, Math.floor(maxLength))
  ) {
    throw new RangeError(
      `Serialized chart config is ${query.length} characters; the declared URL limit is ${maxLength}. Use a file or sidecar export instead.`
    )
  }
  return query
}

export function decodeConfigURL(urlString: string): unknown {
  const hash = urlString.indexOf("#")
  const query = hash < 0 ? urlString : urlString.slice(0, hash)
  const parameter = (part: string) =>
    new URLSearchParams(part.slice(part.indexOf("?") + 1)).get("sc")
  const encoded =
    parameter(query) ?? (hash < 0 ? null : parameter(urlString.slice(hash + 1)))
  if (!encoded) {
    throw new Error("No chart config found in URL (missing 'sc' parameter)")
  }
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/")
  const json = new TextDecoder("utf-8", { fatal: true }).decode(
    Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
  )
  const parsed: unknown = JSON.parse(json)
  return parsed
}
