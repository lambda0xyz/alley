import { useState } from 'react'
import { uploadItemImage } from '../lib/uploadImage'

const LOW_STOCK_THRESHOLD = 2

export default function ItemCard({ item, onSell, onCorrect, onEdit, onDelete }) {
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [showQuantityPicker, setShowQuantityPicker] = useState(false)
  const [showCorrection, setShowCorrection] = useState(false)
  const [correctQty, setCorrectQty] = useState('')
  const [correctNote, setCorrectNote] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [editName, setEditName] = useState(item.name)
  const [editPrice, setEditPrice] = useState(String(item.price))
  const [editQty, setEditQty] = useState(String(item.quantity_total))
  const [editImageFile, setEditImageFile] = useState(null)
  const [editPreviewUrl, setEditPreviewUrl] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const outOfStock = item.quantity_remaining === 0
  const lowStock = item.quantity_remaining <= LOW_STOCK_THRESHOLD && !outOfStock

  // How many units have been sold so far — the most a correction can reverse
  // without pushing remaining back above the original total (qty_check).
  const soldCount = item.quantity_total - item.quantity_remaining

  // Price is captured live from the item, never snapshotted on each sale, so
  // editing it after a sale would rewrite past revenue. Lock it once anything sells.
  const priceLocked = soldCount > 0

  // Deleting an item with sales would destroy revenue history (and the DB's
  // ON DELETE RESTRICT would reject it anyway). Only allow it before any sale.
  const canDelete = soldCount === 0

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

  function clearEditPreview() {
    setEditImageFile(null)
    setEditPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  function handleEditFileChange(e) {
    const file = e.target.files?.[0] ?? null
    setEditImageFile(file)
    setEditPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return file ? URL.createObjectURL(file) : null
    })
  }

  function openEdit() {
    setEditName(item.name)
    setEditPrice(String(item.price))
    setEditQty(String(item.quantity_total))
    clearEditPreview()
    setConfirmDelete(false)
    setActionError(null)
    setShowEdit(true)
  }

  function closeEdit() {
    setShowEdit(false)
    clearEditPreview()
    setConfirmDelete(false)
    setActionError(null)
  }

  async function handleDelete() {
    setBusy(true)
    setActionError(null)
    const { error } = await onDelete(item.id)
    if (error) {
      // On success the parent drops this item and the card unmounts, so we
      // only need to recover from the failure path.
      setActionError(error.message)
      setConfirmDelete(false)
      setBusy(false)
    }
  }

  async function handleEdit(e) {
    e.preventDefault()

    const name = editName.trim()
    if (!name) {
      setActionError('Name is required')
      return
    }

    const total = parseInt(editQty, 10)
    if (!Number.isInteger(total) || total < soldCount) {
      setActionError(`Total must be at least ${soldCount} (already sold)`)
      return
    }

    let price = item.price
    if (!priceLocked) {
      price = Math.round(parseFloat(editPrice) * 100) / 100
      if (!Number.isFinite(price) || price < 0) {
        setActionError('Enter a valid price')
        return
      }
    }

    setBusy(true)
    setActionError(null)

    // Replace the photo only if a new one was picked; otherwise leave image_url
    // untouched (the hook omits it from the update when undefined).
    const fields = { name, price, quantity_total: total }
    if (editImageFile) {
      const { url, error: uploadError } = await uploadItemImage(editImageFile)
      if (uploadError) {
        setActionError(uploadError.message)
        setBusy(false)
        return
      }
      fields.image_url = url
    }

    const { error } = await onEdit(item.id, fields)
    if (error) {
      setActionError(error.message)
    } else {
      setShowEdit(false)
      clearEditPreview()
    }
    setBusy(false)
  }

  // While a form is open, drop the sold-out dimming so its inputs read as
  // fully interactive (editing the total of a sold-out item is valid — e.g. a
  // restock or a miscounted starting count).
  const formOpen = showEdit || showCorrection

  const cardClass = [
    'card',
    outOfStock && !formOpen && 'card-soldout',
    lowStock && 'card-warning',
  ].filter(Boolean).join(' ')

  return (
    <div className={cardClass}>
      {item.image_url && (
        <img
          className="item-thumb"
          src={item.image_url}
          alt={item.name}
          loading="lazy"
        />
      )}
      <div className="item-info">
        <span className="item-name">{item.name}</span>
        <span className="item-price">RON {Number(item.price).toFixed(2)}</span>
      </div>

      <div className="item-stock">
        {outOfStock
          ? <span className="text-soldout">sold out</span>
          : <span className={lowStock ? 'text-warning' : 'text-muted'}>
              {item.quantity_remaining} left
            </span>
        }
        <span className="text-muted">{item.quantity_total} total</span>
      </div>

      {actionError && <p className="text-error">{actionError}</p>}

      {showEdit ? (
        <form className="item-correction" onSubmit={handleEdit}>
          <input
            className="input"
            type="text"
            placeholder="Item name"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            autoFocus
          />
          <div className="form-row">
            <label className="field">
              <span className="field-label">Price</span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="Price"
                value={priceLocked ? Number(item.price).toFixed(2) : editPrice}
                onChange={e => setEditPrice(e.target.value)}
                disabled={priceLocked}
              />
            </label>
            <label className="field">
              <span className="field-label">Total qty</span>
              <input
                className="input"
                type="number"
                min={Math.max(soldCount, 1)}
                step="1"
                inputMode="numeric"
                placeholder="Total qty"
                value={editQty}
                onChange={e => setEditQty(e.target.value)}
              />
            </label>
          </div>
          {priceLocked && (
            <p className="text-muted item-edit-hint">
              Price is locked — {soldCount} already sold
            </p>
          )}
          <label className="field">
            <span className="field-label">
              {item.image_url ? 'Replace photo' : 'Add photo'}
            </span>
            <input
              className="input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleEditFileChange}
            />
          </label>
          {(editPreviewUrl || item.image_url) && (
            <img
              className="item-thumb item-thumb-preview"
              src={editPreviewUrl || item.image_url}
              alt="Preview"
            />
          )}
          <div className="form-row">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? '…' : 'Save changes'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={closeEdit} disabled={busy}>
              Cancel
            </button>
          </div>

          <div className="item-delete">
            {confirmDelete ? (
              <>
                <p className="item-edit-hint">Delete “{item.name}” for good?</p>
                <div className="form-row">
                  <button
                    className="btn btn-danger"
                    type="button"
                    onClick={handleDelete}
                    disabled={busy}
                  >
                    {busy ? '…' : 'Yes, delete'}
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : canDelete ? (
              <button
                className="btn-delete"
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
              >
                Delete item
              </button>
            ) : (
              <p className="text-muted item-edit-hint">
                Can't delete — {soldCount} already sold
              </p>
            )}
          </div>
        </form>
      ) : showCorrection ? (
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
                  disabled={busy || item.quantity_remaining < 2}
                >
                  Sell more
                </button>
              </div>
            )
          )}

          {!showQuantityPicker && (
            <div className="item-edit-row">
              <button
                className="btn-correct"
                onClick={openEdit}
                disabled={busy}
              >
                Edit
              </button>
              {soldCount > 0 && (
                <button
                  className="btn-correct"
                  onClick={() => { setShowCorrection(true); setActionError(null) }}
                  disabled={busy}
                >
                  Submit correction
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
