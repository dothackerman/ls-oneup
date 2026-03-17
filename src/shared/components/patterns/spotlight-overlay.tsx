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

const SPOTLIGHT_PADDING = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function SpotlightOverlay({ selector }: SpotlightOverlayProps): React.JSX.Element | null {
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
    return <div data-slot="spotlight-overlay" className="fixed inset-0 z-40 bg-black/45" />;
  }

  if (!rect) {
    return null;
  }

  return (
    <>
      <div
        data-slot="spotlight-overlay"
        className="pointer-events-none fixed z-40 rounded-sm"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-[45] border border-primary/70 shadow-spotlight-frame transition-all duration-300"
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
