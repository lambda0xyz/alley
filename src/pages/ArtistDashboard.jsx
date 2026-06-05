// src/pages/ArtistDashboard.jsx
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useArtistItems } from '../hooks/useArtistItems'
import ItemCard from '../components/ItemCard'
import AddItemForm from '../components/AddItemForm'
import SignOutButton from '../components/SignOutButton'

export default function ArtistDashboard() {
  const { profile } = useAuth()
  const { items, loading, error, sellItem, addItem } = useArtistItems()
  const [showAddForm, setShowAddForm] = useState(false)

  async function handleAddItem(fields) {
    const result = await addItem(fields)
    if (!result.error) setShowAddForm(false)
    return result
  }

  if (loading) return <div style={styles.center}>Loading...</div>
  if (error) return <div style={styles.center}>Error: {error}</div>

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.name}>{profile?.display_name}</span>
        <SignOutButton />
      </div>

      <div style={styles.grid}>
        {items.map(item => (
          <ItemCard key={item.id} item={item} onSell={sellItem} />
        ))}
      </div>

      {showAddForm
        ? <AddItemForm onAdd={handleAddItem} onCancel={() => setShowAddForm(false)} />
        : (
          <button style={styles.addButton} onClick={() => setShowAddForm(true)}>
            + Add item
          </button>
        )
      }
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '8px',
    borderBottom: '1px solid #eee',
  },
  name: {
    fontWeight: '600',
    fontSize: '1rem',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  addButton: {
    padding: '14px',
    fontSize: '1rem',
    borderRadius: '8px',
    border: '1px dashed #ccc',
    background: '#fff',
    cursor: 'pointer',
    color: '#555',
  },
  center: {
    display: 'flex',
    justifyContent: 'center',
    padding: '48px',
  },
}