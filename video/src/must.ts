/** A value the cut's data guarantees, checked at run time rather than asserted to the compiler. */
export function must<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`Missing ${what}`)
  return value
}
