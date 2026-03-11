import { useState, useCallback, useRef, useEffect } from 'react';

export function useTimeline(images = []) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(5); // frames per second
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);

  const clamp = (i) => Math.max(0, Math.min(images.length - 1, i));

  const goTo = useCallback((i) => setCurrentIndex(clamp(i)), [images.length]);
  const goNext = useCallback(() => setCurrentIndex(i => clamp(i + 1)), [images.length]);
  const goPrev = useCallback(() => setCurrentIndex(i => clamp(i - 1)), [images.length]);

  const play = useCallback(() => {
    if (images.length === 0) return;
    setIsPlaying(true);
  }, [images.length]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastTimeRef.current = null;
  }, []);

  // rAF loop
  useEffect(() => {
    if (!isPlaying || images.length === 0) return;

    const interval = 1000 / speed;

    const tick = (timestamp) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const elapsed = timestamp - lastTimeRef.current;
      if (elapsed >= interval) {
        lastTimeRef.current = timestamp;
        setCurrentIndex(i => {
          const next = i + 1;
          if (next >= images.length) {
            setIsPlaying(false);
            return i;
          }
          return next;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, speed, images.length]);

  // Stop playback when we run out of images
  useEffect(() => {
    if (currentIndex >= images.length - 1 && isPlaying) {
      pause();
    }
  }, [currentIndex, images.length, isPlaying, pause]);

  // Jump to first image of a given date
  const goToDate = useCallback((dateStr) => {
    // Split manually to get local midnight — new Date('YYYY-MM-DD') parses as UTC
    const [y, m, d] = dateStr.split('-').map(Number);
    const ts = new Date(y, m - 1, d, 0, 0, 0).getTime() / 1000;
    const idx = images.findIndex(img => img.captured_at >= ts);
    if (idx !== -1) setCurrentIndex(idx);
  }, [images]);

  const currentImage = images[currentIndex] || null;

  return {
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
    toggle: isPlaying ? pause : play,
  };
}
