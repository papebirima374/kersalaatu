import React, { useEffect, useRef, useState } from 'react';

/**
 * « Tirer vers le bas pour rafraîchir » (geste mobile natif).
 * Se déclenche uniquement quand la page est tout en haut.
 * Monté une seule fois (dans App) → fonctionne sur toutes les pages.
 */
const THRESHOLD = 70; // px de tirage nécessaires pour déclencher

export default function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const active = useRef(false);
  const val = useRef(0);

  useEffect(() => {
    const onStart = (e) => {
      // Désactivé quand un modal verrouille le défilement (body en overflow hidden)
      if (document.body.style.overflow === 'hidden') { active.current = false; return; }
      if (window.scrollY <= 0 && e.touches.length === 1) {
        startY.current = e.touches[0].clientY;
        active.current = true;
      } else {
        active.current = false;
      }
    };
    const onMove = (e) => {
      if (!active.current || startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && window.scrollY <= 0) {
        const damped = Math.min(dy * 0.45, 110); // résistance + plafond
        val.current = damped;
        setPull(damped);
      } else {
        active.current = false;
        val.current = 0;
        setPull(0);
      }
    };
    const onEnd = () => {
      if (!active.current) return;
      active.current = false;
      startY.current = null;
      if (val.current >= THRESHOLD) {
        setRefreshing(true);
        setPull(THRESHOLD);
        setTimeout(() => window.location.reload(), 250);
      } else {
        val.current = 0;
        setPull(0);
      }
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  if (pull <= 0 && !refreshing) return null;

  const ready = pull >= THRESHOLD || refreshing;
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] flex justify-center pointer-events-none"
      style={{
        transform: `translateY(${Math.max(0, pull - 18)}px)`,
        paddingTop: 'env(safe-area-inset-top)',
        transition: refreshing ? 'transform .2s ease' : 'none',
      }}
    >
      <div className={`mt-2 w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center ${ready ? 'ring-2 ring-blue-400' : ''}`}>
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
          className={`w-5 h-5 text-blue-500 ${refreshing ? 'animate-spin' : ''}`}
          style={{ transform: refreshing ? 'none' : `rotate(${pull * 3}deg)` }}
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
      </div>
    </div>
  );
}
