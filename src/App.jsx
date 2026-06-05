import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import ArtistDashboard from './pages/ArtistDashboard'
import AdminDashboard from './pages/AdminDashboard'
import NotFound from './pages/NotFound'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"        element={<Navigate to="/login" replace />} />
        <Route path="/login"   element={<Login />} />
        <Route path="/artist"  element={<ArtistDashboard />} />
        <Route path="/admin"   element={<AdminDashboard />} />
        <Route path="*"        element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App