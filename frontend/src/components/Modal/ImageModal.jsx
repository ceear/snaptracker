import { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { format, fromUnixTime } from 'date-fns';
import { useUIStore } from '../../store/ui.js';
import { useImageDetail } from '../../hooks/useImages.js';
import { getFullUrl } from '@api/images.js';

export default function ImageModal() {
  const { modalImageId, closeModal, openModal } = useUIStore();
  const { data: image, isLoading } = useImageDetail(modalImageId);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Close on Escape, navigate with arrow keys
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeModal]);

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) closeModal();
  }, [closeModal]);

  const exif = image?.exif || {};
  const fileSize = image ? formatBytes(image.file_size) : '';

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-6xl max-h-[calc(100vh-2rem)] flex flex-col lg:flex-row
                      bg-surface-900 rounded-2xl overflow-hidden shadow-2xl border border-surface-800"
           onClick={e => e.stopPropagation()}>

        {/* Close button */}
        <button
          onClick={closeModal}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-surface-800/80 hover:bg-surface-700
                     flex items-center justify-center text-surface-300 hover:text-white transition-colors"
          aria-label="Close"
        >
          <XIcon />
        </button>

        {/* Image area */}
        <div className="flex-1 flex items-center justify-center bg-surface-950 min-h-48 lg:min-h-0">
          {isLoading && (
            <div className="w-12 h-12 rounded-full border-2 border-surface-700 border-t-accent-500 animate-spin" />
          )}
          {image && (
            <img
              key={image.id}
              src={getFullUrl(image.id)}
              alt={image.filename}
              className={`max-w-full max-h-[70vh] lg:max-h-full object-contain transition-opacity duration-200 ${
                imgLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgLoaded(true)}
            />
          )}
        </div>

        {/* Details panel */}
        {image && (
          <div className="w-full lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l border-surface-800
                          overflow-y-auto">
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
