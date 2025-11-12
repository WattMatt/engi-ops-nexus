import { useState, useRef, useEffect } from 'react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { ExtractedTextItem } from './PDFTextExtractor';

interface EditablePDFTextProps {
  item: ExtractedTextItem;
  isSelected: boolean;
  scale: number;
  onSelect: (id: string, isCtrlKey: boolean) => void;
  onTextChange: (id: string, newText: string) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
}

export const EditablePDFText: React.FC<EditablePDFTextProps> = ({
  item,
  isSelected,
  scale,
  onSelect,
  onTextChange,
  onPositionChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(item.text);
  const [position, setPosition] = useState({ x: item.x * scale, y: item.y * scale });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isCtrlKey = e.ctrlKey || e.metaKey;
    onSelect(item.id, isCtrlKey);
    
    if (isSelected && !isCtrlKey) {
      setIsEditing(true);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (text !== item.text) {
      onTextChange(item.id, text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      if (text !== item.text) {
        onTextChange(item.id, text);
      }
    } else if (e.key === 'Escape') {
      setText(item.text);
      setIsEditing(false);
    }
  };

  const handleDragStop = (e: DraggableEvent, data: DraggableData) => {
    const newX = data.x / scale;
    const newY = data.y / scale;
    setPosition({ x: data.x, y: data.y });
    onPositionChange(item.id, newX, newY);
  };

  return (
    <Draggable
      position={position}
      onStop={handleDragStop}
      disabled={isEditing}
      handle=".drag-handle"
    >
      <div
        className="absolute cursor-move group drag-handle"
        style={{
          minWidth: `${item.width * scale}px`,
          minHeight: `${item.height * scale}px`,
        }}
        onClick={handleClick}
      >
        {/* Selection/Hover Border */}
        <div
          className={`absolute inset-0 pointer-events-none transition-all ${
            isSelected
              ? 'ring-2 ring-primary bg-primary/10'
              : 'group-hover:ring-1 group-hover:ring-primary/50 group-hover:bg-primary/5'
          }`}
        />

        {/* Text Content */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={handleTextChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="absolute inset-0 bg-white border-2 border-primary outline-none px-1 z-10"
            style={{
              fontSize: `${item.fontSize * scale}px`,
              fontFamily: item.fontFamily,
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className="absolute inset-0 px-1 whitespace-nowrap overflow-hidden"
            style={{
              fontSize: `${item.fontSize * scale}px`,
              fontFamily: item.fontFamily,
              color: 'transparent',
              textShadow: '0 0 0 #000',
            }}
          >
            {text}
          </div>
        )}

        {/* Edit indicator when selected */}
        {isSelected && !isEditing && (
          <div className="absolute -top-6 left-0 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            Click to edit
          </div>
        )}
      </div>
    </Draggable>
  );
};
