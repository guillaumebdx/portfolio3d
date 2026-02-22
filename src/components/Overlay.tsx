import { useState, useEffect, useCallback } from 'react';

interface OverlayProps {
  title?: string;
  subtitle?: string;
}

export default function Overlay({
  title = 'Portfolio',
  subtitle = 'Guillaume HARARI',
}: OverlayProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [touring, setTouring] = useState(false);

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  useEffect(() => {
    const onStart = () => setTouring(true);
    const onEnd = () => setTouring(false);
    window.addEventListener('startGuidedTour', onStart);
    window.addEventListener('guidedTourEnd', onEnd);
    window.addEventListener('stopGuidedTour', onEnd);
    return () => {
      window.removeEventListener('startGuidedTour', onStart);
      window.removeEventListener('guidedTourEnd', onEnd);
      window.removeEventListener('stopGuidedTour', onEnd);
    };
  }, []);

  const onWalkStart = useCallback(() => {
    window.dispatchEvent(new Event('walkStart'));
  }, []);

  const onWalkEnd = useCallback(() => {
    window.dispatchEvent(new Event('walkEnd'));
  }, []);

  const onWalkBackStart = useCallback(() => {
    window.dispatchEvent(new Event('walkBackStart'));
  }, []);

  const onWalkBackEnd = useCallback(() => {
    window.dispatchEvent(new Event('walkBackEnd'));
  }, []);

  const onStrafeLeftStart = useCallback(() => {
    window.dispatchEvent(new Event('strafeLeftStart'));
  }, []);

  const onStrafeLeftEnd = useCallback(() => {
    window.dispatchEvent(new Event('strafeLeftEnd'));
  }, []);

  const onStrafeRightStart = useCallback(() => {
    window.dispatchEvent(new Event('strafeRightStart'));
  }, []);

  const onStrafeRightEnd = useCallback(() => {
    window.dispatchEvent(new Event('strafeRightEnd'));
  }, []);

  return (
    <div className="overlay">
      {!isMobile && (
        <div className="hint">Cliquer pour entrer — ZQSD / WASD pour se déplacer</div>
      )}
      {isMobile && (
        <div className="hint">Glisser pour regarder — Toucher un tableau pour s'en approcher</div>
      )}

      <div className="overlay-title">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      {isMobile && !touring && (
        <div className="walk-btns">
          <button
            className="walk-btn walk-btn-up"
            onTouchStart={onWalkStart}
            onTouchEnd={onWalkEnd}
            onContextMenu={(e) => e.preventDefault()}
          >
            ▲
          </button>
          <button
            className="walk-btn walk-btn-left"
            onTouchStart={onStrafeLeftStart}
            onTouchEnd={onStrafeLeftEnd}
            onContextMenu={(e) => e.preventDefault()}
          >
            ◀
          </button>
          <button
            className="walk-btn walk-btn-right"
            onTouchStart={onStrafeRightStart}
            onTouchEnd={onStrafeRightEnd}
            onContextMenu={(e) => e.preventDefault()}
          >
            ▶
          </button>
          <button
            className="walk-btn walk-btn-down"
            onTouchStart={onWalkBackStart}
            onTouchEnd={onWalkBackEnd}
            onContextMenu={(e) => e.preventDefault()}
          >
            ▼
          </button>
        </div>
      )}
    </div>
  );
}
