import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface InlineDatePickerProps {
  value: string | null;
  onChange: (date: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  isOverdue?: boolean;
  isDueSoon?: boolean;
  size?: "sm" | "default";
}

export function InlineDatePicker({
  value,
  onChange,
  placeholder = "Set date",
  disabled = false,
  isOverdue = false,
  isDueSoon = false,
  size = "sm",
}: InlineDatePickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      // Format to YYYY-MM-DD for database
      const formatted = format(date, "yyyy-MM-dd");
      onChange(formatted);
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const dateValue = value ? new Date(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          disabled={disabled}
          className={cn(
            "h-7 px-2 gap-1 font-normal justify-start text-left",
            !value && "text-muted-foreground",
            isOverdue && "text-destructive bg-destructive/10 hover:bg-destructive/20",
            isDueSoon && "text-warning bg-warning/10 hover:bg-warning/20",
            size === "sm" && "text-xs"
          )}
        >
          <CalendarIcon className="h-3 w-3 shrink-0" />
          {value ? (
            <span className="truncate">
              {format(new Date(value), "MMM d")}
            </span>
          ) : (
            <span className="truncate">{placeholder}</span>
          )}
          {value && (
            <X
              className="h-3 w-3 shrink-0 opacity-50 hover:opacity-100"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleSelect}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}