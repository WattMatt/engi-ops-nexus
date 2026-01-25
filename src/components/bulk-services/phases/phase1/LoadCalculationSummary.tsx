/**
 * Load Calculation Summary
 * Displays unified summary of calculated loads with validation
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, Info, TrendingUp, Zap } from 'lucide-react';

interface LoadCalculationSummaryProps {
  method: string;
  connectedLoad: number;
  maxDemand?: number;
  diversityFactor?: number;
  breakdown?: {
    category: string;
    value: number;
    unit: string;
  }[];
  projectArea?: number;
  typicalRange?: { min: number; max: number };
}

export function LoadCalculationSummary({
  method,
  connectedLoad,
  maxDemand,
  diversityFactor = 0.8,
  breakdown = [],
  projectArea,
  typicalRange,
}: LoadCalculationSummaryProps) {
  const calculatedMaxDemand = maxDemand || connectedLoad * diversityFactor;
  // connectedLoad is in kVA, convert to VA for VA/m² calculation
  const vaPerSqm = projectArea && projectArea > 0 ? (connectedLoad * 1000) / projectArea : 0;
  
  // Validation
  const isWithinRange = typicalRange 
    ? vaPerSqm >= typicalRange.min && vaPerSqm <= typicalRange.max 
    : true;
  
  const isLow = typicalRange && vaPerSqm < typicalRange.min;
  const isHigh = typicalRange && vaPerSqm > typicalRange.max;

  const getMethodLabel = (m: string) => {
    const labels: Record<string, string> = {
      total: 'Direct Entry',
      itemized: 'Itemized Schedule',
      category: 'Category Totals',
      sans204: 'SANS 204 (VA/m²)',
      sans10142: 'SANS 10142-1',
      admd: 'ADMD Residential',
      external: 'External Meters',
    };
    return labels[m] || m;
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Calculation Summary</CardTitle>
          </div>
          <Badge variant="secondary">{getMethodLabel(method)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Values */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-1">Connected Load</p>
            <p className="text-3xl font-bold">{connectedLoad.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">kVA</p>
          </div>
          <div className="p-4 bg-primary/10 rounded-lg text-center border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">Maximum Demand</p>
            <p className="text-3xl font-bold text-primary">{calculatedMaxDemand.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">kVA</p>
          </div>
        </div>

        {/* Diversity Factor */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Diversity Factor Applied</span>
          </div>
          <span className="font-bold">{(diversityFactor * 100).toFixed(0)}%</span>
        </div>

        {/* VA/m² Indicator */}
        {projectArea && projectArea > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Load Density</span>
              <span className="font-medium">{vaPerSqm.toFixed(1)} VA/m²</span>
            </div>
            {typicalRange && (
              <>
                <Progress 
                  value={Math.min(100, (vaPerSqm / typicalRange.max) * 100)} 
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{typicalRange.min} VA/m²</span>
                  <span>Typical Range</span>
                  <span>{typicalRange.max} VA/m²</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Validation Messages */}
        {!isWithinRange && (
          <Alert variant={isHigh ? 'destructive' : 'default'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {isLow && 'Load density is below typical range. Verify all loads are included.'}
              {isHigh && 'Load density exceeds typical range. Consider reviewing calculations.'}
            </AlertDescription>
          </Alert>
        )}

        {isWithinRange && connectedLoad > 0 && (
          <Alert className="border-primary/20 bg-primary/5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              Load calculation is within expected range for this building type.
            </AlertDescription>
          </Alert>
        )}

        {/* Breakdown */}
        {breakdown.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Breakdown</p>
            <div className="space-y-1">
              {breakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <span>{item.category}</span>
                  <span className="font-medium">{item.value.toFixed(1)} {item.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
