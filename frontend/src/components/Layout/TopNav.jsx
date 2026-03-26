import { NavLink } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { clsx } from 'clsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useOwners } from '../../hooks/useImages.js';
import OwnerDropdown from './OwnerDropdown.jsx';

export default function TopNav() {
  const { user, isAdmin, logout } = useAuth();
  const { data: ownersData } = useOwners();
  const owners = ownersData?.owners || [];

  const navLinkClass = ({ isActive }) =>
    clsx(
      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
      isActive
        ? 'bg-surface-800 text-surface-100'
        : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/50'
    );

  return (
    <header className="border-b border-surface-800 bg-surface-950/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2 mr-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center">
            <CameraIcon className="w-4 h-4 text-surface-300" />
          </div>
          <span className="font-semibold text-surface-100 hidden sm:block">SnapTracker</span>
        </NavLink>

        {/* Nav links — desktop only, with icons matching BottomNav */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/" end className={navLinkClass}>
            <GalleryIcon className="w-4 h-4" />
            Gallery
          </NavLink>
          <NavLink to="/timeline" className={navLinkClass}>
            <TimelineIcon className="w-4 h-4" />
            Timeline
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={navLinkClass}>
              <SettingsIcon className="w-4 h-4" />
              Settings
            </NavLink>
          )}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Owner switcher — only show when multiple owners available */}
        {owners.length > 1 && (
          <OwnerDropdown owners={owners} />
        )}

        {/* User menu — user icon always visible, username text on desktop */}
        <DropdownMenu.Root modal={false}>
          <DropdownMenu.Trigger asChild>
            <button className="btn-ghost flex items-center gap-1.5 px-2 py-1.5 shrink-0">
              <UserIcon className="w-5 h-5 text-surface-400" />
              <span className="hidden md:block text-xs text-surface-400 max-w-28 truncate">
                {user?.username}
              </span>
              {isAdmin && (
                <span className="hidden md:block px-1.5 py-0.5 rounded text-[10px] bg-accent-500/20 text-accent-400 shrink-0">
                  admin
                </span>
              )}
              <ChevronDownIcon className="w-3.5 h-3.5 text-surface-500" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-48 rounded-lg bg-surface-850 border border-surface-700 shadow-xl
                         py-1 animate-in fade-in-0 zoom-in-95"
              sideOffset={6}
              align="end"
              collisionPadding={8}
            >
              {/* User info header */}
              <div className="px-3 py-2.5 border-b border-surface-700">
                <p className="text-sm font-medium text-surface-100">{user?.username}</p>
                <p className="text-xs text-surface-500 mt-0.5">
                  {isAdmin ? 'Administrator' : 'Contributor'}
                </p>
              </div>

              {/* Sign out */}
              <DropdownMenu.Item
                onSelect={() => logout()}
                className="flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer outline-none
                           text-surface-200 hover:bg-surface-700 transition-colors"
              >
                <SignOutIcon className="w-4 h-4 text-surface-400" />
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────

function CameraIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" strokeWidth={1.5} />
    </svg>
  );
}

// ── Nav icons (same SVGs as BottomNav for visual consistency) ─────────────────

function GalleryIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function TimelineIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SettingsIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function UserIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function ChevronDownIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function SignOutIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
