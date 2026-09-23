/** A failed/pending turn must never silently borrow an earlier successful trace. */
export function selectExchange<T extends { id: number }>(
  exchanges: readonly T[],
  selectedId: number | null,
): T | null {
  if (selectedId !== null)
    return exchanges.find((item) => item.id === selectedId) ?? null;
  return exchanges.at(-1) ?? null;
}
