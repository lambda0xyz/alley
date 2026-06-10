import { formatSaleTime, formatArtistName } from '../lib/format'

// How many of the most recent sales/corrections to show. The data is already
// fully loaded by useAdminData (and kept live by its realtime subscription),
// so this is purely a display cap — flatten every sale, sort newest-first,
// and slice off the top few.
const ACTIVITY_LIMIT = 20

function buildRecent(artists) {
  const entries = []
  for (const artist of artists) {
    for (const item of artist.items) {
      for (const sale of item.sales || []) {
        entries.push({
          id: sale.id,
          artist: formatArtistName(artist.display_name),
          item: item.name,
          quantity: sale.quantity_sold,
          soldAt: sale.sold_at,
          notes: sale.notes,
        })
      }
    }
  }
  entries.sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt))
  return entries.slice(0, ACTIVITY_LIMIT)
}

export default function ActivityLog({ artists }) {
  const recent = buildRecent(artists)

  return (
    <div className="activity">
      <div className="activity-header">
        <span className="activity-title">Recent activity</span>
        {recent.length > 0 && (
          <span className="activity-count">last {recent.length}</span>
        )}
      </div>

      {recent.length === 0 ? (
        <p className="artist-empty">No sales yet.</p>
      ) : (
        <div className="activity-list">
          {recent.map(entry => {
            // Negative quantity is a correction (stock added back); a note
            // usually explains why. Positive is a normal sale.
            const correction = entry.quantity < 0
            return (
              <div key={entry.id} className="activity-row">
                <span className={`sale-qty ${correction ? 'sale-qty-correction' : ''}`}>
                  {correction ? `−${Math.abs(entry.quantity)}` : `×${entry.quantity}`}
                </span>
                <div className="activity-main">
                  <span className="activity-item-name">{entry.item}</span>
                  <span className="activity-artist">{entry.artist}</span>
                  {entry.notes && <span className="sale-note">{entry.notes}</span>}
                </div>
                <span className="sale-time">{formatSaleTime(entry.soldAt)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
