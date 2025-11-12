import { useState, useRef } from "react";
import { Edit2, Move, Lock, Square } from "lucide-react";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";
import { ElementBounds } from "./AlignmentGuides";

interface EditableElementProps {
  type: 'heading' | 'body' | 'table' | 'section';
  level?: 1 | 2 | 3;
  styleKey: string;
  children: React.ReactNode;
  currentStyles: any;
  isSelected: boolean;
  isMultiSelected?: boolean;
  onSelect: (styleKey: string, isCtrlKey: boolean) => void;
  onPositionChange?: (styleKey: string, x: number, y: number) => void;
  onGroupDrag?: (deltaX: number, deltaY: number) => void;
  onDragStart?: (styleKey: string, bounds: ElementBounds) => void;
  onDragging?: (styleKey: string, bounds: ElementBounds) => void;
  onDragEnd?: () => void;
  snapPosition?: { x: number | null; y: number | null };
}

export const EditableElement = ({
  type,
  level,
  styleKey,
  children,
  currentStyles,
  isSelected,
  isMultiSelected,
  onSelect,
  onPositionChange,
  onGroupDrag,
  onDragStart,
  onDragging,
  onDragEnd,
  snapPosition,
}: EditableElementProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  
  // Get position from settings or default to 0,0
  const position = currentStyles.positions?.[styleKey] || { x: 0, y: 0 };
  const gridSettings = currentStyles.grid || { size: 10, enabled: true, visible: true };
  const metadata = currentStyles.elements?.[styleKey] || { visible: true, locked: false, zIndex: 0 };

  const snapToGrid = (value: number): number => {
    if (!gridSettings.enabled) return value;
    return Math.round(value / gridSettings.size) * gridSettings.size;
  };

  const getElementBounds = (pos: { x: number; y: number }): ElementBounds | null => {
    if (!elementRef.current) return null;
    
    const rect = elementRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    return {
      left: pos.x,
      right: pos.x + width,
      top: pos.y,
      bottom: pos.y + height,
      centerX: pos.x + width / 2,
      centerY: pos.y + height / 2,
      width,
      height,
    };
  };

  const handleDragStart = (e: DraggableEvent) => {
    if (!metadata.locked) {
      setDragStart({ x: position.x, y: position.y });
      
      if (onDragStart && !isMultiSelected) {
        const bounds = getElementBounds(position);
        if (bounds) {
          onDragStart(styleKey, bounds);
        }
      }
    }
  };

  const handleDrag = (e: DraggableEvent, data: DraggableData) => {
    if (metadata.locked || !dragStart) return;

    let snappedX = snapToGrid(data.x);
    let snappedY = snapToGrid(data.y);

    // Apply smart guide snapping if available (overrides grid snap)
    if (snapPosition) {
      if (snapPosition.x !== null) snappedX = snapPosition.x;
      if (snapPosition.y !== null) snappedY = snapPosition.y;
    }

    // Update guides during drag
    if (onDragging && !isMultiSelected) {
      const bounds = getElementBounds({ x: snappedX, y: snappedY });
      if (bounds) {
        onDragging(styleKey, bounds);
      }
    }

    // If multi-selected, use group drag
    if (isMultiSelected && onGroupDrag) {
      const deltaX = snappedX - dragStart.x;
      const deltaY = snappedY - dragStart.y;
      onGroupDrag(deltaX, deltaY);
      setDragStart({ x: snappedX, y: snappedY });
    } else if (onPositionChange) {
      onPositionChange(styleKey, snappedX, snappedY);
    }
  };

  const handleDragStop = () => {
    setDragStart(null);
    if (onDragEnd) {
      onDragEnd();
    }
  };

  // Don't render if hidden
  if (!metadata.visible) {
    return null;
  }

  const getStyles = () => {
    const baseStyles = {
      position: 'relative' as const,
      cursor: metadata.locked ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s',
      outline: isSelected || isMultiSelected ? '2px solid hsl(var(--primary))' : isHovered ? '1px dashed hsl(var(--primary) / 0.5)' : 'none',
      outlineOffset: '2px',
      opacity: metadata.locked ? 0.7 : 1,
      zIndex: metadata.zIndex,
      backgroundColor: isMultiSelected ? 'hsla(var(--primary) / 0.05)' : 'transparent',
    };

    if (type === 'heading') {
      const sizeKey = `h${level}Size`;
      return {
        ...baseStyles,
        fontFamily: currentStyles.typography.headingFont,
        fontSize: `${currentStyles.typography[sizeKey]}px`,
        fontWeight: 'bold',
        color: `rgb(${currentStyles.colors.primary.join(',')})`,
      };
    }

    if (type === 'body') {
      return {
        ...baseStyles,
        fontFamily: currentStyles.typography.bodyFont,
        fontSize: `${currentStyles.typography.bodySize}px`,
        color: `rgb(${currentStyles.colors.text.join(',')})`,
      };
    }

    return baseStyles;
  };

  return (
    <Draggable
      position={position}
      onStart={handleDragStart}
      onDrag={handleDrag}
      onStop={handleDragStop}
      disabled={!isSelected || metadata.locked}
      bounds="parent"
    >
      <div
        ref={elementRef}
        style={getStyles()}
        onMouseEnter={() => !metadata.locked && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (!metadata.locked) {
            onSelect(styleKey, e.ctrlKey || e.metaKey);
          }
        }}
        className="group"
      >
        {children}
        {(isHovered || isSelected) && !metadata.locked && (
          <div className="absolute -top-6 -right-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs flex items-center gap-1 pointer-events-none z-50">
            {isMultiSelected && <Square className="w-3 h-3 fill-current" />}
            {isSelected && <Move className="w-3 h-3" />}
            <Edit2 className="w-3 h-3" />
            {type} {level && `H${level}`}
          </div>
        )}
        {isSelected && !metadata.locked && (
          <div className="absolute -bottom-6 left-0 bg-muted text-muted-foreground px-2 py-1 rounded text-xs pointer-events-none flex items-center gap-2 z-50">
            <span>x: {Math.round(position.x)}, y: {Math.round(position.y)}</span>
            {gridSettings.enabled && (
              <span className="text-xs opacity-70">| Grid: {gridSettings.size}px</span>
            )}
            <span className="text-xs opacity-70">| z: {metadata.zIndex}</span>
          </div>
        )}
        {metadata.locked && (
          <div className="absolute top-1 right-1 bg-muted/90 p-1 rounded pointer-events-none z-50">
            <Lock className="w-3 h-3 text-muted-foreground" />
          </div>
        )}
      </div>
    </Draggable>
  );
};
