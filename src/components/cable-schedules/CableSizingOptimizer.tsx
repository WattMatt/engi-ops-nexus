import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { calculateCableSize, CableCalculationParams } from "@/utils/cableSizing";
import { useCalculationSettings } from "@/hooks/useCalculationSettings";
import { useToast } from "@/hooks/use-toast";

interface CableSizingOptimizerProps {
  projectId: string;
}

interface OptimizationResult {
  cableId: string;
  cableTag: string;
  currentConfig: {
    size: string;
    parallelCount: number;
    totalCost: number;
    voltage: number;
    loadAmps: number;
  };
  alternatives: Array<{
    size: string;
    parallelCount: number;
    totalCost: number;
    savings: number;
    savingsPercent: number;
    voltDrop: number;
  }>;
}

export const CableSizingOptimizer = ({ projectId }: CableSizingOptimizerProps) => {
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<OptimizationResult[]>([]);
  const { data: calcSettings } = useCalculationSettings(projectId);

  const { data: cableEntries } = useQuery({
    queryKey: ["cable-entries-optimizer", projectId],
    queryFn: async () => {
      const { data: schedules } = await supabase
        .from("cable_schedules")
        .select("id")
        .eq("project_id", projectId);

      if (!schedules || schedules.length === 0) return [];

      const scheduleIds = schedules.map(s => s.id);
      
      const { data, error } = await supabase
        .from("cable_entries")
        .select("*")
        .in("schedule_id", scheduleIds)
        .gte("load_amps", 100); // Only analyze cables with significant load

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: cableRates } = useQuery({
    queryKey: ["cable-rates", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cable_rates")
        .select("*")
        .eq("project_id", projectId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const calculateTotalCost = (
    cableSize: string,
    cableType: string,
    lengthMeters: number,
    parallelCount: number
  ): number => {
    const rate = cableRates?.find(
      r => r.cable_size === cableSize && r.cable_type === cableType
    );

    if (!rate) return 0;

    const supplyCost = rate.supply_rate_per_meter * lengthMeters * parallelCount;
    const installCost = rate.install_rate_per_meter * lengthMeters * parallelCount;
    const terminationCost = rate.termination_cost_per_end * 2 * parallelCount; // Both ends

    return supplyCost + installCost + terminationCost;
  };

  const analyzeOptimizations = async () => {
    if (!cableEntries || !calcSettings || !cableRates) {
      toast({
        title: "Missing Data",
        description: "Please ensure cable rates and calculation settings are configured.",
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);
    const optimizations: OptimizationResult[] = [];

    try {
      for (const entry of cableEntries) {
        if (!entry.load_amps || !entry.voltage || !entry.total_length) continue;

        const params: CableCalculationParams = {
          loadAmps: entry.load_amps,
          voltage: entry.voltage,
          totalLength: entry.total_length,
          material: entry.cable_type?.includes("Cu") ? "copper" : 
                   entry.cable_type?.includes("Al") ? "aluminium" : 
                   (calcSettings.default_cable_material.toLowerCase() as "copper" | "aluminium"),
          deratingFactor: entry.grouping_factor || 1.0,
          installationMethod: (entry.installation_method || calcSettings.default_installation_method) as 'air' | 'ducts' | 'ground',
          safetyMargin: calcSettings.cable_safety_margin,
          maxAmpsPerCable: calcSettings.max_amps_per_cable,
          preferredAmpsPerCable: calcSettings.preferred_amps_per_cable,
          voltageDropLimit: entry.voltage >= 380 ? 
            calcSettings.voltage_drop_limit_400v : 
            calcSettings.voltage_drop_limit_230v,
        };

        const result = calculateCableSize(params);
        
        if (!result || !result.alternatives || result.alternatives.length === 0) continue;

        const currentCost = calculateTotalCost(
          entry.cable_size || "",
          entry.cable_type || "",
          entry.total_length,
          entry.parallel_total_count || 1
        );

        const alternatives = result.alternatives
          .map(alt => {
            const altCost = calculateTotalCost(
              alt.cableSize,
              params.material === "copper" ? "Cu" : "Al",
              entry.total_length,
              alt.cablesInParallel
            );

            const savings = currentCost - altCost;
            const savingsPercent = currentCost > 0 ? (savings / currentCost) * 100 : 0;

            return {
              size: alt.cableSize,
              parallelCount: alt.cablesInParallel,
              totalCost: altCost,
              savings,
              savingsPercent,
              voltDrop: alt.voltDropPercentage,
            };
          })
          .filter(alt => alt.savings > 100) // Only show if savings > R100
          .sort((a, b) => b.savings - a.savings);

        if (alternatives.length > 0) {
          optimizations.push({
            cableId: entry.id,
            cableTag: entry.cable_tag,
            currentConfig: {
              size: entry.cable_size || "",
              parallelCount: entry.parallel_total_count || 1,
              totalCost: currentCost,
              voltage: entry.voltage,
              loadAmps: entry.load_amps,
            },
            alternatives: alternatives.slice(0, 3), // Top 3 alternatives
          });
        }
      }

      setResults(optimizations);
      
      if (optimizations.length === 0) {
        toast({
          title: "Analysis Complete",
          description: "No cost-saving opportunities found. Your current configurations are optimal!",
        });
      } else {
        toast({
          title: "Analysis Complete",
          description: `Found ${optimizations.length} optimization opportunities.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Analysis Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `R ${value.toLocaleString('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const totalPotentialSavings = results.reduce(
    (sum, result) => sum + (result.alternatives[0]?.savings || 0),
    0
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cable Sizing Optimizer</CardTitle>
          <CardDescription>
            Analyze parallel cable configurations to find the most cost-effective solutions.
            The system compares different cable size combinations for the same load capacity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={analyzeOptimizations}
              disabled={analyzing || !cableEntries || cableEntries.length === 0}
            >
              {analyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {analyzing ? "Analyzing..." : "Analyze Cables"}
            </Button>
            
            {results.length > 0 && (
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-600">
                  Potential Savings: {formatCurrency(totalPotentialSavings)}
                </span>
              </div>
            )}
          </div>

          {!cableEntries || cableEntries.length === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>No cable entries found for analysis</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-6">
          {results.map((result) => (
            <Card key={result.cableId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{result.cableTag}</CardTitle>
                    <CardDescription>
                      {result.currentConfig.loadAmps}A @ {result.currentConfig.voltage}V
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-lg">
                    Best Savings: {formatCurrency(result.alternatives[0].savings)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Configuration</TableHead>
                      <TableHead>Cable Size</TableHead>
                      <TableHead className="text-right">Parallel Runs</TableHead>
                      <TableHead className="text-right">Volt Drop (%)</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead className="text-right">Savings</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-muted/50">
                      <TableCell className="font-medium">Current</TableCell>
                      <TableCell>{result.currentConfig.size}</TableCell>
                      <TableCell className="text-right">
                        {result.currentConfig.parallelCount}
                      </TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(result.currentConfig.totalCost)}
                      </TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                    {result.alternatives.map((alt, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          Alternative {idx + 1}
                        </TableCell>
                        <TableCell>{alt.size}</TableCell>
                        <TableCell className="text-right">{alt.parallelCount}</TableCell>
                        <TableCell className="text-right">
                          {alt.voltDrop.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(alt.totalCost)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-green-600 font-semibold">
                            {formatCurrency(alt.savings)}
                            <span className="text-xs ml-1">
                              ({alt.savingsPercent.toFixed(1)}%)
                            </span>
                          </span>
                        </TableCell>
                        <TableCell>
                          {idx === 0 && (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Best Option
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
