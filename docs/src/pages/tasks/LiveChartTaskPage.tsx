import packet from "../../../../ai/task-packets/update-live-chart.json"
import TaskPage from "./TaskPage"
import LiveChartExample from "./examples/LiveChartExample"

export default function LiveChartTaskPage() {
  return (
    <TaskPage packet={packet}>
      <LiveChartExample />
    </TaskPage>
  )
}
