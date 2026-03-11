import { useState } from 'react';
import { useImages } from '../hooks/useImages.js';
import { useUIStore } from '../store/ui.js';
import { useAuthStore } from '../store/auth.js';
import ThumbnailCard from '../components/Gallery/ThumbnailCard.jsx';
import { clsx } from 'clsx';

const PAGE_SIZE = 48;

export default function GalleryPage() {
  const { user } = useAuthStore();
  const { activeOwner } = useUIStore();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('asc');

  const owner = activeOwner || user?.folder_name;

  const { data, isLoading, isError } = useImages({
    owner,
    page,
    limit: PAGE_SIZE,
    sort,
  });

  const images = data?.images || [];
  const totalPages = data?.pages || 1;
  const total = data?.total || 0;

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-surface-100">Gallery</h2>
            {total > 0 && (
              <p className="text-sm text-surface-400">{total} images</p>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSort(s => s === 'asc' ? 'desc' : 'asc')}
              className="btn-ghost text-xs flex items-center gap-1.5"
            >
              {sort === 'asc' ? <SortAscIcon /> : <SortDescIcon />}
              {sort === 'asc' ? 'Oldest first' : 'Newest first'}
            </button>
          </div>
        </div>

        {/* Grid */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-video rounded-lg bg-surface-800 animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-20 text-surface-400">
            <p className="text-lg">Failed to load images</p>
            <p className="text-sm mt-1">Check your connection and try again</p>
          </div>
        )}

        {!isLoading && !isError && images.length === 0 && (
          <div className="text-center py-20 text-surface-400">
            <div className="text-4xl mb-3">📂</div>
            <p className="text-lg">No images yet</p>
            <p className="text-sm mt-1">
              Mount a folder with images or upload via API key
            </p>
          </div>
        )}

        {!isLoading && images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {images.map(img => (
              <ThumbnailCard key={img.id} image={img} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-ghost text-sm px-3 py-1.5 disabled:opacity-30"
            >
              ← Prev
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={clsx(
                      'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                      page === p
                        ? 'bg-accent-500 text-white'
                        : 'text-surface-400 hover:bg-surface-800'
                    )}
                  >
                    {p}
                  </button>
                );
              })}
              {totalPages > 7 && (
                <span className="text-surface-500 text-sm px-2">… {totalPages}</span>
              )}
            </div>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-ghost text-sm px-3 py-1.5 disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SortAscIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 4h13M3 8h9M3 12h5m10 0l-4-4m4 4l-4 4" />
    </svg>
  );
}

function SortDescIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 4h13M3 8h9M3 12h5m10 8l-4-4m4 4l-4 4" />
    </svg>
  );
}
