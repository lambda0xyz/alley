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
    <div style={styles.card}>
      <button style={styles.header} onClick={() => setExpanded(e => !e)}>
        <span style={styles.artistName}>{artist.display_name}</span>
        <div style={styles.headerStats}>
          <span style={styles.stat}>
            <strong>¥{totalRevenue.toLocaleString()}</strong>
            <small> revenue</small>
          </span>
          <span style={styles.stat}>
            <strong>{totalSold}</strong>
            <small> sold</small>
          </span>
          <span style={styles.stat}>
            <strong>{totalStock}</strong>
            <small> left</small>
          </span>
          <span style={styles.chevron}>{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div style={styles.itemList}>
          {artist.items.length === 0
            ? <p style={styles.empty}>No items yet.</p>
            : artist.items.map(item => {
                const sold = item.quantity_total - item.quantity_remaining
                const revenue = sold * Number(item.price)
                const outOfStock = item.quantity_remaining === 0
                const lowStock = item.quantity_remaining <= 2 && !outOfStock

                return (
                  <div key={item.id} style={styles.itemRow}>
                    <div style={styles.itemLeft}>
                      <span style={styles.itemName}>{item.name}</span>
                      <span style={styles.itemPrice}>
                        ¥{Number(item.price).toLocaleString()}
                      </span>
                    </div>
                    <div style={styles.itemRight}>
                      <span style={styles.itemRevenue}>
                        ¥{revenue.toLocaleString()}
                      </span>
                      <span style={styles.itemSold}>{sold} sold</span>
                      <span style={{
                        ...styles.itemRemaining,
                        color: outOfStock ? '#9ca3af'
                          : lowStock ? '#d97706'
                          : '#555'
                      }}>
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

const styles = {
  card: {
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    overflow: 'hidden',
    background: '#fff',
  },
  header: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    gap: '8px',
  },
  artistName: {
    fontWeight: '700',
    fontSize: '1rem',
    flex: 1,
  },
  headerStats: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  stat: {
    fontSize: '0.85rem',
    color: '#444',
  },
  chevron: {
    fontSize: '0.7rem',
    color: '#888',
  },
  itemList: {
    borderTop: '1px solid #f0f0f0',
    display: 'flex',
    flexDirection: 'column',
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    borderBottom: '1px solid #f5f5f5',
    gap: '8px',
  },
  itemLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
  },
  itemName: {
    fontSize: '0.95rem',
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: '0.8rem',
    color: '#888',
  },
  itemRight: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    fontSize: '0.85rem',
  },
  itemRevenue: {
    fontWeight: '600',
  },
  itemSold: {
    color: '#555',
  },
  itemRemaining: {
    minWidth: '40px',
    textAlign: 'right',
  },
  empty: {
    padding: '12px 16px',
    color: '#aaa',
    fontSize: '0.85rem',
    margin: 0,
  },
}