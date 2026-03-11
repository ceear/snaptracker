import { useState, useEffect, useRef } from 'react';
import { format, fromUnixTime } from 'date-fns';
import { getFullUrl } from '@api/images.js';
import { useUIStore } from '../../store/ui.js';

const PRELOAD_AHEAD = 8;
const PRELOAD_BEHIND = 2;

export default function MainImageDisplay({ image, images = [], currentIndex = 0 }) {
  const openModal = useUIStore(s => s.openModal);

  // Always keep the last successfully loaded src visible — never goes blank
  const [displayedSrc, setDisplayedSrc] = useState(null);
  const latestId = useRef(null); // prevent stale loads from overwriting current

  useEffect(() => {
    if (!image) return;
    const id = image.id;
    latestId.current = id;
    const src = getFullUrl(id);

    // If already showing this image, skip
    if (displayedSrc === src) return;

    // Preload off-DOM — only swap in when fully loaded
    const loader = new window.Image();
    loader.onload = () => {
      if (latestId.current === id) setDisplayedSrc(src);
    };
    loader.onerror = () => {
      // Show broken image rather than staying on old one
      if (latestId.current === id) setDisplayedSrc(src);
    };
    loader.src = src;

    return () => { loader.onload = null; loader.onerror = null; };
  }, [image?.id]);

  // Aggressively preload surrounding frames into browser cache
  useEffect(() => {
    if (!images.length) return;
    const start = Math.max(0, currentIndex - PRELOAD_BEHIND);
    const end = Math.min(images.length - 1, currentIndex + PRELOAD_AHEAD);
    for (let i = start; i <= end; i++) {
      if (i === currentIndex) continue;
      const loader = new window.Image();
      loader.src = getFullUrl(images[i].id);
    }
  }, [currentIndex, images]);

  if (!image) {
    return (
      <div className="flex items-center justify-center h-full text-surface-500">
        <p>No images to display</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-surface-950 group">
      {displayedSrc ? (
        <img
          src={displayedSrc}
          alt={image.filename}
          onClick={() => openModal(image.id)}
          className="max-w-full max-h-full object-contain cursor-zoom-in select-none"
          draggable={false}
        />
      ) : (
        // Initial load spinner — shown only once before the very first image loads
        <div className="w-8 h-8 rounded-full border-2 border-surface-700 border-t-surface-300 animate-spin" />
      )}

      {/* Timestamp overlay */}
      <div className="absolute bottom-3 left-3 pointer-events-none z-10">
        <div className="bg-surface-950/70 backdrop-blur-sm rounded-lg px-3 py-1.5">
          <p className="text-sm font-medium text-surface-100">
            {format(fromUnixTime(image.captured_at), 'PPP')}
          </p>
          <p className="text-xs text-surface-400">
            {format(fromUnixTime(image.captured_at), 'HH:mm:ss')}
          </p>
        </div>
      </div>

      {/* Zoom hint */}
      <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-surface-950/70 backdrop-blur-sm rounded-lg px-2 py-1">
          <p className="text-xs text-surface-400">Click to zoom</p>
        </div>
      </div>
    </div>
  );
}
