/**
 * `score` is the quiz correctness percentage (0-100); quest types without
 * scoring (lessons, challenges) omit it entirely. `undefined` is valid —
 * only a present-but-out-of-range or wrongly-typed value is rejected, so a
 * bad payload surfaces as a 400 rather than being silently clamped or stored.
 */
export function isValidScore(score: unknown): score is number | undefined {
  if (score === undefined) return true
  return typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 100
}
