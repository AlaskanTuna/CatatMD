// `no-inline` because Vite inlines a small asset as a `data:` URL, which the production CSP's `script-src` refuses
// for a worklet; served from `/assets/` it is `'self'`. `pcm-capture.test.ts` pins this.
import workletUrl from './pcm-worklet.js?url&no-inline'

export const PCM_SAMPLE_RATE = 16_000
export const PCM_FRAME_SAMPLES = 1_600

export type PcmFramer = {
  push: (samples: Float32Array) => ArrayBuffer[]
  flush: () => ArrayBuffer[]
}

export type PcmCapture = {
  stop: () => Promise<void>
}

/**
 * Converts Float32 samples at any input rate into 16 kHz s16le frames.
 *
 * Resampling is linear interpolation at a fractional read position. The
 * position and any partly filled frame carry between calls, so a block
 * boundary neither drops nor repeats a sample.
 */
export function createPcmFramer(inputSampleRate: number): PcmFramer {
  if (!Number.isFinite(inputSampleRate) || inputSampleRate <= 0) {
    throw new Error('input sample rate must be positive')
  }
  const step = inputSampleRate / PCM_SAMPLE_RATE
  let buffered: number[] = []
  let position = 0
  let pending: number[] = []

  const encode = (samples: readonly number[]): ArrayBuffer => {
    const buffer = new ArrayBuffer(PCM_FRAME_SAMPLES * 2)
    const view = new DataView(buffer)
    for (let i = 0; i < PCM_FRAME_SAMPLES; i += 1) {
      const sample = samples[i] ?? 0
      const clipped = Math.max(-1, Math.min(1, sample))
      // -1 maps to -32768 and values just below 1 stay below 32768.
      const value = clipped < 0 ? Math.round(clipped * 32_768) : Math.round(clipped * 32_767)
      view.setInt16(i * 2, value, true)
    }
    return buffer
  }

  const emit = (value: number, out: ArrayBuffer[]) => {
    pending.push(value)
    if (pending.length === PCM_FRAME_SAMPLES) {
      out.push(encode(pending))
      pending = []
    }
  }

  const drain = (endOfInput: boolean, out: ArrayBuffer[]) => {
    for (;;) {
      const index = Math.floor(position)
      if (index >= buffered.length) break
      const fraction = position - index
      if (fraction > 0 && index + 1 >= buffered.length) {
        if (!endOfInput) break
        emit(buffered[index] ?? 0, out)
      } else if (fraction > 0) {
        emit((buffered[index] ?? 0) * (1 - fraction) + (buffered[index + 1] ?? 0) * fraction, out)
      } else {
        emit(buffered[index] ?? 0, out)
      }
      position += step
    }
    const consumed = Math.min(buffered.length, Math.floor(position))
    if (consumed > 0) {
      buffered = buffered.slice(consumed)
      position -= consumed
    }
  }

  return {
    push(samples) {
      for (const sample of samples) buffered.push(sample)
      const out: ArrayBuffer[] = []
      drain(false, out)
      return out
    },
    flush() {
      const out: ArrayBuffer[] = []
      drain(true, out)
      buffered = []
      position = 0
      if (pending.length > 0) {
        out.push(encode(pending))
        pending = []
      }
      return out
    },
  }
}

export async function startPcmCapture(
  microphone: MediaStream,
  onFrame: (frame: ArrayBuffer) => void,
): Promise<PcmCapture> {
  let context: AudioContext
  try {
    context = new AudioContext({ sampleRate: PCM_SAMPLE_RATE })
  } catch {
    context = new AudioContext()
  }

  try {
    await context.audioWorklet.addModule(workletUrl)
  } catch (cause) {
    await context.close().catch(() => undefined)
    throw cause
  }

  const framer = createPcmFramer(context.sampleRate)
  const source = context.createMediaStreamSource(microphone)
  const node = new AudioWorkletNode(context, 'pcm-capture')
  let stopped = false

  node.port.onmessage = (event: MessageEvent<unknown>) => {
    if (!(event.data instanceof Float32Array)) return
    for (const frame of framer.push(event.data)) onFrame(frame)
  }
  source.connect(node)
  // The processor writes no output; connecting it keeps the graph pulling
  // while passing silence to the destination.
  node.connect(context.destination)

  return {
    async stop() {
      if (stopped) return
      stopped = true
      for (const frame of framer.flush()) onFrame(frame)
      node.port.onmessage = null
      source.disconnect()
      node.disconnect()
      await context.close()
    },
  }
}
