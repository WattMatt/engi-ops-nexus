import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface AmortizationRow {
  year: number;
  beginning: number;
  repayment: number;
  interest: number;
  principal: number;
  ending: number;
}

export function CapitalRecoveryCalculator() {
  const [capitalCost, setCapitalCost] = useState(3594200.00);
  const [periodYears, setPeriodYears] = useState(10);
  const [rate, setRate] = useState(12.00);

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
            <Label htmlFor="capitalCost">Capital Cost (R)</Label>
            <Input
              id="capitalCost"
              type="number"
              step="0.01"
              value={capitalCost}
              onChange={(e) => setCapitalCost(Number(e.target.value))}
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
