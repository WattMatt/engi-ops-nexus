import { useState } from "react";
import { Edit2, Move, Lock } from "lucide-react";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";

interface EditableElementProps {
  type: 'heading' | 'body' | 'table' | 'section';
  level?: 1 | 2 | 3;
  styleKey: string;
  children: React.ReactNode;
  currentStyles: any;
  isSelected: boolean;
  onSelect: (styleKey: string) => void;
  onPositionChange?: (styleKey: string, x: number, y: number) => void;
}

export const EditableElement = ({
  type,
  level,
  styleKey,
  children,
  currentStyles,
  isSelected,
  onSelect,
  onPositionChange,
}: EditableElementProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Get position from settings or default to 0,0
  const position = currentStyles.positions?.[styleKey] || { x: 0, y: 0 };
  const gridSettings = currentStyles.grid || { size: 10, enabled: true, visible: true };
  const metadata = currentStyles.elements?.[styleKey] || { visible: true, locked: false, zIndex: 0 };

  const snapToGrid = (value: number): number => {
    if (!gridSettings.enabled) return value;
    return Math.round(value / gridSettings.size) * gridSettings.size;
  };

  const handleDrag = (e: DraggableEvent, data: DraggableData) => {
    if (onPositionChange && !metadata.locked) {
      const snappedX = snapToGrid(data.x);
      const snappedY = snapToGrid(data.y);
      onPositionChange(styleKey, snappedX, snappedY);
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
      outline: isSelected ? '2px solid hsl(var(--primary))' : isHovered ? '1px dashed hsl(var(--primary) / 0.5)' : 'none',
      outlineOffset: '2px',
      opacity: metadata.locked ? 0.7 : 1,
      zIndex: metadata.zIndex,
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
      onDrag={handleDrag}
      disabled={!isSelected || metadata.locked}
      bounds="parent"
    >
      <div
        style={getStyles()}
        onMouseEnter={() => !metadata.locked && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (!metadata.locked) {
            onSelect(styleKey);
          }
        }}
        className="group"
      >
        {children}
        {(isHovered || isSelected) && !metadata.locked && (
          <div className="absolute -top-6 -right-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs flex items-center gap-1 pointer-events-none z-50">
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
