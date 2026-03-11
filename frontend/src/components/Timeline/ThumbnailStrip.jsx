import { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { format, fromUnixTime } from 'date-fns';
import { useUIStore } from '../../store/ui.js';
import { getThumbUrl } from '@api/images.js';

export default function ThumbnailStrip({ images, currentIndex, onSelect }) {
  const openModal = useUIStore(s => s.openModal);
  const stripRef = useRef(null);
  const activeRef = useRef(null);

  // Auto-scroll active thumb into view
  useEffect(() => {
    if (activeRef.current && stripRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentIndex]);

  if (images.length === 0) return null;

  return (
    <div
      ref={stripRef}
      className="flex gap-1.5 overflow-x-auto px-4 py-2 scrollbar-none"
      style={{ scrollbarWidth: 'none' }}
    >
      {images.map((image, i) => {
        const isActive = i === currentIndex;
        return (
          <div
            key={image.id}
            ref={isActive ? activeRef : null}
            onClick={() => onSelect(i)}
            onDoubleClick={() => openModal(image.id)}
            className={clsx(
              'shrink-0 w-16 h-12 rounded-md overflow-hidden cursor-pointer',
              'border-2 transition-all duration-100',
              isActive
                ? 'border-accent-500 scale-105 shadow-lg'
                : 'border-transparent hover:border-surface-600 opacity-60 hover:opacity-100'
            )}
            title={format(fromUnixTime(image.captured_at), 'PPpp')}
          >
            <img
              src={getThumbUrl(image.id)}
              alt={image.filename}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        );
      })}
    </div>
  );
}
