import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Zap, Leaf } from 'lucide-react';
import { LightingFitting } from '../lightingTypes';
import { ComparisonSettings } from './comparisonTypes';

interface EnergyAnalysisPanelProps {
  fittings: LightingFitting[];
  settings: ComparisonSettings;
  onSettingsChange: (settings: ComparisonSettings) => void;
}

// CO2 emission factor for South Africa (kg CO2 per kWh)
const CO2_FACTOR = 0.95;

export const EnergyAnalysisPanel = ({
  fittings,
  settings,
  onSettingsChange,
}: EnergyAnalysisPanelProps) => {
  const [quantity, setQuantity] = useState(50);

  const analysis = useMemo(() => {
    const results = fittings.map((fitting) => {
      const wattage = fitting.wattage || 0;
      
      // Energy calculations
      const dailyKwh = (wattage * quantity * settings.operating_hours_per_day) / 1000;
      const monthlyKwh = dailyKwh * 30;
      const annualKwh = dailyKwh * 365;
      
      // Cost calculations
      let annualCost = annualKwh * settings.electricity_rate;
      if (settings.include_vat) {
        annualCost *= (1 + settings.vat_rate / 100);
      }
      
      const fiveYearCost = annualCost * settings.analysis_period_years;
      
      // CO2 emissions
      const annualCO2 = (annualKwh * CO2_FACTOR) / 1000; // tonnes
      
      // Capital cost
      const capitalCost = (fitting.supply_cost + fitting.install_cost) * quantity;
      const totalCostOfOwnership = capitalCost + fiveYearCost;

      return {
        fitting,
        wattage,
        monthlyKwh,
        annualKwh,
        annualCost,
        fiveYearCost,
        annualCO2,
        totalCostOfOwnership,
      };
    });

    // Find most efficient (lowest annual kWh)
    const lowestKwh = Math.min(...results.filter((r) => r.wattage > 0).map((r) => r.annualKwh));
    const lowestTCO = Math.min(...results.map((r) => r.totalCostOfOwnership));

    return results.map((result) => ({
      ...result,
      isLowestEnergy: result.annualKwh === lowestKwh && result.wattage > 0,
      isLowestTCO: result.totalCostOfOwnership === lowestTCO,
    }));
  }, [fittings, quantity, settings]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Energy Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Settings */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="qty">Quantity</Label>
            <Input
              id="qty"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rate">Electricity Rate (R/kWh)</Label>
            <Input
              id="rate"
              type="number"
              value={settings.electricity_rate}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  electricity_rate: parseFloat(e.target.value) || 0,
                })
              }
              step={0.01}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="hours">Operating Hours/Day</Label>
            <Input
              id="hours"
              type="number"
              value={settings.operating_hours_per_day}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  operating_hours_per_day: parseFloat(e.target.value) || 0,
                })
              }
              max={24}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="years">Analysis Period (Years)</Label>
            <Input
              id="years"
              type="number"
              value={settings.analysis_period_years}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  analysis_period_years: parseInt(e.target.value) || 1,
                })
              }
              min={1}
              max={20}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="vat"
            checked={settings.include_vat}
            onCheckedChange={(checked) =>
              onSettingsChange({ ...settings, include_vat: checked })
            }
          />
          <Label htmlFor="vat">Include VAT ({settings.vat_rate}%)</Label>
        </div>

        {/* Energy Consumption Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fitting</TableHead>
              <TableHead className="text-right">Wattage</TableHead>
              <TableHead className="text-right">Monthly kWh</TableHead>
              <TableHead className="text-right">Annual Cost</TableHead>
              <TableHead className="text-right">{settings.analysis_period_years}-Year Energy</TableHead>
              <TableHead className="text-right">{settings.analysis_period_years}-Year TCO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analysis.map((item) => (
              <TableRow key={item.fitting.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{item.fitting.fitting_code}</span>
                    {item.isLowestEnergy && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <Leaf className="h-3 w-3 mr-1" />
                        Most Efficient
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {item.wattage > 0 ? `${item.wattage}W` : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {item.monthlyKwh > 0 ? `${item.monthlyKwh.toFixed(0)} kWh` : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {item.annualCost > 0 ? formatCurrency(item.annualCost) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {item.fiveYearCost > 0 ? formatCurrency(item.fiveYearCost) : '-'}
                </TableCell>
                <TableCell className="text-right font-medium">
                  <div className="flex items-center justify-end gap-1">
                    {formatCurrency(item.totalCostOfOwnership)}
                    {item.isLowestTCO && (
                      <Badge variant="outline" className="text-green-600 border-green-600 ml-1">
                        Best
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* CO2 Emissions */}
        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Leaf className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium">Environmental Impact (Annual)</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {analysis.map((item) => (
              <div key={item.fitting.id}>
                <p className="text-xs text-muted-foreground">{item.fitting.fitting_code}</p>
                <p className="text-sm font-medium">
                  {item.annualCO2 > 0 ? `${item.annualCO2.toFixed(2)} tonnes CO₂` : '-'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
