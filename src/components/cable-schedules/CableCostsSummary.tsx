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

interface CableCostsSummaryProps {
  projectId: string;
}

interface CableSummary {
  cable_type: string;
  cable_size: string;
  total_length: number;
  supply_rate: number;
  install_rate: number;
  supply_cost: number;
  install_cost: number;
  total_cost: number;
}

export const CableCostsSummary = ({ projectId }: CableCostsSummaryProps) => {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["cable-costs-summary", projectId],
    queryFn: async () => {
      // Get all cable schedules for this project
      const { data: schedules, error: schedulesError } = await supabase
        .from("cable_schedules")
        .select("id")
        .eq("project_id", projectId);

      if (schedulesError) throw schedulesError;

      const scheduleIds = schedules?.map(s => s.id) || [];

      // Get all cable entries across all schedules
      const { data: entries, error: entriesError } = await supabase
        .from("cable_entries")
        .select("cable_type, cable_size, total_length")
        .in("schedule_id", scheduleIds);

      if (entriesError) throw entriesError;

      // Get all rates for this project
      const { data: rates, error: ratesError } = await supabase
        .from("cable_rates")
        .select("*")
        .eq("project_id", projectId);

      if (ratesError) throw ratesError;

      // Group entries by cable type and size
      const grouped = new Map<string, CableSummary>();

      entries?.forEach((entry) => {
        const key = `${entry.cable_type}-${entry.cable_size}`;
        const existing = grouped.get(key);

        if (existing) {
          existing.total_length += entry.total_length || 0;
        } else {
          grouped.set(key, {
            cable_type: entry.cable_type || "Unknown",
            cable_size: entry.cable_size || "Unknown",
            total_length: entry.total_length || 0,
            supply_rate: 0,
            install_rate: 0,
            supply_cost: 0,
            install_cost: 0,
            total_cost: 0,
          });
        }
      });

      // Apply rates and calculate costs
      grouped.forEach((summary) => {
        const rate = rates?.find(
          (r) => r.cable_type === summary.cable_type && r.cable_size === summary.cable_size
        );

        if (rate) {
          summary.supply_rate = rate.supply_rate_per_meter;
          summary.install_rate = rate.install_rate_per_meter;
          summary.supply_cost = summary.total_length * rate.supply_rate_per_meter;
          summary.install_cost = summary.total_length * rate.install_rate_per_meter;
          summary.total_cost = summary.supply_cost + summary.install_cost;
        }
      });

      return Array.from(grouped.values());
    },
    enabled: !!projectId,
  });

  const formatCurrency = (value: number) => `R ${value.toFixed(2)}`;

  const totals = summary?.reduce(
    (acc, item) => ({
      supply: acc.supply + item.supply_cost,
      install: acc.install + item.install_cost,
      total: acc.total + item.total_cost,
    }),
    { supply: 0, install: 0, total: 0 }
  );

  if (isLoading) {
    return <div>Loading costs summary...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Cable Costs Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {!summary || summary.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No cable entries found. Add cables and configure rates to see cost summary.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cable Type</TableHead>
                      <TableHead>Cable Size</TableHead>
                      <TableHead className="text-right">Total Length (m)</TableHead>
                      <TableHead className="text-right">Supply Rate</TableHead>
                      <TableHead className="text-right">Install Rate</TableHead>
                      <TableHead className="text-right">Supply Cost</TableHead>
                      <TableHead className="text-right">Install Cost</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.cable_type}</TableCell>
                        <TableCell>{item.cable_size}</TableCell>
                        <TableCell className="text-right">{item.total_length.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {item.supply_rate > 0 ? formatCurrency(item.supply_rate) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.install_rate > 0 ? formatCurrency(item.install_rate) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.supply_cost)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.install_cost)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(item.total_cost)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={5}>Total</TableCell>
                      <TableCell className="text-right">{formatCurrency(totals?.supply || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totals?.install || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totals?.total || 0)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
