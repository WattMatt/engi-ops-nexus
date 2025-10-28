import { Button } from "@/components/ui/button";
import { Undo2, Redo2, Save, Trash2, Edit, MousePointer2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface DrawingControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  saving: boolean;
  hasSelection: boolean;
  onDelete: () => void;
  onEdit: () => void;
  selectionType?: 'equipment' | 'zone' | 'cable' | null;
}

export const DrawingControls = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  saving,
  hasSelection,
  onDelete,
  onEdit,
  selectionType,
}: DrawingControlsProps) => {
  return (
    <div className="flex flex-col gap-2">
      {/* History Controls */}
      <div className="flex items-center gap-2 bg-background/95 backdrop-blur p-2 rounded-lg border shadow-lg">
        <Button
          variant={canUndo ? "default" : "ghost"}
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="h-9 w-9"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant={canRedo ? "default" : "ghost"}
          size="icon"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z or Ctrl+Y)"
          className="h-9 w-9"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-8" />
        
        <Button
          variant="default"
          size="sm"
          onClick={onSave}
          disabled={saving}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Selection Controls */}
      {hasSelection && (
        <div className="flex items-center gap-2 bg-primary/10 backdrop-blur p-2 rounded-lg border-2 border-primary shadow-lg">
          <div className="flex items-center gap-1 px-2">
            <MousePointer2 className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium text-primary">
              {selectionType === 'zone' ? 'Zone Selected' : 
               selectionType === 'equipment' ? 'Equipment Selected' : 
               'Selected'}
            </span>
          </div>
          
          <Separator orientation="vertical" className="h-8" />
          
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            title="Edit (E)"
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            title="Delete (Del or Backspace)"
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
};
