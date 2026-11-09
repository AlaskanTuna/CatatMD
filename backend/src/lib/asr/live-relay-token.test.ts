import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const testEnv = vi.hoisted(() => ({ BETTER_AUTH_SECRET: 'x'.repeat(32) }))

vi.mock('../../config/env.js', () => ({ env: testEnv }))

import {
  mintRelayToken,
  RELAY_TOKEN_TTL_SECONDS,
  replaySetSize,
  verifyRelayToken,
} from './live-relay-token.js'

/**
 * The credential the live relay accepts (#487). Every property here is a way a
 * token could be worth more than it was minted for: a second use, a second
 * minute, a different mode, or a signature somebody else made.
 */
const mint = (mode: 'ambient' | 'dictation' = 'dictation', consent = false) =>
  mintRelayToken({ userId: 'doctor-1', mode, consent })

const claimsOf = (token: string) =>
  JSON.parse(Buffer.from(token.split('.')[0] ?? '', 'base64url').toString('utf8')) as Record<
    string,
    unknown
  >

/**
 * The replay set is module state, so each test starts an hour after the last:
 * whatever an earlier test left in it has expired and is pruned on first use.
 */
let hour = 0

beforeEach(() => {
  testEnv.BETTER_AUTH_SECRET = 'x'.repeat(32)
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(Date.parse('2026-11-10T09:00:00Z') + hour++ * 3_600_000)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('a token that was just minted', () => {
  it('verifies once and returns what it was minted with', () => {
    const { token, jti } = mint('ambient', true)

    expect(verifyRelayToken(token)).toEqual({
      sub: 'doctor-1',
      mode: 'ambient',
      consent: true,
      jti,
      exp: Math.floor(Date.now() / 1000) + RELAY_TOKEN_TTL_SECONDS,
    })
  })

  it('expires sixty seconds ahead, and says when', () => {
    const { expiresAt } = mint()

    expect(Date.parse(expiresAt) - Date.now()).toBe(60_000)
  })

  it('carries exactly the five claims and no secret', () => {
    const { token } = mint()

    expect(Object.keys(claimsOf(token)).sort()).toEqual(['consent', 'exp', 'jti', 'mode', 'sub'])
    expect(token).not.toContain(testEnv.BETTER_AUTH_SECRET)
  })

  it('gets a fresh id every time', () => {
    expect(mint().jti).not.toBe(mint().jti)
  })
})

describe('expiry', () => {
  it('is accepted until the minute is up', () => {
    const { token } = mint()
    vi.advanceTimersByTime(59_000)

    expect(verifyRelayToken(token)).not.toBeNull()
  })

  it('is refused from the sixtieth second', () => {
    const { token } = mint()
    vi.advanceTimersByTime(60_000)

    expect(verifyRelayToken(token)).toBeNull()
  })

  it('is refused long after, and the refusal does not consume anything', () => {
    const { token } = mint()
    const before = replaySetSize()
    vi.advanceTimersByTime(3_600_000)

    expect(verifyRelayToken(token)).toBeNull()
    expect(replaySetSize()).toBe(before)
  })
})

describe('tampering', () => {
  it('refuses a payload edited under the original signature', () => {
    const { token } = mint('dictation')
    const [payload, signature] = token.split('.')
    const edited = Buffer.from(
      JSON.stringify({ ...claimsOf(token), mode: 'ambient', consent: true }),
    ).toString('base64url')
    expect(edited).not.toBe(payload)

    expect(verifyRelayToken(`${edited}.${signature}`)).toBeNull()
  })

  it('refuses an expiry pushed out', () => {
    const { token } = mint()
    const signature = token.split('.')[1]
    const later = Buffer.from(
      JSON.stringify({ ...claimsOf(token), exp: Math.floor(Date.now() / 1000) + 86_400 }),
    ).toString('base64url')

    expect(verifyRelayToken(`${later}.${signature}`)).toBeNull()
  })

  it('refuses a flipped signature, a truncated one and an empty one', () => {
    const { token } = mint()
    const [payload, signature = ''] = token.split('.')
    const flipped = `${signature.startsWith('A') ? 'B' : 'A'}${signature.slice(1)}`

    expect(verifyRelayToken(`${payload}.${flipped}`)).toBeNull()
    expect(verifyRelayToken(`${payload}.${signature.slice(0, -4)}`)).toBeNull()
    expect(verifyRelayToken(`${payload}.`)).toBeNull()
  })

  it('refuses a token signed under another secret', () => {
    testEnv.BETTER_AUTH_SECRET = 'y'.repeat(32)
    const { token } = mint()
    testEnv.BETTER_AUTH_SECRET = 'x'.repeat(32)

    expect(verifyRelayToken(token)).toBeNull()
  })

  it('refuses anything that is not shaped like a token', () => {
    for (const junk of [
      '',
      '.',
      'abc',
      'a.b.c',
      '{}',
      'null.null',
      `${Buffer.from('{}').toString('base64url')}.AAAA`,
    ]) {
      expect(verifyRelayToken(junk), junk).toBeNull()
    }
  })

  it('does not let a forged token touch the replay set', () => {
    const before = replaySetSize()
    verifyRelayToken(`${Buffer.from(JSON.stringify({ jti: 'x' })).toString('base64url')}.AAAA`)

    expect(replaySetSize()).toBe(before)
  })
})

describe('single use', () => {
  it('refuses the second presentation of the same token', () => {
    const { token } = mint()

    expect(verifyRelayToken(token)).not.toBeNull()
    expect(verifyRelayToken(token)).toBeNull()
  })

  it('counts each token separately', () => {
    const first = mint()
    const second = mint()

    expect(verifyRelayToken(first.token)).not.toBeNull()
    expect(verifyRelayToken(second.token)).not.toBeNull()
  })

  it('forgets a token once it has expired, so the set stays small', () => {
    // Prunes whatever an earlier test left, and leaves one entry of its own.
    verifyRelayToken(mint().token)
    expect(replaySetSize()).toBe(1)

    for (let i = 0; i < 5; i++) verifyRelayToken(mint().token)
    expect(replaySetSize()).toBe(6)

    vi.advanceTimersByTime(61_000)
    verifyRelayToken(mint().token)

    expect(replaySetSize()).toBe(1)
  })
})

describe('the mode it was minted for', () => {
  it('is refused for another mode, in both directions', () => {
    expect(verifyRelayToken(mint('dictation').token, 'ambient')).toBeNull()
    expect(verifyRelayToken(mint('ambient', true).token, 'dictation')).toBeNull()
  })

  it('is accepted for its own mode', () => {
    expect(verifyRelayToken(mint('ambient', true).token, 'ambient')).not.toBeNull()
  })

  it('is not burned by being offered for the wrong mode', () => {
    const { token } = mint('dictation')

    expect(verifyRelayToken(token, 'ambient')).toBeNull()
    expect(verifyRelayToken(token, 'dictation')).not.toBeNull()
  })
})
