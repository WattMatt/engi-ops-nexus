import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, FolderOpen } from "lucide-react";

interface SaveLoadDialogProps {
  mode: "save" | "load" | null;
  onClose: () => void;
  onSave?: (name: string) => void;
  onLoad?: (designId: string) => void;
  savedDesigns?: { id: string; name: string; date: string }[];
}

export const SaveLoadDialog = ({ 
  mode, 
  onClose, 
  onSave, 
  onLoad,
  savedDesigns = [] 
}: SaveLoadDialogProps) => {
  const [saveName, setSaveName] = useState("");

  const handleSave = () => {
    if (saveName.trim() && onSave) {
      onSave(saveName.trim());
      setSaveName("");
      onClose();
    }
  };

  const handleLoad = (designId: string) => {
    if (onLoad) {
      onLoad(designId);
      onClose();
    }
  };

  return (
    <Dialog open={mode !== null} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "save" ? (
              <>
                <Save className="w-5 h-5" />
                Save Design
              </>
            ) : (
              <>
                <FolderOpen className="w-5 h-5" />
                Load Design
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {mode === "save" ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="save-name">Design Name</Label>
              <Input
                id="save-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Enter design name..."
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2 py-4 max-h-[400px] overflow-y-auto">
            {savedDesigns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No saved designs found
              </p>
            ) : (
              savedDesigns.map((design) => (
                <button
                  key={design.id}
                  onClick={() => handleLoad(design.id)}
                  className="w-full p-3 text-left border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="font-medium">{design.name}</div>
                  <div className="text-xs text-muted-foreground">{design.date}</div>
                </button>
              ))
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {mode === "save" && (
            <Button onClick={handleSave} disabled={!saveName.trim()}>
              Save
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
