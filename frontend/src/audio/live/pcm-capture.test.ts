import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createPcmFramer, PCM_FRAME_SAMPLES } from './pcm-capture.js'

const samples = (count: number, value = 0.5) => new Float32Array(count).fill(value)

function readInt16(frame: ArrayBuffer, index: number): number {
  return new DataView(frame).getInt16(index * 2, true)
}

describe('createPcmFramer', () => {
  it('converts 48 kHz input to one 16 kHz frame of exactly 1,600 samples', () => {
    const framer = createPcmFramer(48_000)

    const frames = framer.push(samples(4_800))

    expect(frames).toHaveLength(1)
    expect(frames[0]?.byteLength).toBe(PCM_FRAME_SAMPLES * 2)
    expect(framer.flush()).toEqual([])
  })

  it('carries the remainder across uneven chunk sizes without losing samples', () => {
    const framer = createPcmFramer(16_000)
    const frames: ArrayBuffer[] = []

    frames.push(...framer.push(samples(700, 0.25)))
    frames.push(...framer.push(samples(700, 0.25)))
    expect(frames).toHaveLength(0)
    frames.push(...framer.push(samples(700, 0.25)))

    expect(frames).toHaveLength(1)
    expect(readInt16(frames[0] as ArrayBuffer, 1_599)).toBe(Math.round(0.25 * 32_767))
    // 500 samples remain, so flush pads exactly one more frame.
    const tail = framer.flush()
    expect(tail).toHaveLength(1)
    expect(readInt16(tail[0] as ArrayBuffer, 499)).toBe(Math.round(0.25 * 32_767))
    expect(readInt16(tail[0] as ArrayBuffer, 500)).toBe(0)
  })

  it('carries a fractional resampling position across chunks', () => {
    const framer = createPcmFramer(48_000)
    const frames: ArrayBuffer[] = []
    // Uneven blocks that do not align with the 3:1 ratio.
    for (const count of [1_001, 999, 2_800]) frames.push(...framer.push(samples(count, 0.5)))

    expect(frames).toHaveLength(1)
    expect(framer.flush()).toEqual([])
  })

  it('clips samples outside ±1', () => {
    const framer = createPcmFramer(16_000)
    const loud = samples(PCM_FRAME_SAMPLES)
    loud[0] = 2
    loud[1] = -2
    loud[2] = 1
    loud[3] = -1

    const [frame] = framer.push(loud)

    expect(frame).toBeDefined()
    expect(readInt16(frame as ArrayBuffer, 0)).toBe(32_767)
    expect(readInt16(frame as ArrayBuffer, 1)).toBe(-32_768)
    expect(readInt16(frame as ArrayBuffer, 2)).toBe(32_767)
    expect(readInt16(frame as ArrayBuffer, 3)).toBe(-32_768)
  })

  it('writes little-endian byte order', () => {
    const framer = createPcmFramer(16_000)
    const input = samples(PCM_FRAME_SAMPLES, 0)
    // 0x0102 / 32767 as a positive sample produces bytes 02 01 when little-endian.
    input[0] = 0x0102 / 32_767

    const [frame] = framer.push(input)
    const bytes = new Uint8Array(frame as ArrayBuffer)

    expect([bytes[0], bytes[1]]).toEqual([0x02, 0x01])
  })
})

describe('the worklet module', () => {
  it('is never inlined as a data: URL, which the production CSP would refuse', () => {
    const source = readFileSync(join(process.cwd(), 'src/audio/live/pcm-capture.ts'), 'utf8')
    expect(source).toMatch(/from '\.\/pcm-worklet\.js\?url&no-inline'/)
  })
})
