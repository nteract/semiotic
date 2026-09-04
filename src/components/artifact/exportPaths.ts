export interface ArtifactPathSegment {
  key: string
  each: boolean
}

export function artifactPathContains(parent: string, child: string): boolean {
  const normalizedParent = parent.replace(/^\$\.?/, "")
  const normalizedChild = child.replace(/^\$\.?/, "")
  if (normalizedParent === normalizedChild) return true
  if (!normalizedChild.startsWith(normalizedParent)) return false
  const boundary = normalizedChild[normalizedParent.length]
  return boundary === "." || boundary === "["
}

export function artifactPathsOverlap(left: string, right: string): boolean {
  return artifactPathContains(left, right) || artifactPathContains(right, left)
}

export function parseArtifactExportPath(
  path: string
): ArtifactPathSegment[] | undefined {
  const normalized = path.replace(/^\$\.?/, "")
  const segments = normalized.split(".").map((segment) => {
    const match = /^([A-Za-z][A-Za-z0-9]*)(\[\])?$/.exec(segment)
    return match ? { key: match[1], each: Boolean(match[2]) } : undefined
  })
  return segments.length > 0 &&
    segments.every((segment): segment is ArtifactPathSegment =>
      Boolean(segment)
    )
    ? segments
    : undefined
}

export function deleteArtifactExportPath(
  value: unknown,
  segments: ReadonlyArray<ArtifactPathSegment>,
  index = 0
): boolean {
  if (!value || typeof value !== "object") return false
  const segment = segments[index]
  if (!segment) return false
  const record = value as Record<string, unknown>
  if (!Object.prototype.hasOwnProperty.call(record, segment.key)) return false
  const target = record[segment.key]
  if (index === segments.length - 1) {
    if (segment.each) {
      if (!Array.isArray(target)) return false
      const changed = target.length > 0
      record[segment.key] = []
      return changed
    }
    delete record[segment.key]
    return true
  }
  if (segment.each && !Array.isArray(target)) return false
  const targets = segment.each ? (target as unknown[]) : [target]
  return targets
    .map((item) => deleteArtifactExportPath(item, segments, index + 1))
    .some(Boolean)
}
