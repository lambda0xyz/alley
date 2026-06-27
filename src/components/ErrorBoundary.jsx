import { Component } from 'react'

// Catches render-time errors anywhere below it and shows a recoverable fallback
// instead of unmounting the whole tree (which would leave a blank screen).
// Must be a class — React has no hook equivalent for error catching.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Surface it for debugging; swap for a real logger if one is added later.
    console.error('Render error caught by ErrorBoundary:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="page-center">
        <div className="page-center-inner">
          <div className="card">
            <h2>Something went wrong</h2>
            <p className="text-muted">
              An unexpected error stopped this page from loading. Reloading
              usually fixes it.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-full"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}
