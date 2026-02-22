import { useProgress } from '@react-three/drei';
import { useEffect, useState, useRef, useCallback } from 'react';

export default function Loader() {
  const { progress } = useProgress();
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);
  const phase = useRef<'download' | 'fake' | 'done'>('download');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Listen for the real scene ready event
  useEffect(() => {
    const onReady = () => setSceneReady(true);
    window.addEventListener('sceneReady', onReady);
    return () => window.removeEventListener('sceneReady', onReady);
  }, []);

  // Phase 1: real download → maps to 0-80%
  useEffect(() => {
    if (phase.current !== 'download') return;
    const mapped = Math.min(80, progress * 0.8);
    setDisplayProgress(mapped);

    // When download is done, switch to fake phase
    if (progress >= 100) {
      phase.current = 'fake';
      startFakeCrawl();
    }
  }, [progress]);

  // Start fake crawl: 80 → 99 over ~10 seconds
  const startFakeCrawl = useCallback(() => {
    if (intervalRef.current) return;
    const startTime = Date.now();
    const duration = 10000; // 10 seconds

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      // Ease-out curve: fast at start, slows down toward 99
      const eased = 1 - Math.pow(1 - t, 3);
      const value = 80 + eased * 19; // 80 → 99
      setDisplayProgress(Math.min(99, value));

      if (t >= 1) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
      }
    }, 50);
  }, []);

  // Phase 3: scene ready → 100% and fade out
  useEffect(() => {
    if (!sceneReady) return;
    phase.current = 'done';
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setDisplayProgress(100);
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => setShow(false), 1200);
    }, 400);
    return () => clearTimeout(timer);
  }, [sceneReady]);

  if (!show) return null;

  return (
    <div className={`loader-screen ${fadeOut ? 'fade-out' : ''}`}>
      <div className="loader-content">
        <h1 className="loader-title">PORTFOLIO</h1>
        <p className="loader-name">Guillaume HARARI</p>
        <div className="loader-bar-container">
          <div
            className="loader-bar"
            style={{ width: `${displayProgress}%` }}
          />
        </div>
        <p className="loader-percent">{Math.round(displayProgress)}%</p>
      </div>
    </div>
  );
}
