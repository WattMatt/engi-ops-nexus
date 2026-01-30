import { useDroppable } from "@dnd-kit/core";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface DroppableRootZoneProps {
  isVisible: boolean;
}

export const DroppableRootZone = ({ isVisible }: DroppableRootZoneProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id: "root",
    data: {
      type: "root",
    },
  });

  if (!isVisible) return null;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg border-2 border-dashed transition-all duration-200",
        isOver
          ? "border-primary bg-primary/10 text-primary"
          : "border-muted-foreground/30 text-muted-foreground"
      )}
    >
      <FolderOpen className="h-4 w-4" />
      <span className="text-sm">Drop here to move to root</span>
    </div>
  );
};
