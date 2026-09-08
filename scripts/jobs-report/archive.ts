import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { gzipSync } from "node:zlib"

/** Deterministic POSIX tar for this kit's short, ASCII filenames. */
export function archive(root: string): Buffer {
  const blocks: Buffer[] = []
  function append(directory: string, prefix = "") {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort(
      (a, b) => a.name.localeCompare(b.name)
    )) {
      if (!prefix && entry.name === "kit") continue
      const name = prefix + entry.name
      if (entry.isDirectory()) {
        append(join(directory, entry.name), `${name}/`)
        continue
      }
      if (
        !entry.isFile() ||
        name.length > 99 ||
        !/^[A-Za-z0-9./_-]+$/.test(name)
      )
        throw new Error("Unsupported archive entry")
      const body = readFileSync(join(directory, entry.name))
      const header = Buffer.alloc(512)
      header.write(name)
      const octal = (value: number, offset: number, length: number) =>
        header.write(
          value.toString(8).padStart(length - 1, "0") + "\0",
          offset,
          length
        )
      octal(0o644, 100, 8)
      octal(0, 108, 8)
      octal(0, 116, 8)
      octal(body.length, 124, 12)
      octal(0, 136, 12)
      header.fill(32, 148, 156)
      header.write("0", 156)
      header.write("ustar\0", 257)
      header.write("00", 263)
      const checksum = header.reduce((total, byte) => total + byte, 0)
      header.write(checksum.toString(8).padStart(6, "0") + "\0 ", 148, 8)
      blocks.push(header, body, Buffer.alloc((512 - (body.length % 512)) % 512))
    }
  }
  append(root)
  blocks.push(Buffer.alloc(1024))
  return gzipSync(Buffer.concat(blocks), { level: 9 })
}
