/**
 * A `Date` in a default tooltip: the date alone at local midnight (a daily
 * series), the date and time otherwise, so points on an intraday series
 * don't all read the same day.
 */
export function formatTooltipDate(value: Date): string {
  const hasTime = value.getHours() || value.getMinutes() || value.getSeconds() || value.getMilliseconds()
  return hasTime ? value.toLocaleString() : value.toLocaleDateString()
}
