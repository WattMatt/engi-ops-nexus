import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { loadPdfFromFile } from "./utils/pdfCanvas";
import { ScaleDialog } from "./ScaleDialog";
import { MaskingCanvas } from "./MaskingCanvas";
import { MaskingToolbar } from "./MaskingToolbar";
import { AssignTenantDialog } from "./AssignTenantDialog";
import { FloorPlanLegend } from "./FloorPlanLegend";
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { sortTenantsByShopNumber } from "@/utils/tenantSorting";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const FloorPlanMasking = ({ projectId }: { projectId: string }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTool, setActiveTool] = useState<'select' | 'pan' | 'scale' | 'zone'>('select');
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);
  const [scale, setScale] = useState<number | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [scaleLine, setScaleLine] = useState<{ start: { x: number; y: number } | null; end: { x: number; y: number } | null }>({ 
    start: null, 
    end: null 
  });
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedZoneTenantId, setSelectedZoneTenantId] = useState<string | null>(null);
  const [assignTenantDialogOpen, setAssignTenantDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [zones, setZones] = useState<Array<{
    id: string;
    points: Array<{ x: number; y: number }>;
    color: string;
    tenantId?: string | null;
    tenantName?: string | null;
    category?: string | null;
  }>>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: floorPlanRecord, isLoading } = useQuery({
    queryKey: ['tenant-floor-plan', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_floor_plans')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  // Fetch tenants for legend
  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('project_id', projectId);
      
      if (error) throw error;
      return data ? sortTenantsByShopNumber(data) : [];
    },
    enabled: !!projectId
  });

  // Load PDF when in edit mode
  useEffect(() => {
    if (!projectId || !isEditMode) {
      setPdfDoc(null);
      return;
    }

    const loadPdf = async () => {
      const { data: files } = await supabase.storage
        .from('floor-plans')
        .list(`${projectId}`);

      const basePdf = files?.find(f => f.name === 'base.pdf');
      if (basePdf) {
        console.log('Loading PDF from storage');
        const { data, error } = await supabase.storage
          .from('floor-plans')
          .download(`${projectId}/base.pdf`);

        if (error || !data) {
          console.error('Error downloading PDF:', error);
          return;
        }

        const file = new File([data], 'base.pdf', { type: 'application/pdf' });
        const doc = await loadPdfFromFile(file);
        setPdfDoc(doc);
        
        // Load saved scale and scale line if available
        if (floorPlanRecord?.scale_pixels_per_meter) {
          setScale(floorPlanRecord.scale_pixels_per_meter);
          
          // Load saved scale line coordinates
          if (floorPlanRecord.scale_line_start && floorPlanRecord.scale_line_end) {
            setScaleLine({
              start: floorPlanRecord.scale_line_start as { x: number; y: number },
              end: floorPlanRecord.scale_line_end as { x: number; y: number }
            });
          }
          
          toast.success(`Loaded saved scale: ${floorPlanRecord.scale_pixels_per_meter.toFixed(2)} px/m`);
        }
      }
    };

    loadPdf();
  }, [isEditMode, projectId, floorPlanRecord?.scale_pixels_per_meter]);

  // Helper to check if tenant is complete
  const isTenantComplete = (tenantId: string | null): boolean => {
    if (!tenantId) return false;
    const tenant = tenants.find((t: any) => t.id === tenantId);
    if (!tenant) return false;
    
    return !!(
      tenant.sow_received &&
      tenant.layout_received &&
      tenant.db_ordered &&
      tenant.lighting_ordered &&
      tenant.cost_reported
    );
  };

  // Helper to get zone color based on tenant status
  const getZoneColor = (tenantId: string | null): string => {
    if (!tenantId) return '#9ca3af'; // Gray for unassigned
    return isTenantComplete(tenantId) ? '#10B981' : '#F97316'; // Bright green for complete, Bright orange for incomplete
  };

  // Load saved zones and recalculate colors based on current tenant data
  useEffect(() => {
    if (!projectId || tenants.length === 0) return;

    const loadZones = async () => {
      try {
        const { data, error } = await supabase
          .from('tenant_floor_plan_zones')
          .select('*')
          .eq('project_id', projectId);

        if (error) throw error;

        if (data) {
          const loadedZones = data.map(zone => ({
            id: zone.id,
            points: zone.zone_points as Array<{ x: number; y: number }>,
            color: getZoneColor(zone.tenant_id), // Recalculate color based on current tenant status
            tenantId: zone.tenant_id,
            tenantName: zone.tenant_name,
            category: zone.category
          }));
          setZones(loadedZones);
        }
      } catch (error) {
        console.error('Error loading zones:', error);
        toast.error('Failed to load saved zones');
      }
    };

    loadZones();
  }, [projectId, tenants]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !projectId) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    console.log('Uploading file:', file.name, 'Size:', file.size, 'bytes');

    if (file.size === 0) {
      toast.error('The selected PDF file is empty');
      return;
    }

    setIsUploading(true);
    try {
      // Delete existing file first to ensure clean upload
      const { error: deleteError } = await supabase.storage
        .from('floor-plans')
        .remove([`${projectId}/base.pdf`]);

      if (deleteError) {
        console.warn('Could not delete existing file:', deleteError);
      }

      console.log('Uploading to storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('floor-plans')
        .upload(`${projectId}/base.pdf`, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf'
        });

      if (uploadError) throw uploadError;
      console.log('Upload successful:', uploadData);

      // Wait a moment for storage to sync
      await new Promise(resolve => setTimeout(resolve, 500));

      // Load the PDF
      const doc = await loadPdfFromFile(file);
      setPdfDoc(doc);
      setIsEditMode(true); // Automatically enter edit mode
      
      toast.success('Floor plan uploaded successfully');
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload floor plan');
    } finally {
      setIsUploading(false);
    }
  };

  const handleToolSelect = (tool: 'select' | 'pan' | 'scale' | 'zone') => {
    setActiveTool(tool);
    if (tool === 'scale') {
      toast.info("Click two points on the floor plan to set a reference line");
    } else if (tool === 'zone') {
      toast.info("Click to add points. Click the start point or press Enter to finish.");
    }
    // Don't reset scale line when switching tools - keep it visible
  };

  const handleScaleSubmit = (distance: number) => {
    if (!scaleLine.start || !scaleLine.end) return;

    const lineLength = Math.sqrt(
      Math.pow(scaleLine.end.x - scaleLine.start.x, 2) +
      Math.pow(scaleLine.end.y - scaleLine.start.y, 2)
    );

    const pixelsPerMeter = lineLength / distance;
    setScale(pixelsPerMeter);
    // Keep the scale line visible instead of clearing it
    setActiveTool('select'); // Switch back to select after setting scale
    toast.success(`Scale set: ${distance}m = ${lineLength.toFixed(0)}px`);
  };

  const handleZoneSelected = (zoneId: string, tenantId: string | null) => {
    setSelectedZoneId(zoneId);
    setSelectedZoneTenantId(tenantId);
    // Auto-open assign dialog when zone is selected in select mode
    if (activeTool === 'select') {
      setAssignTenantDialogOpen(true);
    }
  };

  const handleAssignTenant = (tenantId: string, tenantName: string, category: string) => {
    if (selectedZoneId && (window as any).updateZoneTenant) {
      (window as any).updateZoneTenant(selectedZoneId, tenantId, tenantName, category, tenants);
      toast.success(`Zone assigned to ${tenantName}`);
    }
  };

  const handleRedrawZone = () => {
    if (!selectedZoneId) return;
    
    // Remove the selected zone from the zones array
    setZones(prevZones => prevZones.filter(z => z.id !== selectedZoneId));
    
    // Switch to zone drawing mode
    setActiveTool('zone');
    toast.info("Click to add points for the new zone. Click the start point or press Enter to finish.");
  };

  const handleReassignZone = () => {
    if (!selectedZoneId) return;
    
    // Find the zone and clear its tenant assignment
    setZones(prevZones => prevZones.map(z => {
      if (z.id === selectedZoneId) {
        return {
          ...z,
          tenantId: null,
          tenantName: null,
          category: null,
          color: '#9ca3af' // Reset to unassigned gray
        };
      }
      return z;
    }));
    
    // Reopen the assign dialog
    setSelectedZoneTenantId(null);
    setAssignTenantDialogOpen(true);
    toast.info("Select a new tenant for this zone");
  };

  const handleDeleteZone = () => {
    if (!selectedZoneId) return;
    // Show confirmation dialog instead of deleting immediately
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteZone = async () => {
    if (!selectedZoneId) return;
    
    try {
      // Delete from database if it exists
      const { error } = await supabase
        .from('tenant_floor_plan_zones')
        .delete()
        .eq('id', selectedZoneId);
      
      if (error) throw error;
      
      // Remove from local state
      setZones(prevZones => prevZones.filter(z => z.id !== selectedZoneId));
      
      toast.success('Zone deleted successfully');
      setDeleteConfirmOpen(false);
    } catch (error) {
      console.error('Error deleting zone:', error);
      toast.error('Failed to delete zone');
    }
  };

  const saveCompositeImage = async (fileName: string = 'composite.png') => {
    if (!pdfDoc || !(window as any).getCompositeCanvas) {
      throw new Error('Cannot generate preview');
    }

    const compositeCanvas = (window as any).getCompositeCanvas(tenants);
    const blob = await new Promise<Blob>((resolve) => {
      compositeCanvas.toBlob((blob: Blob) => resolve(blob), 'image/png');
    });

    const filePath = `${projectId}/${fileName}`;
    
    // Delete existing file to avoid duplicates
    await supabase.storage
      .from('floor-plans')
      .remove([filePath]);

    // Upload new file
    const { error: uploadError } = await supabase.storage
      .from('floor-plans')
      .upload(filePath, blob, { 
        upsert: false,
        contentType: 'image/png'
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('floor-plans')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSaveZones = async (saveAs: boolean = false) => {
    setIsSaving(true);
    try {
      // Delete existing zones for this project
      const { error: deleteError } = await supabase
        .from('tenant_floor_plan_zones')
        .delete()
        .eq('project_id', projectId);

      if (deleteError) throw deleteError;

      // Insert all zones
      if (zones.length > 0) {
        const zonesData = zones.map(zone => ({
          project_id: projectId,
          zone_points: zone.points,
          tenant_id: zone.tenantId,
          tenant_name: zone.tenantName,
          category: zone.category,
          color: zone.color
        }));

        const { error: insertError } = await supabase
          .from('tenant_floor_plan_zones')
          .insert(zonesData);

        if (insertError) throw insertError;
      }

      // Generate composite preview image
      const fileName = saveAs 
        ? `composite_${new Date().getTime()}.png` 
        : 'composite.png';
      
      const publicUrl = await saveCompositeImage(fileName);

      // Update or create floor plan record with scale and scale line
      const { error: upsertError } = await supabase
        .from('project_floor_plans')
        .upsert({
          project_id: projectId,
          composite_image_url: publicUrl,
          scale_pixels_per_meter: scale,
          scale_line_start: scaleLine.start,
          scale_line_end: scaleLine.end,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'project_id'
        });

      if (upsertError) throw upsertError;

      // Invalidate query to refresh preview
      queryClient.invalidateQueries({ queryKey: ['tenant-floor-plan', projectId] });

      toast.success(saveAs 
        ? `Saved ${zones.length} zone(s) as new version` 
        : `Saved ${zones.length} zone(s) and updated preview`
      );
    } catch (error) {
      console.error('Error saving zones:', error);
      toast.error('Failed to save zones');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleUpload}
        className="hidden"
      />
      
      {/* Preview Image and Legend at Top (when not in edit mode and zones exist) */}
      {!isEditMode && zones.length > 0 && floorPlanRecord?.composite_image_url?.endsWith('.png') && (
        <div className="border-b p-4 bg-muted/20">
          <div className="flex gap-4 items-start">
            <div className="flex-1 flex items-center justify-center">
              <img 
                src={`${floorPlanRecord.composite_image_url}?t=${Date.now()}`}
                alt="Masked Floor Plan"
                className="max-w-full max-h-[500px] object-contain shadow-lg rounded-lg"
              />
            </div>
            <div className="w-80 flex-shrink-0">
              <div className="max-h-[500px] overflow-y-auto rounded-lg border bg-card">
                <FloorPlanLegend zones={zones} tenants={tenants} />
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex flex-1 overflow-hidden">
        {isEditMode && (
          <MaskingToolbar
            activeTool={activeTool}
            onToolSelect={handleToolSelect}
            onUpload={() => fileInputRef.current?.click()}
            isPdfLoaded={!!pdfDoc}
            scaleSet={!!scale}
            scaleValue={scale}
            onSave={async () => await handleSaveZones(false)}
            onSaveAs={async () => await handleSaveZones(true)}
            isSaving={isSaving}
          />
        )}
        
        <div className="flex-1 flex flex-col">
          {/* Top toolbar with mode toggle */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">Floor Plan Masking</h3>
            <div className="flex gap-2">
              {!isEditMode && floorPlanRecord ? (
                <>
                  <Button onClick={() => setIsEditMode(true)} variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Floor Plan
                  </Button>
                  {zones.length > 0 && pdfDoc && (
                    <Button 
                      onClick={async () => {
                        setIsSaving(true);
                        try {
                          await handleSaveZones(false);
                          toast.success('Preview updated with current tenant status');
                        } catch (error) {
                          toast.error('Failed to update preview');
                        } finally {
                          setIsSaving(false);
                        }
                      }} 
                      variant="outline"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Preview Colors'
                      )}
                    </Button>
                  )}
                </>
              ) : isEditMode && floorPlanRecord?.composite_image_url ? (
                <Button onClick={() => setIsEditMode(false)} variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              ) : null}
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden flex gap-4">
            {!isEditMode && zones.length > 0 ? (
              <div className="flex-1 p-4">
                {/* Content area - legend is now at top with preview */}
              </div>
            ) : isEditMode && pdfDoc ? (
              <MaskingCanvas 
                pdfDoc={pdfDoc}
                onScaleLineComplete={(start, end) => {
                  setScaleLine({ start, end });
                  setScaleDialogOpen(true);
                }}
                isScaleMode={activeTool === 'scale'}
                existingScale={scale}
                scaleLine={scaleLine}
                onScaleLineUpdate={setScaleLine}
                isZoneMode={activeTool === 'zone'}
                onZoneComplete={(points) => {
                  console.log('Zone completed with points:', points);
                  toast.success(`Zone created with ${points.length} points`);
                }}
                activeTool={activeTool}
                projectId={projectId}
                onZoneSelected={handleZoneSelected}
                zones={zones}
                onZonesChange={setZones}
                tenants={tenants}
              />
            ) : isEditMode ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <p className="mb-4">No floor plan available. Upload a PDF to get started.</p>
                  <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ScaleDialog
        isOpen={scaleDialogOpen}
        onClose={() => {
          setScaleDialogOpen(false);
          setScaleLine({ start: null, end: null });
        }}
        onSubmit={handleScaleSubmit}
      />

      <AssignTenantDialog
        isOpen={assignTenantDialogOpen}
        onClose={() => setAssignTenantDialogOpen(false)}
        projectId={projectId}
        zoneId={selectedZoneId || ""}
        currentTenantId={selectedZoneTenantId}
        onAssign={handleAssignTenant}
        onRedraw={handleRedrawZone}
        onReassign={handleReassignZone}
        onDelete={handleDeleteZone}
        assignedTenantIds={zones.filter(z => z.tenantId).map(z => z.tenantId!)}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Zone</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this zone? This action cannot be undone.
              {selectedZoneId && zones.find(z => z.id === selectedZoneId)?.tenantName && (
                <span className="block mt-2 font-medium">
                  Currently assigned to: {zones.find(z => z.id === selectedZoneId)?.tenantName}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteZone} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
