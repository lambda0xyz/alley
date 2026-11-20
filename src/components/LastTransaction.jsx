import { formatTransactionTime } from '../lib/format'

// Server-confirmed "last transaction" banner for the artist dashboard. Only
// ever fed rows the database has returned, so it doubles as a receipt that a
// tap really went through (unlike the optimistic stock count on the card).
export default function LastTransaction({ sale }) {
  if (!sale) return null

  const correction = sale.quantity_sold < 0
  const qty = Math.abs(sale.quantity_sold)
  const name = sale.items?.name ?? 'item'

  return (
    <output className="last-tx" aria-live="polite">
      {/* Keyed on the sale id so each new confirmation replays the flash. */}
      <div key={sale.id} className="last-tx-inner">
        <span className="last-tx-label">Last transaction</span>
        <span className="last-tx-body">
          <span className={correction ? 'text-warning' : undefined}>
            {correction ? 'Corrected' : 'Sold'} {qty} × {name}
          </span>{' '}
          <span className="text-muted">
            at {formatTransactionTime(sale.sold_at)}
          </span>
        </span>
      </div>
    </output>
  )
}
