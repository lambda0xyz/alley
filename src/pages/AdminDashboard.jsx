import { useAdminData } from '../hooks/useAdminData'
import AdminArtistCard from '../components/AdminArtistCard'
import ActivityLog from '../components/ActivityLog'
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

  if (loading) return <div className="loading">Loading…</div>
  if (error) return <div className="loading">Error: {error}</div>

  return (
    <div className="page page-wide">
      <div className="app-header">
        <span className="admin-title">Admin</span>
        <SignOutButton />
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">RON {totalRevenue.toFixed(2)}</span>
          <span className="stat-label">Total revenue</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{totalSold}</span>
          <span className="stat-label">Items sold</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{artists.length}</span>
          <span className="stat-label">Artists</span>
        </div>
      </div>

      <ActivityLog artists={artists} />

      <div className="artist-list">
        {artists.map(artist => (
          <AdminArtistCard key={artist.id} artist={artist} />
        ))}
      </div>

      <button
        className="btn btn-ghost btn-full"
        onClick={() => exportConventionReport(artists)}
      >
        Export Excel report
      </button>
    </div>
  )
}
