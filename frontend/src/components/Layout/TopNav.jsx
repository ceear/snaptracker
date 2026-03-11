import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useOwners } from '../../hooks/useImages.js';
import { useUIStore } from '../../store/ui.js';
import OwnerDropdown from './OwnerDropdown.jsx';

export default function TopNav() {
  const { user, isAdmin, logout } = useAuth();
  const { data: ownersData } = useOwners();
  const owners = ownersData?.owners || [];

  const navLinkClass = ({ isActive }) =>
    clsx(
      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
      isActive
        ? 'bg-surface-800 text-surface-100'
        : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/50'
    );

  return (
    <header className="border-b border-surface-800 bg-surface-950/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2 mr-2 shrink-0">
          <span className="text-lg">📸</span>
          <span className="font-semibold text-surface-100 hidden sm:block">SnapTracker</span>
        </NavLink>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={navLinkClass}>
            Gallery
          </NavLink>
          <NavLink to="/timeline" className={navLinkClass}>
            Timeline
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={navLinkClass}>
              Admin
            </NavLink>
          )}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Owner switcher — only show when multiple owners available */}
        {owners.length > 1 && (
          <OwnerDropdown owners={owners} />
        )}

        {/* User menu */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-surface-500 hidden sm:block">
            {user?.username}
            {isAdmin && (
              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-accent-500/20 text-accent-400">
                admin
              </span>
            )}
          </span>
          <button
            onClick={logout}
            className="btn-ghost text-xs px-2 py-1"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
