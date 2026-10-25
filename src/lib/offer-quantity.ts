/** Keep the quantity shown on a result card identical to the submitted value. */
export function offerQuantity(requested: number, maxQuantity?: number): number | null {
  const limit = maxQuantity === undefined ? 99 : Math.max(0, Math.min(99, Math.floor(maxQuantity)));
  if (!Number.isFinite(limit) || limit < 1) return null;
  const whole = Number.isFinite(requested) ? Math.floor(requested) : 1;
  return Math.max(1, Math.min(whole, limit));
}
