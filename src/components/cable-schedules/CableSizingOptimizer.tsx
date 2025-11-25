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
import { useCalculationSettings } from "@/hooks/useCalculationSettings";
import { useToast } from "@/hooks/use-toast";
import { analyzeCableOptimizations, type OptimizationResult } from "@/utils/cableOptimization";

interface CableSizingOptimizerProps {
  projectId: string;
}

export const CableSizingOptimizer = ({ projectId }: CableSizingOptimizerProps) => {
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<OptimizationResult[]>([]);
  const [applying, setApplying] = useState(false);
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

    try {
      const optimizations = analyzeCableOptimizations(
        cableEntries as any,
        cableRates as any,
        calcSettings
      );

      setResults(optimizations);
      
      const savingsCount = optimizations.filter(
        opt => opt.alternatives[0]?.savings > 0 && !opt.alternatives[0]?.isCurrentConfig
      ).length;
      
      if (optimizations.length === 0) {
        toast({
          title: "Analysis Complete",
          description: "No cables with sufficient data found for analysis.",
        });
      } else if (savingsCount === 0) {
        toast({
          title: "Analysis Complete",
          description: `Analyzed ${optimizations.length} cable groups. All configurations explored - current setups are optimal!`,
        });
      } else {
        toast({
          title: "Analysis Complete",
          description: `Found ${savingsCount} cost-saving opportunities out of ${optimizations.length} cable groups analyzed.`,
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

  const applyRecommendations = async () => {
    const recommendedChanges = results.filter(
      r => r.alternatives[0] && r.alternatives[0].savings > 100 && !r.alternatives[0].isCurrentConfig
    );

    if (recommendedChanges.length === 0) {
      toast({
        title: "No Recommendations",
        description: "All cables are already using optimal configurations.",
      });
      return;
    }

    setApplying(true);
    try {
      for (const result of recommendedChanges) {
        const recommended = result.alternatives[0];
        
        // Update the cable entry with the recommended configuration
        const { error } = await supabase
          .from("cable_entries")
          .update({
            cable_size: recommended.size,
            parallel_total_count: recommended.parallelCount,
            supply_cost: recommended.supplyCost,
            install_cost: recommended.installCost,
            total_cost: recommended.totalCost,
            volt_drop: recommended.voltDrop,
            notes: `COMPLIANCE VERIFIED - Optimized: Was ${result.currentConfig.parallelCount}x ${result.currentConfig.size}, now ${recommended.parallelCount}x ${recommended.size}. Savings: ${formatCurrency(recommended.savings)}. Meets all derating, voltage drop, and protection device coordination requirements.`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", result.cableId);

        if (error) throw error;
      }

      toast({
        title: "Recommendations Applied",
        description: `Successfully updated ${recommendedChanges.length} cable configuration(s) with optimal sizing.`,
      });
      
      // Clear results to trigger re-analysis
      setResults([]);
      
      // Refresh cable entries
      window.location.reload();
      
    } catch (error: any) {
      toast({
        title: "Error Applying Recommendations",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setApplying(false);
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
            
            {results.length > 0 && results.some(r => r.alternatives[0]?.savings > 100 && !r.alternatives[0]?.isCurrentConfig) && (
              <Button
                onClick={applyRecommendations}
                disabled={applying}
                variant="default"
                className="bg-green-600 hover:bg-green-700"
              >
                {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {applying ? "Applying..." : "Apply All Recommendations"}
              </Button>
            )}
            
            {results.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-600">
                    Potential Savings: {formatCurrency(totalPotentialSavings)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  <span className="text-muted-foreground">
                    All recommendations verified for compliance: capacity, derating, voltage drop, and protection coordination
                  </span>
                </div>
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
                        {result.fromLocation} → {result.toLocation} | {result.totalLength}m
                      </CardDescription>
                      <div className="mt-1 font-semibold text-foreground">
                        Design Load: {result.currentConfig.loadAmps}A
                      </div>
                      {result.complianceNotes && (
                        <div className="mt-2 text-xs text-muted-foreground bg-secondary/20 p-2 rounded border border-border">
                          {result.complianceNotes}
                        </div>
                      )}
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
                    <h4 className="font-semibold mb-3">SANS 10142-1 Compliant Configurations for {result.currentConfig.loadAmps}A</h4>
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
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.alternatives.map((alt, idx) => {
                          const isRecommended = idx === 0 && alt.savings > 100 && !alt.isCurrentConfig;
                          const isCurrent = alt.isCurrentConfig;
                          return (
                            <TableRow 
                              key={idx}
                              className={
                                isCurrent ? "bg-primary/10 border-2 border-primary/30" :
                                isRecommended ? "bg-green-50" : 
                                alt.savings < -100 ? "bg-red-50" : 
                                ""
                              }
                            >
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {alt.parallelCount}x {alt.size}
                                    </span>
                                    {isCurrent && (
                                      <Badge variant="secondary" className="text-xs">
                                        CURRENT
                                      </Badge>
                                    )}
                                    {isRecommended && (
                                      <Badge variant="default" className="bg-green-600 text-xs">
                                        RECOMMENDED
                                      </Badge>
                                    )}
                                  </div>
                                  {alt.complianceReport && (
                                    <div className="text-xs text-muted-foreground font-mono">
                                      {alt.complianceReport}
                                    </div>
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
                                {alt.isCurrentConfig ? (
                                  <span className="text-muted-foreground font-medium">
                                    Baseline
                                  </span>
                                ) : alt.savings > 0 ? (
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
                              <TableCell>
                                {alt.isCurrentConfig ? (
                                  <Badge variant="outline" className="text-xs">Current</Badge>
                                ) : alt.savings > 100 ? (
                                  <Badge className="bg-green-600 text-xs">Best Value</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">Valid</Badge>
                                )}
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
