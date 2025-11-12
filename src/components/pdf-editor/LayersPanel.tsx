import { Eye, EyeOff, Lock, Unlock, MoveUp, MoveDown, Layers, Image, Type, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LayersPanelProps {
  settings: any;
  selectedElements: string[];
  onSelectElement: (key: string, isCtrlKey: boolean) => void;
  onToggleVisibility: (key: string) => void;
  onToggleLocked: (key: string) => void;
  onChangeZIndex: (key: string, direction: 'up' | 'down') => void;
  extractedElements?: {
    text: any[];
    images: any[];
    shapes: any[];
  };
  addedElements?: any[];
}

export const LayersPanel = ({
  settings,
  selectedElements,
  onSelectElement,
  onToggleVisibility,
  onToggleLocked,
  onChangeZIndex,
  extractedElements,
  addedElements = [],
}: LayersPanelProps) => {
  const getElementMetadata = (key: string) => {
    return settings.elements?.[key] || { visible: true, locked: false, zIndex: 0 };
  };

  // Count elements
  const textCount = extractedElements?.text?.length || 0;
  const imageCount = extractedElements?.images?.length || 0;
  const shapeCount = extractedElements?.shapes?.length || 0;
  const addedCount = addedElements.length;
  const totalExtracted = textCount + imageCount + shapeCount + addedCount;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <Type className="h-3 w-3" />;
      case 'image':
        return <Image className="h-3 w-3" />;
      case 'shape':
        return <Square className="h-3 w-3" />;
      default:
        return <Type className="h-3 w-3" />;
    }
  };

  const renderElement = (element: any, type: string) => {
    const isSelected = selectedElements.includes(element.id);
    const metadata = getElementMetadata(element.id);

    return (
      <div
        key={element.id}
        className={cn(
          "group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
          isSelected && "bg-primary/10 ring-1 ring-primary",
          !isSelected && "hover:bg-muted/50",
          !metadata.visible && "opacity-50"
        )}
        onClick={(e) => !metadata.locked && onSelectElement(element.id, e.ctrlKey || e.metaKey)}
      >
        <div className="w-6 h-6 flex items-center justify-center bg-muted rounded">
          {getTypeIcon(type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {type === 'text' ? element.text?.substring(0, 20) : element.id}
          </div>
          <div className="text-xs text-muted-foreground">
            {type} • z: {metadata.zIndex}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onChangeZIndex(element.id, 'up');
            }}
            title="Move forward"
          >
            <MoveUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onChangeZIndex(element.id, 'down');
            }}
            title="Move backward"
          >
            <MoveDown className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLocked(element.id);
            }}
            title={metadata.locked ? "Unlock" : "Lock"}
          >
            {metadata.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(element.id);
            }}
            title={metadata.visible ? "Hide" : "Show"}
          >
            {metadata.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </Button>
        </div>
        {metadata.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4" />
          <h3 className="font-semibold">Layers</h3>
          {totalExtracted > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {totalExtracted}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {selectedElements.length > 1 
            ? `${selectedElements.length} selected • Drag to move together`
            : "Click to select • Ctrl/⌘+Click for multi-select"}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {/* Extracted Text Elements */}
          {textCount > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 px-2 py-1">
                <Type className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">
                  Text Elements ({textCount})
                </span>
              </div>
              {extractedElements?.text?.map((element) => renderElement(element, 'text'))}
            </div>
          )}

          {/* Extracted Images */}
          {imageCount > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 px-2 py-1">
                <Image className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">
                  Images ({imageCount})
                </span>
              </div>
              {extractedElements?.images?.map((element) => renderElement(element, 'image'))}
            </div>
          )}

          {/* Extracted Shapes */}
          {shapeCount > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 px-2 py-1">
                <Square className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">
                  Shapes ({shapeCount})
                </span>
              </div>
              {extractedElements?.shapes?.map((element) => renderElement(element, 'shape'))}
            </div>
          )}

          {/* User Added Elements */}
          {addedCount > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 px-2 py-1">
                <Layers className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">
                  User Added ({addedCount})
                </span>
              </div>
              {addedElements.map((element) => renderElement(element, element.type))}
            </div>
          )}

          {/* Empty State */}
          {totalExtracted === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No elements extracted yet</p>
              <p className="text-xs mt-1">Load a PDF to extract elements</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground">
          💡 Add elements with toolbar • Edit positions in Style Panel
        </p>
      </div>
    </div>
  );
};
