import { useState } from 'react'

export default function AddItemForm({ onAdd, onCancel }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { error } = await onAdd({
      name: name.trim(),
      price: parseFloat(price),
      quantity_total: parseInt(quantity),
    })

    if (error) {
      setError(error.message)
      setSubmitting(false)
    }
    // parent clears the form by unmounting this component on success
  }

  return (
    <form onSubmit={handleSubmit} className="add-form">
      <input
        className="input"
        placeholder="Item name"
        value={name}
        onChange={e => setName(e.target.value)}
        required
        autoFocus
      />
      <div className="form-row">
        <input
          className="input"
          placeholder="Price"
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={e => setPrice(e.target.value)}
          required
        />
        <input
          className="input"
          placeholder="Quantity"
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-error">{error}</p>}
      <div className="form-row">
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add item'}
        </button>
        <button className="btn btn-ghost" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
