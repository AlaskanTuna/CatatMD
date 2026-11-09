import { describe, expect, it } from 'vitest'
import { LIVE_ASR_RELAY_URL, LiveAsrConfigSchema } from './live-asr.js'

const config = {
  model: 'qwen3-asr-flash-realtime',
  languageHints: ['en'],
  languageIdentification: false,
  speakerDiarization: false,
  endpointDetection: true,
  context: { general: [{ key: 'domain', value: 'Healthcare' }] },
  audioFormat: 'pcm_s16le' as const,
  sampleRate: 16000 as const,
}

describe('LiveAsrConfigSchema provider consistency (#487)', () => {
  it('accepts Qwen on the relay in sg', () => {
    const r = LiveAsrConfigSchema.safeParse({
      provider: 'qwen',
      region: 'sg',
      websocketUrl: 'wss://api.example.com/api/asr/live-relay',
      config,
    })
    expect(r.success).toBe(true)
  })

  it('accepts Soniox on its own host in a Soniox region', () => {
    const r = LiveAsrConfigSchema.safeParse({
      provider: 'soniox',
      region: 'us',
      websocketUrl: 'wss://stt-rt.soniox.com/transcribe-websocket',
      config: { ...config, audioFormat: undefined, sampleRate: undefined },
    })
    expect(r.success).toBe(true)
  })

  it.each([
    [
      'Qwen pointed at Soniox',
      {
        provider: 'qwen',
        region: 'sg',
        websocketUrl: 'wss://stt-rt.soniox.com/transcribe-websocket',
      },
    ],
    [
      'Soniox pointed at the relay',
      {
        provider: 'soniox',
        region: 'us',
        websocketUrl: 'wss://api.example.com/api/asr/live-relay',
      },
    ],
    [
      'Qwen in a Soniox region',
      { provider: 'qwen', region: 'us', websocketUrl: 'wss://api.example.com/api/asr/live-relay' },
    ],
    [
      'Soniox in sg',
      {
        provider: 'soniox',
        region: 'sg',
        websocketUrl: 'wss://stt-rt.soniox.com/transcribe-websocket',
      },
    ],
  ])('refuses %s', (_name, body) => {
    expect(LiveAsrConfigSchema.safeParse({ ...body, config }).success).toBe(false)
  })

  it.each([
    'ws://api.example.com/api/asr/live-relay',
    'wss://api.example.com/api/asr/live-relay/x',
    'wss://api.example.com/live-relay',
    'https://api.example.com/api/asr/live-relay',
  ])('refuses relay address %s', (url) => expect(LIVE_ASR_RELAY_URL.test(url)).toBe(false))

  it.each([
    'ws://localhost:3001/api/asr/live-relay',
    'ws://127.0.0.1:3001/api/asr/live-relay',
    'wss://catatmd-api.onrender.com/api/asr/live-relay',
  ])('accepts relay address %s', (url) => expect(LIVE_ASR_RELAY_URL.test(url)).toBe(true))
})
