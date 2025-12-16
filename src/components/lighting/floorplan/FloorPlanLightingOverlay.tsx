import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Lightbulb, 
  Plus, 
  Trash2, 
  RotateCw, 
  Save,
  Move,
  MousePointer,
  Undo,
  Grid3X3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LightingFitting {
  id: string;
  fitting_code: string;
  fitting_name: string;
  wattage: number | null;
  fitting_type: string | null;
}

interface PlacedFitting {
  id: string;
  fittingId: string;
  x: number;
  y: number;
  rotation: number;
  zoneId: string | null;
  tenantId: string | null;
  fitting?: LightingFitting;
}

interface FloorPlanLightingOverlayProps {
  floorPlanId: string;
  width: number;
  height: number;
  onPlacementsChange?: (placements: PlacedFitting[]) => void;
}

type ToolMode = 'select' | 'place' | 'move' | 'delete';

export const FloorPlanLightingOverlay = ({
  floorPlanId,
  width,
  height,
  onPlacementsChange
}: FloorPlanLightingOverlayProps) => {
  const [fittings, setFittings] = useState<LightingFitting[]>([]);
  const [placements, setPlacements] = useState<PlacedFitting[]>([]);
  const [selectedFitting, setSelectedFitting] = useState<string | null>(null);
  const [selectedPlacement, setSelectedPlacement] = useState<string | null>(null);
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  // Load fittings library
  useEffect(() => {
    const loadFittings = async () => {
      const { data, error } = await supabase
        .from('lighting_fittings')
        .select('id, fitting_code, model_name, wattage, fitting_type')
        .order('fitting_code');

      if (error) {
        console.error('Error loading fittings:', error);
        return;
      }

      const mappedData = (data || []).map(f => ({
        id: f.id,
        fitting_code: f.fitting_code,
        fitting_name: f.model_name,
        wattage: f.wattage,
        fitting_type: f.fitting_type
      }));
      setFittings(mappedData);
    };

    loadFittings();
  }, []);

  // Load existing placements
  useEffect(() => {
    const loadPlacements = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('floor_plan_lighting')
        .select(`
          id,
          fitting_id,
          x_position,
          y_position,
          rotation,
          zone_id,
          tenant_id,
          lighting_fittings (
            id,
            fitting_code,
            model_name,
            wattage,
            fitting_type
          )
        `)
        .eq('floor_plan_id', floorPlanId);

      if (error) {
        console.error('Error loading placements:', error);
        setIsLoading(false);
        return;
      }

      const mappedPlacements: PlacedFitting[] = (data || []).map(p => {
        const lf = p.lighting_fittings as any;
        return {
          id: p.id,
          fittingId: p.fitting_id,
          x: Number(p.x_position),
          y: Number(p.y_position),
          rotation: Number(p.rotation) || 0,
          zoneId: p.zone_id,
          tenantId: p.tenant_id,
          fitting: lf ? {
            id: lf.id,
            fitting_code: lf.fitting_code,
            fitting_name: lf.model_name,
            wattage: lf.wattage,
            fitting_type: lf.fitting_type
          } : undefined
        };
      });

      setPlacements(mappedPlacements);
      setIsLoading(false);
    };

    if (floorPlanId) {
      loadPlacements();
    }
  }, [floorPlanId]);

  // Notify parent of changes
  useEffect(() => {
    onPlacementsChange?.(placements);
  }, [placements, onPlacementsChange]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (toolMode !== 'place' || !selectedFitting) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const fitting = fittings.find(f => f.id === selectedFitting);
    const newPlacement: PlacedFitting = {
      id: `temp-${Date.now()}`,
      fittingId: selectedFitting,
      x,
      y,
      rotation: 0,
      zoneId: null,
      tenantId: null,
      fitting
    };

    setPlacements(prev => [...prev, newPlacement]);
    setIsDirty(true);
  }, [toolMode, selectedFitting, fittings]);

  const handlePlacementClick = useCallback((placementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (toolMode === 'delete') {
      setPlacements(prev => prev.filter(p => p.id !== placementId));
      setIsDirty(true);
      return;
    }

    setSelectedPlacement(placementId);
  }, [toolMode]);

  const handleRotatePlacement = useCallback(() => {
    if (!selectedPlacement) return;
    
    setPlacements(prev => prev.map(p => 
      p.id === selectedPlacement 
        ? { ...p, rotation: (p.rotation + 45) % 360 }
        : p
    ));
    setIsDirty(true);
  }, [selectedPlacement]);

  const handleSave = async () => {
    try {
      // Delete all existing placements for this floor plan
      await supabase
        .from('floor_plan_lighting')
        .delete()
        .eq('floor_plan_id', floorPlanId);

      // Insert new placements
      const insertData = placements.map(p => ({
        floor_plan_id: floorPlanId,
        fitting_id: p.fittingId,
        x_position: p.x,
        y_position: p.y,
        rotation: p.rotation,
        zone_id: p.zoneId,
        tenant_id: p.tenantId
      }));

      if (insertData.length > 0) {
        const { error } = await supabase
          .from('floor_plan_lighting')
          .insert(insertData);

        if (error) throw error;
      }

      setIsDirty(false);
      toast.success('Lighting layout saved');
    } catch (error) {
      console.error('Error saving placements:', error);
      toast.error('Failed to save lighting layout');
    }
  };

  const getFittingSymbol = (fittingType: string | null): string => {
    switch (fittingType?.toLowerCase()) {
      case 'downlight': return '○';
      case 'panel': return '□';
      case 'linear': return '═';
      case 'track': return '─';
      case 'emergency': return '✚';
      case 'spotlight': return '◉';
      default: return '●';
    }
  };

  const getFittingColor = (fittingType: string | null): string => {
    switch (fittingType?.toLowerCase()) {
      case 'downlight': return 'hsl(var(--primary))';
      case 'panel': return 'hsl(var(--chart-1))';
      case 'linear': return 'hsl(var(--chart-2))';
      case 'track': return 'hsl(var(--chart-3))';
      case 'emergency': return 'hsl(var(--destructive))';
      case 'spotlight': return 'hsl(var(--chart-4))';
      default: return 'hsl(var(--muted-foreground))';
    }
  };

  // Calculate totals
  const totalFittings = placements.length;
  const totalWattage = placements.reduce((sum, p) => sum + (p.fitting?.wattage || 0), 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={toolMode === 'select' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setToolMode('select')}
              >
                <MousePointer className="h-4 w-4 mr-1" />
                Select
              </Button>
              <Button
                variant={toolMode === 'place' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setToolMode('place')}
              >
                <Plus className="h-4 w-4 mr-1" />
                Place
              </Button>
              <Button
                variant={toolMode === 'move' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setToolMode('move')}
              >
                <Move className="h-4 w-4 mr-1" />
                Move
              </Button>
              <Button
                variant={toolMode === 'delete' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setToolMode('delete')}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {toolMode === 'place' && (
                <Select value={selectedFitting || ''} onValueChange={setSelectedFitting}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select fitting" />
                  </SelectTrigger>
                  <SelectContent>
                    {fittings.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.fitting_code} - {f.fitting_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {selectedPlacement && (
                <Button variant="outline" size="sm" onClick={handleRotatePlacement}>
                  <RotateCw className="h-4 w-4 mr-1" />
                  Rotate
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGrid(!showGrid)}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPlacements([])}
              >
                <Undo className="h-4 w-4 mr-1" />
                Clear
              </Button>

              <Button
                onClick={handleSave}
                disabled={!isDirty}
                size="sm"
              >
                <Save className="h-4 w-4 mr-1" />
                Save Layout
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Canvas */}
      <div className="grid grid-cols-[1fr_250px] gap-4">
        <Card>
          <CardContent className="p-2">
            <div
              className="relative bg-muted/30 rounded-lg overflow-hidden cursor-crosshair"
              style={{ width: '100%', paddingBottom: `${(height / width) * 100}%` }}
              onClick={handleCanvasClick}
            >
              {/* Grid overlay */}
              {showGrid && (
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: 'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
                    backgroundSize: '5% 5%'
                  }}
                />
              )}

              {/* Placed fittings */}
              {placements.map(placement => (
                <div
                  key={placement.id}
                  className={`absolute flex items-center justify-center cursor-pointer transition-all ${
                    selectedPlacement === placement.id ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                  style={{
                    left: `${placement.x}%`,
                    top: `${placement.y}%`,
                    transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
                    width: '24px',
                    height: '24px',
                    color: getFittingColor(placement.fitting?.fitting_type || null)
                  }}
                  onClick={(e) => handlePlacementClick(placement.id, e)}
                  title={`${placement.fitting?.fitting_code || 'Unknown'} - ${placement.fitting?.fitting_name || ''}`}
                >
                  <span className="text-lg font-bold">
                    {getFittingSymbol(placement.fitting?.fitting_type || null)}
                  </span>
                </div>
              ))}

              {/* Empty state */}
              {placements.length === 0 && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Select "Place" mode and click to add fittings</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Placement Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Fittings</span>
                <span className="font-medium">{totalFittings}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Wattage</span>
                <span className="font-medium">{totalWattage}W</span>
              </div>
            </CardContent>
          </Card>

          {/* Fitting types legend */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {['Downlight', 'Panel', 'Linear', 'Track', 'Emergency', 'Spotlight'].map(type => (
                    <div key={type} className="flex items-center gap-2 text-sm">
                      <span style={{ color: getFittingColor(type) }}>
                        {getFittingSymbol(type)}
                      </span>
                      <span>{type}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {placements.filter(p => 
                          p.fitting?.fitting_type?.toLowerCase() === type.toLowerCase()
                        ).length}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardContent className="py-3">
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• <strong>Place:</strong> Select fitting and click on plan</p>
                <p>• <strong>Select:</strong> Click fitting to select</p>
                <p>• <strong>Delete:</strong> Click fitting to remove</p>
                <p>• <strong>Rotate:</strong> Select fitting, then rotate</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
