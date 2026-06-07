import { useState } from 'react'

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
  const { totalRevenue, totalSold, totalStock } = computeStats(artist.items)

  return (
    <div className="artist-card">
      <button className="artist-header" onClick={() => setExpanded(e => !e)}>
        <span className="artist-name">{artist.display_name}</span>
        <div className="artist-header-stats">
          <span className="artist-stat">
            <strong>¥{totalRevenue.toLocaleString()}</strong>
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

                return (
                  <div key={item.id} className="artist-item-row">
                    <div className="artist-item-left">
                      <span className="artist-item-name">{item.name}</span>
                      <span className="artist-item-price">
                        ¥{Number(item.price).toLocaleString()}
                      </span>
                    </div>
                    <div className="artist-item-right">
                      <span className="artist-item-revenue">
                        ¥{revenue.toLocaleString()}
                      </span>
                      <span className="artist-item-sold">{sold} sold</span>
                      <span className={`artist-item-remaining ${remainingClass}`}>
                        {item.quantity_remaining} left
                      </span>
                    </div>
                  </div>
                )
              })
          }
        </div>
      )}
    </div>
  )
}
