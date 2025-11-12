import { useState } from "react";
import { Edit2, Move } from "lucide-react";
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

  const snapToGrid = (value: number): number => {
    if (!gridSettings.enabled) return value;
    return Math.round(value / gridSettings.size) * gridSettings.size;
  };

  const handleDrag = (e: DraggableEvent, data: DraggableData) => {
    if (onPositionChange) {
      const snappedX = snapToGrid(data.x);
      const snappedY = snapToGrid(data.y);
      onPositionChange(styleKey, snappedX, snappedY);
    }
  };

  const getStyles = () => {
    const baseStyles = {
      position: 'relative' as const,
      cursor: 'pointer',
      transition: 'all 0.2s',
      outline: isSelected ? '2px solid hsl(var(--primary))' : isHovered ? '1px dashed hsl(var(--primary) / 0.5)' : 'none',
      outlineOffset: '2px',
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
      disabled={!isSelected}
      bounds="parent"
    >
      <div
        style={getStyles()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(styleKey);
        }}
        className="group"
      >
        {children}
        {(isHovered || isSelected) && (
          <div className="absolute -top-6 -right-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs flex items-center gap-1 pointer-events-none">
            {isSelected && <Move className="w-3 h-3" />}
            <Edit2 className="w-3 h-3" />
            {type} {level && `H${level}`}
          </div>
        )}
        {isSelected && (
          <div className="absolute -bottom-6 left-0 bg-muted text-muted-foreground px-2 py-1 rounded text-xs pointer-events-none flex items-center gap-2">
            <span>x: {Math.round(position.x)}, y: {Math.round(position.y)}</span>
            {gridSettings.enabled && (
              <span className="text-xs opacity-70">| Grid: {gridSettings.size}px</span>
            )}
          </div>
        )}
      </div>
    </Draggable>
  );
};
