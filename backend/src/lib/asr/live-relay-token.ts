import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { type LiveAsrMode, LiveAsrModeSchema } from '@shared/types'
import { z } from 'zod'
import { env } from '../../config/env.js'

/**
 * The credential a browser presents to the live relay (#487), and the only one
 * it holds: a WebSocket cannot carry the session cookie across the Vercel
 * rewrite, so this token is what authorises the socket.
 *
 * **Short, single use and bound to what it was minted for.** It lives sixty
 * seconds, which is the gap between the mint and the connect, and the relay
 * burns its `jti` on the first accepted use, so a token read out of a log or a
 * shoulder-surfed devtools panel is worth nothing a minute later or a second
 * time. It names the mode, and the relay builds the upstream session from that
 * claim and from nothing the client sends.
 *
 * HMAC-SHA256 over the claims, keyed from `BETTER_AUTH_SECRET` under a label so
 * the same secret never signs two things the same way. Not a JWT: nothing else
 * reads it, so it carries no header and no algorithm field to be confused about.
 */

/** Seconds, and the whole of the token's life. */
export const RELAY_TOKEN_TTL_SECONDS = 60

const KEY_LABEL = 'live-relay'

const ClaimsSchema = z.object({
  sub: z.string().min(1),
  mode: LiveAsrModeSchema,
  consent: z.boolean(),
  jti: z.uuid(),
  /** Epoch seconds, as in a JWT. */
  exp: z.number().int(),
})

export type RelayClaims = z.infer<typeof ClaimsSchema>

/**
 * Tokens already accepted, mapped to their expiry in epoch seconds.
 *
 * In memory, so it holds for one API process. Render runs one instance; a second
 * would need a shared store before this guarantee could be claimed across them.
 * Pruned whenever it is consulted, so it never outgrows one minute of mints.
 */
const accepted = new Map<string, number>()

/** How many tokens the replay set holds, so a test can pin that it is pruned. */
export const replaySetSize = () => accepted.size

const nowSeconds = () => Date.now() / 1000

function prune(now: number) {
  for (const [jti, exp] of accepted) if (exp <= now) accepted.delete(jti)
}

/** Derived per call: cheap, and a secret changed in a test is picked up. */
const signingKey = () => createHmac('sha256', env.BETTER_AUTH_SECRET).update(KEY_LABEL).digest()

const sign = (payload: string) => createHmac('sha256', signingKey()).update(payload).digest()

export function mintRelayToken(input: { userId: string; mode: LiveAsrMode; consent: boolean }): {
  token: string
  expiresAt: string
  jti: string
} {
  const jti = randomUUID()
  const exp = Math.floor(nowSeconds()) + RELAY_TOKEN_TTL_SECONDS
  const claims: RelayClaims = {
    sub: input.userId,
    mode: input.mode,
    consent: input.consent,
    jti,
    exp,
  }
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')

  return {
    token: `${payload}.${sign(payload).toString('base64url')}`,
    expiresAt: new Date(exp * 1000).toISOString(),
    jti,
  }
}

/**
 * Accepts a token once. Returns its claims, or `null` for every failure alike:
 * a caller that could tell a forged signature from an expired token would be
 * holding an oracle, and the relay answers all of them the same way.
 *
 * The signature is checked before anything in the payload is read, so input an
 * attacker made up never reaches the parser and never touches the replay set.
 * A token for the wrong mode is refused without being burned: it was genuine.
 */
export function verifyRelayToken(token: string, mode?: LiveAsrMode): RelayClaims | null {
  const parts = token.split('.')
  const [payload, signature] = parts
  if (parts.length !== 2 || !payload || !signature) return null

  const expected = sign(payload)
  const presented = Buffer.from(signature, 'base64url')
  // `timingSafeEqual` throws on unequal lengths. The length of a SHA-256 MAC is
  // public, so comparing it first leaks nothing.
  if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) return null

  let claims: RelayClaims
  try {
    claims = ClaimsSchema.parse(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')))
  } catch {
    return null
  }

  const now = nowSeconds()
  prune(now)
  if (claims.exp <= now) return null
  if (mode !== undefined && claims.mode !== mode) return null
  if (accepted.has(claims.jti)) return null

  accepted.set(claims.jti, claims.exp)
  return claims
}
