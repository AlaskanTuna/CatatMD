export type SourceMappedText = {
  text: string
  origin: number[]
}

type AppendSourceMappedText = (text: string, sourceIndexes: number | readonly number[]) => void

/** Collects transformed text with the source indexes that produced each output character. */
export function buildSourceMappedText(
  build: (append: AppendSourceMappedText) => void,
): SourceMappedText {
  let text = ''
  const origin: number[] = []

  build((part, sourceIndexes) => {
    text += part
    if (typeof sourceIndexes === 'number') {
      origin.push(sourceIndexes)
      return
    }
    for (const sourceIndex of sourceIndexes) origin.push(sourceIndex)
  })

  return { text, origin }
}

/** Copies a UTF-16 source range while keeping each code unit's original index. */
export function appendSourceRange(
  append: AppendSourceMappedText,
  source: string,
  start: number,
  end: number,
): void {
  const origin: number[] = []
  for (let index = start; index < end; index += 1) origin.push(index)
  append(source.slice(start, end), origin)
}
