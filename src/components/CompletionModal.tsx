import { useState, useEffect } from 'react';

export default function CompletionModal() {
  const [show, setShow] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    const onComplete = () => {
      setShow(true);
      // Trigger fade-in after mount
      requestAnimationFrame(() => setFadeIn(true));
    };

    window.addEventListener('allPaintingsVisited', onComplete);
    return () => window.removeEventListener('allPaintingsVisited', onComplete);
  }, []);

  if (!show) return null;

  return (
    <div className={`completion-overlay ${fadeIn ? 'visible' : ''}`}>
      <div className="completion-modal">
        <button className="completion-close" onClick={() => setShow(false)}>
          ✕
        </button>

        <div className="completion-emoji">🎉</div>
        <h2>Bravo !</h2>
        <p className="completion-text">
          Vous avez regardé tous mes projets !
        </p>
        <p className="completion-subtext">
          Cadeau pour vous remercier :
        </p>

        <div className="completion-video">
          <iframe
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
            title="Cadeau"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
