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
        .select("*")
        .eq("schedule_id", scheduleId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!scheduleId,
  });

  if (isLoading) {
    return <div>Loading cable tags...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cable Tag Schedule</CardTitle>
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
                  <TableHead>Cable Tag</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Cable Type</TableHead>
                  <TableHead>Cable Size</TableHead>
                  <TableHead className="text-right">Length (m)</TableHead>
                  <TableHead className="text-right">Load (A)</TableHead>
                  <TableHead>Installation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.cable_tag}</TableCell>
                    <TableCell>{entry.from_location}</TableCell>
                    <TableCell>{entry.to_location}</TableCell>
                    <TableCell>{entry.cable_type || "-"}</TableCell>
                    <TableCell>{entry.cable_size || "-"}</TableCell>
                    <TableCell className="text-right">
                      {entry.total_length?.toFixed(2) || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.load_amps?.toFixed(2) || "-"}
                    </TableCell>
                    <TableCell>{entry.installation_method}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
