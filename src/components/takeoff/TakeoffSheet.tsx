/**
 * Main Takeoff Sheet component — orchestrates the full takeoff workflow.
 * Used in both Contractor Portal and main dashboard.
 */
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Plus, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { TakeoffCanvas } from './TakeoffCanvas';
import { TakeoffToolPalette } from './TakeoffToolPalette';
import { TakeoffBOMPanel } from './TakeoffBOMPanel';
import { TakeoffPropertiesPanel } from './TakeoffPropertiesPanel';
import {
  useTakeoffCatalog, useTakeoffAssemblies, useTakeoffs, useTakeoffMeasurements,
  useTakeoffZones, useCreateTakeoff, useUpdateTakeoff, useAddMeasurement,
  useDeleteMeasurement, useAddZone, useDeleteZone,
} from '@/hooks/useTakeoff';
import type { TakeoffTool, TakeoffMeasurement } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface Props {
  projectId: string;
  contractorName?: string;
  contractorEmail?: string;
}

export function TakeoffSheet({ projectId, contractorName, contractorEmail }: Props) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [activeTool, setActiveTool] = useState<TakeoffTool>('select');
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(null);
  const [selectedTakeoffId, setSelectedTakeoffId] = useState<string | null>(null);
  const [newTakeoffName, setNewTakeoffName] = useState('');
  const [mobileView, setMobileView] = useState<'canvas' | 'tools' | 'bom'>('canvas');

  // Data hooks
  const { data: catalog = [] } = useTakeoffCatalog();
  const { data: assemblies = [] } = useTakeoffAssemblies();
  const { data: takeoffs = [], isLoading: takeoffsLoading } = useTakeoffs(projectId);
  const { data: measurements = [] } = useTakeoffMeasurements(selectedTakeoffId);
  const { data: zones = [] } = useTakeoffZones(selectedTakeoffId);

  // Fetch drawings for this project
  const { data: drawings = [] } = useQuery({
    queryKey: ['takeoff-drawings', projectId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('project_drawings')
        .select('id, drawing_title, drawing_number, file_url, category')
        .eq('project_id', projectId)
        .order('drawing_number');
      if (error) throw error;
      return data as { id: string; drawing_title: string; drawing_number: string; file_url: string | null; category: string }[];
    },
    enabled: !!projectId,
  });

  const selectedTakeoff = takeoffs.find(t => t.id === selectedTakeoffId);
  const selectedDrawing = drawings.find(d => d.id === selectedTakeoff?.drawing_id);

  // Mutations
  const createTakeoff = useCreateTakeoff();
  const updateTakeoff = useUpdateTakeoff();
  const addMeasurement = useAddMeasurement();
  const deleteMeasurement = useDeleteMeasurement();
  const addZone = useAddZone();
  const deleteZone = useDeleteZone();

  const handleCreateTakeoff = async () => {
    if (!newTakeoffName.trim()) {
      toast.warning('Enter a name for the takeoff');
      return;
    }
    try {
      const result = await createTakeoff.mutateAsync({
        project_id: projectId,
        name: newTakeoffName.trim(),
        created_by: contractorName,
        created_by_email: contractorEmail,
      });
      setSelectedTakeoffId(result.id);
      setNewTakeoffName('');
      toast.success('Takeoff created');
    } catch {
      toast.error('Failed to create takeoff');
    }
  };

  const handleDrawingChange = async (drawingId: string) => {
    if (!selectedTakeoffId) return;
    await updateTakeoff.mutateAsync({ id: selectedTakeoffId, drawing_id: drawingId });
  };

  const handleScaleSet = async (ratio: number) => {
    if (!selectedTakeoffId) return;
    await updateTakeoff.mutateAsync({ id: selectedTakeoffId, scale_ratio: ratio } as any);
  };

  const handleAddMeasurement = useCallback(async (m: Partial<TakeoffMeasurement>) => {
    if (!selectedTakeoffId) return;

    // Auto-assign zone if point is inside a zone polygon
    let zoneId: string | null = null;
    if (m.type === 'count' && m.x_pos != null && m.y_pos != null && zones.length > 0) {
      for (const z of zones) {
        if (isPointInPolygon({ x: m.x_pos, y: m.y_pos }, z.polygon)) {
          zoneId = z.id;
          break;
        }
      }
    }

    await addMeasurement.mutateAsync({
      ...m,
      takeoff_id: selectedTakeoffId,
      zone_id: zoneId,
    } as any);
  }, [selectedTakeoffId, zones, addMeasurement]);

  const handleAddZone = useCallback(async (z: { name: string; polygon: any; color: string }) => {
    if (!selectedTakeoffId) return;
    await addZone.mutateAsync({ ...z, takeoff_id: selectedTakeoffId });
  }, [selectedTakeoffId, addZone]);

  const handleDeleteMeasurement = useCallback((id: string) => {
    if (!selectedTakeoffId) return;
    deleteMeasurement.mutate({ id, takeoffId: selectedTakeoffId });
  }, [selectedTakeoffId, deleteMeasurement]);

  const handleDeleteZone = useCallback((id: string) => {
    if (!selectedTakeoffId) return;
    deleteZone.mutate({ id, takeoffId: selectedTakeoffId });
  }, [selectedTakeoffId, deleteZone]);

  // No takeoff selected — show list
  if (!selectedTakeoffId) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Electrical Takeoff Sheets</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Create takeoff sheets to count devices and measure cable/conduit runs directly on PDF drawings.
          </p>

          {/* Create new */}
          <div className="flex gap-2">
            <Input
              placeholder="Takeoff name (e.g. Ground Floor Lighting)"
              value={newTakeoffName}
              onChange={e => setNewTakeoffName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateTakeoff()}
            />
            <Button onClick={handleCreateTakeoff} disabled={createTakeoff.isPending} className="gap-1">
              {createTakeoff.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </Button>
          </div>

          {/* Existing takeoffs */}
          {takeoffsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : takeoffs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No takeoffs yet. Create one above to get started.</p>
          ) : (
            <div className="space-y-2">
              {takeoffs.map(t => (
                <button
                  key={t.id}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedTakeoffId(t.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{t.name}</span>
                    <span className="text-xs text-muted-foreground">{t.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.created_by && `By ${t.created_by} · `}
                    {new Date(t.created_at).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-200px)]">
        {/* Header */}
        <div className="flex items-center gap-2 p-2 border-b bg-background">
          <Button size="sm" variant="ghost" onClick={() => setSelectedTakeoffId(null)}>← Back</Button>
          <span className="text-sm font-medium truncate flex-1">{selectedTakeoff?.name}</span>
          <Select value={selectedTakeoff?.drawing_id || ''} onValueChange={handleDrawingChange}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue placeholder="Select drawing" />
            </SelectTrigger>
            <SelectContent>
              {drawings.map(d => (
                <SelectItem key={d.id} value={d.id} className="text-xs">{d.drawing_number} - {d.drawing_title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mobile tab buttons */}
        <div className="flex border-b">
          {(['canvas', 'tools', 'bom'] as const).map(view => (
            <button
              key={view}
              className={`flex-1 py-2 text-xs font-medium capitalize ${mobileView === view ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
              onClick={() => setMobileView(view)}
            >
              {view === 'bom' ? 'BOM' : view}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          {mobileView === 'canvas' && (
            <TakeoffCanvas
              imageUrl={selectedDrawing?.file_url || null}
              activeTool={activeTool}
              selectedCatalogId={selectedCatalogId}
              selectedAssemblyId={selectedAssemblyId}
              catalog={catalog}
              assemblies={assemblies}
              measurements={measurements}
              zones={zones}
              scaleRatio={selectedTakeoff?.scale_ratio || null}
              measurementUnit={selectedTakeoff?.measurement_unit || 'meters'}
              onAddMeasurement={handleAddMeasurement}
              onAddZone={handleAddZone}
              onScaleSet={handleScaleSet}
            />
          )}
          {mobileView === 'tools' && (
            <TakeoffToolPalette
              activeTool={activeTool}
              onToolChange={setActiveTool}
              catalog={catalog}
              assemblies={assemblies}
              selectedCatalogId={selectedCatalogId}
              selectedAssemblyId={selectedAssemblyId}
              onSelectCatalog={setSelectedCatalogId}
              onSelectAssembly={setSelectedAssemblyId}
            />
          )}
          {mobileView === 'bom' && (
            <TakeoffBOMPanel
              measurements={measurements}
              catalog={catalog}
              assemblies={assemblies}
              zones={zones}
              onDeleteMeasurement={handleDeleteMeasurement}
              takeoffName={selectedTakeoff?.name || 'Takeoff'}
            />
          )}
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="flex items-center gap-3 p-2 border-b bg-background">
        <Button size="sm" variant="ghost" onClick={() => setSelectedTakeoffId(null)}>← Back</Button>
        <span className="text-sm font-semibold">{selectedTakeoff?.name}</span>
        <Select value={selectedTakeoff?.drawing_id || ''} onValueChange={handleDrawingChange}>
          <SelectTrigger className="h-8 text-xs w-[250px]">
            <SelectValue placeholder="Select drawing..." />
          </SelectTrigger>
          <SelectContent>
            {drawings.map(d => (
              <SelectItem key={d.id} value={d.id} className="text-xs">{d.drawing_number} - {d.drawing_title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left: Tool Palette */}
        <ResizablePanel defaultSize={18} minSize={14} maxSize={25}>
          <TakeoffToolPalette
            activeTool={activeTool}
            onToolChange={setActiveTool}
            catalog={catalog}
            assemblies={assemblies}
            selectedCatalogId={selectedCatalogId}
            selectedAssemblyId={selectedAssemblyId}
            onSelectCatalog={setSelectedCatalogId}
            onSelectAssembly={setSelectedAssemblyId}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />

        {/* Center: Canvas */}
        <ResizablePanel defaultSize={52}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={65}>
              <TakeoffCanvas
                imageUrl={selectedDrawing?.file_url || null}
                activeTool={activeTool}
                selectedCatalogId={selectedCatalogId}
                selectedAssemblyId={selectedAssemblyId}
                catalog={catalog}
                assemblies={assemblies}
                measurements={measurements}
                zones={zones}
                scaleRatio={selectedTakeoff?.scale_ratio || null}
                measurementUnit={selectedTakeoff?.measurement_unit || 'meters'}
                onAddMeasurement={handleAddMeasurement}
                onAddZone={handleAddZone}
                onScaleSet={handleScaleSet}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            {/* Bottom: Live BOM */}
            <ResizablePanel defaultSize={35} minSize={20}>
              <TakeoffBOMPanel
                measurements={measurements}
                catalog={catalog}
                assemblies={assemblies}
                zones={zones}
                onDeleteMeasurement={handleDeleteMeasurement}
                takeoffName={selectedTakeoff?.name || 'Takeoff'}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle withHandle />

        {/* Right: Properties */}
        <ResizablePanel defaultSize={15} minSize={12} maxSize={22}>
          <TakeoffPropertiesPanel
            scaleRatio={selectedTakeoff?.scale_ratio || null}
            measurementUnit={selectedTakeoff?.measurement_unit || 'meters'}
            measurements={measurements}
            zones={zones}
            catalog={catalog}
            onDeleteZone={handleDeleteZone}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

// Point-in-polygon test (ray casting)
function isPointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
