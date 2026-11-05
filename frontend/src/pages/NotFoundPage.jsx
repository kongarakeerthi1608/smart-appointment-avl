import { Link } from 'react-router-dom'
import { ArrowLeft, GitBranch, Search } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="notfound-page">
      <div className="notfound-card card">
        <div className="notfound-visual" aria-hidden="true">
          <span className="notfound-node root">404</span>
          <span className="notfound-node left">null</span>
          <span className="notfound-node right">null</span>
        </div>
        <span className="eyebrow-chip">
          <Search size={12} /> Route not found
        </span>
        <h2>This branch does not exist.</h2>
        <p>
          The AVL search returned <code>null</code> for that path. The page may have moved, or the address was
          typed incorrectly.
        </p>
        <div className="notfound-actions">
          <Link to="/" className="button primary">
            <ArrowLeft size={16} /> Return to dashboard
          </Link>
          <Link to="/visualizer" className="button secondary">
            <GitBranch size={16} /> Open visualizer
          </Link>
        </div>
        <div className="notfound-key">
          <span>Attempted route</span>
          <code>{window.location.pathname}</code>
        </div>
      </div>
    </div>
  )
}
