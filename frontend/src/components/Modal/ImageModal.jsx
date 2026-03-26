import { useEffect, useCallback, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { format, fromUnixTime } from 'date-fns';
import { useUIStore } from '../../store/ui.js';
import { useImageDetail } from '../../hooks/useImages.js';
import { getFullUrl } from '@api/images.js';

export default function ImageModal() {
  const {
    modalImageId,
    modalImageIds,
    modalImageIndex,
    closeModal,
    modalNext,
    modalPrev,
  } = useUIStore();

  const { data: image, isLoading } = useImageDetail(modalImageId);
  const [imgLoaded, setImgLoaded] = useState(false);
  const touchStart = useRef(null);

  const canGoPrev = modalImageIndex > 0;
  const canGoNext = modalImageIndex < modalImageIds.length - 1;

  // Reset loaded state when image changes
  useEffect(() => { setImgLoaded(false); }, [modalImageId]);

  // Keyboard: Escape → close, arrows → navigate
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape')      closeModal();
      if (e.key === 'ArrowRight')  modalNext();
      if (e.key === 'ArrowLeft')   modalPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeModal, modalNext, modalPrev]);

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) closeModal();
  }, [closeModal]);

  // Swipe gesture — track X+Y so vertical scroll in details panel doesn't fire
  const handleTouchStart = useCallback((e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStart.current) return;
    const dx = touchStart.current.x - e.changedTouches[0].clientX;
    const dy = touchStart.current.y - e.changedTouches[0].clientY;
    touchStart.current = null;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      dx > 0 ? modalNext() : modalPrev();
    }
  }, [modalNext, modalPrev]);

  const exif = image?.exif || {};
  const fileSize = image ? formatBytes(image.file_size) : '';

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 landscape:p-0"
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-6xl max-h-[calc(100dvh-2rem)] flex flex-col lg:flex-row
                   bg-surface-900 rounded-2xl overflow-hidden shadow-2xl border border-surface-800
                   landscape:max-w-none landscape:max-h-dvh landscape:h-dvh landscape:rounded-none landscape:border-0"
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Close button */}
        <button
          onClick={closeModal}
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-surface-800/80 hover:bg-surface-700
                     flex items-center justify-center text-surface-300 hover:text-white transition-colors"
          aria-label="Close"
        >
          <XIcon />
        </button>

        {/* Image area */}
        <div className="flex-1 relative flex items-center justify-center bg-surface-950 min-h-48 lg:min-h-0">
          {isLoading && (
            <div className="w-12 h-12 rounded-full border-2 border-surface-700 border-t-accent-500 animate-spin" />
          )}
          {image && (
            <img
              key={image.id}
              src={getFullUrl(image.id)}
              alt={image.filename}
              className={`max-w-full max-h-[70vh] lg:max-h-full landscape:max-h-full object-contain transition-opacity duration-200 select-none ${
                imgLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgLoaded(true)}
              draggable={false}
            />
          )}

          {/* Prev button */}
          {canGoPrev && (
            <button
              onClick={modalPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full
                         bg-surface-950/70 hover:bg-surface-800 backdrop-blur-sm
                         flex items-center justify-center text-surface-300 hover:text-white transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeftIcon />
            </button>
          )}

          {/* Next button */}
          {canGoNext && (
            <button
              onClick={modalNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full
                         bg-surface-950/70 hover:bg-surface-800 backdrop-blur-sm
                         flex items-center justify-center text-surface-300 hover:text-white transition-colors"
              aria-label="Next image"
            >
              <ChevronRightIcon />
            </button>
          )}

          {/* Image counter */}
          {modalImageIds.length > 1 && (
            <div className="absolute bottom-3 right-3 z-10 bg-surface-950/70 backdrop-blur-sm rounded-lg px-2.5 py-1">
              <span className="text-xs text-surface-400 tabular-nums">
                {modalImageIndex + 1} / {modalImageIds.length}
              </span>
            </div>
          )}
        </div>

        {/* Details panel — hidden in landscape on mobile */}
        {image && (
          <div className="w-full lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l border-surface-800
                          overflow-y-auto landscape:hidden">
            <div className="p-4 space-y-4">
              {/* Filename */}
              <div>
                <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-1">File</p>
                <p className="text-sm text-surface-100 break-all font-mono">{image.filename}</p>
              </div>

              {/* Date/Time */}
              <DetailRow label="Captured">
                {format(fromUnixTime(image.captured_at), 'PPpp')}
              </DetailRow>

              {/* Dimensions */}
              {image.width && image.height && (
                <DetailRow label="Dimensions">
                  {image.width} × {image.height} px
                </DetailRow>
              )}

              {/* File size */}
              {image.file_size && (
                <DetailRow label="Size">{fileSize}</DetailRow>
              )}

              {/* Owner */}
              <DetailRow label="Folder">{image.folder_owner}</DetailRow>

              {/* EXIF data */}
              {Object.keys(exif).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-2">
                    Camera Info
                  </p>
                  <div className="space-y-1.5">
                    {exif.Make && <DetailRow label="Make">{exif.Make}</DetailRow>}
                    {exif.Model && <DetailRow label="Model">{exif.Model}</DetailRow>}
                    {exif.LensModel && <DetailRow label="Lens">{exif.LensModel}</DetailRow>}
                    {exif.ISO && <DetailRow label="ISO">{exif.ISO}</DetailRow>}
                    {exif.ExposureTime && (
                      <DetailRow label="Shutter">
                        {formatShutter(exif.ExposureTime)}
                      </DetailRow>
                    )}
                    {exif.FNumber && (
                      <DetailRow label="Aperture">f/{exif.FNumber}</DetailRow>
                    )}
                    {exif.FocalLength && (
                      <DetailRow label="Focal length">{exif.FocalLength}mm</DetailRow>
                    )}
                    {exif.GPSLatitude && exif.GPSLongitude && (
                      <DetailRow label="GPS">
                        {formatGPS(exif.GPSLatitude, exif.GPSLongitude)}
                      </DetailRow>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

function DetailRow({ label, children }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-surface-500 shrink-0 w-24 pt-0.5">{label}</span>
      <span className="text-xs text-surface-200 break-all">{children}</span>
    </div>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatShutter(val) {
  if (!val) return '';
  if (val < 1) return `1/${Math.round(1 / val)}s`;
  return `${val}s`;
}

function formatGPS(lat, lon) {
  const latArr = Array.isArray(lat) ? lat : [lat];
  const lonArr = Array.isArray(lon) ? lon : [lon];
  const latDec = latArr[0] + (latArr[1] || 0) / 60 + (latArr[2] || 0) / 3600;
  const lonDec = lonArr[0] + (lonArr[1] || 0) / 60 + (lonArr[2] || 0) / 3600;
  return `${latDec.toFixed(5)}, ${lonDec.toFixed(5)}`;
}
