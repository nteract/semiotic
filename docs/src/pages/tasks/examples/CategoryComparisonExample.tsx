import { useState } from "react"
import { BarChart } from "semiotic/ordinal"
import { categoryComparisonProps } from "./category-comparison"

export default function CategoryComparisonExample() {
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">("vertical")
  return (
    <section aria-label="Category comparison example" className="task-example">
      <p>Synthetic fixture: three already aggregated regional totals, all measured in units.</p>
      <label>
        Bar direction{" "}
        <select
          value={orientation}
          onChange={(event) => setOrientation(event.target.value as typeof orientation)}
        >
          <option value="vertical">Vertical</option>
          <option value="horizontal">Horizontal</option>
        </select>
      </label>
      <BarChart {...categoryComparisonProps} orientation={orientation} responsiveWidth />
      <p>
        South accounts for 30 of the 60 units. Changing direction preserves the values and category
        order.
      </p>
    </section>
  )
}
