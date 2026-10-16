import { useCallback, useEffect, useRef, useState } from 'react';

export interface Position {
  x: number;
  y: number;
}

/**
 * Draggable floating-button hook.
 * - Saves position to localStorage under the given key.
 * - Distinguishes click vs drag (only clicks < 5px movement fire onClick).
 * - Works with mouse and touch (pointer events).
 * - Clamps position to viewport on resize.
 */
export function useDraggable(storageKey: string, defaultPos: Position) {
  const [pos, setPos] = useState<Position>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return defaultPos;
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    moved: false,
  });

  // Persist position on change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(pos));
    } catch {}
  }, [storageKey, pos]);

  // Clamp on resize
  useEffect(() => {
    const onResize = () => {
      setPos((p) => ({
        x: Math.min(p.x, window.innerWidth - 60),
        y: Math.min(p.y, window.innerHeight - 60),
      }));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        offsetX: pos.x,
        offsetY: pos.y,
        moved: false,
      };
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [pos]
  );

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - dragState.current.startX;
      const dy = e.clientY - dragState.current.startY;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        dragState.current.moved = true;
      }

      const newX = Math.max(
        8,
        Math.min(window.innerWidth - 80, dragState.current.offsetX + dx)
      );
      const newY = Math.max(
        8,
        Math.min(window.innerHeight - 60, dragState.current.offsetY + dy)
      );
      setPos({ x: newX, y: newY });
    };

    const onUp = () => setIsDragging(false);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [isDragging]);

  const didMove = useCallback(() => dragState.current.moved, []);

  const reset = useCallback(() => setPos(defaultPos), [defaultPos]);

  return { pos, isDragging, didMove, reset, dragHandlers: { onPointerDown } };
}
