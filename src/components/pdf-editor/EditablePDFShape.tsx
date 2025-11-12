import { useState } from 'react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { ExtractedShape } from './PDFVisualExtractor';
import { Square, Minus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditablePDFShapeProps {
  item: ExtractedShape;
  isSelected: boolean;
  onSelect: (id: string, isCtrlKey: boolean) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  onStrokeColorChange?: (id: string, color: string) => void;
  onFillColorChange?: (id: string, color: string) => void;
}

export const EditablePDFShape: React.FC<EditablePDFShapeProps> = ({
  item,
  isSelected,
  onSelect,
  onPositionChange,
  onDelete,
  onStrokeColorChange,
  onFillColorChange,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isCtrlKey = e.ctrlKey || e.metaKey;
    onSelect(item.id, isCtrlKey);
  };

  const handleDragStop = (e: DraggableEvent, data: DraggableData) => {
    onPositionChange(item.id, data.x, data.y);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(item.id);
  };

  const renderShape = () => {
    const commonProps = {
      stroke: item.strokeColor || '#000',
      strokeWidth: item.strokeWidth || 1,
      fill: item.fillColor || 'none',
    };

    if (item.type === 'rect') {
      return (
        <rect
          width={Math.abs(item.width)}
          height={Math.abs(item.height)}
          {...commonProps}
        />
      );
    }

    if (item.type === 'line') {
      return (
        <line
          x1={0}
          y1={0}
          x2={item.width}
          y2={item.height}
          {...commonProps}
        />
      );
    }

    if (item.type === 'path' && item.path) {
      return <path d={item.path} {...commonProps} />;
    }

    return null;
  };

  const getIcon = () => {
    if (item.type === 'rect') return <Square className="h-3 w-3" />;
    if (item.type === 'line') return <Minus className="h-3 w-3" />;
    return <Square className="h-3 w-3" />;
  };

  return (
    <Draggable
      position={{ x: item.x, y: item.y }}
      onStop={handleDragStop}
    >
      <div
        className="absolute cursor-move group"
        style={{
          width: `${Math.abs(item.width)}px`,
          height: `${Math.abs(item.height)}px`,
        }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Selection/Hover Border */}
        <div
          className={`absolute inset-0 pointer-events-none transition-all ${
            isSelected
              ? 'ring-2 ring-green-500 bg-green-500/10'
              : isHovered
              ? 'ring-1 ring-green-400/50 bg-green-400/5'
              : ''
          }`}
          style={{ margin: '-2px' }}
        />

        {/* Shape */}
        <svg
          width="100%"
          height="100%"
          className="pointer-events-none"
        >
          {renderShape()}
        </svg>

        {/* Controls */}
        {(isSelected || isHovered) && (
          <>
            <div className="absolute -top-8 left-0 flex items-center gap-1 bg-green-500 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              {getIcon()}
              {item.type}
            </div>
            
            {isSelected && (
              <Button
                size="sm"
                variant="destructive"
                className="absolute -top-8 -right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-50"
                onClick={handleDelete}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </>
        )}
      </div>
    </Draggable>
  );
};
