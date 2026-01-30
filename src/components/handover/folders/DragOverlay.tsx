import { DragOverlay as DndDragOverlay } from "@dnd-kit/core";
import { FileText } from "lucide-react";
import { HandoverDocument } from "./types";

interface DragOverlayProps {
  activeDocument: HandoverDocument | null;
}

export const DragOverlay = ({ activeDocument }: DragOverlayProps) => {
  if (!activeDocument) return null;

  return (
    <DndDragOverlay>
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card shadow-lg cursor-grabbing">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-sm">{activeDocument.document_name}</p>
          <p className="text-xs text-muted-foreground">Dragging...</p>
        </div>
      </div>
    </DndDragOverlay>
  );
};
