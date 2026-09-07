import type { ReactNode } from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import "./tasks.css"

interface TaskPacket {
  id: string
  title: string
  summary: string
  job: string
  dataShape: string
  fit: string[]
  exclusions: string[]
  identity: { packageVersion: string; sourceRevision: string; availability: string }
  api: {
    component: string
    importPath: string
    usageMode: string
    schemaScope: string
    schemaResourceUri: string
    schema: object
    contracts: { id: string; summary: string; action: string }[]
  }
  examples: { title: string; environment: string; path: string; source: string }[]
  evidence: {
    status: string
    expected: string[]
    unassessed: string[]
    commands: string[]
    observed: { verifiedAt: string; authorship: string } | null
  }
  recovery: { symptom: string; action: string; recheck: string; contractId?: string }[]
  continuation: { rationale: string; recheck: string[]; loss: string }
  update?: { previousAssumption: string; action: string; recheck: string[]; remaining: string }
}

export default function TaskPage({
  packet,
  children,
}: {
  packet: TaskPacket
  children: ReactNode
}) {
  return (
    <PageLayout
      title={packet.title}
      tier={undefined}
      prevPage={undefined}
      nextPage={undefined}
      breadcrumbs={[{ label: "Tasks", path: "/tasks" }, { label: packet.title }]}
    >
      <div className="task-page">
        <p className="task-lead">{packet.summary}</p>
        <p>{packet.job}</p>
        <p>
          <strong>Data needed:</strong> {packet.dataShape}
        </p>
        <p className="task-version" data-testid="task-source-version">
          Source checkout · Semiotic {packet.identity.packageVersion}. Check the installed version
          before applying this guide.
        </p>
        <div className="task-links">
          <a href={`/tasks/${packet.id}.md`}>Read as plain text</a>
          <a href={`/tasks/${packet.id}.json`} download>
            Download task packet
          </a>
        </div>
        <h2 id="fit">When this fits</h2>
        <ul>
          {packet.fit.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <ul>
          {packet.exclusions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <h2 id="try">Try the complete example</h2>
        {children}
        <h2 id="implement">Use it in your application</h2>
        <p>
          <code>{packet.api.component}</code> from <code>{packet.api.importPath}</code>, in{" "}
          {packet.api.usageMode} mode.
        </p>
        {packet.examples.map((example, index) => (
          <details key={example.path} open={index === 0}>
            <summary>
              {example.title} · {example.environment}
            </summary>
            <p>
              Save as <code>{example.path.split("/").pop()}</code> beside its companion files below.
            </p>
            <CodeBlock
              code={example.source}
              language={example.path.endsWith("css") ? "css" : "tsx"}
              children={undefined}
              codeAreaLabel={example.title}
            />
          </details>
        ))}
        <h2 id="verify">Check the result</h2>
        <p>
          {packet.evidence.status === "supported-in-scope"
            ? `Repository source checks passed on ${packet.evidence.observed!.verifiedAt}.`
            : packet.evidence.status === "stale"
              ? "The source changed after the recorded checks. Run the checks again before relying on that result."
              : "Executable checks are supplied below; no current run result is attached to this source identity."}
        </p>
        <ul>
          {packet.evidence.expected.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <CodeBlock
          code={packet.evidence.commands.join("\n")}
          language="bash"
          children={undefined}
          codeAreaLabel="Task verification commands"
        />
        <p>These checks leave the following questions open:</p>
        <ul>
          {packet.evidence.unassessed.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <h2 id="repair">Repair and recheck</h2>
        {packet.recovery.map((repair) => (
          <section key={repair.symptom}>
            <h3>{repair.symptom}</h3>
            <p>{repair.action}</p>
            <p>
              <strong>Recheck:</strong> {repair.recheck}
            </p>
            {repair.contractId && (
              <p className="task-version">
                Behavior contract: <code>{repair.contractId}</code>
              </p>
            )}
          </section>
        ))}
        <h2 id="handoff">Leave useful maintenance context</h2>
        <p>{packet.continuation.rationale}</p>
        <ul>
          {packet.continuation.recheck.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>{packet.continuation.loss}</p>
        <p>
          Keep project notes optional. A changed requirement or dependency policy can justify a
          different approach.
        </p>
        {packet.update && (
          <details>
            <summary>What to recheck after an update</summary>
            <p>
              Current source guidance; an installed-release introduction has not been established.
            </p>
            <p>
              <strong>Assumption to revisit:</strong> {packet.update.previousAssumption}
            </p>
            <p>{packet.update.action}</p>
            <ul>
              {packet.update.recheck.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>{packet.update.remaining}</p>
          </details>
        )}
        <details>
          <summary>Inspect exact API, source identity and mode rules</summary>
          <p>{packet.identity.availability}</p>
          <p>
            Content revision: <code>{packet.identity.sourceRevision}</code>
          </p>
          <p>
            {packet.api.schemaScope} Full resource: <code>{packet.api.schemaResourceUri}</code>.
          </p>
          <CodeBlock
            code={JSON.stringify(packet.api.schema, null, 2)}
            language="json"
            children={undefined}
            codeAreaLabel="Selected component schema"
          />
          <ul>
            {packet.api.contracts.map((contract) => (
              <li key={contract.id}>
                <code>{contract.id}</code>: {contract.summary} {contract.action}
              </li>
            ))}
          </ul>
          {packet.evidence.observed && <p>{packet.evidence.observed.authorship}</p>}
        </details>
      </div>
    </PageLayout>
  )
}
