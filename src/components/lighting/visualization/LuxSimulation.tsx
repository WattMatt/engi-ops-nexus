import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Calculator, 
  Download, 
  Grid3X3, 
  Plus, 
  Trash2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FittingPlacement {
  id: string;
  x: number;
  y: number;
  lumens: number;
  beamAngle: number;
  mountingHeight: number;
}

interface LuxSimulationProps {
  projectId?: string | null;
}

// Lux standards for different space types
const luxStandards: Record<string, { min: number; recommended: number; max: number }> = {
  office: { min: 300, recommended: 500, max: 750 },
  retail: { min: 300, recommended: 500, max: 1000 },
  warehouse: { min: 100, recommended: 200, max: 300 },
  corridor: { min: 50, recommended: 100, max: 150 },
  workshop: { min: 300, recommended: 500, max: 750 },
  classroom: { min: 300, recommended: 500, max: 750 },
};

export const LuxSimulation = ({ projectId }: LuxSimulationProps) => {
  // Room dimensions
  const [roomWidth, setRoomWidth] = useState(10);
  const [roomLength, setRoomLength] = useState(12);
  const [workPlaneHeight, setWorkPlaneHeight] = useState(0.8);
  const [spaceType, setSpaceType] = useState<string>('office');

  // Fitting placements
  const [placements, setPlacements] = useState<FittingPlacement[]>([]);
  const [selectedFitting, setSelectedFitting] = useState<string | null>(null);

  // Grid resolution
  const gridResolution = 20; // cells per dimension

  // Calculate lux levels at each grid point
  const luxGrid = useMemo(() => {
    const grid: number[][] = [];
    const cellWidth = roomWidth / gridResolution;
    const cellLength = roomLength / gridResolution;

    for (let i = 0; i < gridResolution; i++) {
      grid[i] = [];
      for (let j = 0; j < gridResolution; j++) {
        const x = (i + 0.5) * cellWidth;
        const y = (j + 0.5) * cellLength;
        
        let totalLux = 0;

        // Calculate contribution from each fitting
        placements.forEach(fitting => {
          const dx = x - (fitting.x * roomWidth / 100);
          const dy = y - (fitting.y * roomLength / 100);
          const distance2D = Math.sqrt(dx * dx + dy * dy);
          const height = fitting.mountingHeight - workPlaneHeight;
          const distance3D = Math.sqrt(distance2D * distance2D + height * height);

          // Simple inverse square law with beam angle consideration
          const halfAngleRad = (fitting.beamAngle / 2) * (Math.PI / 180);
          const maxSpread = height * Math.tan(halfAngleRad);
          
          if (distance2D <= maxSpread * 1.5) {
            // Utilization factor (simplified)
            const utilizationFactor = Math.max(0, 1 - (distance2D / (maxSpread * 1.5)));
            const maintenanceFactor = 0.8; // Typical maintenance factor
            
            // Lux = (lumens × UF × MF) / Area
            const effectiveArea = Math.PI * maxSpread * maxSpread;
            const contribution = (fitting.lumens * utilizationFactor * maintenanceFactor) / effectiveArea;
            
            totalLux += contribution;
          }
        });

        grid[i][j] = Math.round(totalLux);
      }
    }

    return grid;
  }, [placements, roomWidth, roomLength, workPlaneHeight, gridResolution]);

  // Calculate statistics
  const stats = useMemo(() => {
    const allValues = luxGrid.flat();
    const avg = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const uniformity = allValues.length > 0 ? min / avg : 0;

    return { avg: Math.round(avg), min, max, uniformity: uniformity.toFixed(2) };
  }, [luxGrid]);

  // Get color for lux value
  const getLuxColor = useCallback((lux: number): string => {
    const standard = luxStandards[spaceType];
    if (!standard) return 'hsl(var(--muted))';

    if (lux < standard.min * 0.5) {
      return 'hsl(0, 70%, 50%)'; // Red - severely under-lit
    } else if (lux < standard.min) {
      return 'hsl(40, 70%, 50%)'; // Yellow/Orange - under-lit
    } else if (lux <= standard.max) {
      return 'hsl(120, 70%, 40%)'; // Green - adequate
    } else if (lux <= standard.max * 1.5) {
      return 'hsl(60, 70%, 50%)'; // Yellow - slightly over-lit
    } else {
      return 'hsl(0, 70%, 60%)'; // Red - over-lit
    }
  }, [spaceType]);

  // Add a fitting
  const handleAddFitting = useCallback(() => {
    const newFitting: FittingPlacement = {
      id: `fitting-${Date.now()}`,
      x: 50,
      y: 50,
      lumens: 2000,
      beamAngle: 90,
      mountingHeight: 3
    };
    setPlacements(prev => [...prev, newFitting]);
    setSelectedFitting(newFitting.id);
  }, []);

  // Remove selected fitting
  const handleRemoveFitting = useCallback(() => {
    if (!selectedFitting) return;
    setPlacements(prev => prev.filter(p => p.id !== selectedFitting));
    setSelectedFitting(null);
  }, [selectedFitting]);

  // Handle grid click to place fitting
  const handleGridClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedFitting) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setPlacements(prev => prev.map(p => 
      p.id === selectedFitting ? { ...p, x, y } : p
    ));
  }, [selectedFitting]);

  // Update selected fitting
  const updateSelectedFitting = useCallback((field: keyof FittingPlacement, value: number) => {
    if (!selectedFitting) return;
    setPlacements(prev => prev.map(p =>
      p.id === selectedFitting ? { ...p, [field]: value } : p
    ));
  }, [selectedFitting]);

  const selectedFittingData = placements.find(p => p.id === selectedFitting);
  const standard = luxStandards[spaceType];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Lux Level Simulation
          </CardTitle>
          <Badge variant="outline">
            {placements.length} fittings
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Room Setup */}
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Room Width (m)</Label>
            <Input
              type="number"
              value={roomWidth}
              onChange={(e) => setRoomWidth(Number(e.target.value))}
              min={1}
              max={100}
            />
          </div>
          <div className="space-y-2">
            <Label>Room Length (m)</Label>
            <Input
              type="number"
              value={roomLength}
              onChange={(e) => setRoomLength(Number(e.target.value))}
              min={1}
              max={100}
            />
          </div>
          <div className="space-y-2">
            <Label>Work Plane Height (m)</Label>
            <Input
              type="number"
              value={workPlaneHeight}
              onChange={(e) => setWorkPlaneHeight(Number(e.target.value))}
              min={0}
              max={2}
              step={0.1}
            />
          </div>
          <div className="space-y-2">
            <Label>Space Type</Label>
            <Select value={spaceType} onValueChange={setSpaceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="office">Office</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="warehouse">Warehouse</SelectItem>
                <SelectItem value="corridor">Corridor</SelectItem>
                <SelectItem value="workshop">Workshop</SelectItem>
                <SelectItem value="classroom">Classroom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <Button onClick={handleAddFitting} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Fitting
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleRemoveFitting}
            disabled={!selectedFitting}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Remove
          </Button>
        </div>

        <div className="grid grid-cols-[1fr_300px] gap-4">
          {/* Lux Heat Map */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Lux Heat Map (Click to position selected fitting)</Label>
            <div 
              className="relative bg-muted rounded-lg overflow-hidden border cursor-crosshair"
              style={{ paddingBottom: `${(roomLength / roomWidth) * 100}%` }}
              onClick={handleGridClick}
            >
              {/* Heat map grid */}
              <div 
                className="absolute inset-0 grid"
                style={{ 
                  gridTemplateColumns: `repeat(${gridResolution}, 1fr)`,
                  gridTemplateRows: `repeat(${gridResolution}, 1fr)`
                }}
              >
                {luxGrid.map((row, i) =>
                  row.map((lux, j) => (
                    <div
                      key={`${i}-${j}`}
                      className="transition-colors"
                      style={{ backgroundColor: getLuxColor(lux) }}
                      title={`${lux} lux`}
                    />
                  ))
                )}
              </div>

              {/* Fitting markers */}
              {placements.map(fitting => (
                <div
                  key={fitting.id}
                  className={`absolute w-4 h-4 rounded-full border-2 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 ${
                    fitting.id === selectedFitting 
                      ? 'bg-primary border-primary-foreground ring-2 ring-primary' 
                      : 'bg-background border-primary'
                  }`}
                  style={{ left: `${fitting.x}%`, top: `${fitting.y}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFitting(fitting.id);
                  }}
                  title={`${fitting.lumens} lm`}
                />
              ))}

              {/* Empty state */}
              {placements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Grid3X3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Add fittings to see lux simulation</p>
                  </div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(0, 70%, 50%)' }} />
                  Under-lit
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(120, 70%, 40%)' }} />
                  Adequate
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(60, 70%, 50%)' }} />
                  Over-lit
                </span>
              </div>
              <span>Standard: {standard.min}-{standard.max} lux</span>
            </div>
          </div>

          {/* Fitting Controls & Stats */}
          <div className="space-y-4">
            {/* Statistics */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Lighting Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Average Lux</span>
                  <Badge variant={stats.avg >= standard.min && stats.avg <= standard.max ? 'default' : 'destructive'}>
                    {stats.avg} lux
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Min / Max</span>
                  <span className="text-sm">{stats.min} / {stats.max} lux</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Uniformity</span>
                  <Badge variant={parseFloat(stats.uniformity) >= 0.6 ? 'default' : 'secondary'}>
                    {stats.uniformity}
                  </Badge>
                </div>
                <div className="pt-2 border-t">
                  {stats.avg >= standard.min && stats.avg <= standard.max ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Meets {spaceType} standard</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">Does not meet standard</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Selected Fitting Controls */}
            {selectedFittingData && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Selected Fitting</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Lumens</Label>
                      <span className="text-sm text-muted-foreground">{selectedFittingData.lumens} lm</span>
                    </div>
                    <Slider
                      value={[selectedFittingData.lumens]}
                      onValueChange={([v]) => updateSelectedFitting('lumens', v)}
                      min={100}
                      max={10000}
                      step={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Beam Angle</Label>
                      <span className="text-sm text-muted-foreground">{selectedFittingData.beamAngle}°</span>
                    </div>
                    <Slider
                      value={[selectedFittingData.beamAngle]}
                      onValueChange={([v]) => updateSelectedFitting('beamAngle', v)}
                      min={15}
                      max={120}
                      step={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Mounting Height</Label>
                      <span className="text-sm text-muted-foreground">{selectedFittingData.mountingHeight}m</span>
                    </div>
                    <Slider
                      value={[selectedFittingData.mountingHeight]}
                      onValueChange={([v]) => updateSelectedFitting('mountingHeight', v)}
                      min={2}
                      max={10}
                      step={0.5}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Export */}
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export Lux Report
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LuxSimulation;
