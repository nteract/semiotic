/** "1 line", "2 lines", "0 lines". */
export function countNoun(
  count: number,
  singular: string,
  plural = `${singular}s`
): string {
  return `${count} ${count === 1 ? singular : plural}`
}
