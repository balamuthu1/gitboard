import { useRef, useState, useEffect, useCallback } from "react";

interface VirtualListResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  visibleStart: number;
  visibleEnd: number;
  totalHeight: number;
  offsetTop: number;
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
  }, [handleScroll]);

  const totalHeight = itemCount * itemHeight;
  const visibleStart = Math.max(0, Math.floor(scroll / itemHeight) - overscan);
  const visibleEnd = Math.min(
    itemCount,
    Math.ceil((scroll + containerHeight) / itemHeight) + overscan
  );
  const offsetTop = visibleStart * itemHeight;

  return { containerRef, visibleStart, visibleEnd, totalHeight, offsetTop };
}
