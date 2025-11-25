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
  fromLocation: string;
  toLocation: string;
  totalLength: number;
  currentConfig: {
    size: string;
    parallelCount: number;
    totalCost: number;
    supplyCost: number;
    installCost: number;
    terminationCost: number;
    voltage: number;
    loadAmps: number;
  };
  alternatives: Array<{
    size: string;
    parallelCount: number;
    totalCost: number;
    supplyCost: number;
    installCost: number;
    terminationCost: number;
    savings: number;
    savingsPercent: number;
    voltDrop: number;
  }>;
}

export const CableSizingOptimizer = ({ projectId }: CableSizingOptimizerProps) => {
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<OptimizationResult[]>([]);
  const { data: calcSettings, isLoading: settingsLoading } = useCalculationSettings(projectId);

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

  const calculateCostBreakdown = (
    cableSize: string,
    cableType: string,
    lengthMeters: number,
    parallelCount: number
  ): { total: number; supply: number; install: number; termination: number } => {
    const rate = cableRates?.find(
      r => r.cable_size === cableSize && r.cable_type === cableType
    );

    if (!rate) return { total: 0, supply: 0, install: 0, termination: 0 };

    const supply = rate.supply_rate_per_meter * lengthMeters * parallelCount;
    const install = rate.install_rate_per_meter * lengthMeters * parallelCount;
    const termination = rate.termination_cost_per_end * 2 * parallelCount; // Both ends

    return {
      total: supply + install + termination,
      supply,
      install,
      termination,
    };
  };

  const analyzeOptimizations = async () => {
    if (!cableEntries || cableEntries.length === 0) {
      toast({
        title: "No Cable Data",
        description: "No cable entries found with load >= 100A.",
        variant: "destructive",
      });
      return;
    }

    if (!cableRates || cableRates.length === 0) {
      toast({
        title: "Missing Cable Rates",
        description: "Please configure cable rates in the Cable Tables tab first.",
        variant: "destructive",
      });
      return;
    }

    if (!calcSettings) {
      toast({
        title: "Loading Settings",
        description: "Calculation settings are still loading. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);
    const optimizations: OptimizationResult[] = [];

    try {
      console.log(`Analyzing ${cableEntries.length} cables...`);
      
      for (const entry of cableEntries) {
        console.log(`Processing cable: ${entry.cable_tag}, Load: ${entry.load_amps}A, Size: ${entry.cable_size}, Parallel: ${entry.parallel_total_count}`);
        
        if (!entry.load_amps || !entry.voltage || !entry.total_length) {
          console.log(`Skipping ${entry.cable_tag} - missing required data`);
          continue;
        }

        const material = entry.cable_type?.includes("Cu") ? "copper" : 
                        entry.cable_type?.includes("Al") ? "aluminium" : 
                        (calcSettings.default_cable_material.toLowerCase() as "copper" | "aluminium");

        const params: CableCalculationParams = {
          loadAmps: entry.load_amps,
          voltage: entry.voltage,
          totalLength: entry.total_length,
          material,
          deratingFactor: entry.grouping_factor || 1.0,
          installationMethod: (entry.installation_method || calcSettings.default_installation_method) as 'air' | 'ducts' | 'ground',
          safetyMargin: calcSettings.cable_safety_margin,
          maxAmpsPerCable: calcSettings.max_amps_per_cable,
          preferredAmpsPerCable: calcSettings.preferred_amps_per_cable,
          voltageDropLimit: entry.voltage >= 380 ? 
            calcSettings.voltage_drop_limit_400v : 
            calcSettings.voltage_drop_limit_230v,
        };

        console.log(`Calculation params:`, params);

        const result = calculateCableSize(params);
        
        console.log(`Result for ${entry.cable_tag}:`, result);
        
        if (!result || !result.alternatives || result.alternatives.length === 0) {
          console.log(`No alternatives found for ${entry.cable_tag}`);
          continue;
        }

        const currentCostBreakdown = calculateCostBreakdown(
          entry.cable_size || "",
          entry.cable_type || "",
          entry.total_length,
          entry.parallel_total_count || 1
        );

        const alternatives = result.alternatives
          .map(alt => {
            const altCostBreakdown = calculateCostBreakdown(
              alt.cableSize,
              params.material === "copper" ? "Cu" : "Al",
              entry.total_length,
              alt.cablesInParallel
            );

            const savings = currentCostBreakdown.total - altCostBreakdown.total;
            const savingsPercent = currentCostBreakdown.total > 0 ? (savings / currentCostBreakdown.total) * 100 : 0;

            return {
              size: alt.cableSize,
              parallelCount: alt.cablesInParallel,
              totalCost: altCostBreakdown.total,
              supplyCost: altCostBreakdown.supply,
              installCost: altCostBreakdown.install,
              terminationCost: altCostBreakdown.termination,
              savings,
              savingsPercent,
              voltDrop: alt.voltDropPercentage,
            };
          })
          .sort((a, b) => b.savings - a.savings); // Sort by savings (best first)

        // Always include if we have alternatives to show
        if (alternatives.length > 0) {
          optimizations.push({
            cableId: entry.id,
            cableTag: entry.cable_tag,
            fromLocation: entry.from_location,
            toLocation: entry.to_location,
            totalLength: entry.total_length,
            currentConfig: {
              size: entry.cable_size || "",
              parallelCount: entry.parallel_total_count || 1,
              totalCost: currentCostBreakdown.total,
              supplyCost: currentCostBreakdown.supply,
              installCost: currentCostBreakdown.install,
              terminationCost: currentCostBreakdown.termination,
              voltage: entry.voltage,
              loadAmps: entry.load_amps,
            },
            alternatives: alternatives.slice(0, 5), // Top 5 alternatives
          });
        }
      }

      setResults(optimizations);
      
      const savingsCount = optimizations.filter(
        opt => opt.alternatives[0]?.savings > 0
      ).length;
      
      if (optimizations.length === 0) {
        toast({
          title: "Analysis Complete",
          description: "No cables with sufficient data found for analysis.",
        });
      } else if (savingsCount === 0) {
        toast({
          title: "Analysis Complete",
          description: `Analyzed ${optimizations.length} cables. Current configurations are optimal!`,
        });
      } else {
        toast({
          title: "Analysis Complete",
          description: `Found ${savingsCount} cost-saving opportunities out of ${optimizations.length} cables analyzed.`,
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
    (sum, result) => sum + Math.max(0, result.alternatives[0]?.savings || 0),
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
              disabled={analyzing || settingsLoading || !cableEntries || cableEntries.length === 0 || !cableRates || cableRates.length === 0}
            >
              {analyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {settingsLoading ? "Loading Settings..." : analyzing ? "Analyzing..." : "Analyze Cables"}
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

          <div className="flex flex-col gap-2">
            {settingsLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading calculation settings...</span>
              </div>
            )}
            {!cableEntries || cableEntries.length === 0 ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>No cable entries found with load ≥ 100A</span>
              </div>
            ) : null}
            {!cableRates || cableRates.length === 0 ? (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span>No cable rates configured - please add rates in Cable Tables tab</span>
              </div>
            ) : null}
            {cableEntries && cableEntries.length > 0 && !settingsLoading && (
              <div className="text-sm text-muted-foreground">
                Found {cableEntries.length} cable{cableEntries.length > 1 ? 's' : ''} ready for analysis
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-6">
          {results.map((result) => {
            const bestAlt = result.alternatives[0];
            const hasSavings = bestAlt && bestAlt.savings > 100;

            return (
              <Card key={result.cableId} className={hasSavings ? "border-green-500" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{result.cableTag}</CardTitle>
                      <CardDescription>
                        {result.fromLocation} → {result.toLocation} | {result.totalLength}m | {result.currentConfig.loadAmps}A @ {result.currentConfig.voltage}V
                      </CardDescription>
                    </div>
                    {hasSavings ? (
                      <Badge variant="default" className="bg-green-600 text-lg px-3 py-1">
                        Save {formatCurrency(bestAlt.savings)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-sm">
                        Current is Optimal
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current Configuration Card */}
                  <div className="bg-primary/5 p-4 rounded-lg border-2 border-primary/20">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-base">Current Configuration</h4>
                        <p className="text-lg font-bold mt-1">
                          {result.currentConfig.parallelCount}x {result.currentConfig.size}
                        </p>
                      </div>
                      <Badge variant="secondary">CURRENT</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                      <div>
                        <span className="text-muted-foreground block">Supply Cost</span>
                        <span className="font-medium">{formatCurrency(result.currentConfig.supplyCost)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Install Cost</span>
                        <span className="font-medium">{formatCurrency(result.currentConfig.installCost)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Termination</span>
                        <span className="font-medium">{formatCurrency(result.currentConfig.terminationCost)}</span>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-border">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Total Cost:</span>
                        <span className="text-xl font-bold text-primary">
                          {formatCurrency(result.currentConfig.totalCost)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Alternatives Table */}
                  <div>
                    <h4 className="font-semibold mb-3">Alternative Configurations Analyzed</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Config</TableHead>
                          <TableHead className="text-right">Supply</TableHead>
                          <TableHead className="text-right">Install</TableHead>
                          <TableHead className="text-right">Termination</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Difference</TableHead>
                          <TableHead className="text-right">V.Drop</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.alternatives.map((alt, idx) => {
                          const isRecommended = idx === 0 && alt.savings > 100;
                          return (
                            <TableRow 
                              key={idx}
                              className={
                                isRecommended ? "bg-green-50" : 
                                alt.savings < -100 ? "bg-red-50" : 
                                ""
                              }
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {alt.parallelCount}x {alt.size}
                                  </span>
                                  {isRecommended && (
                                    <Badge variant="default" className="bg-green-600 text-xs">
                                      RECOMMENDED
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {formatCurrency(alt.supplyCost)}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {formatCurrency(alt.installCost)}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {formatCurrency(alt.terminationCost)}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(alt.totalCost)}
                              </TableCell>
                              <TableCell className="text-right">
                                {alt.savings > 0 ? (
                                  <span className="text-green-700 font-semibold">
                                    -{formatCurrency(alt.savings)}
                                    <span className="text-xs ml-1">
                                      ({alt.savingsPercent.toFixed(1)}%)
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-red-700">
                                    +{formatCurrency(Math.abs(alt.savings))}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {alt.voltDrop.toFixed(2)}%
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
