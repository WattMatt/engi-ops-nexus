import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  TrendingDown, 
  Calendar,
  DollarSign,
  Zap,
  Leaf,
  Download
} from 'lucide-react';

export const ComparisonAnalysis = () => {
  const [traditional, setTraditional] = useState({
    wattage: 58, // T8 fluorescent
    quantity: 100,
    unitCost: 150,
    installCost: 80,
    lifespanHours: 10000,
    maintenanceCost: 50,
  });

  const [led, setLed] = useState({
    wattage: 22, // LED equivalent
    quantity: 100,
    unitCost: 450,
    installCost: 80,
    lifespanHours: 50000,
    maintenanceCost: 10,
  });

  const [config, setConfig] = useState({
    electricityRate: 2.5,
    operatingHoursPerYear: 2600,
    analysisYears: 10,
    gridEmissionFactor: 0.9,
  });

  const analysis = useMemo(() => {
    // Traditional calculations
    const tradTotalWatts = traditional.wattage * traditional.quantity;
    const tradAnnualKWh = (tradTotalWatts * config.operatingHoursPerYear) / 1000;
    const tradAnnualEnergyCost = tradAnnualKWh * config.electricityRate;
    const tradInitialCost = (traditional.unitCost + traditional.installCost) * traditional.quantity;
    const tradReplacementsPerYear = config.operatingHoursPerYear / traditional.lifespanHours;
    const tradAnnualReplacementCost = tradReplacementsPerYear * traditional.unitCost * traditional.quantity;
    const tradAnnualMaintenance = traditional.maintenanceCost * traditional.quantity;
    const tradAnnualTotalCost = tradAnnualEnergyCost + tradAnnualReplacementCost + tradAnnualMaintenance;
    const tradTotalCost = tradInitialCost + (tradAnnualTotalCost * config.analysisYears);
    const tradAnnualCO2 = tradAnnualKWh * config.gridEmissionFactor;

    // LED calculations
    const ledTotalWatts = led.wattage * led.quantity;
    const ledAnnualKWh = (ledTotalWatts * config.operatingHoursPerYear) / 1000;
    const ledAnnualEnergyCost = ledAnnualKWh * config.electricityRate;
    const ledInitialCost = (led.unitCost + led.installCost) * led.quantity;
    const ledReplacementsPerYear = config.operatingHoursPerYear / led.lifespanHours;
    const ledAnnualReplacementCost = ledReplacementsPerYear * led.unitCost * led.quantity;
    const ledAnnualMaintenance = led.maintenanceCost * led.quantity;
    const ledAnnualTotalCost = ledAnnualEnergyCost + ledAnnualReplacementCost + ledAnnualMaintenance;
    const ledTotalCost = ledInitialCost + (ledAnnualTotalCost * config.analysisYears);
    const ledAnnualCO2 = ledAnnualKWh * config.gridEmissionFactor;

    // Savings
    const annualEnergySavings = tradAnnualEnergyCost - ledAnnualEnergyCost;
    const annualTotalSavings = tradAnnualTotalCost - ledAnnualTotalCost;
    const totalSavings = tradTotalCost - ledTotalCost;
    const additionalUpfrontCost = ledInitialCost - tradInitialCost;
    const paybackYears = annualTotalSavings > 0 ? additionalUpfrontCost / annualTotalSavings : Infinity;
    const energySavingsPercent = tradAnnualKWh > 0 ? ((tradAnnualKWh - ledAnnualKWh) / tradAnnualKWh) * 100 : 0;
    const co2Reduction = tradAnnualCO2 - ledAnnualCO2;
    const co2ReductionPercent = tradAnnualCO2 > 0 ? (co2Reduction / tradAnnualCO2) * 100 : 0;

    // ROI
    const roi = additionalUpfrontCost > 0 ? ((totalSavings - additionalUpfrontCost) / additionalUpfrontCost) * 100 : 0;

    return {
      traditional: {
        totalWatts: tradTotalWatts,
        annualKWh: tradAnnualKWh,
        annualEnergyCost: tradAnnualEnergyCost,
        initialCost: tradInitialCost,
        annualTotalCost: tradAnnualTotalCost,
        totalCost: tradTotalCost,
        annualCO2: tradAnnualCO2,
      },
      led: {
        totalWatts: ledTotalWatts,
        annualKWh: ledAnnualKWh,
        annualEnergyCost: ledAnnualEnergyCost,
        initialCost: ledInitialCost,
        annualTotalCost: ledAnnualTotalCost,
        totalCost: ledTotalCost,
        annualCO2: ledAnnualCO2,
      },
      savings: {
        annualEnergySavings,
        annualTotalSavings,
        totalSavings,
        additionalUpfrontCost,
        paybackYears,
        energySavingsPercent,
        co2Reduction,
        co2ReductionPercent,
        roi,
      },
    };
  }, [traditional, led, config]);

  const formatCurrency = (value: number) => `R ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const formatNumber = (value: number, decimals = 0) => value.toLocaleString(undefined, { maximumFractionDigits: decimals });

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Analysis Parameters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Electricity Rate (R/kWh)</Label>
            <Input
              type="number"
              step="0.1"
              value={config.electricityRate}
              onChange={(e) => setConfig(c => ({ ...c, electricityRate: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Operating Hours/Year</Label>
            <Input
              type="number"
              value={config.operatingHoursPerYear}
              onChange={(e) => setConfig(c => ({ ...c, operatingHoursPerYear: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Analysis Period (Years)</Label>
            <Input
              type="number"
              value={config.analysisYears}
              onChange={(e) => setConfig(c => ({ ...c, analysisYears: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Grid Factor (kg CO2/kWh)</Label>
            <Input
              type="number"
              step="0.01"
              value={config.gridEmissionFactor}
              onChange={(e) => setConfig(c => ({ ...c, gridEmissionFactor: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Input Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Traditional Lighting */}
        <Card className="border-orange-500/30">
          <CardHeader className="bg-orange-500/10">
            <CardTitle className="text-sm flex items-center gap-2">
              <Badge variant="outline" className="bg-orange-500/20">Traditional</Badge>
              Fluorescent / Halogen
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Wattage per Fitting</Label>
                <Input
                  type="number"
                  value={traditional.wattage}
                  onChange={(e) => setTraditional(t => ({ ...t, wattage: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  value={traditional.quantity}
                  onChange={(e) => setTraditional(t => ({ ...t, quantity: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Unit Cost (R)</Label>
                <Input
                  type="number"
                  value={traditional.unitCost}
                  onChange={(e) => setTraditional(t => ({ ...t, unitCost: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Install Cost (R)</Label>
                <Input
                  type="number"
                  value={traditional.installCost}
                  onChange={(e) => setTraditional(t => ({ ...t, installCost: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Lifespan (Hours)</Label>
                <Input
                  type="number"
                  value={traditional.lifespanHours}
                  onChange={(e) => setTraditional(t => ({ ...t, lifespanHours: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Maintenance/Unit/Year (R)</Label>
                <Input
                  type="number"
                  value={traditional.maintenanceCost}
                  onChange={(e) => setTraditional(t => ({ ...t, maintenanceCost: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LED Lighting */}
        <Card className="border-green-500/30">
          <CardHeader className="bg-green-500/10">
            <CardTitle className="text-sm flex items-center gap-2">
              <Badge variant="outline" className="bg-green-500/20">LED</Badge>
              Energy Efficient
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Wattage per Fitting</Label>
                <Input
                  type="number"
                  value={led.wattage}
                  onChange={(e) => setLed(l => ({ ...l, wattage: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  value={led.quantity}
                  onChange={(e) => setLed(l => ({ ...l, quantity: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Unit Cost (R)</Label>
                <Input
                  type="number"
                  value={led.unitCost}
                  onChange={(e) => setLed(l => ({ ...l, unitCost: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Install Cost (R)</Label>
                <Input
                  type="number"
                  value={led.installCost}
                  onChange={(e) => setLed(l => ({ ...l, installCost: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Lifespan (Hours)</Label>
                <Input
                  type="number"
                  value={led.lifespanHours}
                  onChange={(e) => setLed(l => ({ ...l, lifespanHours: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Maintenance/Unit/Year (R)</Label>
                <Input
                  type="number"
                  value={led.maintenanceCost}
                  onChange={(e) => setLed(l => ({ ...l, maintenanceCost: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="pt-4 text-center">
            <TrendingDown className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold text-green-600">{analysis.savings.energySavingsPercent.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">Energy Reduction</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="pt-4 text-center">
            <Calendar className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold text-blue-600">
              {analysis.savings.paybackYears < 100 ? analysis.savings.paybackYears.toFixed(1) : '∞'}
            </div>
            <div className="text-xs text-muted-foreground">Years Payback</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="pt-4 text-center">
            <DollarSign className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(analysis.savings.totalSavings)}</div>
            <div className="text-xs text-muted-foreground">{config.analysisYears}yr Total Savings</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/10 border-purple-500/30">
          <CardContent className="pt-4 text-center">
            <Leaf className="h-6 w-6 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold text-purple-600">{analysis.savings.co2ReductionPercent.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">CO2 Reduction</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Detailed Cost Comparison</span>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Metric</th>
                  <th className="text-right py-2 text-orange-600">Traditional</th>
                  <th className="text-center py-2 w-8"></th>
                  <th className="text-right py-2 text-green-600">LED</th>
                  <th className="text-right py-2">Savings</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2">Total Wattage</td>
                  <td className="text-right">{formatNumber(analysis.traditional.totalWatts)} W</td>
                  <td className="text-center"><ArrowRight className="h-4 w-4 text-muted-foreground" /></td>
                  <td className="text-right text-green-600">{formatNumber(analysis.led.totalWatts)} W</td>
                  <td className="text-right">{analysis.savings.energySavingsPercent.toFixed(0)}%</td>
                </tr>
                <tr>
                  <td className="py-2">Annual Energy</td>
                  <td className="text-right">{formatNumber(analysis.traditional.annualKWh)} kWh</td>
                  <td className="text-center"><ArrowRight className="h-4 w-4 text-muted-foreground" /></td>
                  <td className="text-right text-green-600">{formatNumber(analysis.led.annualKWh)} kWh</td>
                  <td className="text-right">{formatNumber(analysis.traditional.annualKWh - analysis.led.annualKWh)} kWh</td>
                </tr>
                <tr>
                  <td className="py-2">Annual Energy Cost</td>
                  <td className="text-right">{formatCurrency(analysis.traditional.annualEnergyCost)}</td>
                  <td className="text-center"><ArrowRight className="h-4 w-4 text-muted-foreground" /></td>
                  <td className="text-right text-green-600">{formatCurrency(analysis.led.annualEnergyCost)}</td>
                  <td className="text-right text-green-600">{formatCurrency(analysis.savings.annualEnergySavings)}</td>
                </tr>
                <tr>
                  <td className="py-2">Initial Investment</td>
                  <td className="text-right">{formatCurrency(analysis.traditional.initialCost)}</td>
                  <td className="text-center"><ArrowRight className="h-4 w-4 text-muted-foreground" /></td>
                  <td className="text-right">{formatCurrency(analysis.led.initialCost)}</td>
                  <td className="text-right text-red-600">+{formatCurrency(analysis.savings.additionalUpfrontCost)}</td>
                </tr>
                <tr>
                  <td className="py-2">Annual Operating Cost</td>
                  <td className="text-right">{formatCurrency(analysis.traditional.annualTotalCost)}</td>
                  <td className="text-center"><ArrowRight className="h-4 w-4 text-muted-foreground" /></td>
                  <td className="text-right text-green-600">{formatCurrency(analysis.led.annualTotalCost)}</td>
                  <td className="text-right text-green-600">{formatCurrency(analysis.savings.annualTotalSavings)}</td>
                </tr>
                <tr className="font-bold bg-muted/50">
                  <td className="py-2">{config.analysisYears}-Year Total Cost</td>
                  <td className="text-right">{formatCurrency(analysis.traditional.totalCost)}</td>
                  <td className="text-center"><ArrowRight className="h-4 w-4 text-muted-foreground" /></td>
                  <td className="text-right text-green-600">{formatCurrency(analysis.led.totalCost)}</td>
                  <td className="text-right text-green-600">{formatCurrency(analysis.savings.totalSavings)}</td>
                </tr>
                <tr>
                  <td className="py-2">Annual CO2 Emissions</td>
                  <td className="text-right">{formatNumber(analysis.traditional.annualCO2)} kg</td>
                  <td className="text-center"><ArrowRight className="h-4 w-4 text-muted-foreground" /></td>
                  <td className="text-right text-green-600">{formatNumber(analysis.led.annualCO2)} kg</td>
                  <td className="text-right text-green-600">{formatNumber(analysis.savings.co2Reduction)} kg</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <Zap className="h-5 w-5 mb-2 text-blue-500" />
              <div className="font-medium">Break-Even Point</div>
              <div className="text-sm text-muted-foreground">
                LED investment pays for itself in {analysis.savings.paybackYears.toFixed(1)} years through energy and maintenance savings.
              </div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <DollarSign className="h-5 w-5 mb-2 text-green-500" />
              <div className="font-medium">Return on Investment</div>
              <div className="text-sm text-muted-foreground">
                {analysis.savings.roi.toFixed(0)}% ROI over {config.analysisYears} years. For every R1 invested, you get R{(1 + analysis.savings.roi / 100).toFixed(2)} back.
              </div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <Leaf className="h-5 w-5 mb-2 text-green-500" />
              <div className="font-medium">Environmental Impact</div>
              <div className="text-sm text-muted-foreground">
                {formatNumber(analysis.savings.co2Reduction * config.analysisYears)} kg CO2 avoided over {config.analysisYears} years - equivalent to planting {Math.round(analysis.savings.co2Reduction / 21)} trees.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComparisonAnalysis;
