import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CableTagScheduleProps {
  scheduleId: string;
}

export const CableTagSchedule = ({ scheduleId }: CableTagScheduleProps) => {
  const { data: entries, isLoading } = useQuery({
    queryKey: ["cable-tags", scheduleId],
    queryFn: async () => {
      // First get the schedule to get project_id
      const { data: schedule } = await supabase
        .from("cable_schedules")
        .select("project_id")
        .eq("id", scheduleId)
        .single();

      // Get all floor plan IDs for this project
      const { data: floorPlans } = await supabase
        .from("floor_plan_projects")
        .select("id")
        .eq("project_id", schedule?.project_id || "");

      const floorPlanIds = floorPlans?.map(fp => fp.id) || [];

      // Get cable entries linked to this schedule OR to floor plans in this project
      let query = supabase
        .from("cable_entries")
        .select("id, cable_tag, base_cable_tag, cable_number, parallel_group_id, parallel_total_count");

      if (floorPlanIds.length > 0) {
        query = query.or(`schedule_id.eq.${scheduleId},floor_plan_id.in.(${floorPlanIds.join(',')})`);
      } else {
        query = query.eq("schedule_id", scheduleId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Sort by base tag first, then by cable number for parallel cables
      return (data || []).sort((a, b) => {
        const baseTagA = a.base_cable_tag || a.cable_tag;
        const baseTagB = b.base_cable_tag || b.cable_tag;
        
        const tagCompare = baseTagA.localeCompare(baseTagB, undefined, { numeric: true, sensitivity: 'base' });
        if (tagCompare !== 0) return tagCompare;
        
        // For same base tag (parallel cables), sort by cable number
        return (a.cable_number || 0) - (b.cable_number || 0);
      });
    },
    enabled: !!scheduleId,
  });

  if (isLoading) {
    return <div>Loading cable tags...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cable Tag Schedule - All Tags Only</CardTitle>
      </CardHeader>
      <CardContent>
        {!entries || entries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No cable entries found in this schedule.
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32 text-center">Cable Number</TableHead>
                  <TableHead>Cable Tag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const baseTag = entry.base_cable_tag || entry.cable_tag;
                  const cableNumber = entry.cable_number || 1;
                  const isParallel = entry.parallel_group_id && entry.parallel_total_count && entry.parallel_total_count > 1;
                  
                  // For parallel cables, show as "BaseTag (CableNum/Total)"
                  // For single cables, show the tag as-is
                  let displayTag = baseTag;
                  if (isParallel) {
                    displayTag = `${baseTag} (${cableNumber}/${entry.parallel_total_count})`;
                  }
                  
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg">
                          {cableNumber}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-lg">
                        {displayTag}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
