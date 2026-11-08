import type { LiveAsrConfig } from '@shared/types'
import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { createChunkedRecorder } from '../../audio/chunked-recorder.js'
import {
  belowHardwareFloor,
  DICTATION_AUDIO_CONSTRAINTS,
  STALL_TIMEOUT_MS,
  toMono16k,
} from '../../audio/dictation.js'
import type { WorkerRequest, WorkerResponse } from '../../audio/protocol.js'
import { ApiError, api } from '../../lib/api.js'
import { capDictation, MAX_DICTATED_CHARACTERS } from '../prescription-draft.js'
import { useDictationStream } from '../use-dictation-stream.js'

const STALL_ERROR = `Transcription was stopped after ${Math.round(
  STALL_TIMEOUT_MS / 60_000,
)} minutes with no sign of progress. The speech model may be unreachable from this network. Type the medication instead.`

const WORKER_DIED_ERROR = 'Speech recognition stopped unexpectedly. Type the medication instead.'

const CAPPED_NOTICE =
  'Length limit reached, so recording stopped here. Confirm what you have, then dictate again.'

type PrescriptionDictationOptions = {
  open: boolean
  dictation: string
  setDictation: (value: string) => void
  onDictated: (text: string) => void
  setError: (message: string | null) => void
}

export function usePrescriptionDictation({
  open,
  dictation,
  setDictation,
  onDictated,
  setError,
}: PrescriptionDictationOptions) {
  /*
   * Streaming is always preferred here, and on-device is only the fallback when
   * the config says streaming is unavailable or does not answer. No stored
   * preference is read: the owner settled the engine for this page, so a
   * device left on the on-device choice by an older build still streams.
   */
  const [liveConfig, setLiveConfig] = useState<LiveAsrConfig | null>(null)
  const [configFailure, setConfigFailure] = useState<'unavailable' | 'unreachable' | null>(null)
  const streaming = liveConfig !== null

  /**
   * Whether the engine is a decision yet.
   *
   * `streaming` reads false while `liveConfig` is still null, and the config is
   * fetched asynchronously, so an autoStart running on the mount tick took the
   * on-device branch every time and the one-shot ref below then refused to
   * retry once the config landed. A doctor on the shipped streaming default got
   * the local model, silently, on every press of Dictate.
   */
  const engineResolved = liveConfig !== null || configFailure !== null

  const [lowPower] = useState(belowHardwareFloor)
  /** A socket loads no weights, so the floor only bites when the worker runs. */
  const thin = lowPower && !streaming

  const [phase, setPhase] = useState<'idle' | 'recording' | 'loading-model' | 'transcribing'>(
    'idle',
  )
  const [progress, setProgress] = useState<number | null>(null)
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null)
  const [elapsed, setElapsed] = useState(0)

  const attempt = useRef(0)
  const worker = useRef<Worker | null>(null)
  const stall = useRef<number | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  /**
   * Set by the streaming effect when the cap fires and read once in
   * `onComplete`. The cap path stops the socket with no notice of its own, so
   * without this the text truncates and the socket closes in silence.
   */
  const cappedRef = useRef(false)

  const latestOnDictated = useRef(onDictated)
  useEffect(() => {
    latestOnDictated.current = onDictated
  })

  const prefix = useRef('')

  const stream = useDictationStream({
    onComplete: (text, notice) => {
      const { text: joined } = capDictation(prefix.current, text, MAX_DICTATED_CHARACTERS)
      const trimmed = joined.trim()
      if (notice !== null) toast(notice)
      if (cappedRef.current) setError(CAPPED_NOTICE)
      if (trimmed.length > 0) latestOnDictated.current(trimmed)
    },
  })

  useEffect(() => {
    if (stream.phase !== 'streaming') return
    const { text, capped } = capDictation(prefix.current, stream.settled, MAX_DICTATED_CHARACTERS)
    setDictation(text)
    if (capped) {
      cappedRef.current = true
      stream.stop()
    }
  }, [setDictation, stream.phase, stream.settled, stream.stop])

  const capturing = phase === 'recording' || stream.phase !== null

  /** Only while the microphone is open, so a settled theatre holds no timer. */
  useEffect(() => {
    if (!capturing) return
    const started = Date.now()
    setElapsed(0)
    const tick = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1_000)),
      1_000,
    )
    return () => window.clearInterval(tick)
  }, [capturing])

  useEffect(() => {
    if (!open) return
    let live = true
    api
      .liveAsrConfig('dictation')
      .then((config) => {
        if (!live) return
        setLiveConfig(config)
        /*
         * Cleared on success, not only set on failure. Reopening the theatre
         * re-runs this effect, so a first attempt that failed and a retry that
         * succeeded would otherwise leave the "transcribes on this device"
         * sentence on screen while the socket was open. With the consent tick
         * gone from this surface that sentence is the only thing left telling
         * the doctor where the audio goes, so it must not be able to be false.
         */
        setConfigFailure(null)
      })
      .catch((cause: unknown) => {
        if (!live) return
        setConfigFailure(
          cause instanceof ApiError && cause.status === 503 ? 'unavailable' : 'unreachable',
        )
      })
    return () => {
      live = false
    }
  }, [open])

  const clearStall = useCallback(() => {
    if (stall.current !== null) {
      window.clearTimeout(stall.current)
      stall.current = null
    }
  }, [])

  const abort = useCallback(
    (message: string | null) => {
      attempt.current += 1
      clearStall()
      worker.current?.terminate()
      worker.current = null
      setPhase('idle')
      setProgress(null)
      setError(message)
    },
    [clearStall, setError],
  )

  const watchForStall = useCallback(() => {
    clearStall()
    stall.current = window.setTimeout(() => abort(STALL_ERROR), STALL_TIMEOUT_MS)
  }, [abort, clearStall])

  const ensureWorker = useCallback(() => {
    if (worker.current) return worker.current
    const id = attempt.current
    /*
     * By URL, never by import. A value import from the worker module would pull
     * the inference library onto the main chunk with it, which `protocol.ts`
     * measured at 458 kB to 982 kB. Only types come from `protocol.js`.
     */
    const instance = new Worker(new URL('../../audio/transcribe.worker.js', import.meta.url), {
      type: 'module',
    })

    instance.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (attempt.current !== id) return
      const message = event.data
      switch (message.type) {
        case 'progress':
          watchForStall()
          setProgress(message.total > 0 ? Math.round((message.loaded / message.total) * 100) : null)
          setPhase('loading-model')
          break
        case 'ready':
          watchForStall()
          setProgress(null)
          setPhase('transcribing')
          break
        case 'transcribing':
        case 'alive':
          watchForStall()
          break
        case 'finishing':
          clearStall()
          break
        case 'result': {
          clearStall()
          setPhase('idle')
          setProgress(null)
          // Through the same join and the same cap as the streaming path, so
          // one engine cannot append while the other replaces.
          const { text, capped } = capDictation(
            prefix.current,
            message.text.trim(),
            MAX_DICTATED_CHARACTERS,
          )
          if (capped) setError(CAPPED_NOTICE)
          const settled = text.trim()
          if (settled.length > 0) latestOnDictated.current(settled)
          break
        }
        case 'error':
          clearStall()
          setPhase('idle')
          setProgress(null)
          setError(WORKER_DIED_ERROR)
          break
        default: {
          const unhandled: never = message
          void unhandled
        }
      }
    }
    const died = () => {
      if (attempt.current !== id) return
      abort(WORKER_DIED_ERROR)
    }
    instance.onerror = died
    instance.onmessageerror = died
    worker.current = instance
    return instance
  }, [abort, clearStall, setError, watchForStall])

  const transcribe = useCallback(
    async (blob: Blob) => {
      setPhase('loading-model')
      setProgress(null)
      const id = attempt.current
      watchForStall()
      try {
        const decoded = await toMono16k(blob)
        if (attempt.current !== id) return
        const request: WorkerRequest = { type: 'transcribe', audio: decoded }
        ensureWorker().postMessage(request, [decoded.buffer as ArrayBuffer])
      } catch {
        if (attempt.current !== id) return
        clearStall()
        setPhase('idle')
        setError('That recording could not be read. Type the medication instead.')
      }
    },
    [clearStall, ensureWorker, watchForStall, setError],
  )

  const startRecording = useCallback(async () => {
    setError(null)
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: DICTATION_AUDIO_CONSTRAINTS,
      })
      const capture = createChunkedRecorder(media, chunks, (stopped) => {
        setLiveStream(null)
        void transcribe(new Blob(chunks.current, { type: stopped.mimeType }))
      })
      capture.start()
      recorder.current = capture
      setLiveStream(media)
      setPhase('recording')
    } catch {
      setError('Microphone access was refused, or no microphone is available.')
    }
  }, [setError, transcribe])

  const stopRecording = useCallback(() => {
    recorder.current?.stop()
    recorder.current = null
  }, [])

  const startDictation = useCallback(() => {
    setError(null)
    stream.clearError()
    cappedRef.current = false
    // Snapshotted for both engines. It was set only on the streaming branch,
    // so on-device "Dictate again" replaced the box rather than appending to it.
    prefix.current = dictation
    if (!streaming) {
      void startRecording()
      return
    }
    void stream.start()
  }, [dictation, setError, startRecording, stream, streaming])

  const stopDictation = useCallback(() => {
    if (stream.phase !== null) return stream.stop()
    stopRecording()
  }, [stopRecording, stream])

  /** Everything a run holds, dropped without firing a handler. */
  const teardown = useCallback(() => {
    attempt.current += 1
    if (stall.current !== null) window.clearTimeout(stall.current)
    stall.current = null
    worker.current?.terminate()
    worker.current = null
    const media = recorder.current
    recorder.current = null
    if (media === null) return
    media.onstop = null
    if (media.state !== 'inactive') media.stop()
    for (const track of media.stream.getTracks()) track.stop()
  }, [])

  useEffect(() => () => teardown(), [teardown])

  const reset = useCallback(() => {
    cappedRef.current = false
  }, [])

  return {
    configFailure,
    capturing,
    elapsed,
    engineResolved,
    liveConfig,
    liveStream,
    listening: phase !== 'idle' || stream.phase !== null,
    phase,
    progress,
    reset,
    startDictation,
    startRecording,
    stopDictation,
    stopRecording,
    stream,
    streaming,
    thin,
  }
}
