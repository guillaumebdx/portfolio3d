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

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
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

  return (
    <div className="overlay">
      {!isMobile && (
        <div className="hint">Cliquer pour entrer — ZQSD / WASD pour se déplacer</div>
      )}
      {isMobile && (
        <div className="hint">Glisser pour regarder</div>
      )}

      <div className="overlay-title">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      {isMobile && (
        <div className="walk-btns">
          <button
            className="walk-btn"
            onTouchStart={onWalkStart}
            onTouchEnd={onWalkEnd}
            onContextMenu={(e) => e.preventDefault()}
          >
            ▲
          </button>
          <button
            className="walk-btn walk-btn-back"
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
