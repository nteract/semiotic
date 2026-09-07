import { fingerprintValue } from "semiotic/artifact"
import { verifyReceiptPacket } from "./packet"
import type { GrocerySnapshot } from "./types"

export function importReceiptPacket(text: string, snapshot: GrocerySnapshot) {
  if (text.length > 2_000_000) throw new Error("This packet exceeds the 2 MB limit.")
  const input = JSON.parse(text)
  if (!input || input.sourceFingerprint !== fingerprintValue(snapshot).fingerprint)
    throw new Error(
      "The saved source edition is unavailable here. The current basket was retained.",
    )
  const packet = verifyReceiptPacket(input)
  if (fingerprintValue(packet.snapshot).fingerprint !== fingerprintValue(snapshot).fingerprint)
    throw new Error("The packet source differs from the pinned edition.")
  return packet
}
