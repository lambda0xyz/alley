// Stock-level status for an item, derived from its current quantity_remaining.
// Shared by the artist ItemCard and the admin AdminArtistCard so the low-stock
// cutoff and the colour classes stay in sync (they used to diverge — the
// threshold was a named constant in one and a bare 2 in the other).
export const LOW_STOCK_THRESHOLD = 2

export function stockStatus(item) {
  const outOfStock = item.quantity_remaining === 0
  const lowStock = item.quantity_remaining <= LOW_STOCK_THRESHOLD && !outOfStock
  const remainingClass = outOfStock
    ? 'text-soldout'
    : lowStock
      ? 'text-warning'
      : 'text-muted'
  return { outOfStock, lowStock, remainingClass }
}
