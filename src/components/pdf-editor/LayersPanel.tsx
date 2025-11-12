import { Eye, EyeOff, Lock, Unlock, MoveUp, MoveDown, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface LayersPanelProps {
  settings: any;
  selectedElement: string | null;
  onSelectElement: (key: string) => void;
  onToggleVisibility: (key: string) => void;
  onToggleLocked: (key: string) => void;
  onChangeZIndex: (key: string, direction: 'up' | 'down') => void;
}

// Define all available elements with their display names
const ELEMENT_DEFINITIONS = [
  { key: 'cover-title', name: 'Cover Title', type: 'heading' },
  { key: 'cover-subtitle', name: 'Cover Subtitle', type: 'body' },
  { key: 'section-heading', name: 'Section Heading', type: 'heading' },
  { key: 'section-body', name: 'Section Body', type: 'body' },
  { key: 'subsection-heading', name: 'Subsection Heading', type: 'heading' },
  { key: 'kpi-text', name: 'KPI Text', type: 'body' },
  { key: 'table-heading', name: 'Table Heading', type: 'heading' },
  { key: 'sample-table', name: 'Sample Table', type: 'table' },
];

export const LayersPanel = ({
  settings,
  selectedElement,
  onSelectElement,
  onToggleVisibility,
  onToggleLocked,
  onChangeZIndex,
}: LayersPanelProps) => {
  const getElementMetadata = (key: string) => {
    return settings.elements?.[key] || { visible: true, locked: false, zIndex: 0 };
  };

  // Sort elements by z-index (highest first)
  const sortedElements = [...ELEMENT_DEFINITIONS].sort((a, b) => {
    const metaA = getElementMetadata(a.key);
    const metaB = getElementMetadata(b.key);
    return metaB.zIndex - metaA.zIndex;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'heading':
        return 'H';
      case 'body':
        return 'T';
      case 'table':
        return '⊞';
      default:
        return '•';
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4" />
          <h3 className="font-semibold">Layers</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Manage element visibility and stacking order
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sortedElements.map((element) => {
            const metadata = getElementMetadata(element.key);
            const isSelected = selectedElement === element.key;

            return (
              <div
                key={element.key}
                className={cn(
                  "group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                  isSelected && "bg-primary/10 ring-1 ring-primary",
                  !isSelected && "hover:bg-muted/50",
                  !metadata.visible && "opacity-50"
                )}
                onClick={() => !metadata.locked && onSelectElement(element.key)}
              >
                {/* Type indicator */}
                <div className="w-6 h-6 flex items-center justify-center bg-muted rounded text-xs font-mono">
                  {getTypeIcon(element.type)}
                </div>

                {/* Element name */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{element.name}</div>
                  <div className="text-xs text-muted-foreground">z: {metadata.zIndex}</div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Z-Index controls */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChangeZIndex(element.key, 'up');
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
                      onChangeZIndex(element.key, 'down');
                    }}
                    title="Move backward"
                  >
                    <MoveDown className="h-3 w-3" />
                  </Button>

                  {/* Lock toggle */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLocked(element.key);
                    }}
                    title={metadata.locked ? "Unlock" : "Lock"}
                  >
                    {metadata.locked ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      <Unlock className="h-3 w-3" />
                    )}
                  </Button>

                  {/* Visibility toggle */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(element.key);
                    }}
                    title={metadata.visible ? "Hide" : "Show"}
                  >
                    {metadata.visible ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                  </Button>
                </div>

                {/* Lock indicator (always visible) */}
                {metadata.locked && (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-3 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground">
          💡 Click to select • Drag in preview to reposition
        </p>
      </div>
    </div>
  );
};
