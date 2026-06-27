// Sold/revenue figures derive from the append-only `sales` ledger — the source
// of truth — not from `quantity_total - quantity_remaining`. Those counters are
// mutable: an artist can rewrite `quantity_remaining` with a direct API call and
// zero out their reported sales while keeping the goods. The ledger can't be
// rewritten (no UPDATE/DELETE policy on `sales`), so summing it gives the real
// number. For untampered data the two agree, because the sales trigger moves
// `quantity_remaining` by exactly `quantity_sold` on every insert.
//
// A sale row's `quantity_sold` is positive for a sale and negative for a
// correction, so a plain sum nets corrections automatically.

// Net units sold for one item, from its nested sales rows.
export function itemSold(item) {
  return (item.sales || []).reduce((sum, s) => sum + s.quantity_sold, 0)
}

// Revenue for one item: net sold × current price.
export function itemRevenue(item) {
  return itemSold(item) * Number(item.price)
}

// Totals across a list of items (one artist, or all of them flattened).
export function sumSold(items) {
  return items.reduce((sum, item) => sum + itemSold(item), 0)
}

export function sumRevenue(items) {
  return items.reduce((sum, item) => sum + itemRevenue(item), 0)
}

// Flatten the nested append-only sales of a list of items into flat entries,
// each carrying its parent item's name and (numeric) price alongside the sale
// fields. Items with no sales contribute nothing. Callers add artist
// attribution, sorting, and presentation. Unsorted — the order follows the
// input items and their nested sales.
export function flattenItemSales(items) {
  const rows = []
  for (const item of items) {
    for (const sale of item.sales || []) {
      rows.push({
        id: sale.id,
        soldAt: sale.sold_at,
        item: item.name,
        price: Number(item.price),
        quantity: sale.quantity_sold,
        notes: sale.notes,
      })
    }
  }
  return rows
}
