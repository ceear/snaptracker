import { useCallback } from 'react';
import { format, fromUnixTime } from 'date-fns';

export default function TimeSlider({ images, currentIndex, onChange, isPlaying, onToggle, speed, onSpeedChange }) {
  const total = images.length;
  const progress = total > 1 ? (currentIndex / (total - 1)) * 100 : 0;

  const handleChange = useCallback((e) => {
    onChange(parseInt(e.target.value, 10));
  }, [onChange]);

  const currentImage = images[currentIndex];

  return (
    <div className="px-4 pb-3 space-y-2">
      {/* Slider row */}
      <div className="flex items-center gap-3">
        {/* Play/Pause */}
        <button
          onClick={onToggle}
          disabled={total === 0}
          className="shrink-0 w-9 h-9 rounded-full bg-accent-500 hover:bg-accent-600 disabled:opacity-40
                     flex items-center justify-center text-white transition-colors active:scale-95"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        {/* Time range labels */}
        {total > 0 && (
          <span className="text-[10px] text-surface-500 shrink-0 hidden sm:block w-28">
            {format(fromUnixTime(images[0].captured_at), 'MMM d yyyy')}
          </span>
        )}

        {/* The slider */}
        <div className="flex-1 relative">
          <input
            type="range"
            min={0}
            max={Math.max(0, total - 1)}
            value={currentIndex}
            onChange={handleChange}
            className="timeline-slider w-full"
            style={{ '--progress': `${progress}%` }}
            disabled={total === 0}
          />
        </div>

        {total > 0 && (
          <span className="text-[10px] text-surface-500 shrink-0 hidden sm:block w-28 text-right">
            {format(fromUnixTime(images[total - 1].captured_at), 'MMM d yyyy')}
          </span>
        )}
      </div>

      {/* Position info + speed control */}
      <div className="flex items-center justify-between px-0">
        <div className="text-xs text-surface-400">
          {total > 0 ? (
            <span>{currentIndex + 1} / {total}</span>
          ) : (
            <span>No images</span>
          )}
        </div>

        {/* Speed control */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-surface-500">Speed</span>
          {[1, 3, 5, 10, 24].map(fps => (
            <button
              key={fps}
              onClick={() => onSpeedChange(fps)}
              className={`text-xs px-2 py-0.5 rounded transition-colors ${
                speed === fps
                  ? 'bg-accent-500/20 text-accent-400 font-medium'
                  : 'text-surface-500 hover:text-surface-300'
              }`}
            >
              {fps}fps
            </button>
          ))}
        </div>
      </div>
    </div>
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
