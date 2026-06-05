import { useState } from 'react'

const LOW_STOCK_THRESHOLD = 2

export default function ItemCard({ item, onSell }) {
  const [selling, setSelling] = useState(false)
  const [sellError, setSellError] = useState(null)
  const [showQuantityPicker, setShowQuantityPicker] = useState(false)

  const outOfStock = item.quantity_remaining === 0
  const lowStock = item.quantity_remaining <= LOW_STOCK_THRESHOLD && !outOfStock

  async function handleSell(quantity) {
    setSelling(true)
    setSellError(null)
    setShowQuantityPicker(false)
    const { error } = await onSell(item.id, quantity)
    if (error) setSellError(error.message)
    setSelling(false)
  }

  return (
    <div style={{
      ...styles.card,
      ...(outOfStock ? styles.cardSoldOut : {}),
      ...(lowStock ? styles.cardLowStock : {}),
    }}>
      <div style={styles.info}>
        <span style={styles.name}>{item.name}</span>
        <span style={styles.price}>¥{Number(item.price).toLocaleString()}</span>
      </div>

      <div style={styles.stock}>
        {outOfStock
          ? <span style={styles.soldOutLabel}>Sold out</span>
          : <span style={lowStock ? styles.lowStockLabel : styles.stockLabel}>
              {item.quantity_remaining} left
            </span>
        }
      </div>

      {sellError && <p style={styles.error}>{sellError}</p>}

      {!outOfStock && (
        showQuantityPicker ? (
          <div style={styles.quantityRow}>
            {[2, 3, 4, 5].map(n => (
              n <= item.quantity_remaining && (
                <button
                  key={n}
                  style={styles.qtyButton}
                  onClick={() => handleSell(n)}
                  disabled={selling}
                >
                  ×{n}
                </button>
              )
            ))}
            <button
              style={styles.cancelButton}
              onClick={() => setShowQuantityPicker(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div style={styles.actions}>
            <button
              style={styles.sellButton}
              onClick={() => handleSell(1)}
              disabled={selling}
            >
              {selling ? '...' : 'Sold 1'}
            </button>
            <button
              style={styles.multiButton}
              onClick={() => setShowQuantityPicker(true)}
              disabled={selling}
            >
              +qty
            </button>
          </div>
        )
      )}
    </div>
  )
}

const styles = {
  card: {
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid #e0e0e0',
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  cardLowStock: {
    borderColor: '#f59e0b',
    background: '#fffbeb',
  },
  cardSoldOut: {
    borderColor: '#e5e7eb',
    background: '#f9fafb',
    opacity: 0.6,
  },
  info: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  name: {
    fontWeight: '600',
    fontSize: '1rem',
  },
  price: {
    fontSize: '0.9rem',
    color: '#555',
  },
  stock: {
    fontSize: '0.85rem',
  },
  stockLabel: { color: '#555' },
  lowStockLabel: { color: '#d97706', fontWeight: '600' },
  soldOutLabel: { color: '#9ca3af' },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  sellButton: {
    flex: 1,
    padding: '14px',
    fontSize: '1rem',
    fontWeight: '600',
    borderRadius: '8px',
    border: 'none',
    background: '#000',
    color: '#fff',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  multiButton: {
    padding: '14px 16px',
    fontSize: '0.9rem',
    borderRadius: '8px',
    border: '1px solid #ddd',
    background: '#f9f9f9',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  quantityRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  qtyButton: {
    flex: 1,
    padding: '12px',
    fontSize: '1rem',
    borderRadius: '8px',
    border: '1px solid #ddd',
    background: '#f0f0f0',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    fontSize: '0.9rem',
    borderRadius: '8px',
    border: '1px solid #ddd',
    background: '#fff',
    cursor: 'pointer',
  },
  error: {
    color: 'red',
    fontSize: '0.8rem',
    margin: 0,
  },
}