import { Link } from "react-router-dom"
import PageLayout from "../../components/PageLayout"
import index from "../../../public/tasks/index.json"
import "./tasks.css"

export default function TasksPage() {
  return (
    <PageLayout
      title="Complete a visualization task"
      tier={undefined}
      breadcrumbs={undefined}
      prevPage={undefined}
      nextPage={undefined}
    >
      <div className="task-page">
        <p className="task-lead">
          Start with the job. Run a complete example, inspect what its checks establish, and repair
          a realistic failure.
        </p>
        <p>
          These three source-checkout guides use existing Semiotic APIs. Begin with the project’s
          current dependencies and delivery requirements; keep a working charting stack when it
          meets the task.
        </p>
        <div className="task-cards">
          {index.tasks.map((task) => (
            <article key={task.id}>
              <h2>
                <Link to={task.route}>{task.title}</Link>
              </h2>
              <p>{task.summary}</p>
              <p className="task-version">Source package {task.packageVersion}</p>
              <a href={task.markdown}>Plain text guide</a>
              {" · "}
              <a href={task.json}>Machine packet</a>
            </article>
          ))}
        </div>
        <p>
          Each packet combines one task with selected schema properties, mode contracts, executable
          source, repairs and limits. Full component schemas remain available when needed.
        </p>
        <p>
          MCP clients can discover the same guidance through <code>semiotic://tasks</code> and
          retrieve one packet at <code>semiotic://tasks/&#123;taskId&#125;</code>.
        </p>
        <p>
          Test results describe a specific source build. Published package availability, deployment
          parity, human reception and adoption require their own evidence.
        </p>
      </div>
    </PageLayout>
  )
}
