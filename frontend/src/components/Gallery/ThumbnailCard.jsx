import { useInView } from 'react-intersection-observer';
import { format, fromUnixTime } from 'date-fns';
import { clsx } from 'clsx';
import { useUIStore } from '../../store/ui.js';
import { getThumbUrl } from '@api/images.js';

export default function ThumbnailCard({ image, isActive = false }) {
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: '100px' });
  const openModal = useUIStore(s => s.openModal);

  const dateStr = format(fromUnixTime(image.captured_at), 'MMM d, yyyy HH:mm');

  return (
    <div
      ref={ref}
      onClick={() => openModal(image.id)}
      className={clsx(
        'group relative cursor-pointer rounded-lg overflow-hidden bg-surface-900',
        'border transition-all duration-150',
        isActive
          ? 'border-accent-500 ring-1 ring-accent-500'
          : 'border-surface-800 hover:border-surface-600'
      )}
    >
      <div className="aspect-video bg-surface-800">
        {inView && (
          <img
            src={getThumbUrl(image.id)}
            alt={image.filename}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
        )}
      </div>

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-surface-950/80 via-transparent to-transparent
                      opacity-0 group-hover:opacity-100 transition-opacity duration-150" />

      {/* Date badge */}
      <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0
                      transition-transform duration-150">
        <p className="text-xs text-surface-200 font-medium truncate">{dateStr}</p>
        {image.filename && (
          <p className="text-[10px] text-surface-400 truncate">{image.filename}</p>
        )}
      </div>
    </div>
  );
}
