import { useState, useRef } from 'react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { ExtractedImage } from './PDFVisualExtractor';
import { Image as ImageIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditablePDFImageProps {
  item: ExtractedImage;
  isSelected: boolean;
  onSelect: (id: string, isCtrlKey: boolean) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
  onSizeChange: (id: string, width: number, height: number) => void;
  onDelete: (id: string) => void;
}

export const EditablePDFImage: React.FC<EditablePDFImageProps> = ({
  item,
  isSelected,
  onSelect,
  onPositionChange,
  onSizeChange,
  onDelete,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

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

  return (
    <Draggable
      position={{ x: item.x, y: item.y }}
      onStop={handleDragStop}
      disabled={isResizing}
    >
      <div
        className="absolute cursor-move group"
        style={{
          width: `${item.width}px`,
          height: `${item.height}px`,
        }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Selection/Hover Border */}
        <div
          className={`absolute inset-0 pointer-events-none transition-all ${
            isSelected
              ? 'ring-2 ring-blue-500 bg-blue-500/10'
              : isHovered
              ? 'ring-1 ring-blue-400/50 bg-blue-400/5'
              : ''
          }`}
          style={{ margin: '-2px' }}
        />

        {/* Image */}
        <img
          ref={imageRef}
          src={item.dataUrl}
          alt="PDF Image"
          className="w-full h-full object-contain"
          draggable={false}
        />

        {/* Controls */}
        {(isSelected || isHovered) && (
          <>
            <div className="absolute -top-8 left-0 flex items-center gap-1 bg-blue-500 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              <ImageIcon className="h-3 w-3" />
              Image
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

        {/* Resize Handle */}
        {isSelected && (
          <div
            className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize z-50"
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsResizing(true);
              
              const startX = e.clientX;
              const startY = e.clientY;
              const startWidth = item.width;
              const startHeight = item.height;
              
              const handleMouseMove = (moveEvent: MouseEvent) => {
                const deltaX = moveEvent.clientX - startX;
                const deltaY = moveEvent.clientY - startY;
                const newWidth = Math.max(20, startWidth + deltaX);
                const newHeight = Math.max(20, startHeight + deltaY);
                onSizeChange(item.id, newWidth, newHeight);
              };
              
              const handleMouseUp = () => {
                setIsResizing(false);
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
        )}
      </div>
    </Draggable>
  );
};
