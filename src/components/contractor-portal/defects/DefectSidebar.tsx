import { DefectPin } from "@/hooks/useDefectPins";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, MapPinned } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Props {
  pins: DefectPin[];
  selectedPinId: string | null;
  onPinSelect: (pin: DefectPin) => void;
}

const STATUS_COLORS: Record<string, string> = {
  open: "text-red-500",
  in_progress: "text-orange-500",
  resolved: "text-blue-500",
  closed: "text-green-500",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Med",
  high: "High",
  critical: "Crit",
};

export function DefectSidebar({ pins, selectedPinId, onPinSelect }: Props) {
  if (pins.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
        No pins on this drawing yet.
        <br />
        Click "Add Pin" or use Rapid mode.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-1 p-2">
        {pins.map((pin) => (
          <button
            key={pin.id}
            onClick={() => onPinSelect(pin)}
            className={`w-full text-left p-2.5 rounded-md transition-colors text-sm ${
              selectedPinId === pin.id
                ? "bg-accent border border-accent-foreground/10"
                : "hover:bg-muted"
            }`}
          >
            <div className="flex items-start gap-2">
              <MapPin className={`h-4 w-4 mt-0.5 shrink-0 ${STATUS_COLORS[pin.status]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">#{pin.number_id}</span>
                  <span className="truncate">{pin.title}</span>
                </div>
                {pin.location_area && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPinned className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground truncate">{pin.location_area}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    {pin.status.replace("_", " ")}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    {PRIORITY_LABELS[pin.priority]}
                  </Badge>
                  {pin.assignee_names?.length > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {pin.assignee_names.length} assigned
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(pin.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
