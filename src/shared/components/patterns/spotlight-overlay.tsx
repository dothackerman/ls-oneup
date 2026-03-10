import { useEffect, useState } from "react";

type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type SpotlightOverlayProps = {
  selector?: string;
};

const SPOTLIGHT_PADDING = 14;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function SpotlightOverlay({ selector }: SpotlightOverlayProps): JSX.Element | null {
  const [rect, setRect] = useState<SpotlightRect | null>(null);

  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }

    const targetSelector = selector;

    function measure(): void {
      const element = document.querySelector(targetSelector);
      if (!(element instanceof HTMLElement)) {
        setRect(null);
        return;
      }

      const bounds = element.getBoundingClientRect();
      const top = clamp(bounds.top - SPOTLIGHT_PADDING, 0, window.innerHeight);
      const left = clamp(bounds.left - SPOTLIGHT_PADDING, 0, window.innerWidth);
      const right = clamp(bounds.right + SPOTLIGHT_PADDING, 0, window.innerWidth);
      const bottom = clamp(bounds.bottom + SPOTLIGHT_PADDING, 0, window.innerHeight);

      setRect({
        top,
        left,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top),
      });
    }

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [selector]);

  if (!selector) {
    return (
      <div
        data-slot="spotlight-overlay"
        className="fixed inset-0 z-40 bg-black/45 supports-backdrop-filter:backdrop-blur-xs"
      />
    );
  }

  if (!rect) {
    return null;
  }

  const bottom = rect.top + rect.height;
  const right = rect.left + rect.width;

  return (
    <>
      <div
        data-slot="spotlight-overlay"
        className="fixed inset-x-0 top-0 z-40 bg-black/45 supports-backdrop-filter:backdrop-blur-xs"
        style={{ height: rect.top }}
      />
      <div
        className="fixed inset-x-0 bottom-0 z-40 bg-black/45 supports-backdrop-filter:backdrop-blur-xs"
        style={{ top: bottom }}
      />
      <div
        className="fixed left-0 z-40 bg-black/45 supports-backdrop-filter:backdrop-blur-xs"
        style={{ top: rect.top, width: rect.left, height: rect.height }}
      />
      <div
        className="fixed right-0 z-40 bg-black/45 supports-backdrop-filter:backdrop-blur-xs"
        style={{ top: rect.top, left: right, height: rect.height }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-[45] rounded-xl border border-primary/70 shadow-spotlight-frame transition-all duration-300"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
      />
    </>
  );
}
