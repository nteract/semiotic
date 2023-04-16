type BatchOptions = { signal?: AbortSignal; timeFrameMs?: number }

const MAX_TIMEFRAME_MS = 30

export async function batchWork(
  performWork: () => boolean,
  { signal, timeFrameMs = MAX_TIMEFRAME_MS }: BatchOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    requestAnimationFrame(function loop() {
      // FIXME the `timestamp` value can be received from rAF,
      // but the value is not in sync with performance.now (in tests only)
      let timestamp = performance.now()
      let elapsed = 0
      let shouldContinue = false
      let isAborted = signal != null && signal.aborted

      try {
        if (isAborted) {
          return resolve()
        }

        do {
          shouldContinue = performWork()
          elapsed = performance.now() - timestamp
          isAborted = signal != null && signal.aborted
        } while (!isAborted && shouldContinue && elapsed < timeFrameMs)

        if (!isAborted && shouldContinue) {
          requestAnimationFrame(loop)
        } else {
          resolve()
        }
      } catch (error) {
        reject(error)
      }
    })
  })
}
