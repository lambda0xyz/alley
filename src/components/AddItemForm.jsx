import { useState } from 'react'
import { uploadItemImage } from '../lib/uploadImage'
import PhotoPicker from './PhotoPicker'

export default function AddItemForm({ onAdd, onCancel }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Local object URL just for the preview — revoked when a new file replaces it.
  const [previewUrl, setPreviewUrl] = useState(null)

  function handleFileChange(e) {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)
    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return file ? URL.createObjectURL(file) : null
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    // Upload the photo first; only attach its URL if it succeeds. A failed
    // image upload aborts the add so we never create an item that silently
    // dropped its picture.
    let image_url = null
    if (imageFile) {
      const { url, error: uploadError } = await uploadItemImage(imageFile)
      if (uploadError) {
        setError(uploadError.message)
        setSubmitting(false)
        return
      }
      image_url = url
    }

    const { error } = await onAdd({
      name: name.trim(),
      price: Math.round(parseFloat(price) * 100) / 100,
      quantity_total: parseInt(quantity),
      image_url,
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
      <PhotoPicker label="Photo (optional)" onChange={handleFileChange} />
      {previewUrl && (
        <img className="item-thumb item-thumb-preview" src={previewUrl} alt="Preview" />
      )}
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
