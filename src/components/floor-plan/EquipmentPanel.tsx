import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Lightbulb, Zap, Square, Circle } from "lucide-react";

interface EquipmentPanelProps {
  onSelectEquipment: (type: string) => void;
  selectedType: string | null;
}

const EQUIPMENT_TYPES = [
  { id: "light", label: "Light Fitting", icon: Lightbulb },
  { id: "switch", label: "Switch", icon: Square },
  { id: "socket", label: "Socket Outlet", icon: Circle },
  { id: "db", label: "Distribution Board", icon: Zap },
  { id: "panel", label: "Control Panel", icon: Square },
];

export function EquipmentPanel({ onSelectEquipment, selectedType }: EquipmentPanelProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold">Equipment</h2>
        <p className="text-sm text-muted-foreground">Select equipment to place</p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {EQUIPMENT_TYPES.map((equipment) => {
            const Icon = equipment.icon;
            return (
              <Button
                key={equipment.id}
                variant={selectedType === equipment.id ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => onSelectEquipment(equipment.id)}
              >
                <Icon className="h-4 w-4 mr-2" />
                {equipment.label}
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
