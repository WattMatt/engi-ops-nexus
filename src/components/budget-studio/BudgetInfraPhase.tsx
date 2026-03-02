import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  useProjectTenants,
  useStandbyConfig,
  useProjectZoning,
  useMasterGeneratorRates,
  useMasterTransformerSizes,
  calculateGeneratorSize,
  calculateZoneLoad,
} from "@/hooks/useBudgetEngine";

interface Props {
  budgetId: string;
  budget: any;
}

export const BudgetInfraPhase = ({ budgetId, budget }: Props) => {
  const { data: tenants = [] } = useProjectTenants(budgetId);
  const { data: standby } = useStandbyConfig(budgetId);
  const { data: zones = [] } = useProjectZoning(budgetId);
  const { data: genRates = [] } = useMasterGeneratorRates();
  const { data: txSizes = [] } = useMasterTransformerSizes();

  const loadFactor = standby?.load_factor_va_m2 ? Number(standby.load_factor_va_m2) : 30;
  const pf = standby?.power_factor ? Number(standby.power_factor) : 0.8;

  // Generator calculation
  const centreGenTenants = tenants.filter((t: any) => t.standby_source === "centre_generator");
  const genCalc = useMemo(
    () => calculateGeneratorSize(centreGenTenants, loadFactor, pf),
    [centreGenTenants, loadFactor, pf]
  );
  const suggestedGen = genRates.find((g) => Number(g.size_kva) >= genCalc.requiredKVA);

  // Transformer demand
  const totalProjectArea = tenants.reduce((s: number, t: any) => s + Number(t.area_m2 || 0), 0);
  const totalDemandKVA = totalProjectArea * 0.085;

  // DB summary
  const dbSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    tenants.forEach((t: any) => {
      const size = t.db_size || "Unknown";
      counts[size] = (counts[size] || 0) + 1;
    });
    return counts;
  }, [tenants]);

  const formatR = (v: number) => `R ${v.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Infrastructure Engine</h1>
        <p className="text-muted-foreground text-sm">DB sizing, transformer zoning, and generator calculations.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* DB Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribution Boards</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(dbSummary).length === 0 ? (
              <p className="text-sm text-muted-foreground">No tenants added yet.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(dbSummary).map(([size, count]) => (
                  <div key={size} className="flex justify-between items-center p-2 rounded bg-muted/50">
                    <span className="text-sm font-medium">{size}</span>
                    <Badge variant="secondary">{count}x</Badge>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t font-semibold text-sm">
                  <span>Total DBs</span>
                  <span>{tenants.length}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generator */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Standby Generator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Centre Gen Tenants</span>
                <span className="font-medium">{centreGenTenants.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Area</span>
                <span className="font-medium">{genCalc.totalArea.toLocaleString()} m²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total VA ({loadFactor} VA/m²)</span>
                <span className="font-medium">{genCalc.totalVA.toLocaleString()} VA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Power (PF {pf})</span>
                <span className="font-medium">{genCalc.totalKW.toFixed(1)} kW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Required kVA</span>
                <span className="font-semibold">{genCalc.requiredKVA.toFixed(1)} kVA</span>
              </div>
            </div>
            {suggestedGen && (
              <div className="p-3 rounded-lg bg-primary/10 text-sm">
                <p className="font-medium">Suggested: {suggestedGen.size_kva} kVA</p>
                <p className="text-muted-foreground">{formatR(Number(suggestedGen.allowance))}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transformer Demand */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Transformer Demand</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total GLA</span>
                <span className="font-medium">{totalProjectArea.toLocaleString()} m²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Load Factor</span>
                <span className="font-medium">0.085 kVA/m²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Demand</span>
                <span className="font-semibold">{totalDemandKVA.toFixed(1)} kVA</span>
              </div>
            </div>
            {txSizes.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                {txSizes.map((tx) => {
                  const usable = Number(tx.size_kva) * 0.8;
                  const unitsNeeded = Math.ceil(totalDemandKVA / usable);
                  return (
                    <div key={tx.id} className="p-3 rounded-lg border text-center">
                      <p className="font-semibold">{tx.size_kva} kVA</p>
                      <p className="text-xs text-muted-foreground">
                        {unitsNeeded}x needed
                      </p>
                      <p className="text-xs text-muted-foreground">{formatR(Number(tx.allowance) * unitsNeeded)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
