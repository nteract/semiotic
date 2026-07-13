import { useCallback, type MutableRefObject, type RefObject } from "react"
import type { PipelineStore } from "./PipelineStore"
import {
  extractCategoryDomain,
  sameCategoryDomain,
  type CategoryDomainAccessor
} from "./categoryDomain"

/** Keep legend-category callbacks stable while reading the latest frame props. */
export function useLegendCategoryEmission(
  storeRef: RefObject<PipelineStore | null>,
  accessorRef: MutableRefObject<CategoryDomainAccessor | undefined>,
  onChangeRef: MutableRefObject<((categories: string[]) => void) | undefined>,
  previousRef: MutableRefObject<string[]>
): () => void {
  return useCallback(() => {
    const accessor = accessorRef.current
    const onChange = onChangeRef.current
    if (!onChange || !accessor) return
    const categories = extractCategoryDomain(storeRef.current?.getData() ?? [], accessor)
    if (sameCategoryDomain(categories, previousRef.current)) return
    previousRef.current = categories
    onChange(categories)
  }, [accessorRef, onChangeRef, previousRef, storeRef])
}
