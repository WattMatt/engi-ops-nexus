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
import { useNavigate } from "react-router-dom";

interface AllCableEntriesViewProps {
  projectId: string;
}

export const AllCableEntriesView = ({ projectId }: AllCableEntriesViewProps) => {
  const navigate = useNavigate();

  const { data: entries, isLoading } = useQuery({
    queryKey: ["all-cable-entries", projectId],
    queryFn: async () => {
      // Get all schedules for this project
      const { data: schedules, error: schedulesError } = await supabase
        .from("cable_schedules")
        .select("id, schedule_name, revision")
        .eq("project_id", projectId);

      if (schedulesError) throw schedulesError;

      const scheduleIds = schedules?.map(s => s.id) || [];

      // Get all cable entries
      const { data: entries, error: entriesError } = await supabase
        .from("cable_entries")
        .select("*, schedule_id")
        .in("schedule_id", scheduleIds)
        .order("display_order");

      if (entriesError) throw entriesError;

      // Combine entries with schedule info
      return entries?.map(entry => {
        const schedule = schedules?.find(s => s.id === entry.schedule_id);
        return {
          ...entry,
          schedule_name: schedule?.schedule_name,
          revision: schedule?.revision,
        };
      });
    },
    enabled: !!projectId,
  });

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "R 0.00";
    return `R ${value.toFixed(2)}`;
  };

  const totalCost = entries?.reduce((sum, entry) => sum + (entry.total_cost || 0), 0) || 0;

  if (isLoading) {
    return <div>Loading cable entries...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Cable Entries</CardTitle>
      </CardHeader>
      <CardContent>
        {!entries || entries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No cable entries found across all schedules.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Revision</TableHead>
                    <TableHead>Cable #</TableHead>
                    <TableHead>Cable Tag</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Voltage</TableHead>
                    <TableHead>Load (A)</TableHead>
                    <TableHead>Cable Type</TableHead>
                    <TableHead>Cable Size</TableHead>
                    <TableHead>Length (m)</TableHead>
                    <TableHead>Supply Cost</TableHead>
                    <TableHead>Install Cost</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow 
                      key={entry.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/dashboard/cable-schedules/${entry.schedule_id}`)}
                    >
                      <TableCell className="font-medium">{entry.revision}</TableCell>
                      <TableCell className="font-medium">{entry.cable_number || "1"}</TableCell>
                      <TableCell>{entry.cable_tag}</TableCell>
                      <TableCell>{entry.from_location}</TableCell>
                      <TableCell>{entry.to_location}</TableCell>
                      <TableCell>{entry.voltage || "-"}</TableCell>
                      <TableCell>{entry.load_amps || "-"}</TableCell>
                      <TableCell>{entry.cable_type || "-"}</TableCell>
                      <TableCell>{entry.cable_size || "-"}</TableCell>
                      <TableCell>{entry.total_length?.toFixed(2) || "0.00"}</TableCell>
                      <TableCell>{formatCurrency(entry.supply_cost)}</TableCell>
                      <TableCell>{formatCurrency(entry.install_cost)}</TableCell>
                      <TableCell>{formatCurrency(entry.total_cost)}</TableCell>
                      <TableCell>{entry.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end">
              <Card className="w-64">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total Cost:</span>
                    <span className="text-lg font-bold">{formatCurrency(totalCost)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
