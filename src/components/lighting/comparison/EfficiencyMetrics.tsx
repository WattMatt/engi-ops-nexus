import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Lightbulb, DollarSign, Gauge, Award } from 'lucide-react';
import { ComparisonMetrics } from './comparisonTypes';

interface EfficiencyMetricsProps {
  metrics: ComparisonMetrics[];
}

const RATING_COLORS: Record<ComparisonMetrics['efficiencyRating'], string> = {
  A: 'bg-green-500',
  B: 'bg-green-400',
  C: 'bg-lime-400',
  D: 'bg-yellow-400',
  E: 'bg-orange-400',
  F: 'bg-red-400',
  G: 'bg-red-600',
};

const RATING_DESCRIPTIONS: Record<ComparisonMetrics['efficiencyRating'], string> = {
  A: 'Excellent (≥130 lm/W)',
  B: 'Very Good (≥110 lm/W)',
  C: 'Good (≥90 lm/W)',
  D: 'Average (≥70 lm/W)',
  E: 'Below Average (≥50 lm/W)',
  F: 'Poor (≥30 lm/W)',
  G: 'Very Poor (<30 lm/W)',
};

export const EfficiencyMetrics = ({ metrics }: EfficiencyMetricsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Find best values for highlighting
  const bestEfficacy = Math.max(...metrics.map((m) => m.efficacy));
  const bestCostPerKLumen = Math.min(...metrics.filter((m) => m.costPerKLumen > 0).map((m) => m.costPerKLumen));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          Efficiency Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={metric.fitting.id}
              className="p-4 border rounded-lg space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm font-medium">
                    {metric.fitting.fitting_code}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {metric.fitting.manufacturer}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Badge
                    className={`${RATING_COLORS[metric.efficiencyRating]} text-white font-bold text-lg px-3`}
                  >
                    {metric.efficiencyRating}
                  </Badge>
                </div>
              </div>

              {/* Efficiency Rating Description */}
              <p className="text-xs text-muted-foreground">
                {RATING_DESCRIPTIONS[metric.efficiencyRating]}
              </p>

              {/* Luminous Efficacy */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" />
                    Luminous Efficacy
                  </span>
                  <span className="font-medium">
                    {metric.efficacy > 0 ? `${metric.efficacy.toFixed(1)} lm/W` : '-'}
                    {metric.efficacy === bestEfficacy && metric.efficacy > 0 && (
                      <Award className="h-3 w-3 inline ml-1 text-yellow-500" />
                    )}
                  </span>
                </div>
                <Progress
                  value={Math.min((metric.efficacy / 150) * 100, 100)}
                  className="h-2"
                />
              </div>

              {/* Cost per 1000 Lumens */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Cost per 1000lm
                  </span>
                  <span className="font-medium">
                    {metric.costPerKLumen > 0 ? formatCurrency(metric.costPerKLumen) : '-'}
                    {metric.costPerKLumen === bestCostPerKLumen && metric.costPerKLumen > 0 && (
                      <Award className="h-3 w-3 inline ml-1 text-yellow-500" />
                    )}
                  </span>
                </div>
                <Progress
                  value={metric.costPerKLumen > 0 ? Math.max(100 - (metric.costPerKLumen / 500) * 100, 10) : 0}
                  className="h-2"
                />
              </div>

              {/* Total Unit Cost */}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span>Total Unit Cost</span>
                  <span className="font-semibold">{formatCurrency(metric.totalCost)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-2">Energy Efficiency Rating Scale</p>
          <div className="flex flex-wrap gap-2">
            {(['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const).map((rating) => (
              <Badge key={rating} className={`${RATING_COLORS[rating]} text-white`}>
                {rating}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Based on luminous efficacy (lumens per watt). Higher ratings indicate more efficient fittings.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
