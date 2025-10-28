import { Button } from "@/components/ui/button";
import { Undo2, Redo2, Save, Trash2, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
}: DrawingControlsProps) => {
  return (
    <div className="flex items-center gap-2 bg-background/95 backdrop-blur p-2 rounded-lg border shadow-lg">
      <div className="flex items-center gap-1 border-r pr-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      {hasSelection && (
        <div className="flex items-center gap-1 border-r pr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            title="Edit (E)"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            title="Delete (Del)"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Button
        variant="default"
        size="sm"
        onClick={onSave}
        disabled={saving}
      >
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
};
