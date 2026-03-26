import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../../hooks/useAuth.js';

export default function BottomNav() {
  const { isAdmin } = useAuth();

  const tabClass = ({ isActive }) =>
    clsx(
      'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[3.5rem]',
      'text-[10px] font-medium transition-colors select-none',
      isActive
        ? 'text-accent-400'
        : 'text-surface-500 active:text-surface-300'
    );

  return (
    <nav
      className="md:hidden landscape:hidden fixed bottom-0 left-0 right-0 z-40
                 bg-surface-950/95 backdrop-blur-sm border-t border-surface-800
                 flex items-stretch pb-safe"
    >
      <NavLink to="/" end className={tabClass}>
        <GalleryIcon />
        <span>Gallery</span>
      </NavLink>
      <NavLink to="/timeline" className={tabClass}>
        <TimelineIcon />
        <span>Timeline</span>
      </NavLink>
      {isAdmin && (
        <NavLink to="/admin" className={tabClass}>
          <SettingsIcon />
          <span>Settings</span>
        </NavLink>
      )}
    </nav>
  );
}

function GalleryIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function TimelineIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
