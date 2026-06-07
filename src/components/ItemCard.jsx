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

  const cardClass = [
    'card',
    outOfStock && 'card-soldout',
    lowStock && 'card-warning',
  ].filter(Boolean).join(' ')

  return (
    <div className={cardClass}>
      <div className="item-info">
        <span className="item-name">{item.name}</span>
        <span className="item-price">RON {Number(item.price).toLocaleString()}</span>
      </div>

      <div className="item-stock">
        {outOfStock
          ? <span className="text-soldout">Sold out</span>
          : <span className={lowStock ? 'text-warning' : 'text-muted'}>
              {item.quantity_remaining} left
            </span>
        }
      </div>

      {sellError && <p className="text-error">{sellError}</p>}

      {!outOfStock && (
        showQuantityPicker ? (
          <div className="item-qty-row">
            {[2, 3, 4, 5].map(n => (
              n <= item.quantity_remaining && (
                <button
                  key={n}
                  className="btn btn-ghost btn-qty"
                  onClick={() => handleSell(n)}
                  disabled={selling}
                >
                  ×{n}
                </button>
              )
            ))}
            <button
              className="btn btn-ghost btn-qty"
              onClick={() => setShowQuantityPicker(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="item-actions">
            <button
              className="btn btn-primary btn-sell"
              onClick={() => handleSell(1)}
              disabled={selling}
            >
              {selling ? '…' : 'Sold 1'}
            </button>
            <button
              className="btn btn-ghost"
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
