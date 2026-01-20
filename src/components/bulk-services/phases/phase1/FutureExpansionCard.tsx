/**
 * Future Expansion Planning Card
 * Allows users to set future growth allowance and planning horizon
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { TrendingUp, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface FutureExpansionCardProps {
  currentDemand: number;
  expansionFactor: number;
  onExpansionFactorChange: (factor: number) => void;
}

const HORIZON_PRESETS = [
  { years: 5, factor: 1.15, label: '5 Years', description: '15% allowance' },
  { years: 10, factor: 1.20, label: '10 Years', description: '20% allowance' },
  { years: 15, factor: 1.30, label: '15 Years', description: '30% allowance' },
  { years: 20, factor: 1.40, label: '20 Years', description: '40% allowance' },
];

export function FutureExpansionCard({ 
  currentDemand, 
  expansionFactor, 
  onExpansionFactorChange 
}: FutureExpansionCardProps) {
  const [customMode, setCustomMode] = useState(false);
  const [selectedHorizon, setSelectedHorizon] = useState<number | null>(null);

  // Check if current factor matches a preset
  useEffect(() => {
    const matchingPreset = HORIZON_PRESETS.find(p => Math.abs(p.factor - expansionFactor) < 0.01);
    if (matchingPreset) {
      setSelectedHorizon(matchingPreset.years);
      setCustomMode(false);
    } else if (expansionFactor !== 1) {
      setCustomMode(true);
    }
  }, []);

  const handlePresetSelect = (years: number) => {
    const preset = HORIZON_PRESETS.find(p => p.years === years);
    if (preset) {
      setSelectedHorizon(years);
      setCustomMode(false);
      onExpansionFactorChange(preset.factor);
    }
  };

  const handleCustomChange = (value: number) => {
    setCustomMode(true);
    setSelectedHorizon(null);
    onExpansionFactorChange(value);
  };

  const expansionPercentage = ((expansionFactor - 1) * 100);
  const futureDemand = currentDemand * expansionFactor;
  const additionalCapacity = futureDemand - currentDemand;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Future Expansion Planning
        </CardTitle>
        <CardDescription>
          Plan for growth to avoid costly future upgrades
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Planning Horizon Presets */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Planning Horizon
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {HORIZON_PRESETS.map((preset) => (
              <button
                key={preset.years}
                onClick={() => handlePresetSelect(preset.years)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  selectedHorizon === preset.years && !customMode
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-medium">{preset.label}</div>
                <div className="text-sm text-muted-foreground">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Factor Slider */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <Label>Expansion Factor</Label>
            <Badge variant={customMode ? 'default' : 'secondary'}>
              {customMode ? 'Custom' : 'Preset'}
            </Badge>
          </div>
          
          <div className="space-y-4">
            <Slider
              value={[expansionFactor]}
              onValueChange={([value]) => handleCustomChange(value)}
              min={1}
              max={2}
              step={0.05}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>No expansion (1.0×)</span>
              <span>Double capacity (2.0×)</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm">Expansion Allowance</span>
            <div className="text-right">
              <span className="text-2xl font-bold">{expansionPercentage.toFixed(0)}%</span>
              <span className="text-muted-foreground ml-1">(×{expansionFactor.toFixed(2)})</span>
            </div>
          </div>
        </div>

        {/* Calculated Impact */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Current Demand</p>
            <p className="text-lg font-bold">{currentDemand.toFixed(1)} kVA</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10">
            <p className="text-xs text-muted-foreground mb-1">Future Demand</p>
            <p className="text-lg font-bold text-primary">{futureDemand.toFixed(1)} kVA</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Additional Capacity</p>
            <p className="text-lg font-bold">+{additionalCapacity.toFixed(1)} kVA</p>
          </div>
        </div>

        {/* Guidance */}
        <div className={`flex items-start gap-2 p-3 rounded-lg ${
          expansionPercentage < 15 
            ? 'bg-amber-50 dark:bg-amber-950/30' 
            : 'bg-green-50 dark:bg-green-950/30'
        }`}>
          {expansionPercentage < 15 ? (
            <>
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  Consider higher expansion allowance
                </p>
                <p className="text-amber-600 dark:text-amber-500">
                  Low expansion allowance may require costly future upgrades. 
                  Consider 20%+ for commercial buildings.
                </p>
              </div>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-700 dark:text-green-400">
                  Good expansion allowance
                </p>
                <p className="text-green-600 dark:text-green-500">
                  This provides adequate capacity for future growth.
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
