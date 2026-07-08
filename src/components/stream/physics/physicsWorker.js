import { createPhysicsWorkerRuntime } from "./PhysicsWorkerRuntime"
import { physicsWorkerFrameTransferables } from "./PhysicsWorkerProtocol"

const runtime = createPhysicsWorkerRuntime()

function transferablesForPayload(payload) {
  if (payload.type === "frame" || payload.type === "removed") {
    return physicsWorkerFrameTransferables(payload.frame)
  }
  return []
}

function errorPayload(error) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack
    }
  }
  return {
    message: String(error)
  }
}

self.onmessage = (event) => {
  const request = event.data

  try {
    const payload = runtime.handle(request.command)
    self.postMessage(
      {
        ok: true,
        payload,
        requestId: request.requestId
      },
      transferablesForPayload(payload)
    )
  } catch (error) {
    self.postMessage({
      error: errorPayload(error),
      ok: false,
      requestId: request.requestId
    })
  }
}
