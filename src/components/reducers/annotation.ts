const baseState = {
  tooltip: null
}

export default (state = baseState, action) => {
  const { type, tooltip } = action

  if (type === "CHANGE_TOOLTIP") {
    return { ...state, tooltip }
  }

  return state
}
