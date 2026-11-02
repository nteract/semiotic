import { createContext } from "react"
import type { CategoryColorMap } from "../CategoryColors"

// Optional chart graphs share identity without loading palette construction.
export const CategoryColorContext = /* @__PURE__ */ createContext<CategoryColorMap | null>(null)
export const ExplicitCategoryColorContext = /* @__PURE__ */ createContext<CategoryColorMap | null>(null)
