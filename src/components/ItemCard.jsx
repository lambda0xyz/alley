import { useState } from 'react'

const LOW_STOCK_THRESHOLD = 2

export default function ItemCard({ item, onSell, onCorrect }) {
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [showQuantityPicker, setShowQuantityPicker] = useState(false)
  const [showCorrection, setShowCorrection] = useState(false)
  const [correctQty, setCorrectQty] = useState('')
  const [correctNote, setCorrectNote] = useState('')

  const outOfStock = item.quantity_remaining === 0
  const lowStock = item.quantity_remaining <= LOW_STOCK_THRESHOLD && !outOfStock

  // How many units have been sold so far — the most a correction can reverse
  // without pushing remaining back above the original total (qty_check).
  const soldCount = item.quantity_total - item.quantity_remaining

  async function handleSell(quantity) {
    setBusy(true)
    setActionError(null)
    setShowQuantityPicker(false)
    const { error } = await onSell(item.id, quantity)
    if (error) setActionError(error.message)
    setBusy(false)
  }

  async function handleCorrect(e) {
    e.preventDefault()
    const quantity = parseInt(correctQty, 10)
    if (!Number.isInteger(quantity) || quantity < 1) {
      setActionError('Enter a quantity of 1 or more')
      return
    }
    if (quantity > soldCount) {
      setActionError(`Can't remove more than the ${soldCount} sold`)
      return
    }
    setBusy(true)
    setActionError(null)
    const { error } = await onCorrect(item.id, quantity, correctNote)
    if (error) {
      setActionError(error.message)
    } else {
      setShowCorrection(false)
      setCorrectQty('')
      setCorrectNote('')
    }
    setBusy(false)
  }

  function closeCorrection() {
    setShowCorrection(false)
    setCorrectQty('')
    setCorrectNote('')
    setActionError(null)
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
        <span className="item-price">RON {Number(item.price).toFixed(2)}</span>
      </div>

      <div className="item-stock">
        {outOfStock
          ? <span className="text-soldout">Sold out</span>
          : <span className={lowStock ? 'text-warning' : 'text-muted'}>
              {item.quantity_remaining} left
            </span>
        }
      </div>

      {actionError && <p className="text-error">{actionError}</p>}

      {showCorrection ? (
        <form className="item-correction" onSubmit={handleCorrect}>
          <input
            className="input"
            type="number"
            min="1"
            max={soldCount}
            step="1"
            inputMode="numeric"
            placeholder={`Quantity to remove (max ${soldCount})`}
            value={correctQty}
            onChange={e => setCorrectQty(e.target.value)}
            autoFocus
          />
          <input
            className="input"
            type="text"
            placeholder="Reason (optional)"
            value={correctNote}
            onChange={e => setCorrectNote(e.target.value)}
          />
          <div className="form-row">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? '…' : 'Submit correction'}
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={closeCorrection}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {!outOfStock && (
            showQuantityPicker ? (
              <div className="item-qty-row">
                {[2, 3, 4, 5].map(n => (
                  n <= item.quantity_remaining && (
                    <button
                      key={n}
                      className="btn btn-ghost btn-qty"
                      onClick={() => handleSell(n)}
                      disabled={busy}
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
                  disabled={busy}
                >
                  {busy ? '…' : 'Sell 1'}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowQuantityPicker(true)}
                  disabled={busy}
                >
                  Sell more
                </button>
              </div>
            )
          )}

          {soldCount > 0 && !showQuantityPicker && (
            <button
              className="btn-correct"
              onClick={() => { setShowCorrection(true); setActionError(null) }}
              disabled={busy}
            >
              Submit correction
            </button>
          )}
        </>
      )}
    </div>
  )
}
