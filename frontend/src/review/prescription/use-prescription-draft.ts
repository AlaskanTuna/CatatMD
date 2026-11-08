import type { PrescriptionLine } from '@shared/types'
import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import { count } from '../../lib/plural.js'
import {
  type LineEdit,
  type LineRow,
  lineKeys,
  manualRow,
  rowsFrom,
  toConfirm,
} from '../prescription-draft.js'

/**
 * How long the box rests before it is read again. Long enough not to parse on
 * every keystroke, short enough that the table has caught up by the time the
 * doctor looks at it.
 */
const REPARSE_DELAY_MS = 600

type PrescriptionDraftOptions = {
  consultationId: string
  dialog: { current: HTMLDialogElement | null }
  setError: (message: string | null) => void
}

export function usePrescriptionDraft({
  consultationId,
  dialog,
  setError,
}: PrescriptionDraftOptions) {
  const [dictation, setDictation] = useState('')
  const [parsedFrom, setParsedFrom] = useState<string | null>(null)
  const [lines, setLines] = useState<readonly PrescriptionLine[]>([])
  const [generics, setGenerics] = useState<readonly string[]>([])
  /**
   * What the doctor did to each line, kept apart from the parse so reading the
   * box again cannot overwrite it (`LineEdit`).
   */
  const [edits, setEdits] = useState<ReadonlyMap<string, LineEdit>>(new Map())
  const [manual, setManual] = useState<readonly { key: string; phrase: string }[]>([])
  const [parseFailed, setParseFailed] = useState(false)

  /*
   * The latest text, and the last text sent. A response for text the doctor has
   * since changed is dropped rather than rendered: a newer read is coming, and
   * offsets into the old text would quote the wrong words.
   */
  const latest = useRef('')
  const sent = useRef<string | null>(null)
  useEffect(() => {
    latest.current = dictation.trim()
  })

  const parse = useMutation({
    mutationFn: (dictated: string) => api.parsePrescription(consultationId, dictated),
    onSuccess: (response, dictated) => {
      if (dictated !== latest.current) {
        // Dropped, so not read: going back to these words must read them again.
        if (sent.current === dictated) sent.current = null
        return
      }
      setError(null)
      setParseFailed(false)
      /*
       * A line the doctor removed stays removed only while the text still
       * holds it. Its key is by drug, so without this a drug removed, deleted
       * from the box and then dictated again would come back hidden: said, and
       * dropped with no row to show for it.
       */
      const present = new Set(lineKeys(dictated, response.lines ?? []))
      setEdits((current) => {
        // A row added by hand is in no read, so only read rows are pruned.
        const stale = [...current].filter(
          ([key, each]) => each.removed && !key.startsWith('manual-') && !present.has(key),
        )
        if (stale.length === 0) return current
        const next = new Map(current)
        for (const [key, each] of stale) next.set(key, { ...each, removed: undefined })
        return next
      })
      setLines(response.lines ?? [])
      setGenerics(response.generics ?? [])
      setParsedFrom(dictated)
    },
    onError: (_cause, dictated) => {
      if (dictated === latest.current) setParseFailed(true)
      else if (sent.current === dictated) sent.current = null
    },
  })
  const mutateParse = parse.mutate

  const read = useCallback(
    (text: string) => {
      sent.current = text
      mutateParse(text)
    },
    [mutateParse],
  )

  const onDictated = useCallback(
    (text: string) => {
      setDictation(text)
      read(text)
    },
    [read],
  )

  const reset = useCallback(() => {
    setDictation('')
    setParsedFrom(null)
    setLines([])
    setEdits(new Map())
    setManual([])
    setParseFailed(false)
    setError(null)
    sent.current = null
  }, [setError])

  /*
   * Read again once the doctor stops editing, rather than on a button. The box
   * stays editable while a read is in flight; a response for text since
   * changed is dropped by `parse`.
   */
  const scheduleRead = useCallback(
    (open: boolean, listening: boolean) => {
      if (!open || listening) return undefined
      const text = dictation.trim()
      if (text === '') {
        setLines([])
        setParsedFrom(null)
        sent.current = null
        return undefined
      }
      if (text === sent.current) return undefined
      const timer = window.setTimeout(() => read(text), REPARSE_DELAY_MS)
      return () => window.clearTimeout(timer)
    },
    [dictation, read],
  )

  const fresh = parsedFrom !== null && dictation.trim() === parsedFrom
  const everyRow: LineRow[] = [
    ...(parsedFrom === null ? [] : rowsFrom(parsedFrom, lines, edits)),
    ...manual.map(({ key, phrase }) => manualRow(key, phrase, edits.get(key))),
  ]
  const rows = everyRow.filter(({ key }) => edits.get(key)?.removed !== true)
  const removedCount = everyRow.length - rows.length
  const { ready, unnamed, undecided } = toConfirm(rows)
  const ticked = rows.filter((row) => row.ticked)

  /** Stable across edits, so a row's React key and focus target never move. */
  const nextKey = useRef(0)

  /** Each row's drug field, so focus can follow the doctor's act. */
  const drugFields = useRef(new Map<string, HTMLInputElement>())
  const focusNext = useRef<string | null>(null)
  useEffect(() => {
    const key = focusNext.current
    if (key === null) return
    focusNext.current = null
    drugFields.current.get(key)?.focus()
  })

  const edit = (key: string, change: LineEdit) =>
    setEdits((current) => {
      const before = current.get(key)
      return new Map(current).set(key, {
        ...before,
        ...change,
        fields: { ...before?.fields, ...change.fields },
      })
    })

  const addByHand = () => {
    /*
     * The live box is the evidence, because a row typed by hand was read from
     * no line of it. Without words behind it there is nothing to quote, and
     * `dictated` is required.
     */
    const phrase = dictation.trim()
    if (phrase.length === 0) return
    nextKey.current += 1
    const key = `manual-${nextKey.current}`
    focusNext.current = key
    setManual((current) => [...current, { key, phrase }])
  }

  /*
   * One control for the table rather than one per row, beside Add Line, acting
   * on the ticked lines the way a list's selection does. A row read from the
   * box is hidden rather than deleted, since its words are still there and the
   * next read would only bring it back; a row added by hand is hidden too, so
   * Restore can bring either back.
   *
   * The tick also means "include", and exact names start ticked, so the button
   * counts what it would take and asks before it takes a named drug. Without
   * both, one press on a freshly read table hid every line it had.
   */
  const removeTicked = () => {
    if (ticked.length === 0) return
    const named = ticked.some((row) => row.draft.drug.trim() !== '')
    if (named && !window.confirm(removePrompt(ticked.length))) return
    setEdits((current) => {
      const next = new Map(current)
      for (const row of ticked) next.set(row.key, { ...current.get(row.key), removed: true })
      return next
    })
    dialog.current?.querySelector<HTMLButtonElement>(`[aria-label="${ADD_LINE_LABEL}"]`)?.focus()
  }

  const restoreRemoved = () =>
    setEdits((current) => {
      const next = new Map(current)
      for (const [key, each] of current) {
        if (each.removed) next.set(key, { ...each, removed: undefined })
      }
      return next
    })

  const stale = parsedFrom !== null && !fresh

  return {
    addByHand,
    dictation,
    drugFields,
    edit,
    everyRow,
    fresh,
    generics,
    lines,
    manual,
    onDictated,
    parseFailed,
    parsePending: parse.isPending,
    parsedFrom,
    read,
    ready,
    removeTicked,
    removedCount,
    restoreRemoved,
    rows,
    scheduleRead,
    setDictation,
    stale,
    ticked,
    undecided,
    unnamed,
    reset,
  }
}

const ADD_LINE_LABEL = 'Add Line'

const removePrompt = (n: number) =>
  `Remove ${count(n, 'ticked line')}? Restore brings ${n === 1 ? 'it' : 'them'} back until the dictation is closed.`
