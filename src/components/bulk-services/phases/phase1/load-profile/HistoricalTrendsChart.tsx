/**
 * Historical Trends Chart - Shows load trends over time
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import type { LoadProfileReading } from './useLoadProfile';
import { format, subDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

interface HistoricalTrendsChartProps {
  readings: LoadProfileReading[];
}

// Generate sample historical data if no readings
const generateSampleHistoricalData = () => {
  const today = new Date();
  const data = [];
  
  for (let i = 30; i >= 0; i--) {
    const date = subDays(today, i);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Base values with weekend reduction
    const basePeak = isWeekend ? 280 : 380;
    const baseAvg = isWeekend ? 180 : 250;
    
    // Add some variation
    const variation = (Math.random() - 0.5) * 40;
    
    data.push({
      date: format(date, 'yyyy-MM-dd'),
      displayDate: format(date, 'MMM dd'),
      peakDemand: Math.round(basePeak + variation),
      avgDemand: Math.round(baseAvg + variation * 0.6),
      energy: Math.round((baseAvg + variation * 0.6) * 24 * (0.9 + Math.random() * 0.2)),
      isWeekend,
    });
  }
  
  return data;
};

// Generate monthly summary
const generateMonthlySummary = (dailyData: any[]) => {
  const monthlyMap = new Map<string, { peak: number; avg: number; energy: number; days: number }>();
  
  dailyData.forEach(day => {
    const monthKey = day.date.substring(0, 7); // YYYY-MM
    const existing = monthlyMap.get(monthKey) || { peak: 0, avg: 0, energy: 0, days: 0 };
    
    monthlyMap.set(monthKey, {
      peak: Math.max(existing.peak, day.peakDemand),
      avg: existing.avg + day.avgDemand,
      energy: existing.energy + day.energy,
      days: existing.days + 1,
    });
  });

  return Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    displayMonth: format(parseISO(`${month}-01`), 'MMM yyyy'),
    peakDemand: data.peak,
    avgDemand: Math.round(data.avg / data.days),
    totalEnergy: data.energy,
  }));
};

export function HistoricalTrendsChart({ readings }: HistoricalTrendsChartProps) {
  // Transform readings or use sample data
  const dailyData = readings.length > 0 
    ? aggregateReadingsByDay(readings) 
    : generateSampleHistoricalData();

  const monthlySummary = generateMonthlySummary(dailyData);

  const totalEnergy = dailyData.reduce((sum, d) => sum + (d.energy || 0), 0);
  const peakOfPeaks = Math.max(...dailyData.map(d => d.peakDemand));
  const avgOfAvg = dailyData.reduce((sum, d) => sum + d.avgDemand, 0) / dailyData.length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-green-500/5 to-green-500/10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Historical Trends
          </CardTitle>
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Period Peak:</span>
              <span className="ml-2 font-mono font-bold">{peakOfPeaks} kVA</span>
            </div>
            <div>
              <span className="text-muted-foreground">Avg Demand:</span>
              <span className="ml-2 font-mono font-bold">{avgOfAvg.toFixed(0)} kVA</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Energy:</span>
              <span className="ml-2 font-mono font-bold">{(totalEnergy / 1000).toFixed(1)} MWh</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="daily">
          <TabsList className="mb-4">
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Daily
            </TabsTrigger>
            <TabsTrigger value="monthly" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Monthly
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={dailyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="peakGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="avgGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  interval={4}
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  label={{ value: 'kVA', angle: -90, position: 'insideLeft', fontSize: 12 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded-lg shadow-lg p-3">
                        <p className="font-semibold">{data.displayDate}</p>
                        <p className="text-sm">
                          Peak: <span className="font-mono font-bold text-red-500">{data.peakDemand} kVA</span>
                        </p>
                        <p className="text-sm">
                          Avg: <span className="font-mono font-bold text-primary">{data.avgDemand} kVA</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Energy: {data.energy} kWh
                        </p>
                        {data.isWeekend && (
                          <p className="text-xs text-muted-foreground mt-1">Weekend</p>
                        )}
                      </div>
                    );
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="peakDemand"
                  name="Peak Demand"
                  stroke="hsl(var(--chart-1))"
                  fill="url(#peakGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="avgDemand"
                  name="Avg Demand"
                  stroke="hsl(var(--chart-2))"
                  fill="url(#avgGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="monthly">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlySummary} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="displayMonth" 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  label={{ value: 'kVA', angle: -90, position: 'insideLeft', fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  label={{ value: 'kWh', angle: 90, position: 'insideRight', fontSize: 12 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded-lg shadow-lg p-3">
                        <p className="font-semibold">{data.displayMonth}</p>
                        <p className="text-sm">
                          Peak: <span className="font-mono font-bold">{data.peakDemand} kVA</span>
                        </p>
                        <p className="text-sm">
                          Avg: <span className="font-mono font-bold">{data.avgDemand} kVA</span>
                        </p>
                        <p className="text-sm">
                          Total Energy: <span className="font-mono font-bold">{(data.totalEnergy / 1000).toFixed(1)} MWh</span>
                        </p>
                      </div>
                    );
                  }}
                />
                <Legend />
                <Bar 
                  yAxisId="left"
                  dataKey="peakDemand" 
                  name="Peak Demand" 
                  fill="hsl(var(--chart-1))"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  yAxisId="left"
                  dataKey="avgDemand" 
                  name="Avg Demand" 
                  fill="hsl(var(--chart-2))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>

        {/* Sample data notice */}
        {readings.length === 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg border text-center">
            <p className="text-sm text-muted-foreground">
              Showing sample data. Sync with wm-solar to see actual historical readings.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Aggregate readings by day
function aggregateReadingsByDay(readings: LoadProfileReading[]) {
  const dayMap = new Map<string, {
    demands: number[];
    energies: number[];
  }>();
  
  readings.forEach(reading => {
    const date = reading.reading_date;
    const existing = dayMap.get(date) || { demands: [], energies: [] };
    existing.demands.push(reading.demand_kva);
    existing.energies.push(reading.energy_kwh);
    dayMap.set(date, existing);
  });

  return Array.from(dayMap.entries())
    .map(([date, data]) => {
      const parsedDate = parseISO(date);
      return {
        date,
        displayDate: format(parsedDate, 'MMM dd'),
        peakDemand: Math.max(...data.demands),
        avgDemand: Math.round(data.demands.reduce((a, b) => a + b, 0) / data.demands.length),
        energy: Math.round(data.energies.reduce((a, b) => a + b, 0)),
        isWeekend: parsedDate.getDay() === 0 || parsedDate.getDay() === 6,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
