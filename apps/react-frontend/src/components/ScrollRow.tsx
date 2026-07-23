import { useRef, type ReactNode } from 'react';

/**
 * A horizontal card row that pages with arrow buttons instead of a visible scrollbar.
 * The buttons scroll the track by ~one viewport per click (smooth), matching the
 * "Trending" row pattern from the design reference.
 */
export function ScrollRow({ children }: { children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function page(direction: 1 | -1) {
    const track = trackRef.current;
    if (track) {
      track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: 'smooth' });
    }
  }

  return (
    <div className="scroll-row">
      <div ref={trackRef} className="row scroll-row__track">
        {children}
      </div>
      <div className="scroll-row__nav" aria-hidden="false">
        <button type="button" aria-label="Scroll forward" onClick={() => page(1)}>
          ›
        </button>
        <button type="button" aria-label="Scroll back" onClick={() => page(-1)}>
          ‹
        </button>
      </div>
    </div>
  );
}
