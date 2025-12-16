import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Leaf, 
  TrendingDown, 
  Target, 
  Award,
  Zap,
  Factory,
  TreePine,
  Car,
  Home
} from 'lucide-react';

interface SustainabilityDashboardProps {
  projectData?: {
    totalWatts: number;
    projectArea: number;
    fittingCount: number;
    ledPercentage: number;
  };
}

export const SustainabilityDashboard = ({ projectData }: SustainabilityDashboardProps) => {
  const data = projectData || {
    totalWatts: 15000,
    projectArea: 1200,
    fittingCount: 150,
    ledPercentage: 95,
  };

  const [config] = useState({
    gridEmissionFactor: 0.9,
    electricityRate: 2.5,
    baselineWattsPerSqm: 18, // Traditional lighting baseline
    operatingHoursPerYear: 2600,
    projectLifespanYears: 15,
  });

  const metrics = useMemo(() => {
    // Current lighting metrics
    const wattsPerSqm = data.projectArea > 0 ? data.totalWatts / data.projectArea : 0;
    const annualKWh = (data.totalWatts * config.operatingHoursPerYear) / 1000;
    const annualCO2kg = annualKWh * config.gridEmissionFactor;
    
    // Baseline (traditional lighting) metrics
    const baselineWatts = data.projectArea * config.baselineWattsPerSqm;
    const baselineAnnualKWh = (baselineWatts * config.operatingHoursPerYear) / 1000;
    const baselineCO2kg = baselineAnnualKWh * config.gridEmissionFactor;
    
    // Savings
    const energySavingsKWh = baselineAnnualKWh - annualKWh;
    const energySavingsPercent = baselineAnnualKWh > 0 ? (energySavingsKWh / baselineAnnualKWh) * 100 : 0;
    const co2SavingsKg = baselineCO2kg - annualCO2kg;
    const costSavings = energySavingsKWh * config.electricityRate;
    const lifetimeSavings = costSavings * config.projectLifespanYears;
    
    // Equivalents
    const treesPlanted = Math.round(co2SavingsKg / 21);
    const carsOffRoad = (co2SavingsKg / 1000 / 4.6).toFixed(1);
    const householdsPowered = (energySavingsKWh / 3500).toFixed(1);
    
    // Green building targets
    const sans10400Target = 12; // W/m² for offices
    const targetCompliance = wattsPerSqm <= sans10400Target;
    const compliancePercent = Math.min(100, (sans10400Target / wattsPerSqm) * 100);

    return {
      wattsPerSqm,
      annualKWh,
      annualCO2kg,
      baselineWatts,
      baselineAnnualKWh,
      energySavingsKWh,
      energySavingsPercent,
      co2SavingsKg,
      costSavings,
      lifetimeSavings,
      treesPlanted,
      carsOffRoad,
      householdsPowered,
      targetCompliance,
      compliancePercent,
      sans10400Target,
    };
  }, [data, config]);

  const getEfficiencyRating = (percent: number) => {
    if (percent >= 50) return { rating: 'A', color: 'bg-green-500' };
    if (percent >= 40) return { rating: 'B', color: 'bg-lime-500' };
    if (percent >= 30) return { rating: 'C', color: 'bg-yellow-500' };
    if (percent >= 20) return { rating: 'D', color: 'bg-orange-500' };
    return { rating: 'E', color: 'bg-red-500' };
  };

  const efficiencyRating = getEfficiencyRating(metrics.energySavingsPercent);

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <Leaf className="h-4 w-4" />
              <span className="text-xs font-medium">CO2 Saved</span>
            </div>
            <div className="text-2xl font-bold">{(metrics.co2SavingsKg / 1000).toFixed(1)} t/yr</div>
            <div className="text-xs text-muted-foreground">vs traditional lighting</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Zap className="h-4 w-4" />
              <span className="text-xs font-medium">Energy Saved</span>
            </div>
            <div className="text-2xl font-bold">{metrics.energySavingsPercent.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">{metrics.energySavingsKWh.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh/yr</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-yellow-600 mb-2">
              <TrendingDown className="h-4 w-4" />
              <span className="text-xs font-medium">Cost Saved</span>
            </div>
            <div className="text-2xl font-bold">R {(metrics.costSavings / 1000).toFixed(0)}k/yr</div>
            <div className="text-xs text-muted-foreground">R {(metrics.lifetimeSavings / 1000).toFixed(0)}k lifetime</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-purple-600 mb-2">
              <Award className="h-4 w-4" />
              <span className="text-xs font-medium">Efficiency Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`text-2xl font-bold px-3 py-1 rounded ${efficiencyRating.color} text-white`}>
                {efficiencyRating.rating}
              </div>
              <div className="text-xs text-muted-foreground">
                {metrics.wattsPerSqm.toFixed(1)} W/m²
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="equivalents">Impact Equivalents</TabsTrigger>
          <TabsTrigger value="targets">Green Targets</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Energy Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Energy Comparison</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Baseline (Traditional)</span>
                    <span className="font-medium">{metrics.baselineAnnualKWh.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh/yr</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current (LED)</span>
                    <span className="font-medium text-green-600">{metrics.annualKWh.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh/yr</span>
                  </div>
                  <Progress value={100 - metrics.energySavingsPercent} className="h-2 [&>div]:bg-green-500" />
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Annual Savings</span>
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                      {metrics.energySavingsPercent.toFixed(0)}% reduction
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Carbon Footprint */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Carbon Footprint</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <Factory className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-lg font-bold">{(metrics.annualCO2kg / 1000).toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">tonnes CO2/year</div>
                  </div>
                  <div className="p-4 bg-green-500/10 rounded-lg text-center">
                    <Leaf className="h-6 w-6 mx-auto mb-2 text-green-600" />
                    <div className="text-lg font-bold text-green-600">{(metrics.co2SavingsKg / 1000).toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">tonnes saved/year</div>
                  </div>
                </div>
                <div className="pt-4 border-t text-center">
                  <div className="text-sm text-muted-foreground">Grid Emission Factor</div>
                  <div className="text-lg font-medium">{config.gridEmissionFactor} kg CO2/kWh</div>
                  <Badge variant="secondary" className="mt-1">South African Grid</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* LED Adoption */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">LED Adoption Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={data.ledPercentage} className="flex-1 h-4 [&>div]:bg-green-500" />
                <span className="text-2xl font-bold text-green-600">{data.ledPercentage}%</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {data.fittingCount} total fittings • LED technology provides 50-80% energy savings over traditional lighting
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equivalents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="text-center">
              <CardContent className="pt-6">
                <TreePine className="h-16 w-16 mx-auto mb-4 text-green-600" />
                <div className="text-4xl font-bold text-green-600">{metrics.treesPlanted}</div>
                <div className="text-lg font-medium">Trees Planted</div>
                <div className="text-sm text-muted-foreground mt-2">
                  Equivalent carbon offset from {metrics.treesPlanted} trees absorbing CO2 for one year
                </div>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <Car className="h-16 w-16 mx-auto mb-4 text-blue-600" />
                <div className="text-4xl font-bold text-blue-600">{metrics.carsOffRoad}</div>
                <div className="text-lg font-medium">Cars Off Road</div>
                <div className="text-sm text-muted-foreground mt-2">
                  Equivalent to removing {metrics.carsOffRoad} average cars from the road for one year
                </div>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <Home className="h-16 w-16 mx-auto mb-4 text-yellow-600" />
                <div className="text-4xl font-bold text-yellow-600">{metrics.householdsPowered}</div>
                <div className="text-lg font-medium">Households Powered</div>
                <div className="text-sm text-muted-foreground mt-2">
                  Energy saved could power {metrics.householdsPowered} South African households for a year
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">
                <strong>How these are calculated:</strong> Trees absorb ~21kg CO2/year. Average car emits ~4.6 tonnes CO2/year. 
                Average SA household uses ~3,500 kWh/year. These equivalents help visualize the environmental impact of 
                energy-efficient lighting choices.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="targets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  SANS 10400-XA Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Target: {metrics.sans10400Target} W/m²</span>
                  <Badge variant={metrics.targetCompliance ? 'default' : 'destructive'}>
                    {metrics.targetCompliance ? 'COMPLIANT' : 'NON-COMPLIANT'}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current: {metrics.wattsPerSqm.toFixed(1)} W/m²</span>
                    <span>{metrics.compliancePercent.toFixed(0)}%</span>
                  </div>
                  <Progress 
                    value={Math.min(100, metrics.compliancePercent)} 
                    className={`h-2 ${metrics.targetCompliance ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Energy Efficiency Scale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-1">
                  {['A', 'B', 'C', 'D', 'E'].map((rating, idx) => {
                    const colors = ['bg-green-500', 'bg-lime-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'];
                    const isActive = rating === efficiencyRating.rating;
                    return (
                      <div 
                        key={rating}
                        className={`flex items-center gap-2 p-2 rounded ${isActive ? colors[idx] + ' text-white' : 'bg-muted/30'}`}
                      >
                        <span className="font-bold w-6">{rating}</span>
                        <div className={`flex-1 h-2 rounded ${colors[idx]} ${isActive ? '' : 'opacity-30'}`} 
                          style={{ width: `${100 - idx * 20}%` }} 
                        />
                        {isActive && <span className="text-xs">Current</span>}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SustainabilityDashboard;
