import { useState, useCallback, useRef, useEffect } from 'react';
import { format, fromUnixTime } from 'date-fns';
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

  // Detect phone landscape vs desktop landscape — CSS landscape: variant fires on both,
  // but we only want compact layout on phones (height ≤ 500px in landscape)
  const [isPhoneLandscape, setIsPhoneLandscape] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches
  );
  useEffect(() => {
    const mql = window.matchMedia('(orientation: landscape) and (max-height: 500px)');
    const handler = (e) => setIsPhoneLandscape(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const handleSliderChange = useCallback((e) => {
    goTo(parseInt(e.target.value, 10));
  }, [goTo]);

  // Swipe gesture on image area
  const swipeStartX = useRef(null);
  const handleTouchStart = useCallback((e) => {
    swipeStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e) => {
    if (swipeStartX.current === null) return;
    const dx = swipeStartX.current - e.changedTouches[0].clientX;
    swipeStartX.current = null;
    if (Math.abs(dx) > 50) dx > 0 ? goNext() : goPrev();
  }, [goNext, goPrev]);

  const total = images.length;
  const progress = total > 1 ? (currentIndex / (total - 1)) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)]">
        <div className="w-8 h-8 rounded-full border-2 border-surface-700 border-t-accent-500 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] text-surface-400">
        <p>Failed to load images</p>
      </div>
    );
  }

  const calendarContent = (
    <CalendarWidget
      dates={dates}
      currentImage={currentImage}
      onDateSelect={(dateStr) => {
        goToDate(dateStr);
        setShowCalendar(false);
      }}
    />
  );

  return (
    <div className="h-[calc(100dvh-7rem)] md:h-[calc(100dvh-3.5rem)] landscape:h-[calc(100dvh-3.5rem)] flex flex-col">
      {/* Main area: image + optional calendar sidebar (desktop) */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Main image */}
        <div className="flex-1 relative overflow-hidden"
             onTouchStart={handleTouchStart}
             onTouchEnd={handleTouchEnd}>
          <MainImageDisplay image={currentImage} images={images} currentIndex={currentIndex} />

          {/* Prev / Next buttons — larger touch targets on mobile */}
          {images.length > 0 && (
            <div className="absolute top-3 left-3 flex gap-1.5">
              <button
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="w-11 h-11 rounded-full bg-surface-950/70 hover:bg-surface-800/80
                           flex items-center justify-center text-surface-300 hover:text-white
                           disabled:opacity-20 transition-colors backdrop-blur-sm"
                aria-label="Previous"
              >
                <ChevronLeftIcon />
              </button>
              <button
                onClick={goNext}
                disabled={currentIndex >= images.length - 1}
                className="w-11 h-11 rounded-full bg-surface-950/70 hover:bg-surface-800/80
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
            className="absolute top-3 right-3 w-11 h-11 rounded-full bg-surface-950/70 hover:bg-surface-800/80
                       flex items-center justify-center text-surface-300 hover:text-white
                       transition-colors backdrop-blur-sm"
            aria-label="Toggle calendar"
            title="Toggle calendar"
          >
            <CalendarIcon />
          </button>

          {/* Landscape compact controls overlay — replaces the slider section below (phone only) */}
          {isPhoneLandscape && images.length > 0 && (
            <div className="flex absolute bottom-0 left-0 right-0 z-10
                            items-center gap-2 px-3 py-2
                            bg-surface-950/80 backdrop-blur-sm">
              <button
                onClick={toggle}
                className="shrink-0 w-10 h-10 rounded-full bg-accent-500 hover:bg-accent-600
                           flex items-center justify-center text-white transition-colors active:scale-95"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>
              <input
                type="range"
                min={0}
                max={Math.max(0, total - 1)}
                value={currentIndex}
                onChange={handleSliderChange}
                className="timeline-slider flex-1"
                style={{ '--progress': `${progress}%` }}
                disabled={total === 0}
              />
              <span className="shrink-0 text-xs text-surface-400 tabular-nums">
                {currentIndex + 1}/{total}
              </span>
            </div>
          )}
        </div>

        {/* Calendar sidebar — desktop only */}
        {showCalendar && (
          <div className="hidden md:block w-64 shrink-0 border-l border-surface-800 bg-surface-900/50 overflow-y-auto p-3">
            <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-3">
              Navigate by date
            </p>
            {calendarContent}
            <div className="mt-3 text-xs text-surface-500 text-center">
              Highlighted dates have images
            </div>
          </div>
        )}
      </div>

      {/* Slider controls — hidden only on phone landscape */}
      {!isPhoneLandscape && <div className="border-t border-surface-800 bg-surface-900/80 backdrop-blur-sm pt-3">
        <TimeSlider
          images={images}
          currentIndex={currentIndex}
          onChange={goTo}
          isPlaying={isPlaying}
          onToggle={toggle}
          speed={speed}
          onSpeedChange={setSpeed}
        />
      </div>}

      {/* Thumbnail strip — hidden only on phone landscape */}
      {!isPhoneLandscape && <div className="border-t border-surface-800 bg-surface-950 h-16 overflow-hidden">
        <ThumbnailStrip
          images={images}
          currentIndex={currentIndex}
          onSelect={goTo}
        />
      </div>}

      {/* Calendar bottom sheet — mobile only */}
      {showCalendar && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-20 bg-black/50"
            onClick={() => setShowCalendar(false)}
          />
          {/* Sheet */}
          <div className="md:hidden fixed inset-x-0 bottom-14 z-30 bg-surface-900 border-t border-surface-800 rounded-t-2xl p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wide">
                Navigate by date
              </p>
              <button
                onClick={() => setShowCalendar(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full
                           text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-colors"
              >
                <CloseIcon />
              </button>
            </div>
            {calendarContent}
          </div>
        </>
      )}
    </div>
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

function CalendarIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}
