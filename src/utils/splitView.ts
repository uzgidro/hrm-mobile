// Which row the split (tablet) layout should have selected. Extracted from the
// identical useEffect in OrdersListScreen and LettersListScreen — both files
// carried the same logic and the same explanatory comment.
//
// Rules: entering split view anchors to the first row; a selection that has
// dropped out of the list (filter change, refetch) re-anchors; leaving split
// view clears.
export function selectSplitId<T extends { id: number }>(
  items: T[],
  currentId: number | null,
  isSplit: boolean,
): number | null {
  if (!isSplit) return null;
  if (items.length === 0) return null;
  if (currentId != null && items.some((i) => i.id === currentId)) return currentId;
  return items[0].id;
}
