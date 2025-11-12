import { useState, useRef, useEffect } from 'react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { ExtractedTextItem } from './PDFTextExtractor';
import { Edit2 } from 'lucide-react';

interface EditablePDFTextProps {
  item: ExtractedTextItem;
  isSelected: boolean;
  scale: number;
  onSelect: (id: string, isCtrlKey: boolean) => void;
  onTextChange: (id: string, newText: string) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
  onColorChange?: (id: string, color: string) => void;
}

export const EditablePDFText: React.FC<EditablePDFTextProps> = ({
  item,
  isSelected,
  scale,
  onSelect,
  onTextChange,
  onPositionChange,
  onColorChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(item.text);
  const [isHovered, setIsHovered] = useState(false);
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
    
    if (isSelected && !isCtrlKey && e.detail === 2) {
      // Double click to edit
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
    onPositionChange(item.id, data.x, data.y);
  };

  return (
    <Draggable
      position={{ x: item.x, y: item.y }}
      onStop={handleDragStop}
      disabled={isEditing}
      cancel="input"
    >
      <div
        className="absolute cursor-pointer group"
        style={{
          minWidth: `${item.width}px`,
          minHeight: `${item.height}px`,
        }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Selection/Hover Border */}
        <div
          className={`absolute inset-0 pointer-events-none transition-all ${
            isSelected
              ? 'ring-2 ring-primary bg-primary/10'
              : isHovered
              ? 'ring-1 ring-primary/50 bg-primary/5'
              : ''
          }`}
          style={{ margin: '-2px' }}
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
            className="absolute inset-0 bg-white border-2 border-primary outline-none px-1 z-50"
            style={{
              fontSize: `${item.fontSize}px`,
              fontFamily: item.fontFamily,
              fontWeight: item.bold ? 'bold' : 'normal',
              color: item.color || '#000',
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className="absolute inset-0 px-1 whitespace-nowrap select-none"
            style={{
              fontSize: `${item.fontSize}px`,
              fontFamily: item.fontFamily,
              fontWeight: item.bold ? 'bold' : 'normal',
              color: item.color || '#000',
            }}
          >
            {text}
          </div>
        )}

        {/* Edit indicator */}
        {(isSelected || isHovered) && !isEditing && (
          <div className="absolute -top-7 -right-1 flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            <Edit2 className="h-3 w-3" />
            Double-click to edit
          </div>
        )}
      </div>
    </Draggable>
  );
};
