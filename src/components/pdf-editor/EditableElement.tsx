import { useState } from "react";
import { Edit2 } from "lucide-react";

interface EditableElementProps {
  type: 'heading' | 'body' | 'table' | 'section';
  level?: 1 | 2 | 3;
  styleKey: string;
  children: React.ReactNode;
  currentStyles: any;
  isSelected: boolean;
  onSelect: (styleKey: string) => void;
}

export const EditableElement = ({
  type,
  level,
  styleKey,
  children,
  currentStyles,
  isSelected,
  onSelect,
}: EditableElementProps) => {
  const [isHovered, setIsHovered] = useState(false);

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
        <div className="absolute -top-6 -right-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs flex items-center gap-1">
          <Edit2 className="w-3 h-3" />
          {type} {level && `H${level}`}
        </div>
      )}
    </div>
  );
};
