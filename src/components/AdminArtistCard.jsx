import { useState } from 'react'
import { formatArtistName, formatMoney, formatSaleTime } from '../lib/format'
import { itemRevenue, itemSold, sumRevenue, sumSold } from '../lib/sales'
import { stockStatus } from '../lib/stock'
import SaleQty from './SaleQty'

// Remaining stock across an artist's items. Sold/revenue come from the
// append-only ledger (sumSold/sumRevenue), not these mutable counters.
function computeTotalStock(items) {
  return items.reduce((sum, item) => sum + item.quantity_remaining, 0)
}

export default function AdminArtistCard({ artist }) {
  const [expanded, setExpanded] = useState(false)
  // Which item rows have their sale history open. Tracked per item id so
  // several can be expanded at once independently of the artist toggle.
  const [openItems, setOpenItems] = useState(() => new Set())
  const totalRevenue = sumRevenue(artist.items)
  const totalSold = sumSold(artist.items)
  const totalStock = computeTotalStock(artist.items)

  function toggleItem(itemId) {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  return (
    <div className="artist-card">
      <button
        type="button"
        className="artist-header"
        onClick={() => setExpanded((e) => !e)}
      >
        <span className="artist-name">
          {formatArtistName(artist.display_name)}
        </span>
        <div className="artist-header-stats">
          <span className="artist-stat">
            <strong>{formatMoney(totalRevenue)}</strong>
            <small> revenue</small>
          </span>
          <span className="artist-stat">
            <strong>{totalSold}</strong>
            <small> sold</small>
          </span>
          <span className="artist-stat">
            <strong>{totalStock}</strong>
            <small> left</small>
          </span>
          <span className="artist-chevron">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="artist-items">
          {artist.items.length === 0 ? (
            <p className="artist-empty">No items yet.</p>
          ) : (
            artist.items.map((item) => {
              const sold = itemSold(item)
              const revenue = itemRevenue(item)
              const { remainingClass } = stockStatus(item)

              // Newest sale first. Only rows with history are expandable.
              const sales = [...(item.sales || [])].sort(
                (a, b) => new Date(b.sold_at) - new Date(a.sold_at),
              )
              const hasSales = sales.length > 0
              const isOpen = openItems.has(item.id)

              const rowInner = (
                <>
                  <div className="artist-item-left">
                    <span className="artist-item-name">{item.name}</span>
                    <span className="artist-item-price">
                      {formatMoney(item.price)}
                    </span>
                  </div>
                  <div className="artist-item-right">
                    <span className="artist-item-revenue">
                      {formatMoney(revenue)}
                    </span>
                    <span className="artist-item-sold">{sold} sold</span>
                    <span className={`artist-item-remaining ${remainingClass}`}>
                      {item.quantity_remaining} left
                    </span>
                    {hasSales && (
                      <span className="artist-item-chevron">
                        {isOpen ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </>
              )

              return (
                <div key={item.id} className="artist-item">
                  {hasSales ? (
                    <button
                      type="button"
                      className="artist-item-row artist-item-row-toggle"
                      onClick={() => toggleItem(item.id)}
                    >
                      {rowInner}
                    </button>
                  ) : (
                    <div className="artist-item-row">{rowInner}</div>
                  )}

                  {hasSales && isOpen && (
                    <div className="sale-log">
                      {sales.map((sale) => (
                        <div key={sale.id} className="sale-row">
                          <SaleQty quantity={sale.quantity_sold} />
                          <span className="sale-time">
                            {formatSaleTime(sale.sold_at)}
                          </span>
                          {sale.notes && (
                            <span className="sale-note">{sale.notes}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
