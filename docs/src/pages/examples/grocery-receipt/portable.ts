// Host adapter for the independent consumer. This stays example-local until
// a second materially different story establishes a reusable public API.
export { prepareBasket } from "./prepare"
export { defaultState, readReceiptSearch, receiptSearch } from "./state"
export { renderReceiptSVG, renderReceiptHTML, receiptValues } from "./exports"
export { buildReceiptPacket, verifyReceiptPacket } from "./packet"
