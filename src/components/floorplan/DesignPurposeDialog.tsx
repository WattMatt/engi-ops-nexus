import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DesignPurpose } from "./types";

interface DesignPurposeDialogProps {
  open: boolean;
  onSelect: (purpose: DesignPurpose) => void;
}

export const DesignPurposeDialog = ({ open, onSelect }: DesignPurposeDialogProps) => {
  const purposes: { value: DesignPurpose; label: string; description: string }[] = [
    {
      value: "general",
      label: "General Markup",
      description: "General electrical floor plan markup with all tools available",
    },
    {
      value: "budget_markup",
      label: "Budget Markup",
      description: "Quick quantity takeoff for budgeting and cost estimation",
    },
    {
      value: "pv_design",
      label: "PV Design",
      description: "Solar photovoltaic system design with roof masks and panel arrays",
    },
    {
      value: "line_shop",
      label: "Line Shop Measurements",
      description: "Detailed measurements for cable routes, containment, and sockets",
    },
  ];

  return (
    <Dialog open={open}>
      <DialogContent className="bg-background max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Design Purpose</DialogTitle>
          <DialogDescription>
            Choose the purpose of this floor plan to configure the available tools
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          {purposes.map((purpose) => (
            <Button
              key={purpose.value}
              variant="outline"
              className="h-auto flex-col items-start p-4 text-left hover:border-primary"
              onClick={() => onSelect(purpose.value)}
            >
              <div className="font-semibold mb-1">{purpose.label}</div>
              <div className="text-xs text-muted-foreground">{purpose.description}</div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
