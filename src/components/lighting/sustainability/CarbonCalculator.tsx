import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Leaf, Zap, Factory, TrendingDown } from 'lucide-react';

interface CarbonCalculatorProps {
  totalWatts?: number;
  projectArea?: number;
}

export const CarbonCalculator = ({ totalWatts = 0, projectArea = 0 }: CarbonCalculatorProps) => {
  const [config, setConfig] = useState({
    gridEmissionFactor: 0.9, // kg CO2/kWh (South African grid)
    operatingHoursPerDay: 10,
    operatingDaysPerYear: 260,
    projectLifespanYears: 15,
    electricityRate: 2.5, // R/kWh
  });

  const calculations = useMemo(() => {
    const hoursPerYear = config.operatingHoursPerDay * config.operatingDaysPerYear;
    
    // Annual energy consumption
    const annualKWh = (totalWatts * hoursPerYear) / 1000;
    
    // Carbon emissions
    const annualCO2kg = annualKWh * config.gridEmissionFactor;
    const annualCO2tonnes = annualCO2kg / 1000;
    const lifetimeCO2tonnes = annualCO2tonnes * config.projectLifespanYears;
    
    // Energy costs
    const annualEnergyCost = annualKWh * config.electricityRate;
    const lifetimeEnergyCost = annualEnergyCost * config.projectLifespanYears;
    
    // Equivalent metrics
    const treesEquivalent = Math.round(annualCO2kg / 21); // ~21kg CO2 absorbed per tree/year
    const carsEquivalent = (annualCO2tonnes / 4.6).toFixed(1); // ~4.6 tonnes CO2 per car/year
    const householdsEquivalent = (annualKWh / 3500).toFixed(1); // ~3500 kWh per SA household/year
    
    // Per square meter metrics
    const wattsPerSqm = projectArea > 0 ? totalWatts / projectArea : 0;
    const kWhPerSqmYear = projectArea > 0 ? annualKWh / projectArea : 0;
    const co2PerSqmYear = projectArea > 0 ? annualCO2kg / projectArea : 0;

    return {
      hoursPerYear,
      annualKWh,
      annualCO2kg,
      annualCO2tonnes,
      lifetimeCO2tonnes,
      annualEnergyCost,
      lifetimeEnergyCost,
      treesEquivalent,
      carsEquivalent,
      householdsEquivalent,
      wattsPerSqm,
      kWhPerSqmYear,
      co2PerSqmYear,
    };
  }, [totalWatts, projectArea, config]);

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Factory className="h-4 w-4" />
            Calculator Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Grid Factor (kg CO2/kWh)</Label>
            <Input
              type="number"
              step="0.01"
              value={config.gridEmissionFactor}
              onChange={(e) => setConfig(c => ({ ...c, gridEmissionFactor: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Hours/Day</Label>
            <Input
              type="number"
              value={config.operatingHoursPerDay}
              onChange={(e) => setConfig(c => ({ ...c, operatingHoursPerDay: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Days/Year</Label>
            <Input
              type="number"
              value={config.operatingDaysPerYear}
              onChange={(e) => setConfig(c => ({ ...c, operatingDaysPerYear: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Lifespan (Years)</Label>
            <Input
              type="number"
              value={config.projectLifespanYears}
              onChange={(e) => setConfig(c => ({ ...c, projectLifespanYears: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Electricity Rate (R/kWh)</Label>
            <Input
              type="number"
              step="0.1"
              value={config.electricityRate}
              onChange={(e) => setConfig(c => ({ ...c, electricityRate: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Input Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total Watts</div>
            <div className="text-2xl font-bold">{totalWatts.toLocaleString()} W</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Project Area</div>
            <div className="text-2xl font-bold">{projectArea.toLocaleString()} m²</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">W/m²</div>
            <div className="text-2xl font-bold">{calculations.wattsPerSqm.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Hours/Year</div>
            <div className="text-2xl font-bold">{calculations.hoursPerYear.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Carbon Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Leaf className="h-5 w-5" />
              Carbon Emissions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Annual CO2</div>
                <div className="text-xl font-bold">{calculations.annualCO2tonnes.toFixed(2)} tonnes</div>
                <div className="text-xs text-muted-foreground">{calculations.annualCO2kg.toFixed(0)} kg</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Lifetime CO2</div>
                <div className="text-xl font-bold">{calculations.lifetimeCO2tonnes.toFixed(1)} tonnes</div>
                <div className="text-xs text-muted-foreground">{config.projectLifespanYears} year lifespan</div>
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground mb-2">CO2 per m² per year</div>
              <div className="text-lg font-semibold">{calculations.co2PerSqmYear.toFixed(2)} kg/m²/yr</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <Zap className="h-5 w-5" />
              Energy Consumption
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Annual Energy</div>
                <div className="text-xl font-bold">{calculations.annualKWh.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Annual Cost</div>
                <div className="text-xl font-bold">R {calculations.annualEnergyCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground mb-2">Lifetime Energy Cost</div>
              <div className="text-lg font-semibold">R {calculations.lifetimeEnergyCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Equivalents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Impact Equivalents (Annual)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-4xl">🌳</div>
              <div>
                <div className="text-2xl font-bold">{calculations.treesEquivalent}</div>
                <div className="text-sm text-muted-foreground">Trees needed to offset</div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-4xl">🚗</div>
              <div>
                <div className="text-2xl font-bold">{calculations.carsEquivalent}</div>
                <div className="text-sm text-muted-foreground">Cars equivalent emissions</div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-4xl">🏠</div>
              <div>
                <div className="text-2xl font-bold">{calculations.householdsEquivalent}</div>
                <div className="text-sm text-muted-foreground">Households powered</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* South African Context */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="text-xs">SA Context</Badge>
            <p className="text-sm text-muted-foreground">
              South Africa's grid emission factor (~0.9 kg CO2/kWh) is among the highest globally due to 
              coal-dominant electricity generation. Energy efficiency in lighting significantly contributes 
              to reducing both emissions and load-shedding pressure.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CarbonCalculator;
