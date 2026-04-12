import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, clearAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    clearAuth();
    navigate('/login');
  }

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <header className="navbar" role="banner">
      <div className="navbar__inner">
        {/* Brand */}
        <Link to="/" className="navbar__brand" aria-label="TaskFlow home">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="url(#nav-grad)" />
            <path d="M8 11h10M8 16h7M8 21h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <circle cx="23" cy="21" r="4" fill="white" opacity="0.9" />
            <path d="M21 21l1.5 1.5L25 19" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="nav-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <span className="navbar__brand-name">TaskFlow</span>
        </Link>

        {/* Nav links */}
        <nav className="navbar__nav" aria-label="Main navigation">
          <Link
            to="/"
            className={`navbar__link${location.pathname === '/' ? ' navbar__link--active' : ''}`}
          >
            Projects
          </Link>
        </nav>

        {/* User area */}
        <div className="navbar__user">
          <div className="navbar__avatar" aria-hidden="true" title={user?.name}>
            {initials}
          </div>
          <span className="navbar__username">{user?.name}</span>
          <button
            id="logout-btn"
            className="btn btn--ghost btn--sm"
            onClick={handleLogout}
            aria-label="Log out"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
