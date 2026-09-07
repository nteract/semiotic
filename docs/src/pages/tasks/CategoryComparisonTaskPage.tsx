import packet from "../../../public/tasks/compare-category-totals.json"
import TaskPage from "./TaskPage"
import CategoryComparisonExample from "./examples/CategoryComparisonExample"

export default function CategoryComparisonTaskPage() {
  return (
    <TaskPage packet={packet}>
      <CategoryComparisonExample />
    </TaskPage>
  )
}
