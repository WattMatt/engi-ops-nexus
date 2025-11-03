import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
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

interface CapitalRecoveryCalculatorProps {
  projectId: string;
}

export function CapitalRecoveryCalculator({ projectId }: CapitalRecoveryCalculatorProps) {
  const [capitalCost, setCapitalCost] = useState(0);
  const [periodYears, setPeriodYears] = useState(10);
  const [rate, setRate] = useState(12.00);

  // Fetch generator zones and settings to calculate total equipment cost
  const { data: zones = [] } = useQuery({
    queryKey: ["generator-zones-capital", projectId],
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

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants-capital", projectId],
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
    queryKey: ["generator-settings-capital", projectId],
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

  // Update capital cost when data changes - use same calculation as GeneratorCostingSection
  useEffect(() => {
    // Calculate generator cost accounting for quantity per zone
    const generatorCost = zones.reduce((sum, zone) => {
      const numGens = zone.num_generators || 1;
      const costPerGen = zone.generator_cost || 0;
      return sum + (costPerGen * numGens);
    }, 0);
    
    // Calculate tenant DBs cost (auto-calculated based on tenants without own generator)
    const numTenantDBs = tenants.filter(t => !t.own_generator_provided).length;
    const ratePerTenantDB = settings?.rate_per_tenant_db || 0;
    const tenantDBsCost = numTenantDBs * ratePerTenantDB;
    
    // Calculate main boards cost
    const numMainBoards = settings?.num_main_boards || 0;
    const ratePerMainBoard = settings?.rate_per_main_board || 0;
    const mainBoardsCost = numMainBoards * ratePerMainBoard;
    
    // Get additional costs
    const additionalCablingCost = settings?.additional_cabling_cost || 0;
    const controlWiringCost = settings?.control_wiring_cost || 0;
    
    // Total matches GeneratorCostingSection exactly
    const totalCost = generatorCost + tenantDBsCost + mainBoardsCost + additionalCablingCost + controlWiringCost;
    
    if (totalCost > 0) {
      setCapitalCost(totalCost);
    }
  }, [zones, tenants, settings]);

  // Calculate annual repayment using annuity formula
  // PMT = PV × [r(1 + r)^n] / [(1 + r)^n - 1]
  const calculateAnnualRepayment = (): number => {
    const r = rate / 100; // Convert percentage to decimal
    const n = periodYears;
    const pv = capitalCost;
    
    if (r === 0) return pv / n; // If no interest, simple division
    
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
      const ending = Math.max(0, beginning - principal); // Prevent negative values due to rounding

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
        {/* Input Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <Label htmlFor="capitalCost">Capital Cost (R) - From Equipment Costing</Label>
            <Input
              id="capitalCost"
              type="number"
              step="0.01"
              value={capitalCost}
              onChange={(e) => setCapitalCost(Number(e.target.value))}
              className="font-semibold"
            />
          </div>
          <div>
            <Label htmlFor="periodYears">Period (years)</Label>
            <Input
              id="periodYears"
              type="number"
              value={periodYears}
              onChange={(e) => setPeriodYears(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="rate">Rate (%)</Label>
            <Input
              id="rate"
              type="number"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
            />
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
