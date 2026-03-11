import { useState } from 'react';
import { useImages, useImageDates } from '../hooks/useImages.js';
import { useTimeline } from '../hooks/useTimeline.js';
import { useUIStore } from '../store/ui.js';
import { useAuthStore } from '../store/auth.js';
import MainImageDisplay from '../components/Timeline/MainImageDisplay.jsx';
import TimeSlider from '../components/Timeline/TimeSlider.jsx';
import CalendarWidget from '../components/Timeline/CalendarWidget.jsx';
import ThumbnailStrip from '../components/Timeline/ThumbnailStrip.jsx';

// Fetch all images for the timeline (no pagination, sorted asc)
const MAX_TIMELINE_IMAGES = 10000;

export default function TimelinePage() {
  const { user } = useAuthStore();
  const { activeOwner } = useUIStore();
  const [showCalendar, setShowCalendar] = useState(false);

  const owner = activeOwner || user?.folder_name;

  const { data, isLoading, isError } = useImages({
    owner,
    page: 1,
    limit: MAX_TIMELINE_IMAGES,
    sort: 'asc',
  });

  const images = data?.images || [];

  const {
    currentIndex,
    currentImage,
    isPlaying,
    speed,
    setSpeed,
    goTo,
    goNext,
    goPrev,
    goToDate,
    play,
    pause,
    toggle,
  } = useTimeline(images);

  const { data: datesData } = useImageDates(owner);
  const dates = datesData?.dates || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="w-8 h-8 rounded-full border-2 border-surface-700 border-t-accent-500 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] text-surface-400">
        <p>Failed to load images</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Main area: image + optional calendar */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Main image */}
        <div className="flex-1 relative overflow-hidden">
          <MainImageDisplay image={currentImage} images={images} currentIndex={currentIndex} />

          {/* Keyboard navigation hints */}
          {images.length > 0 && (
            <div className="absolute top-3 left-3 flex gap-1">
              <button
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="w-8 h-8 rounded-full bg-surface-950/70 hover:bg-surface-800/80
                           flex items-center justify-center text-surface-300 hover:text-white
                           disabled:opacity-20 transition-colors backdrop-blur-sm"
                aria-label="Previous"
              >
                <ChevronLeftIcon />
              </button>
              <button
                onClick={goNext}
                disabled={currentIndex >= images.length - 1}
                className="w-8 h-8 rounded-full bg-surface-950/70 hover:bg-surface-800/80
                           flex items-center justify-center text-surface-300 hover:text-white
                           disabled:opacity-20 transition-colors backdrop-blur-sm"
                aria-label="Next"
              >
                <ChevronRightIcon />
              </button>
            </div>
          )}

          {/* Calendar toggle button */}
          <button
            onClick={() => setShowCalendar(s => !s)}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-950/70 hover:bg-surface-800/80
                       flex items-center justify-center text-surface-300 hover:text-white
                       transition-colors backdrop-blur-sm"
            aria-label="Toggle calendar"
            title="Toggle calendar"
          >
            <CalendarIcon />
          </button>
        </div>

        {/* Calendar sidebar */}
        {showCalendar && (
          <div className="w-64 shrink-0 border-l border-surface-800 bg-surface-900/50 overflow-y-auto p-3">
            <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-3">
              Navigate by date
            </p>
            <CalendarWidget
              dates={dates}
              currentImage={currentImage}
              onDateSelect={(dateStr) => {
                goToDate(dateStr);
                setShowCalendar(false);
              }}
            />
            <div className="mt-3 text-xs text-surface-500 text-center">
              Highlighted dates have images
            </div>
          </div>
        )}
      </div>

      {/* Slider controls */}
      <div className="border-t border-surface-800 bg-surface-900/80 backdrop-blur-sm pt-3">
        <TimeSlider
          images={images}
          currentIndex={currentIndex}
          onChange={goTo}
          isPlaying={isPlaying}
          onToggle={toggle}
          speed={speed}
          onSpeedChange={setSpeed}
        />
      </div>

      {/* Thumbnail strip */}
      <div className="border-t border-surface-800 bg-surface-950 h-16 overflow-hidden">
        <ThumbnailStrip
          images={images}
          currentIndex={currentIndex}
          onSelect={goTo}
        />
      </div>
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
