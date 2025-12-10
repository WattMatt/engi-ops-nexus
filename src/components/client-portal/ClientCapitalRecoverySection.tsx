import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AmortizationRow {
  year: number;
  beginning: number;
  repayment: number;
  interest: number;
  principal: number;
  ending: number;
}

interface ClientCapitalRecoverySectionProps {
  projectId: string;
}

export function ClientCapitalRecoverySection({ projectId }: ClientCapitalRecoverySectionProps) {
  const [capitalCost, setCapitalCost] = useState(0);
  const [periodYears, setPeriodYears] = useState(10);
  const [rate, setRate] = useState(12.00);

  const { data: zones = [] } = useQuery({
    queryKey: ["client-generator-zones-capital", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generator_zones")
        .select("*")
        .eq("project_id", projectId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const zoneIds = zones.map(z => z.id);

  const { data: zoneGenerators = [] } = useQuery({
    queryKey: ["client-zone-generators-capital", projectId, zoneIds],
    queryFn: async () => {
      if (!zoneIds.length) return [];
      
      const { data, error } = await supabase
        .from("zone_generators")
        .select("*")
        .in("zone_id", zoneIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && zoneIds.length > 0,
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["client-tenants-capital", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, own_generator_provided")
        .eq("project_id", projectId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: settings } = useQuery({
    queryKey: ["client-generator-settings-capital", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generator_settings")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Load saved period and rate from settings
  useEffect(() => {
    if (settings) {
      if (settings.capital_recovery_period_years) {
        setPeriodYears(settings.capital_recovery_period_years);
      }
      if (settings.capital_recovery_rate_percent) {
        setRate(Number(settings.capital_recovery_rate_percent));
      }
    }
  }, [settings]);

  // Update capital cost when data changes
  useEffect(() => {
    const generatorCost = zoneGenerators.reduce((sum, gen) => {
      return sum + (Number(gen.generator_cost) || 0);
    }, 0);
    
    const numTenantDBs = tenants.filter(t => !t.own_generator_provided).length;
    const ratePerTenantDB = settings?.rate_per_tenant_db || 0;
    const tenantDBsCost = numTenantDBs * ratePerTenantDB;
    
    const numMainBoards = settings?.num_main_boards || 0;
    const ratePerMainBoard = settings?.rate_per_main_board || 0;
    const mainBoardsCost = numMainBoards * ratePerMainBoard;
    
    const additionalCablingCost = settings?.additional_cabling_cost || 0;
    const controlWiringCost = settings?.control_wiring_cost || 0;
    
    const totalCost = generatorCost + tenantDBsCost + mainBoardsCost + additionalCablingCost + controlWiringCost;
    
    if (totalCost > 0) {
      setCapitalCost(totalCost);
    }
  }, [zoneGenerators, tenants, settings]);

  // Calculate annual repayment using annuity formula
  const calculateAnnualRepayment = (): number => {
    const r = rate / 100;
    const n = periodYears;
    const pv = capitalCost;
    
    if (r === 0) return pv / n;
    
    const numerator = r * Math.pow(1 + r, n);
    const denominator = Math.pow(1 + r, n) - 1;
    return pv * (numerator / denominator);
  };

  const annualRepayment = calculateAnnualRepayment();
  const monthlyRepayment = annualRepayment / 12;

  // Generate amortization schedule
  const generateSchedule = (): AmortizationRow[] => {
    const schedule: AmortizationRow[] = [];
    let balance = capitalCost;
    const r = rate / 100;

    for (let year = 1; year <= periodYears; year++) {
      const beginning = balance;
      const interest = beginning * r;
      const principal = annualRepayment - interest;
      const ending = Math.max(0, beginning - principal);

      schedule.push({
        year,
        beginning,
        repayment: annualRepayment,
        interest,
        principal,
        ending,
      });

      balance = ending;
    }

    return schedule;
  };

  const schedule = generateSchedule();

  const formatCurrency = (value: number): string => {
    return `R ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capital Cost Recovery</CardTitle>
        <CardDescription>Amortization schedule for capital investment recovery</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Parameters (Read-Only) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Capital Cost (R)</div>
            <div className="font-semibold text-lg">{formatCurrency(capitalCost)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Period (years)</div>
            <div className="font-semibold text-lg">{periodYears}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Rate (%)</div>
            <div className="font-semibold text-lg">{rate.toFixed(2)}%</div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-primary/5 rounded-lg border">
            <div className="text-sm text-muted-foreground mb-1">Annual Repayment</div>
            <div className="text-2xl font-bold">{formatCurrency(annualRepayment)}</div>
          </div>
          <div className="p-4 bg-primary/5 rounded-lg border">
            <div className="text-sm text-muted-foreground mb-1">Monthly Repayment</div>
            <div className="text-2xl font-bold">{formatCurrency(monthlyRepayment)}</div>
          </div>
        </div>

        {/* Amortization Schedule */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Amortization Schedule</h3>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Years</TableHead>
                  <TableHead className="text-right font-semibold">Beginning</TableHead>
                  <TableHead className="text-right font-semibold">Repayment</TableHead>
                  <TableHead className="text-right font-semibold">Interest</TableHead>
                  <TableHead className="text-right font-semibold">Principal</TableHead>
                  <TableHead className="text-right font-semibold">Ending Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.map((row) => (
                  <TableRow key={row.year}>
                    <TableCell className="font-medium">{row.year}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.beginning)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.repayment)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.interest)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.principal)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.ending)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
