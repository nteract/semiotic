import { timingSafeEqual } from "node:crypto"

/** Require one credential, without accepting trailing tokens or line breaks. */
export function isAuthorizedRequest(
  authorization: string | undefined,
  token: string,
  scheme = "Bearer"
): boolean {
  if (!token) return true
  if (!authorization) return false
  const match = /^([^\s]+)[\t ]+([^\s]+)$/.exec(authorization)
  if (!match || match[0] !== authorization) return false
  if (match[1].toLowerCase() !== scheme.toLowerCase()) return false
  const provided = Buffer.from(match[2])
  const expected = Buffer.from(token)
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  )
}
