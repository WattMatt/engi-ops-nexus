import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Map, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RoadmapPhaseFilterProps {
  projectId: string;
  value: string | null;
  onChange: (value: string | null) => void;
}

interface PhaseOption {
  phase: string;
  count: number;
}

export const RoadmapPhaseFilter = ({ projectId, value, onChange }: RoadmapPhaseFilterProps) => {
  // Get unique phases from roadmap items that have linked tasks
  const { data: phases } = useQuery({
    queryKey: ["roadmap-phases-with-tasks", projectId],
    queryFn: async () => {
      // Get all roadmap items for the project
      const { data: roadmapItems, error: roadmapError } = await supabase
        .from("project_roadmap_items")
        .select("id, phase")
        .eq("project_id", projectId);

      if (roadmapError) throw roadmapError;

      // Get tasks with roadmap links
      const { data: tasks, error: tasksError } = await supabase
        .from("site_diary_tasks")
        .select("roadmap_item_id")
        .eq("project_id", projectId)
        .not("roadmap_item_id", "is", null);

      if (tasksError) throw tasksError;

      // Count tasks per phase
      const phaseMap: Record<string, number> = {};
      
      // Add "unlinked" count
      const { count: unlinkedCount } = await supabase
        .from("site_diary_tasks")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .is("roadmap_item_id", null);
      
      if (unlinkedCount && unlinkedCount > 0) {
        phaseMap["_unlinked"] = unlinkedCount;
      }

      // Map roadmap item IDs to phases
      const itemPhaseMap: Record<string, string> = {};
      roadmapItems?.forEach((item) => {
        if (item.phase) {
          itemPhaseMap[item.id] = item.phase;
        }
      });

      // Count tasks per phase
      tasks?.forEach((task) => {
        if (task.roadmap_item_id) {
          const phase = itemPhaseMap[task.roadmap_item_id];
          if (phase) {
            phaseMap[phase] = (phaseMap[phase] || 0) + 1;
          }
        }
      });

      // Convert to array and sort
      const result: PhaseOption[] = [];
      Object.entries(phaseMap).forEach(([phase, count]) => {
        result.push({ phase, count });
      });

      // Sort: phases alphabetically, but _unlinked last
      return result.sort((a, b) => {
        if (a.phase === "_unlinked") return 1;
        if (b.phase === "_unlinked") return -1;
        return a.phase.localeCompare(b.phase);
      });
    },
  });

  return (
    <div className="flex items-center gap-2">
      <Select 
        value={value || "all"} 
        onValueChange={(val) => onChange(val === "all" ? null : val)}
      >
        <SelectTrigger className="w-[200px] h-9">
          <div className="flex items-center gap-2">
            <Map className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Filter by Phase" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center justify-between w-full gap-4">
              <span>All Phases</span>
            </div>
          </SelectItem>
          {phases?.map((phase) => (
            <SelectItem key={phase.phase} value={phase.phase}>
              <div className="flex items-center justify-between w-full gap-4">
                <span>{phase.phase === "_unlinked" ? "Unlinked Tasks" : phase.phase}</span>
                <Badge variant="secondary" className="h-5 text-xs">
                  {phase.count}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-9 px-2"
          onClick={() => onChange(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
