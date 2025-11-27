import { useRef, useCallback, useState } from 'react';

interface Point {
  x: number;
  y: number;
}

interface DragState<T> {
  isDragging: boolean;
  startPosition: Point | null;
  currentPosition: Point | null;
  item: T | null;
  itemId: string | null;
}

/**
 * High-performance drag state manager for floor plan elements.
 * Uses refs for position tracking to avoid re-renders during drag,
 * only committing state updates on drag end.
 */
export function useDragState<T>() {
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<DragState<T>>({
    isDragging: false,
    startPosition: null,
    currentPosition: null,
    item: null,
    itemId: null,
  });

  // Track position changes without causing re-renders
  const positionRef = useRef<Point>({ x: 0, y: 0 });
  const deltaRef = useRef<Point>({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);

  const startDrag = useCallback((item: T, itemId: string, startPos: Point) => {
    dragStateRef.current = {
      isDragging: true,
      startPosition: startPos,
      currentPosition: startPos,
      item,
      itemId,
    };
    positionRef.current = startPos;
    deltaRef.current = { x: 0, y: 0 };
    setIsDragging(true);
  }, []);

  const updatePosition = useCallback((newPos: Point) => {
    if (!dragStateRef.current.isDragging) return;
    
    const start = dragStateRef.current.startPosition;
    if (start) {
      deltaRef.current = {
        x: newPos.x - start.x,
        y: newPos.y - start.y,
      };
    }
    positionRef.current = newPos;
    dragStateRef.current.currentPosition = newPos;
  }, []);

  const endDrag = useCallback((): { delta: Point; itemId: string | null } | null => {
    if (!dragStateRef.current.isDragging) return null;

    const result = {
      delta: { ...deltaRef.current },
      itemId: dragStateRef.current.itemId,
    };

    // Clean up
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    dragStateRef.current = {
      isDragging: false,
      startPosition: null,
      currentPosition: null,
      item: null,
      itemId: null,
    };
    deltaRef.current = { x: 0, y: 0 };
    setIsDragging(false);

    return result;
  }, []);

  const cancelDrag = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    dragStateRef.current = {
      isDragging: false,
      startPosition: null,
      currentPosition: null,
      item: null,
      itemId: null,
    };
    deltaRef.current = { x: 0, y: 0 };
    setIsDragging(false);
  }, []);

  const getDelta = useCallback((): Point => {
    return { ...deltaRef.current };
  }, []);

  const getCurrentPosition = useCallback((): Point => {
    return { ...positionRef.current };
  }, []);

  const getItem = useCallback((): T | null => {
    return dragStateRef.current.item;
  }, []);

  const getItemId = useCallback((): string | null => {
    return dragStateRef.current.itemId;
  }, []);

  return {
    isDragging,
    startDrag,
    updatePosition,
    endDrag,
    cancelDrag,
    getDelta,
    getCurrentPosition,
    getItem,
    getItemId,
  };
}

/**
 * Batch multiple drag updates into a single render using requestAnimationFrame
 */
export function useBatchedDragUpdate<T>(onUpdate: (items: T[]) => void) {
  const pendingUpdatesRef = useRef<T[]>([]);
  const frameRef = useRef<number | null>(null);

  const queueUpdate = useCallback((item: T) => {
    pendingUpdatesRef.current.push(item);

    if (!frameRef.current) {
      frameRef.current = requestAnimationFrame(() => {
        onUpdate([...pendingUpdatesRef.current]);
        pendingUpdatesRef.current = [];
        frameRef.current = null;
      });
    }
  }, [onUpdate]);

  const flush = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (pendingUpdatesRef.current.length > 0) {
      onUpdate([...pendingUpdatesRef.current]);
      pendingUpdatesRef.current = [];
    }
  }, [onUpdate]);

  return { queueUpdate, flush };
}
