import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Check, Scan } from 'lucide-react';

interface RegionSelectionOverlayProps {
  isActive: boolean;
  onCancel: () => void;
  onConfirm: (region: { x: number; y: number; width: number; height: number }) => void;
  containerRef: React.RefObject<HTMLElement>;
}

export function RegionSelectionOverlay({
  isActive,
  onCancel,
  onConfirm,
  containerRef,
}: RegionSelectionOverlayProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ x: number; y: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const getRelativePosition = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!overlayRef.current) return { x: 0, y: 0 };
    const rect = overlayRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    const pos = getRelativePosition(e);
    setStartPoint(pos);
    setEndPoint(pos);
    setIsDrawing(true);
  }, [getRelativePosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return;
    setEndPoint(getRelativePosition(e));
  }, [isDrawing, getRelativePosition]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Calculate selection box
  const selectionBox = startPoint && endPoint ? {
    x: Math.min(startPoint.x, endPoint.x),
    y: Math.min(startPoint.y, endPoint.y),
    width: Math.abs(endPoint.x - startPoint.x),
    height: Math.abs(endPoint.y - startPoint.y),
  } : null;

  const hasValidSelection = selectionBox && selectionBox.width > 20 && selectionBox.height > 20;

  const handleConfirm = () => {
    if (hasValidSelection && selectionBox) {
      console.log('RegionSelectionOverlay - Confirming selection:', selectionBox);
      onConfirm(selectionBox);
    }
  };

  // Reset on deactivation
  useEffect(() => {
    if (!isActive) {
      setStartPoint(null);
      setEndPoint(null);
      setIsDrawing(false);
    }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-50 cursor-crosshair"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Instructions */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg px-4 py-2 shadow-lg">
        <p className="text-sm text-foreground flex items-center gap-2">
          <Scan className="h-4 w-4 text-primary" />
          Draw a rectangle around the area to scan for circuit references
        </p>
      </div>

      {/* Selection Rectangle */}
      {selectionBox && selectionBox.width > 0 && selectionBox.height > 0 && (
        <div
          className="absolute border-2 border-primary bg-primary/10 pointer-events-none"
          style={{
            left: selectionBox.x,
            top: selectionBox.y,
            width: selectionBox.width,
            height: selectionBox.height,
          }}
        >
          {/* Corner handles for visual feedback */}
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-primary rounded-full" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-primary rounded-full" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full" />
          
          {/* Size indicator */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-card border border-border rounded px-2 py-0.5 text-xs text-muted-foreground whitespace-nowrap">
            {Math.round(selectionBox.width)} × {Math.round(selectionBox.height)} px
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div 
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          className="bg-card"
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        {hasValidSelection && (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              console.log('Scan button clicked, calling onConfirm with:', selectionBox);
              handleConfirm();
            }}
          >
            <Check className="h-4 w-4 mr-1" />
            Scan This Region
          </Button>
        )}
      </div>
    </div>
  );
}
