import { batchWork } from "./batchWork"

jest.useFakeTimers("modern")

test("batching", () => {
  let count = 0
  const performWork = jest.fn(() => {
    jest.advanceTimersByTime(10)
    return ++count < 6
  })
  const promise = batchWork(performWork, { timeFrameMs: 30 })
  expect(performWork).not.toHaveBeenCalled()
  jest.runOnlyPendingTimers()
  expect(performWork).toHaveBeenCalledTimes(3)
  jest.runOnlyPendingTimers()
  expect(performWork).toHaveBeenCalledTimes(6)
  return expect(promise).resolves.toBe(undefined)
})

test("cancellation", () => {
  const ctrl = new AbortController()
  let count = 0
  const performWork = jest.fn(() => {
    jest.advanceTimersByTime(10)
    return ++count < 6
  })
  const promise = batchWork(performWork, {
    timeFrameMs: 30,
    signal: ctrl.signal
  })
  expect(performWork).not.toHaveBeenCalled()
  jest.runOnlyPendingTimers()
  expect(performWork).toHaveBeenCalledTimes(3)
  ctrl.abort()
  jest.runOnlyPendingTimers()
  expect(performWork).toHaveBeenCalledTimes(3)
  return expect(promise).resolves.toBe(undefined)
})

test("rejection", () => {
  let count = 0
  const performWork = jest.fn(() => {
    jest.advanceTimersByTime(10)
    return ++count < 6
  })
  const rejection = jest.fn()
  const promise = batchWork(performWork)
  // catch promise rejection to avoid node.js exit
  promise.catch(rejection)
  expect(performWork).not.toHaveBeenCalled()
  jest.runOnlyPendingTimers()
  expect(performWork).toHaveBeenCalledTimes(3)
  performWork.mockImplementation(() => {
    jest.advanceTimersByTime(10)
    throw new Error("boom")
  })
  jest.runOnlyPendingTimers()
  expect(performWork).toHaveBeenCalledTimes(4)
  return expect(promise).rejects.toEqual(new Error("boom"))
})
