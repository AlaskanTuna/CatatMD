import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

const testEnv = vi.hoisted(() => ({
  QWEN_API_KEY: 'test-qwen-key' as string | undefined,
  QWEN_ASR_RT_MODEL: 'qwen3-asr-flash-realtime',
  SONIOX_RT_MODEL: 'stt-rt-v5',
}))

vi.mock('../../config/env.js', () => ({ env: testEnv }))

import {
  getQwenLiveDescriptor,
  openQwenRealtime,
  QWEN_REALTIME_ENDPOINT,
  qwenLiveSessionConfig,
  qwenRealtimeUrl,
} from './qwen-realtime.js'
import { liveSessionConfig } from './soniox.js'

/**
 * The Qwen side of the live relay (#487). The wire behaviour against a server is
 * covered with the relay in `live-relay.test.ts`; this pins the parts that are
 * constants, which are the parts a review has to be able to read off a test.
 */
describe('the destination', () => {
  it('is Model Studio in Singapore and no other host', () => {
    expect(QWEN_REALTIME_ENDPOINT).toBe('wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime')
    expect(qwenRealtimeUrl('qwen3-asr-flash-realtime')).toBe(
      'wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime?model=qwen3-asr-flash-realtime',
    )
  })

  it('can carry a model id and nothing that changes the host', () => {
    const url = new URL(qwenRealtimeUrl('a/../@evil.example#'))

    expect(url.host).toBe('dashscope-intl.aliyuncs.com')
    expect(url.pathname).toBe('/api-ws/v1/realtime')
  })

  it('is not built from configuration: the module reads only a model and a key from env', () => {
    const source = readFileSync(
      fileURLToPath(new URL('./qwen-realtime.ts', import.meta.url)),
      'utf8',
    )
    const reads = [...source.matchAll(/\benv\.([A-Z_]+)/g)].map((match) => match[1])

    expect(new Set(reads)).toEqual(new Set(['QWEN_API_KEY', 'QWEN_ASR_RT_MODEL']))
  })

  it('refuses to open without a key, and does not try', () => {
    testEnv.QWEN_API_KEY = undefined

    expect(() =>
      openQwenRealtime({
        terms: [],
        handlers: {
          onSpeechStarted: vi.fn(),
          onInterim: vi.fn(),
          onSpeechStopped: vi.fn(),
          onCompleted: vi.fn(),
          onFinished: vi.fn(),
          onError: vi.fn(),
          onClose: vi.fn(),
        },
      }),
    ).toThrow('QWEN_API_KEY is not set')

    testEnv.QWEN_API_KEY = 'test-qwen-key'
  })

  it('stamps the audit row with the model and the Singapore region', () => {
    expect(getQwenLiveDescriptor()).toEqual({
      provider: 'qwen',
      model: 'qwen3-asr-flash-realtime',
      region: 'sg',
    })
  })
})

describe('the settings a session is told to use', () => {
  it('are written out for ambient', () => {
    expect(qwenLiveSessionConfig('ambient')).toEqual({
      model: 'qwen3-asr-flash-realtime',
      languageHints: ['en', 'ms'],
      languageIdentification: false,
      speakerDiarization: false,
      endpointDetection: false,
      context: liveSessionConfig('ambient').context,
      audioFormat: 'pcm_s16le',
      sampleRate: 16000,
    })
  })

  it('are written out for dictation, which asks for turn boundaries', () => {
    expect(qwenLiveSessionConfig('dictation')).toEqual({
      model: 'qwen3-asr-flash-realtime',
      languageHints: ['en', 'ms'],
      languageIdentification: false,
      speakerDiarization: false,
      endpointDetection: true,
      context: liveSessionConfig('dictation').context,
      audioFormat: 'pcm_s16le',
      sampleRate: 16000,
    })
  })

  it('reuse the per-mode context the Soniox settings build, so the vocabulary is written once', () => {
    expect(qwenLiveSessionConfig('ambient').context.terms).toContain('selesema')
    expect(qwenLiveSessionConfig('dictation').context.terms).toContain('amoxicillin')
    expect(qwenLiveSessionConfig('dictation').context.terms).not.toContain('selesema')
  })

  it('hand out a fresh object every time, so a caller cannot change the next session', () => {
    const first = qwenLiveSessionConfig('ambient')
    first.languageHints.push('zh')
    first.context.terms?.push('injected')

    expect(qwenLiveSessionConfig('ambient').languageHints).toEqual(['en', 'ms'])
    expect(qwenLiveSessionConfig('ambient').context.terms).not.toContain('injected')
  })

  it.each(['toString', 'constructor', 'AMBIENT', '', 'ambient; patient=X'])(
    'throw on %j rather than fall back to a mode the caller did not ask for',
    (mode) => {
      expect(() => qwenLiveSessionConfig(mode as 'ambient')).toThrow('Unknown live ASR mode')
    },
  )
})
