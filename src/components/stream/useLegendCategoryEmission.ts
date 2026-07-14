import { useCallback, useRef, type RefObject } from "react"
import type { Datum } from "../charts/shared/datumTypes"
import {
  extractCategoryDomain,
  sameCategoryDomain,
  type CategoryDomainAccessor
} from "./categoryDomain"

/** Keep legend-category callbacks stable while reading the latest frame props. */
export function useLegendCategoryEmission<TStore extends object, TDatum extends Datum = Datum>(
  storeRef: RefObject<TStore | null>,
  accessor: CategoryDomainAccessor<TDatum> | undefined,
  onChange: ((categories: string[]) => void) | undefined,
  readData: (store: TStore) => TDatum[]
): () => void {
  const latestRef = useRef({ accessor, onChange, readData })
  const previousRef = useRef<string[]>([])
  latestRef.current = { accessor, onChange, readData }
  return useCallback(() => {
    const { accessor, onChange, readData } = latestRef.current
    if (!onChange || !accessor) return
    const categories = extractCategoryDomain(
      storeRef.current ? readData(storeRef.current) : [],
      accessor
    )
    if (sameCategoryDomain(categories, previousRef.current)) return
    previousRef.current = categories
    onChange(categories)
  }, [storeRef])
}
