import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  Info,
  TrendingUp,
  Grid3X3,
  Target
} from 'lucide-react';

interface PhotometricData {
  candelas: number[];
  verticalAngles: number[];
  horizontalAngles: number[];
  lumens: number;
  watts: number;
}

interface PhotometricReportProps {
  data: PhotometricData;
  fittingName?: string;
}

export const PhotometricReport = ({ data, fittingName }: PhotometricReportProps) => {
  const [selectedView, setSelectedView] = useState('polar');

  // Calculate utilization factor at different room indices
  const utilizationData = useMemo(() => {
    const roomIndices = [0.6, 0.8, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0];
    // Simplified utilization factor calculation
    return roomIndices.map(ri => ({
      roomIndex: ri,
      direct: Math.min(0.95, 0.4 + (ri * 0.15)),
      total: Math.min(0.98, 0.5 + (ri * 0.12))
    }));
  }, []);

  // Calculate spacing to mounting height ratios
  const spacingRatios = useMemo(() => {
    // Simplified calculation based on beam spread
    const avgCandela = data.candelas.length > 0 
      ? data.candelas.reduce((a, b) => a + b, 0) / data.candelas.length 
      : 1000;
    
    // Estimate beam spread from candela distribution
    const halfPeakIndex = data.candelas.findIndex(c => c < avgCandela * 0.5);
    const beamAngle = halfPeakIndex > 0 && data.verticalAngles.length > halfPeakIndex
      ? data.verticalAngles[halfPeakIndex] * 2
      : 60;

    return {
      parallel: Math.min(1.5, (beamAngle / 60) * 1.2),
      perpendicular: Math.min(1.5, (beamAngle / 60) * 1.0),
      recommended: Math.min(1.5, (beamAngle / 60) * 1.1)
    };
  }, [data]);

  // Calculate efficacy
  const efficacy = data.watts > 0 ? (data.lumens / data.watts).toFixed(1) : 'N/A';

  // Render polar diagram (simplified SVG representation)
  const renderPolarDiagram = () => {
    const size = 300;
    const center = size / 2;
    const maxRadius = center - 30;

    // Normalize candela values
    const maxCandela = Math.max(...data.candelas, 1);
    
    // Generate path for candela distribution
    const points = data.verticalAngles.slice(0, Math.min(19, data.verticalAngles.length)).map((angle, i) => {
      const candela = data.candelas[i] || 0;
      const normalizedRadius = (candela / maxCandela) * maxRadius;
      const angleRad = (angle - 90) * (Math.PI / 180);
      return {
        x: center + normalizedRadius * Math.cos(angleRad),
        y: center + normalizedRadius * Math.sin(angleRad)
      };
    });

    // Mirror for symmetric distribution
    const mirroredPoints = [...points].reverse().slice(1).map(p => ({
      x: center - (p.x - center),
      y: p.y
    }));

    const allPoints = [...points, ...mirroredPoints];
    const pathD = allPoints.length > 0 
      ? `M ${allPoints[0].x} ${allPoints[0].y} ` + allPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') + ' Z'
      : '';

    return (
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[300px] mx-auto">
        {/* Grid circles */}
        {[0.25, 0.5, 0.75, 1].map(ratio => (
          <circle
            key={ratio}
            cx={center}
            cy={center}
            r={maxRadius * ratio}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
        ))}
        
        {/* Angle lines */}
        {[0, 30, 60, 90, 120, 150, 180].map(angle => {
          const rad = (angle - 90) * (Math.PI / 180);
          return (
            <line
              key={angle}
              x1={center}
              y1={center}
              x2={center + maxRadius * Math.cos(rad)}
              y2={center + maxRadius * Math.sin(rad)}
              stroke="hsl(var(--border))"
              strokeWidth="1"
            />
          );
        })}

        {/* Candela distribution */}
        <path
          d={pathD}
          fill="hsl(var(--primary) / 0.3)"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
        />

        {/* Labels */}
        <text x={center} y={15} textAnchor="middle" className="text-xs fill-muted-foreground">0°</text>
        <text x={size - 10} y={center + 4} textAnchor="middle" className="text-xs fill-muted-foreground">90°</text>
        <text x={center} y={size - 5} textAnchor="middle" className="text-xs fill-muted-foreground">180°</text>
        <text x={10} y={center + 4} textAnchor="middle" className="text-xs fill-muted-foreground">90°</text>
      </svg>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            Photometric Report
            {fittingName && <Badge variant="outline">{fittingName}</Badge>}
          </CardTitle>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-muted/30">
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold">{data.lumens.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Lumens</div>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold">{data.watts}</div>
              <div className="text-xs text-muted-foreground">Watts</div>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold">{efficacy}</div>
              <div className="text-xs text-muted-foreground">Efficacy (lm/W)</div>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold">{data.candelas.length}</div>
              <div className="text-xs text-muted-foreground">Data Points</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs value={selectedView} onValueChange={setSelectedView}>
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="polar">Polar Diagram</TabsTrigger>
            <TabsTrigger value="utilization">Utilization</TabsTrigger>
            <TabsTrigger value="spacing">Spacing Ratios</TabsTrigger>
          </TabsList>

          <TabsContent value="polar" className="space-y-4">
            <div className="flex justify-center py-4">
              {renderPolarDiagram()}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Polar candela distribution showing light intensity at different angles from nadir
            </p>
          </TabsContent>

          <TabsContent value="utilization" className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Room Index</th>
                    <th className="text-right py-2 px-4">Direct UF</th>
                    <th className="text-right py-2 px-4">Total UF</th>
                  </tr>
                </thead>
                <tbody>
                  {utilizationData.map(row => (
                    <tr key={row.roomIndex} className="border-b border-border/50">
                      <td className="py-2 px-4">{row.roomIndex.toFixed(2)}</td>
                      <td className="text-right py-2 px-4">{row.direct.toFixed(2)}</td>
                      <td className="text-right py-2 px-4">{row.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Utilization factors indicate the proportion of lamp lumens reaching the work plane.
                Room index (K) = (L × W) / (Hm × (L + W)), where Hm is the mounting height above work plane.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="spacing" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-primary/10">
                <CardContent className="py-6 text-center">
                  <div className="text-3xl font-bold">{spacingRatios.parallel.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground mt-1">S/Hm Parallel</div>
                  <div className="text-xs text-muted-foreground">to luminaire axis</div>
                </CardContent>
              </Card>
              <Card className="bg-chart-2/10">
                <CardContent className="py-6 text-center">
                  <div className="text-3xl font-bold">{spacingRatios.perpendicular.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground mt-1">S/Hm Perpendicular</div>
                  <div className="text-xs text-muted-foreground">to luminaire axis</div>
                </CardContent>
              </Card>
              <Card className="bg-green-500/10">
                <CardContent className="py-6 text-center">
                  <div className="text-3xl font-bold">{spacingRatios.recommended.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground mt-1">Recommended</div>
                  <div className="text-xs text-muted-foreground">for uniform lighting</div>
                </CardContent>
              </Card>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <Grid3X3 className="h-4 w-4" />
                Spacing Calculation Example
              </div>
              <p className="text-sm text-muted-foreground">
                For a mounting height of <strong>3m</strong> above the work plane:
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Max spacing parallel:</span>
                  <span className="ml-2 font-medium">{(spacingRatios.parallel * 3).toFixed(1)}m</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Max spacing perpendicular:</span>
                  <span className="ml-2 font-medium">{(spacingRatios.perpendicular * 3).toFixed(1)}m</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                S/Hm (Spacing to Mounting Height ratio) determines the maximum distance between 
                luminaires to achieve uniform illumination. Values closer to 1.0 provide better uniformity.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PhotometricReport;
