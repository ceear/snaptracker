import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { clsx } from 'clsx';
import { useUIStore } from '../../store/ui.js';
import { useAuthStore } from '../../store/auth.js';

export default function OwnerDropdown({ owners }) {
  const { user } = useAuthStore();
  const { activeOwner, setActiveOwner } = useUIStore();

  const current = activeOwner || user?.folder_name;
  const currentOwner = owners.find(o => o.folder_name === current) || owners[0];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="btn-ghost text-sm flex items-center gap-1.5 px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-accent-500 shrink-0" />
          <span className="max-w-24 truncate">{currentOwner?.username || 'Select'}</span>
          <ChevronDown />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-40 rounded-lg bg-surface-850 border border-surface-700 shadow-xl
                     py-1 animate-in fade-in-0 zoom-in-95"
          sideOffset={6}
          align="end"
        >
          <DropdownMenu.Label className="px-3 py-1.5 text-[11px] font-medium text-surface-500 uppercase tracking-wide">
            View folder
          </DropdownMenu.Label>

          {owners.map((owner) => (
            <DropdownMenu.Item
              key={owner.folder_name}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer outline-none',
                'hover:bg-surface-700 transition-colors',
                current === owner.folder_name
                  ? 'text-accent-400'
                  : 'text-surface-200'
              )}
              onSelect={() => setActiveOwner(owner.folder_name)}
            >
              {current === owner.folder_name && (
                <CheckIcon className="w-3.5 h-3.5 shrink-0" />
              )}
              {current !== owner.folder_name && (
                <span className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{owner.username}</span>
              {owner.isSelf && (
                <span className="ml-auto text-[10px] text-surface-500">you</span>
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function ChevronDown() {
  return (
    <svg className="w-3.5 h-3.5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function CheckIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}
