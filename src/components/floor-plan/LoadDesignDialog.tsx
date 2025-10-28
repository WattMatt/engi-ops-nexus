import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { listUserFloorPlans } from "@/lib/floor-plan/supabase-database";
import type { Database } from "@/integrations/supabase/types";
import { formatDistanceToNow } from "date-fns";

type FloorPlanProject = Database["public"]["Tables"]["floor_plan_projects"]["Row"];

interface LoadDesignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onLoad: (design: FloorPlanProject) => void;
}

export function LoadDesignDialog({
  open,
  onOpenChange,
  userId,
  onLoad,
}: LoadDesignDialogProps) {
  const [designs, setDesigns] = useState<FloorPlanProject[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadDesigns();
    }
  }, [open]);

  const loadDesigns = async () => {
    setLoading(true);
    try {
      const data = await listUserFloorPlans(userId);
      setDesigns(data);
    } catch (error) {
      console.error("Error loading designs:", error);
      toast.error("Failed to load designs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Load Design</DialogTitle>
          <DialogDescription>
            Select a saved design to load
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading designs...</p>
            </div>
          ) : designs.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No saved designs found</p>
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {designs.map((design) => (
                <Button
                  key={design.id}
                  variant="outline"
                  className="w-full justify-start h-auto py-4"
                  onClick={() => {
                    onLoad(design);
                    onOpenChange(false);
                  }}
                >
                  <div className="text-left">
                    <div className="font-medium">{design.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {design.design_purpose} •{" "}
                      {formatDistanceToNow(new Date(design.created_at), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
