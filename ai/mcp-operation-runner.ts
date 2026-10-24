import { fork, type ChildProcess } from "node:child_process"

export const MCP_OPERATION_CHILD_FLAG = "--semiotic-operation-child"
export const isMcpOperationChild = () =>
  typeof process.send === "function" &&
  process.argv.includes(MCP_OPERATION_CHILD_FLAG)

export type McpOperationJob = {
  name: string
  arguments: Record<string, unknown>
  profile: "public" | "developer"
}

export type McpExecutionCode =
  | "MCP_RENDER_TIMEOUT"
  | "MCP_RENDER_CANCELLED"
  | "MCP_OPERATION_BUSY"
  | "MCP_OPERATION_FAILED"

export class McpExecutionError extends Error {
  constructor(
    public readonly code: McpExecutionCode,
    message: string
  ) {
    super(message)
  }
}

export type McpExecutionLimits = {
  maxOperationMs: number
  maxConcurrentOperations: number
  maxHeapMb: number
}

function positive(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function resolveMcpExecutionLimits(
  env = process.env
): McpExecutionLimits {
  return {
    maxOperationMs: positive(env.MCP_MAX_OPERATION_MS, 10_000),
    maxConcurrentOperations: positive(env.MCP_MAX_CONCURRENT_OPERATIONS, 2),
    maxHeapMb: positive(env.MCP_OPERATION_HEAP_MB, 256)
  }
}

/** A stage budget is enforced by the parent, even while this process is blocked. */
export function reportMcpOperationStage(label: string, limitMs: number): void {
  if (isMcpOperationChild()) process.send?.({ type: "stage", label, limitMs })
}

export function finishMcpOperationStage(): void {
  if (isMcpOperationChild()) process.send?.({ type: "stage-end" })
}

/**
 * One disposable process per tool call. No unbounded queue or retained chart
 * state: SIGKILL stops JS and native rasterization, and slots release on exit.
 */
export function createMcpOperationRunner(
  executable: string,
  limits: McpExecutionLimits = resolveMcpExecutionLimits(),
  launch: typeof fork = fork
) {
  const children = new Set<ChildProcess>()
  let listening = false
  const killAll = () => {
    for (const child of children) child.kill("SIGKILL")
  }
  const stop = () => {
    killAll()
    process.exit(0)
  }
  const close = () => {
    killAll()
    if (!listening) return
    listening = false
    process.removeListener("exit", killAll)
    process.removeListener("SIGTERM", stop)
    process.removeListener("SIGINT", stop)
  }

  function run<T>(
    job: McpOperationJob,
    signals: Array<AbortSignal | undefined> = []
  ): Promise<T> {
    if (signals.some((signal) => signal?.aborted)) {
      return Promise.reject(
        new McpExecutionError(
          "MCP_RENDER_CANCELLED",
          "Tool execution was canceled."
        )
      )
    }
    if (children.size >= limits.maxConcurrentOperations) {
      return Promise.reject(
        new McpExecutionError(
          "MCP_OPERATION_BUSY",
          "Tool execution capacity is full; retry after an active operation completes."
        )
      )
    }
    return new Promise((resolve, reject) => {
      const started = performance.now()
      const deadline = started + limits.maxOperationMs
      let settled = false
      let timer: ReturnType<typeof setTimeout>
      let stage: { label: string; started: number; limit: number } | undefined
      const spent = new Map<string, number>()
      const child = launch(executable, [MCP_OPERATION_CHILD_FLAG], {
        stdio: ["ignore", "ignore", "ignore", "ipc"],
        execArgv: [`--max-old-space-size=${limits.maxHeapMb}`],
        serialization: "advanced"
      })
      if (!listening) {
        listening = true
        process.once("exit", killAll)
        process.once("SIGTERM", stop)
        process.once("SIGINT", stop)
      }
      children.add(child)

      const finish = (error?: McpExecutionError, result?: T) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        for (const signal of signals)
          signal?.removeEventListener("abort", abort)
        child.kill("SIGKILL")
        if (error) reject(error)
        else resolve(result as T)
      }
      const abort = () =>
        finish(
          new McpExecutionError(
            "MCP_RENDER_CANCELLED",
            "Tool execution was canceled."
          )
        )
      const timeout = (label: string) =>
        finish(
          new McpExecutionError(
            "MCP_RENDER_TIMEOUT",
            `${label} exceeded its execution deadline; the operation was terminated.`
          )
        )
      const arm = () => {
        clearTimeout(timer)
        const remaining = deadline - performance.now()
        const stageRemaining = stage
          ? stage.limit -
            (spent.get(stage.label) ?? 0) -
            (performance.now() - stage.started)
          : Infinity
        timer = setTimeout(
          () =>
            timeout(
              stageRemaining < remaining ? stage!.label : "Tool operation"
            ),
          Math.max(0, Math.min(remaining, stageRemaining))
        )
      }
      const endStage = () => {
        if (stage) {
          spent.set(
            stage.label,
            (spent.get(stage.label) ?? 0) + performance.now() - stage.started
          )
          stage = undefined
        }
      }
      child.on("message", (message: unknown) => {
        if (settled || !message || typeof message !== "object") return
        const value = message as {
          type?: string
          label?: string
          limitMs?: number
          result?: T
        }
        // A result arriving after a deadline is not successful just because
        // the timer callback and IPC delivery became ready in the same turn.
        if (
          performance.now() >= deadline ||
          (stage &&
            (spent.get(stage.label) ?? 0) + performance.now() - stage.started >=
              stage.limit)
        ) {
          timeout(stage?.label ?? "Tool operation")
          return
        }
        if (
          value.type === "stage" &&
          typeof value.label === "string" &&
          typeof value.limitMs === "number" &&
          Number.isFinite(value.limitMs) &&
          value.limitMs > 0
        ) {
          endStage()
          stage = {
            label: value.label,
            started: performance.now(),
            limit: value.limitMs
          }
          arm()
        } else if (value.type === "stage-end") {
          endStage()
          arm()
        } else if (value.type === "result") {
          finish(undefined, value.result)
        } else if (value.type === "failure") {
          finish(
            new McpExecutionError(
              "MCP_OPERATION_FAILED",
              "Tool execution failed in the isolated process."
            )
          )
        }
      })
      child.once("error", () =>
        finish(
          new McpExecutionError(
            "MCP_OPERATION_FAILED",
            "Could not start isolated tool execution."
          )
        )
      )
      const reap = () => {
        if (!children.delete(child)) return
        // Keep signal handling stable while the runner is idle. Removing it
        // here can swallow a SIGTERM already queued during child teardown.
        finish(
          new McpExecutionError(
            "MCP_OPERATION_FAILED",
            "Isolated tool execution exited before completing (including a possible memory limit)."
          )
        )
      }
      child.once("exit", reap)
      // A failed spawn can emit error/close without ever emitting exit.
      child.once("close", reap)
      for (const signal of signals)
        signal?.addEventListener("abort", abort, { once: true })
      arm()
      child.send(job, (error) => {
        if (error)
          finish(
            new McpExecutionError(
              "MCP_OPERATION_FAILED",
              "Could not dispatch isolated tool execution."
            )
          )
      })
    })
  }

  return { run, close, active: () => children.size }
}
