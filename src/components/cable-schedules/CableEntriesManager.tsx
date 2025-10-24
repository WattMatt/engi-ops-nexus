import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddCableEntryDialog } from "./AddCableEntryDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CableEntriesManagerProps {
  scheduleId: string;
}

export const CableEntriesManager = ({ scheduleId }: CableEntriesManagerProps) => {
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: entries, refetch } = useQuery({
    queryKey: ["cable-entries", scheduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cable_entries")
        .select("*")
        .eq("schedule_id", scheduleId)
        .order("display_order");

      if (error) throw error;
      return data;
    },
    enabled: !!scheduleId,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(value);
  };

  const totalCost = entries?.reduce((sum, entry) => sum + (entry.total_cost || 0), 0) || 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cable Entries</CardTitle>
            <Button onClick={() => setShowAddDialog(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Cable Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!entries || entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No cable entries yet. Add your first cable entry to get started.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cable Tag</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead className="text-right">Voltage</TableHead>
                      <TableHead className="text-right">Load (A)</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Measured (m)</TableHead>
                      <TableHead className="text-right">Total (m)</TableHead>
                      <TableHead className="text-right">Volt Drop</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.cable_tag}</TableCell>
                        <TableCell>{entry.from_location}</TableCell>
                        <TableCell>{entry.to_location}</TableCell>
                        <TableCell className="text-right">{entry.voltage}</TableCell>
                        <TableCell className="text-right">{entry.load_amps}</TableCell>
                        <TableCell>{entry.cable_type}</TableCell>
                        <TableCell className="text-right">
                          {entry.measured_length?.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.total_length?.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.volt_drop?.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(entry.total_cost || 0)}
                        </TableCell>
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

      <AddCableEntryDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        scheduleId={scheduleId}
        onSuccess={() => {
          refetch();
          setShowAddDialog(false);
        }}
      />
    </div>
  );
};
