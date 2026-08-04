/**
 * ChartAccessor evaluation for ProcessSankey normalize / push / tooltip paths.
 */
import type { Datum } from "../../shared/datumTypes"
import type { ChartAccessor } from "../../shared/types"

/** Read a string-or-function accessor against a datum. */
export function readChartAccessor<T extends Datum, V>(
  accessor: ChartAccessor<T, V>,
  d: T,
): V {
  if (typeof accessor === "function") return accessor(d)
  return d[accessor as string] as V
}
