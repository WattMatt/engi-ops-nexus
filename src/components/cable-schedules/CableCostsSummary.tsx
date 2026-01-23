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
import { DollarSign, TrendingUp, Calculator, AlertCircle } from "lucide-react";
import { multiply, add, round } from "@/utils/decimalPrecision";

interface CableCostsSummaryProps {
  projectId: string;
}

interface CableSummary {
  cable_type: string;
  cable_size: string;
  total_length: number;
  cable_count: number;
  supply_rate: number;
  install_rate: number;
  termination_rate: number;
  supply_cost: number;
  install_cost: number;
  termination_cost: number;
  total_cost: number;
  rate_source?: "final_account" | "manual" | "none";
}

interface FinalAccountRate {
  description: string;
  supply_rate: number;
  install_rate: number;
  unit: string;
}

// Parse cable size from Final Account description
// Examples: "4 Core x 70mm", "70mm x 4 core", "70 x 4 C", "4 C x 70", "70mm²"
const parseCableSizeFromDescription = (description: string): string | null => {
  const patterns = [
    /(\d+)\s*mm²?\s*x\s*4\s*core/i,     // "70mm x 4 core"
    /4\s*core\s*x\s*(\d+)\s*mm/i,        // "4 core x 70mm"  
    /(\d+)\s*x\s*4\s*c/i,                // "70 x 4 C" 
    /4\s*c\s*x\s*(\d+)/i,                // "4 C x 70"
    /^(\d+)\s*mm²?\s*$/i,                // Just "70mm" or "70mm²"
    /^(\d+)\s*$/,                         // Just "70"
    /^(\d+)\s*x\s*4$/i,                  // "70 x 4"
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
};

// Check if description mentions aluminium or copper
const parseCableTypeFromDescription = (description: string): string | null => {
  const lowerDesc = description.toLowerCase();
  if (lowerDesc.includes("aluminium") || lowerDesc.includes("aluminum")) return "Aluminium";
  if (lowerDesc.includes("copper")) return "Copper";
  return null;
};

// Normalize cable size for comparison (remove mm², mm, etc.)
const normalizeCableSize = (size: string): string => {
  return size.replace(/mm²?/gi, "").trim();
};

export const CableCostsSummary = ({ projectId }: CableCostsSummaryProps) => {
  // Fetch Final Account rates for this project
  const { data: finalAccountRates = [] } = useQuery({
    queryKey: ["final-account-cable-rates", projectId],
    queryFn: async (): Promise<FinalAccountRate[]> => {
      // Get the final account for this project
      const { data: account, error: accountError } = await supabase
        .from("final_accounts")
        .select("id")
        .eq("project_id", projectId)
        .single();

      if (accountError || !account) return [];

      // Get all bills for this account
      const { data: bills, error: billsError } = await supabase
        .from("final_account_bills")
        .select("id")
        .eq("final_account_id", account.id);

      if (billsError || !bills?.length) return [];

      // Get all sections for these bills
      const billIds = bills.map((b) => b.id);
      const { data: sections, error: sectionsError } = await supabase
        .from("final_account_sections")
        .select("id, section_code")
        .in("bill_id", billIds);

      if (sectionsError || !sections?.length) return [];

      // Get items from cable-related sections (A2, C, etc.) with rates
      const sectionIds = sections.map((s) => s.id);
      const { data: items, error: itemsError } = await supabase
        .from("final_account_items")
        .select("description, supply_rate, install_rate, unit")
        .in("section_id", sectionIds)
        .eq("unit", "m")
        .or("supply_rate.gt.0,install_rate.gt.0");

      if (itemsError) return [];

      return (items || []).map((item) => ({
        description: item.description,
        supply_rate: Number(item.supply_rate) || 0,
        install_rate: Number(item.install_rate) || 0,
        unit: item.unit || "m",
      }));
    },
    enabled: !!projectId,
  });

  const { data: summary, isLoading } = useQuery({
    queryKey: ["cable-costs-summary", projectId, finalAccountRates],
    queryFn: async () => {
      // Get all cable schedules for this project
      const { data: schedules, error: schedulesError } = await supabase
        .from("cable_schedules")
        .select("id")
        .eq("project_id", projectId);

      if (schedulesError) throw schedulesError;

      const scheduleIds = schedules?.map(s => s.id) || [];

      // Get entries linked to schedules
      const { data: scheduleEntries, error: scheduleEntriesError } = await supabase
        .from("cable_entries")
        .select("cable_type, cable_size, total_length, cable_number")
        .in("schedule_id", scheduleIds);

      if (scheduleEntriesError) throw scheduleEntriesError;

      // Also get entries from floor plans in this project (may not have schedule_id)
      const { data: floorPlans, error: floorPlansError } = await supabase
        .from("floor_plan_projects")
        .select("id")
        .eq("project_id", projectId);

      if (floorPlansError) throw floorPlansError;

      const floorPlanIds = floorPlans?.map(fp => fp.id) || [];

      const { data: floorPlanEntries, error: floorPlanEntriesError } = await supabase
        .from("cable_entries")
        .select("cable_type, cable_size, total_length, cable_number")
        .in("floor_plan_id", floorPlanIds)
        .is("schedule_id", null);

      if (floorPlanEntriesError) throw floorPlanEntriesError;

      // Combine all entries and filter out those without cable_type or cable_size
      const allEntries = [...(scheduleEntries || []), ...(floorPlanEntries || [])];
      const entries = allEntries.filter(e => e.cable_type && e.cable_size);

      // Get manual rates for fallback
      const { data: manualRates, error: ratesError } = await supabase
        .from("cable_rates")
        .select("*")
        .eq("project_id", projectId);

      if (ratesError) throw ratesError;

      // Group entries by cable type and size
      const grouped = new Map<string, CableSummary>();

      entries?.forEach((entry) => {
        const key = `${entry.cable_type}-${entry.cable_size}`;
        const existing = grouped.get(key);
        const cableCount = entry.cable_number || 1;

        if (existing) {
          existing.total_length = add(existing.total_length, entry.total_length || 0);
          existing.cable_count += cableCount;
        } else {
          grouped.set(key, {
            cable_type: entry.cable_type || "Unknown",
            cable_size: entry.cable_size || "Unknown",
            total_length: entry.total_length || 0,
            cable_count: cableCount,
            supply_rate: 0,
            install_rate: 0,
            termination_rate: 0,
            supply_cost: 0,
            install_cost: 0,
            termination_cost: 0,
            total_cost: 0,
            rate_source: "none",
          });
        }
      });

      // Apply rates: First try Final Account, then fall back to manual rates
      grouped.forEach((summary) => {
        const normalizedSize = normalizeCableSize(summary.cable_size);
        
        // Try to find matching Final Account rate
        const faRate = finalAccountRates.find((r) => {
          const parsedSize = parseCableSizeFromDescription(r.description);
          return parsedSize === normalizedSize;
        });

        if (faRate && (faRate.supply_rate > 0 || faRate.install_rate > 0)) {
          summary.supply_rate = faRate.supply_rate;
          summary.install_rate = faRate.install_rate;
          summary.rate_source = "final_account";
        } else {
          // Fall back to manual rates
          const manualRate = manualRates?.find(
            (r) => r.cable_type === summary.cable_type && r.cable_size === summary.cable_size
          );

          if (manualRate) {
            summary.supply_rate = manualRate.supply_rate_per_meter;
            summary.install_rate = manualRate.install_rate_per_meter;
            summary.termination_rate = manualRate.termination_cost_per_end;
            summary.rate_source = "manual";
          }
        }

        // Calculate costs using precision arithmetic
        summary.supply_cost = round(multiply(summary.total_length, summary.supply_rate), 2);
        summary.install_cost = round(multiply(summary.total_length, summary.install_rate), 2);
        // Each cable has 2 terminations (one at each end)
        summary.termination_cost = round(multiply(summary.cable_count, 2, summary.termination_rate), 2);
        summary.total_cost = round(add(summary.supply_cost, summary.install_cost, summary.termination_cost), 2);
      });

      return Array.from(grouped.values());
    },
    enabled: !!projectId,
  });

  const formatCurrency = (value: number) => {
    return `R ${value.toLocaleString('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const totals = summary?.reduce(
    (acc, item) => ({
      supply: acc.supply + item.supply_cost,
      install: acc.install + item.install_cost,
      termination: acc.termination + item.termination_cost,
      total: acc.total + item.total_cost,
    }),
    { supply: 0, install: 0, termination: 0, total: 0 }
  );

  if (isLoading) {
    return <div>Loading costs summary...</div>;
  }

  // Calculate additional metrics
  const totalLength = summary?.reduce((sum, item) => sum + item.total_length, 0) || 0;
  const totalCables = summary?.reduce((sum, item) => sum + item.cable_count, 0) || 0;
  const hasNoRates = summary?.some((item) => item.rate_source === "none");
  const hasFinalAccountRates = summary?.some((item) => item.rate_source === "final_account");

  return (
    <div className="space-y-4">
      {/* Cost Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Project Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals?.total || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Supply, install & termination
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost per Cable</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalCables > 0 ? (totals?.total || 0) / totalCables : 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Average per cable entry
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost per Meter</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalLength > 0 ? (totals?.total || 0) / totalLength : 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Average installation rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rate Source Indicator */}
      {hasFinalAccountRates && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-green-50 dark:bg-green-950/30 p-3 rounded-md border border-green-200 dark:border-green-900">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span>Rates are being sourced from the <strong>Final Account</strong> for this project.</span>
        </div>
      )}

      {hasNoRates && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border border-amber-200 dark:border-amber-900">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <span>Some cables have no matching rates. Configure rates in the <strong>Final Account</strong> or the <strong>Rates tab</strong>.</span>
        </div>
      )}

      {/* Detailed Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cable Costs Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {!summary || summary.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No cable entries with complete data found. To see cost summary:
              <br />
              1. Ensure cable entries have both Cable Type and Cable Size selected
              <br />
              2. Configure matching rates in the Final Account or Rates tab
            </p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cable Type</TableHead>
                      <TableHead>Cable Size</TableHead>
                      <TableHead className="text-right">Cables</TableHead>
                      <TableHead className="text-right">Total Length (m)</TableHead>
                      <TableHead className="text-right">Supply Cost</TableHead>
                      <TableHead className="text-right">Install Cost</TableHead>
                      <TableHead className="text-right">Termination Cost</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead className="text-center">Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.cable_type}</TableCell>
                        <TableCell>{item.cable_size}</TableCell>
                        <TableCell className="text-right">{item.cable_count}</TableCell>
                        <TableCell className="text-right">{item.total_length.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.supply_cost)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.install_cost)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.termination_cost)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(item.total_cost)}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.rate_source === "final_account" && (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              Final Account
                            </span>
                          )}
                          {item.rate_source === "manual" && (
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              Manual
                            </span>
                          )}
                          {item.rate_source === "none" && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                              No Rate
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={4}>Total</TableCell>
                      <TableCell className="text-right">{formatCurrency(totals?.supply || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totals?.install || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totals?.termination || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totals?.total || 0)}</TableCell>
                      <TableCell></TableCell>
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
