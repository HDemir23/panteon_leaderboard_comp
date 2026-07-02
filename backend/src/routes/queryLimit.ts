export function queryLimit(
  value: unknown,
  fallback: number,
  max: number,
): number {
  const limit = Number(value);

  if (!Number.isFinite(limit)) {
    return fallback;
  }

  return Math.min(max, Math.max(1, Math.floor(limit)));
}
