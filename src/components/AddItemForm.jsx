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
    <form onSubmit={handleSubmit} style={styles.form}>
      <input
        style={styles.input}
        placeholder="Item name"
        value={name}
        onChange={e => setName(e.target.value)}
        required
        autoFocus
      />
      <div style={styles.row}>
        <input
          style={styles.input}
          placeholder="Price"
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={e => setPrice(e.target.value)}
          required
        />
        <input
          style={styles.input}
          placeholder="Quantity"
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          required
        />
      </div>
      {error && <p style={styles.error}>{error}</p>}
      <div style={styles.row}>
        <button style={styles.submitButton} type="submit" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add item'}
        </button>
        <button style={styles.cancelButton} type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '16px',
    border: '1px dashed #ccc',
    borderRadius: '12px',
    background: '#fafafa',
  },
  row: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    padding: '12px',
    fontSize: '1rem',
    borderRadius: '8px',
    border: '1px solid #ccc',
  },
  error: {
    color: 'red',
    fontSize: '0.8rem',
    margin: 0,
  },
  submitButton: {
    flex: 1,
    padding: '12px',
    fontSize: '1rem',
    borderRadius: '8px',
    border: 'none',
    background: '#000',
    color: '#fff',
    cursor: 'pointer',
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    fontSize: '1rem',
    borderRadius: '8px',
    border: '1px solid #ddd',
    background: '#fff',
    cursor: 'pointer',
  },
}