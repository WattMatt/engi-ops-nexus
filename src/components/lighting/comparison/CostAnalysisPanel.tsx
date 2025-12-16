import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LightingFitting } from '../lightingTypes';
import { ComparisonSettings } from './comparisonTypes';

interface CostAnalysisPanelProps {
  fittings: LightingFitting[];
  settings: ComparisonSettings;
}

export const CostAnalysisPanel = ({ fittings, settings }: CostAnalysisPanelProps) => {
  const [quantity, setQuantity] = useState(50);

  const analysis = useMemo(() => {
    const results = fittings.map((fitting) => {
      const unitCost = fitting.supply_cost + fitting.install_cost;
      let totalCost = unitCost * quantity;
      
      if (settings.include_vat) {
        totalCost *= (1 + settings.vat_rate / 100);
      }

      return {
        fitting,
        unitCost,
        totalCost,
      };
    });

    // Find lowest cost (baseline)
    const lowestCost = Math.min(...results.map((r) => r.totalCost));
    
    return results.map((result) => ({
      ...result,
      savings: lowestCost - result.totalCost,
      isLowest: result.totalCost === lowestCost,
    }));
  }, [fittings, quantity, settings]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cost Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-32"
              min={1}
            />
          </div>
          <p className="text-sm text-muted-foreground pt-5">
            {settings.include_vat ? `Including ${settings.vat_rate}% VAT` : 'Excluding VAT'}
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fitting</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">Total Cost ({quantity} units)</TableHead>
              <TableHead className="text-right">Savings vs Lowest</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analysis.map((item) => (
              <TableRow key={item.fitting.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{item.fitting.fitting_code}</span>
                    {item.isLowest && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Lowest
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.fitting.manufacturer} - {item.fitting.model_name}
                  </p>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(item.unitCost)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(item.totalCost)}
                </TableCell>
                <TableCell className="text-right">
                  {item.isLowest ? (
                    <span className="text-green-600">—</span>
                  ) : (
                    <span className="text-red-600">
                      {formatCurrency(item.savings)}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium">Summary</p>
          <p className="text-sm text-muted-foreground">
            For {quantity} fittings, the cost difference between the most and least expensive option is{' '}
            <span className="font-medium text-foreground">
              {formatCurrency(Math.max(...analysis.map((a) => a.totalCost)) - Math.min(...analysis.map((a) => a.totalCost)))}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
