/**
 * Daily Demand Curve Chart - Line chart showing 24-hour demand profile
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import { Activity, TrendingUp } from 'lucide-react';
import type { LoadProfileReading } from './useLoadProfile';

interface DailyDemandCurveProps {
  readings: LoadProfileReading[];
}

// Generate sample 24-hour profile if no readings
const generateSampleProfile = () => {
  // Typical commercial building profile
  const baseLoad = 150; // kVA base load
  const peakMultiplier = 2.5;
  
  return Array.from({ length: 24 }, (_, hour) => {
    let factor = 0.3; // Night minimum
    
    if (hour >= 6 && hour < 9) {
      // Morning ramp-up
      factor = 0.3 + ((hour - 6) / 3) * 0.5;
    } else if (hour >= 9 && hour < 12) {
      // Morning peak
      factor = 0.8 + (Math.sin((hour - 9) * Math.PI / 3) * 0.15);
    } else if (hour >= 12 && hour < 14) {
      // Lunch dip
      factor = 0.75;
    } else if (hour >= 14 && hour < 18) {
      // Afternoon peak
      factor = 0.85 + (Math.sin((hour - 14) * Math.PI / 4) * 0.15);
    } else if (hour >= 18 && hour < 21) {
      // Evening ramp-down
      factor = 0.8 - ((hour - 18) / 3) * 0.4;
    } else if (hour >= 21) {
      // Night
      factor = 0.35 - ((hour - 21) / 3) * 0.05;
    }
    
    const demand = baseLoad * peakMultiplier * factor;
    return {
      hour,
      time: `${hour.toString().padStart(2, '0')}:00`,
      demand: Math.round(demand * 10) / 10,
      factor: Math.round(factor * 100) / 100,
    };
  });
};

export function DailyDemandCurve({ readings }: DailyDemandCurveProps) {
  // Group readings by hour and calculate average
  const hourlyData = readings.length > 0
    ? aggregateReadingsByHour(readings)
    : generateSampleProfile();

  const maxDemand = Math.max(...hourlyData.map(d => d.demand));
  const avgDemand = hourlyData.reduce((sum, d) => sum + d.demand, 0) / hourlyData.length;
  const loadFactor = (avgDemand / maxDemand * 100).toFixed(1);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-amber-500/5 to-amber-500/10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-amber-600" />
            Daily Demand Curve
          </CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-red-500" />
              <span>Peak: <span className="font-mono font-bold">{maxDemand.toFixed(1)} kVA</span></span>
            </div>
            <div className="text-muted-foreground">
              LF: <span className="font-mono font-bold">{loadFactor}%</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={hourlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="demandGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={2}
            />
            <YAxis 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
              label={{ value: 'kVA', angle: -90, position: 'insideLeft', fontSize: 12 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-background border rounded-lg shadow-lg p-3">
                    <p className="font-semibold">{data.time}</p>
                    <p className="text-sm">
                      Demand: <span className="font-mono font-bold text-primary">{data.demand} kVA</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Factor: {(data.factor * 100).toFixed(0)}%
                    </p>
                  </div>
                );
              }}
            />
            <ReferenceLine 
              y={avgDemand} 
              stroke="hsl(var(--muted-foreground))" 
              strokeDasharray="5 5"
              label={{ value: 'Avg', position: 'right', fontSize: 10 }}
            />
            <Area
              type="monotone"
              dataKey="demand"
              stroke="none"
              fill="url(#demandGradient)"
            />
            <Line
              type="monotone"
              dataKey="demand"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Time Period Summary */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Off-Peak (22:00-06:00)</p>
            <p className="text-lg font-bold text-green-600">
              {calculatePeriodAverage(hourlyData, 22, 6).toFixed(1)} kVA
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Standard (06:00-09:00, 17:00-22:00)</p>
            <p className="text-lg font-bold text-amber-600">
              {calculatePeriodAverage(hourlyData, 6, 9, 17, 22).toFixed(1)} kVA
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Peak (09:00-17:00)</p>
            <p className="text-lg font-bold text-red-600">
              {calculatePeriodAverage(hourlyData, 9, 17).toFixed(1)} kVA
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Aggregate readings by hour
function aggregateReadingsByHour(readings: LoadProfileReading[]) {
  const hourlyMap = new Map<number, number[]>();
  
  readings.forEach(reading => {
    const hour = reading.reading_hour;
    const existing = hourlyMap.get(hour) || [];
    existing.push(reading.demand_kva);
    hourlyMap.set(hour, existing);
  });

  return Array.from({ length: 24 }, (_, hour) => {
    const demands = hourlyMap.get(hour) || [0];
    const avgDemand = demands.reduce((a, b) => a + b, 0) / demands.length;
    return {
      hour,
      time: `${hour.toString().padStart(2, '0')}:00`,
      demand: Math.round(avgDemand * 10) / 10,
      factor: 0.5,
    };
  });
}

// Calculate average for time periods
function calculatePeriodAverage(
  data: Array<{ hour: number; demand: number }>,
  start1: number,
  end1: number,
  start2?: number,
  end2?: number
): number {
  const filtered = data.filter(d => {
    const inRange1 = start1 < end1 
      ? (d.hour >= start1 && d.hour < end1)
      : (d.hour >= start1 || d.hour < end1);
    
    if (start2 !== undefined && end2 !== undefined) {
      const inRange2 = d.hour >= start2 && d.hour < end2;
      return inRange1 || inRange2;
    }
    return inRange1;
  });

  if (filtered.length === 0) return 0;
  return filtered.reduce((sum, d) => sum + d.demand, 0) / filtered.length;
}
