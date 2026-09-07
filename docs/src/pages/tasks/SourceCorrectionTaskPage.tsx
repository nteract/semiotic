import packet from "../../../public/tasks/correct-published-chart.json"
import TaskPage from "./TaskPage"
import SourceCorrectionExample from "./examples/SourceCorrectionExample"

export default function SourceCorrectionTaskPage() {
  return (
    <TaskPage packet={packet}>
      <SourceCorrectionExample />
    </TaskPage>
  )
}
