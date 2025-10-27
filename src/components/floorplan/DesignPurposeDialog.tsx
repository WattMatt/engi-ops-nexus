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
      value: "budget_markup",
      label: "Budget Markup",
      description: "For high-level, preliminary cost estimation with major electrical equipment like substations, main boards, generators, and main MV/LV cable routes.",
    },
    {
      value: "line_shop",
      label: "Line Shop Measurements",
      description: "For detailed internal fit-outs with extensive library of final circuit items, light fittings, switches, socket outlets, data points, and trunking systems.",
    },
    {
      value: "pv_design",
      label: "PV Design",
      description: "Specialized workflow for solar panel installations. Includes tools for drawing roof areas, defining pitch and direction, placing PV arrays, inverters, and DC/AC cabling.",
    },
    {
      value: "prelim_design",
      label: "Prelim Design Markup",
      description: "Similar to Budget Markup, intended for early stages of project design and planning with high-level equipment placement.",
    },
    {
      value: "cable_schedule",
      label: "Cable Schedule Markup",
      description: "Focused mode specifically for creating detailed cable schedules by drawing feeder routes between main boards and sub-boards.",
    },
    {
      value: "final_account",
      label: "Final Account Markup",
      description: "Comprehensive mode combining all available tools. Designed for as-built drawings or final detailed quantification of all components at project completion.",
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
        <div className="grid grid-cols-1 gap-3 py-4 max-h-[60vh] overflow-y-auto">
          {purposes.map((purpose) => (
            <Button
              key={purpose.value}
              variant="outline"
              className="h-auto flex-col items-start p-4 text-left hover:border-primary hover:bg-accent"
              onClick={() => onSelect(purpose.value)}
            >
              <div className="font-semibold mb-2 text-base">{purpose.label}</div>
              <div className="text-sm text-muted-foreground leading-relaxed">{purpose.description}</div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
