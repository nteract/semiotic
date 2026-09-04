/** Compare complete import tokens, never parent or sibling substrings. */
export function context7SubpathDrift(exportedSubpaths, rules) {
  const documented = new Set(
    rules.flatMap((rule) =>
      [...rule.matchAll(/(?<![\w/])\/(\w[\w.-]*(?:\/\w[\w.-]*)*)/g)].map(
        (match) => match[1]
      )
    )
  )
  // Fully qualified imports are also accepted in the loose prose format.
  for (const rule of rules) {
    for (const match of rule.matchAll(
      /\bsemiotic\/(\w[\w.-]*(?:\/\w[\w.-]*)*)/g
    )) {
      documented.add(match[1])
    }
  }
  const exported = new Set(exportedSubpaths)
  return {
    missing: [...exported].filter((subpath) => !documented.has(subpath)),
    phantom: [...documented].filter((subpath) => !exported.has(subpath))
  }
}
