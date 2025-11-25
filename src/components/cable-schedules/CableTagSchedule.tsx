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
      const { data, error } = await supabase
        .from("cable_entries")
        .select("id, cable_tag, base_cable_tag, cable_number, parallel_group_id, parallel_total_count")
        .eq("schedule_id", scheduleId)
        .order("cable_tag", { ascending: true });

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
        <CardTitle>Cable Tag Schedule - All Tags</CardTitle>
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
                  <TableHead className="w-24">Cable #</TableHead>
                  <TableHead>Cable Tag</TableHead>
                  <TableHead>Base Tag</TableHead>
                  <TableHead className="w-32 text-center">Parallel Info</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, index) => {
                  const baseTag = entry.base_cable_tag || entry.cable_tag;
                  const cableNumber = entry.cable_number || 1;
                  const isParallel = entry.parallel_group_id && entry.parallel_total_count && entry.parallel_total_count > 1;
                  
                  // Display tag with parallel notation if applicable
                  let displayTag = entry.cable_tag;
                  if (isParallel) {
                    displayTag = `${baseTag} (${cableNumber}/${entry.parallel_total_count})`;
                  }
                  
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-center font-semibold">
                        {cableNumber}
                      </TableCell>
                      <TableCell className="font-medium text-base">
                        {displayTag}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {baseTag}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {isParallel ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">
                            {cableNumber} of {entry.parallel_total_count}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Single</span>
                        )}
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
