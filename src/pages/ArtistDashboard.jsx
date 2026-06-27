import { useState } from 'react'
import AddItemForm from '../components/AddItemForm'
import ItemCard from '../components/ItemCard'
import SignOutButton from '../components/SignOutButton'
import { useAuth } from '../context/AuthContext'
import { useArtistItems } from '../hooks/useArtistItems'
import { formatArtistName } from '../lib/format'

export default function ArtistDashboard() {
  const { profile } = useAuth()
  const {
    items,
    loading,
    error,
    sellItem,
    correctItem,
    editItem,
    deleteItem,
    addItem,
  } = useArtistItems()
  const [showAddForm, setShowAddForm] = useState(false)

  async function handleAddItem(fields) {
    const result = await addItem(fields)
    if (!result.error) setShowAddForm(false)
    return result
  }

  if (loading) return <div className="loading">Loading…</div>
  if (error) return <div className="loading">Error: {error}</div>

  return (
    <div className="page">
      <div className="app-header">
        <span className="app-header-name">
          {formatArtistName(profile?.display_name)}
        </span>
        <SignOutButton />
      </div>

      <div className="item-list">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onSell={sellItem}
            onCorrect={correctItem}
            onEdit={editItem}
            onDelete={deleteItem}
          />
        ))}
      </div>

      {showAddForm ? (
        <AddItemForm
          onAdd={handleAddItem}
          onCancel={() => setShowAddForm(false)}
        />
      ) : (
        <button
          type="button"
          className="btn-dashed"
          onClick={() => setShowAddForm(true)}
        >
          + Add item
        </button>
      )}
    </div>
  )
}
