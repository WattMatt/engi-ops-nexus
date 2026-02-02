import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check, ChevronsUpDown, Map, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface RoadmapItem {
  id: string;
  title: string;
  phase: string | null;
  is_completed: boolean;
  due_date: string | null;
  priority: string | null;
  parent_id: string | null;
}

interface RoadmapItemSelectorProps {
  projectId: string;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

export const RoadmapItemSelector = ({
  projectId,
  value,
  onChange,
  disabled = false,
}: RoadmapItemSelectorProps) => {
  const [open, setOpen] = useState(false);

  const { data: roadmapItems, isLoading } = useQuery({
    queryKey: ["roadmap-items-for-selector", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_roadmap_items")
        .select("id, title, phase, is_completed, due_date, priority, parent_id")
        .eq("project_id", projectId)
        .order("sort_order");

      if (error) throw error;
      return data as RoadmapItem[];
    },
    enabled: !!projectId,
  });

  const selectedItem = roadmapItems?.find((item) => item.id === value);

  // Group items by phase for better organization
  const groupedItems = roadmapItems?.reduce((acc, item) => {
    const phase = item.phase || "Unassigned";
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(item);
    return acc;
  }, {} as Record<string, RoadmapItem[]>);

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "critical": return "destructive";
      case "high": return "default";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || isLoading}
          >
            {selectedItem ? (
              <div className="flex items-center gap-2 truncate">
                <Map className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{selectedItem.title}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">
                {isLoading ? "Loading..." : "Link to roadmap item..."}
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search roadmap items..." />
            <CommandList>
              <CommandEmpty>No roadmap items found.</CommandEmpty>
              {groupedItems && Object.entries(groupedItems).map(([phase, items]) => (
                <CommandGroup key={phase} heading={phase}>
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.title}
                      onSelect={() => {
                        onChange(item.id === value ? null : item.id);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          value === item.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "truncate",
                            item.is_completed && "line-through text-muted-foreground"
                          )}>
                            {item.parent_id ? "↳ " : ""}{item.title}
                          </span>
                          {item.priority && (
                            <Badge 
                              variant={getPriorityColor(item.priority)} 
                              className="h-5 text-xs shrink-0"
                            >
                              {item.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedItem && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md text-sm">
          <Map className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{selectedItem.title}</p>
            <p className="text-xs text-muted-foreground">
              {selectedItem.phase || "No phase"} • 
              {selectedItem.is_completed ? " Completed" : " In Progress"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 shrink-0"
            onClick={() => onChange(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};
