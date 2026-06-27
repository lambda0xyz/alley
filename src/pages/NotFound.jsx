import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="page-center">
      <div className="page-center-inner">
        <div className="card">
          <h2>Page not found</h2>
          <p className="text-muted">
            That page doesn’t exist. It may have moved, or the link was
            mistyped.
          </p>
          <Link to="/login" className="btn btn-primary btn-full">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
