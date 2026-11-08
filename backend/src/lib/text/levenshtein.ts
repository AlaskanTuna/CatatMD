/** Levenshtein distance. Two rows rather than a full matrix. */
/**
 * `Uint32Array` keeps the two rows fixed-size and cheap. `noUncheckedIndexedAccess`
 * types even a typed-array read as possibly undefined and Biome forbids `!`, so
 * the `?? 0` fallbacks stand in for a cast. Every index below is provably inside
 * its row, so none of them can actually be taken.
 */
export function levenshtein(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  let previous = new Uint32Array(b.length + 1)
  let current = new Uint32Array(b.length + 1)
  for (let j = 0; j <= b.length; j += 1) previous[j] = j

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i
    const left = a[i - 1]
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = (previous[j - 1] ?? 0) + (left === b[j - 1] ? 0 : 1)
      current[j] = Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, substitution)
    }
    const finished = previous
    previous = current
    current = finished
  }
  return previous[b.length] ?? 0
}
