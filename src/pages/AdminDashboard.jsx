// src/pages/AdminDashboard.jsx
import { useAdminData } from '../hooks/useAdminData'
import AdminArtistCard from '../components/AdminArtistCard'
import SignOutButton from '../components/SignOutButton'
import { exportConventionReport } from '../lib/exportExcel'

export default function AdminDashboard() {
  const { artists, loading, error } = useAdminData()

  const totalRevenue = artists.reduce((sum, artist) =>
    sum + artist.items.reduce((s, item) => {
      const sold = item.quantity_total - item.quantity_remaining
      return s + sold * Number(item.price)
    }, 0), 0
  )

  const totalSold = artists.reduce((sum, artist) =>
    sum + artist.items.reduce((s, item) =>
      s + (item.quantity_total - item.quantity_remaining), 0
    ), 0
  )

  if (loading) return <div style={styles.center}>Loading...</div>
  if (error) return <div style={styles.center}>Error: {error}</div>

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Admin</span>
        <SignOutButton />
      </div>

      <div style={styles.totals}>
        <div style={styles.totalCard}>
          <span style={styles.totalValue}>¥{totalRevenue.toLocaleString()}</span>
          <span style={styles.totalLabel}>Total revenue</span>
        </div>
        <div style={styles.totalCard}>
          <span style={styles.totalValue}>{totalSold}</span>
          <span style={styles.totalLabel}>Items sold</span>
        </div>
        <div style={styles.totalCard}>
          <span style={styles.totalValue}>{artists.length}</span>
          <span style={styles.totalLabel}>Artists</span>
        </div>
      </div>

      <div style={styles.artistList}>
        {artists.map(artist => (
          <AdminArtistCard key={artist.id} artist={artist} />
        ))}
      </div>

      <button
        style={styles.exportButton}
        onClick={() => exportConventionReport(artists)}
      >
        Export Excel report
      </button>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '8px',
    borderBottom: '1px solid #eee',
  },
  title: {
    fontWeight: '700',
    fontSize: '1.1rem',
  },
  totals: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  totalCard: {
    padding: '14px',
    borderRadius: '10px',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    alignItems: 'center',
  },
  totalValue: {
    fontSize: '1.2rem',
    fontWeight: '700',
  },
  totalLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  artistList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  exportButton: {
    padding: '14px',
    fontSize: '1rem',
    borderRadius: '8px',
    border: '1px solid #000',
    background: '#fff',
    cursor: 'pointer',
    fontWeight: '600',
  },
  center: {
    display: 'flex',
    justifyContent: 'center',
    padding: '48px',
  },
}