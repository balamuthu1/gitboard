import { useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";

interface VirtualListResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  visibleStart: number;
  visibleEnd: number;
  totalHeight: number;
  offsetTop: number;
  viewportHeight: number;
  scrollTop: number;
}

export function useVirtualList(
  itemCount: number,
  itemHeight: number,
  overscan = 5
): VirtualListResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScroll(containerRef.current.scrollTop);
    }
  }, []);

  // Set up ResizeObserver and scroll listener once on mount.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerHeight(el.clientHeight));
    ro.observe(el);
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", handleScroll);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Synchronously re-read height after every render so that layout changes
  // caused by graph-commit-bar or CommitActions appearing are picked up
  // in the same paint frame, not one frame later.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const h = el.clientHeight;
    if (h > 0 && h !== containerHeight) {
      setContainerHeight(h);
    }
  });

  const totalHeight = itemCount * itemHeight;
  const visibleStart = Math.max(0, Math.floor(scroll / itemHeight) - overscan);
  const visibleEnd = Math.min(
    itemCount,
    Math.ceil((scroll + containerHeight) / itemHeight) + overscan
  );
  const offsetTop = visibleStart * itemHeight;

  return { containerRef, visibleStart, visibleEnd, totalHeight, offsetTop, viewportHeight: containerHeight, scrollTop: scroll };
}
