import { useState } from 'react'
import { formatSaleTime, formatArtistName } from '../lib/format'

function computeStats(items) {
  const totalRevenue = items.reduce((sum, item) => {
    const sold = item.quantity_total - item.quantity_remaining
    return sum + sold * Number(item.price)
  }, 0)

  const totalSold = items.reduce((sum, item) =>
    sum + (item.quantity_total - item.quantity_remaining), 0
  )

  const totalStock = items.reduce((sum, item) =>
    sum + item.quantity_remaining, 0
  )

  return { totalRevenue, totalSold, totalStock }
}

export default function AdminArtistCard({ artist }) {
  const [expanded, setExpanded] = useState(false)
  // Which item rows have their sale history open. Tracked per item id so
  // several can be expanded at once independently of the artist toggle.
  const [openItems, setOpenItems] = useState(() => new Set())
  const { totalRevenue, totalSold, totalStock } = computeStats(artist.items)

  function toggleItem(itemId) {
    setOpenItems(prev => {
      const next = new Set(prev)
      next.has(itemId) ? next.delete(itemId) : next.add(itemId)
      return next
    })
  }

  return (
    <div className="artist-card">
      <button className="artist-header" onClick={() => setExpanded(e => !e)}>
        <span className="artist-name">{formatArtistName(artist.display_name)}</span>
        <div className="artist-header-stats">
          <span className="artist-stat">
            <strong>RON {totalRevenue.toFixed(2)}</strong>
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
          {artist.items.length === 0
            ? <p className="artist-empty">No items yet.</p>
            : artist.items.map(item => {
                const sold = item.quantity_total - item.quantity_remaining
                const revenue = sold * Number(item.price)
                const outOfStock = item.quantity_remaining === 0
                const lowStock = item.quantity_remaining <= 2 && !outOfStock
                const remainingClass = outOfStock ? 'text-soldout'
                  : lowStock ? 'text-warning'
                  : 'text-muted'

                // Newest sale first. Only rows with history are expandable.
                const sales = [...(item.sales || [])]
                  .sort((a, b) => new Date(b.sold_at) - new Date(a.sold_at))
                const hasSales = sales.length > 0
                const isOpen = openItems.has(item.id)

                const rowInner = (
                  <>
                    <div className="artist-item-left">
                      <span className="artist-item-name">{item.name}</span>
                      <span className="artist-item-price">
                        RON {Number(item.price).toFixed(2)}
                      </span>
                    </div>
                    <div className="artist-item-right">
                      <span className="artist-item-revenue">
                        RON {revenue.toFixed(2)}
                      </span>
                      <span className="artist-item-sold">{sold} sold</span>
                      <span className={`artist-item-remaining ${remainingClass}`}>
                        {item.quantity_remaining} left
                      </span>
                      {hasSales && (
                        <span className="artist-item-chevron">{isOpen ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </>
                )

                return (
                  <div key={item.id} className="artist-item">
                    {hasSales ? (
                      <button
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
                        {sales.map(sale => {
                          const correction = sale.quantity_sold < 0
                          return (
                            <div key={sale.id} className="sale-row">
                              <span className={`sale-qty ${correction ? 'sale-qty-correction' : ''}`}>
                                {correction
                                  ? `−${Math.abs(sale.quantity_sold)}`
                                  : `×${sale.quantity_sold}`}
                              </span>
                              <span className="sale-time">{formatSaleTime(sale.sold_at)}</span>
                              {sale.notes && <span className="sale-note">{sale.notes}</span>}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
          }
        </div>
      )}
    </div>
  )
}
