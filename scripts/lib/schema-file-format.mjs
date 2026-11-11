/**
 * On-disk format of `ai/schema.json`.
 *
 * The file is published as-is, so its formatting is package weight. Two-space
 * indentation cost about 1 MB of the unpacked tarball (1.76 MB pretty-printed
 * against 0.78 MB of actual JSON, measured at 3.13.3 with 65 components).
 * Writing every top-level field and every `tools` entry on its own line keeps
 * the bytes within a few hundred of fully minified while a git diff still
 * names exactly the components that changed.
 *
 * Every writer of the file must use this serializer: the chart-spec generator
 * compares the file byte-for-byte against its expected output.
 */
export function serializeSchemaFile(schema) {
  if (schema == null || typeof schema !== "object" || Array.isArray(schema)) {
    throw new TypeError("ai/schema.json must serialize a JSON object")
  }
  const fields = Object.entries(schema).map(([key, value]) => {
    const name = JSON.stringify(key)
    if (key !== "tools" || !Array.isArray(value)) {
      return `${name}:${JSON.stringify(value)}`
    }
    if (value.length === 0) return `${name}:[]`
    return `${name}:[\n${value.map((tool) => JSON.stringify(tool)).join(",\n")}\n]`
  })
  return `{\n${fields.join(",\n")}\n}\n`
}
