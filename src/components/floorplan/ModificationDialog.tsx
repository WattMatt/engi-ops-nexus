import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ModificationDialogProps {
  open: boolean;
  type: "scale" | "cable" | "zone" | "containment";
  oldValue?: string;
  newValue?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ModificationDialog = ({
  open,
  type,
  oldValue,
  newValue,
  onConfirm,
  onCancel,
}: ModificationDialogProps) => {
  const getTitle = () => {
    switch (type) {
      case "scale":
        return "Scale Calibration Changed";
      case "cable":
        return "Cable Route Modified";
      case "zone":
        return "Zone Modified";
      case "containment":
        return "Containment Route Modified";
      default:
        return "Modification Detected";
    }
  };

  const getDescription = () => {
    switch (type) {
      case "scale":
        return "You've moved the scale reference markers. This will affect all measurements on this floor plan.";
      case "cable":
        return "You've modified the cable route. The new path will be saved.";
      case "zone":
        return "You've modified the zone boundary. The new shape will be saved.";
      case "containment":
        return "You've modified the containment route. The new path will be saved.";
      default:
        return "You've made changes that will be saved.";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="bg-background">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>
        
        {oldValue && newValue && (
          <div className="grid gap-3 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Previous</p>
                <p className="text-sm font-mono bg-muted p-2 rounded">{oldValue}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">New</p>
                <p className="text-sm font-mono bg-primary/10 p-2 rounded font-semibold">{newValue}</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Confirm Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
