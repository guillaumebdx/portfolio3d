import { useState, useEffect } from 'react';

export default function ModeSelector() {
  const [show, setShow] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [touring, setTouring] = useState(false);

  // Show mode selector as soon as scene is ready (blocks interaction until chosen)
  useEffect(() => {
    const onReady = () => setShow(true);
    window.addEventListener('sceneReady', onReady);
    return () => window.removeEventListener('sceneReady', onReady);
  }, []);

  // Listen for tour end (finished all paintings or user cancelled via movement)
  useEffect(() => {
    const onTourEnd = () => setTouring(false);
    window.addEventListener('guidedTourEnd', onTourEnd);
    return () => window.removeEventListener('guidedTourEnd', onTourEnd);
  }, []);

  const dismiss = () => {
    setFadeOut(true);
    setTimeout(() => setShow(false), 600);
  };

  const handleFreeRoam = () => {
    window.dispatchEvent(new Event('modeSelected'));
    dismiss();
  };

  const handleGuidedTour = () => {
    window.dispatchEvent(new Event('modeSelected'));
    dismiss();
    setTouring(true);
    // Small delay so the selector fades out first
    setTimeout(() => {
      window.dispatchEvent(new Event('startGuidedTour'));
    }, 700);
  };

  const handleStopTour = () => {
    setTouring(false);
    window.dispatchEvent(new Event('stopGuidedTour'));
  };

  return (
    <>
      {show && (
        <div className={`mode-selector-overlay ${fadeOut ? 'fade-out' : ''}`}>
          <div className="mode-selector">
            <h2 className="mode-selector-title">Bienvenue</h2>
            <p className="mode-selector-subtitle">Comment souhaitez-vous visiter ?</p>
            <div className="mode-selector-buttons">
              <button className="mode-btn" onClick={handleFreeRoam}>
                <span className="mode-btn-icon">🚶</span>
                <span className="mode-btn-label">Promenade libre</span>
              </button>
              <button className="mode-btn" onClick={handleGuidedTour}>
                <span className="mode-btn-icon">🎬</span>
                <span className="mode-btn-label">Visite guidée sans les mains</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {touring && (
        <button className="tour-exit-btn" onClick={handleStopTour}>
          Passer en promenade libre
        </button>
      )}
    </>
  );
}
