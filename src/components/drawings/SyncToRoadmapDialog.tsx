/**
 * Dialog to sync selected drawings to the project roadmap
 * Creates roadmap items under the "Drawings" phase
 */

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, FileText, Route, CheckCircle2 } from 'lucide-react';
import type { ProjectDrawing } from '@/types/drawings';

interface SyncToRoadmapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  drawings: ProjectDrawing[];
}

interface DrawingWithSync extends ProjectDrawing {
  existsInRoadmap?: boolean;
}

export function SyncToRoadmapDialog({
  open,
  onOpenChange,
  projectId,
  drawings,
}: SyncToRoadmapDialogProps) {
  const queryClient = useQueryClient();
  const [selectedDrawings, setSelectedDrawings] = useState<Set<string>>(new Set());

  // Fetch the Drawings phase parent item
  const { data: drawingsPhase, isLoading: loadingPhase } = useQuery({
    queryKey: ['roadmap-drawings-phase', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_roadmap_items')
        .select('id, title')
        .eq('project_id', projectId)
        .eq('phase', 'Drawings')
        .is('parent_id', null)
        .single();

      if (error) {
        // Try to find or create the drawings phase
        if (error.code === 'PGRST116') {
          // No drawings phase exists, create one
          const { data: newPhase, error: createError } = await supabase
            .from('project_roadmap_items')
            .insert({
              project_id: projectId,
              title: 'Drawings',
              phase: 'Drawings',
              sort_order: 7,
            })
            .select()
            .single();

          if (createError) throw createError;
          return newPhase;
        }
        throw error;
      }
      return data;
    },
    enabled: open,
  });

  // Fetch existing roadmap items to check which drawings are already synced
  const { data: existingItems = [], isLoading: loadingExisting } = useQuery({
    queryKey: ['roadmap-drawing-items', projectId, drawingsPhase?.id],
    queryFn: async () => {
      if (!drawingsPhase?.id) return [];

      const { data, error } = await supabase
        .from('project_roadmap_items')
        .select('id, title, description')
        .eq('project_id', projectId)
        .eq('parent_id', drawingsPhase.id);

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!drawingsPhase?.id,
  });

  // Check which drawings already exist in roadmap
  const drawingsWithSyncStatus: DrawingWithSync[] = drawings.map((d) => ({
    ...d,
    existsInRoadmap: existingItems.some(
      (item) =>
        item.title?.includes(d.drawing_number) ||
        item.description?.includes(d.drawing_number)
    ),
  }));

  // Group drawings by category
  const groupedDrawings = drawingsWithSyncStatus.reduce((acc, drawing) => {
    const category = drawing.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(drawing);
    return acc;
  }, {} as Record<string, DrawingWithSync[]>);

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedDrawings(new Set());
    }
  }, [open]);

  const syncMutation = useMutation({
    mutationFn: async (drawingIds: string[]) => {
      if (!drawingsPhase?.id) {
        throw new Error('Drawings phase not found');
      }

      const drawingsToSync = drawings.filter((d) => drawingIds.includes(d.id));

      const roadmapItems = drawingsToSync.map((d, index) => ({
        project_id: projectId,
        parent_id: drawingsPhase.id,
        title: `${d.drawing_number} - ${d.drawing_title}`,
        description: `Drawing: ${d.drawing_number}\nRevision: ${d.current_revision}\nCategory: ${d.category}`,
        sort_order: index + 1,
        is_completed: d.status === 'as_built',
      }));

      const { data, error } = await supabase
        .from('project_roadmap_items')
        .insert(roadmapItems)
        .select();

      if (error) throw error;

      // Update drawings with roadmap_item_id reference
      for (let i = 0; i < data.length; i++) {
        await supabase
          .from('project_drawings')
          .update({ roadmap_item_id: data[i].id })
          .eq('id', drawingsToSync[i].id);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-items', projectId] });
      queryClient.invalidateQueries({ queryKey: ['roadmap-drawing-items', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-drawings', projectId] });
      toast.success(`Synced ${data.length} drawings to roadmap`);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to sync: ${error.message}`);
    },
  });

  const handleToggleDrawing = (drawingId: string) => {
    const newSelected = new Set(selectedDrawings);
    if (newSelected.has(drawingId)) {
      newSelected.delete(drawingId);
    } else {
      newSelected.add(drawingId);
    }
    setSelectedDrawings(newSelected);
  };

  const handleSelectAll = (category: string) => {
    const categoryDrawings = groupedDrawings[category] || [];
    const unsyncedDrawings = categoryDrawings.filter((d) => !d.existsInRoadmap);
    const allSelected = unsyncedDrawings.every((d) => selectedDrawings.has(d.id));

    const newSelected = new Set(selectedDrawings);
    unsyncedDrawings.forEach((d) => {
      if (allSelected) {
        newSelected.delete(d.id);
      } else {
        newSelected.add(d.id);
      }
    });
    setSelectedDrawings(newSelected);
  };

  const handleSync = () => {
    if (selectedDrawings.size === 0) {
      toast.error('Please select at least one drawing');
      return;
    }
    syncMutation.mutate(Array.from(selectedDrawings));
  };

  const isLoading = loadingPhase || loadingExisting;
  const unsyncedCount = drawingsWithSyncStatus.filter((d) => !d.existsInRoadmap).length;
  const alreadySyncedCount = drawingsWithSyncStatus.filter((d) => d.existsInRoadmap).length;

  const categoryLabels: Record<string, string> = {
    site: 'Site Plans',
    power: 'Power Layouts',
    lighting: 'Lighting Layouts',
    schematic: 'Schematics',
    tenant: 'Tenant Drawings',
    cctv: 'CCTV',
    hvac: 'HVAC',
    signage: 'Signage',
    other: 'Other',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Sync Drawings to Roadmap
          </DialogTitle>
          <DialogDescription>
            Add selected drawings as trackable items under the Drawings phase in your project roadmap.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{drawings.length} total drawings</span>
              <Badge variant="secondary">{unsyncedCount} available to sync</Badge>
              {alreadySyncedCount > 0 && (
                <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {alreadySyncedCount} already synced
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {Object.entries(groupedDrawings).map(([category, categoryDrawings]) => {
                  const unsyncedInCategory = categoryDrawings.filter((d) => !d.existsInRoadmap);
                  const allCategorySelected =
                    unsyncedInCategory.length > 0 &&
                    unsyncedInCategory.every((d) => selectedDrawings.has(d.id));

                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">
                          {categoryLabels[category] || category}
                          <span className="text-muted-foreground ml-2">
                            ({categoryDrawings.length})
                          </span>
                        </h4>
                        {unsyncedInCategory.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSelectAll(category)}
                          >
                            {allCategorySelected ? 'Deselect all' : 'Select all'}
                          </Button>
                        )}
                      </div>

                      <div className="space-y-1">
                        {categoryDrawings.map((drawing) => (
                          <div
                            key={drawing.id}
                            className={`flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 ${
                              drawing.existsInRoadmap ? 'opacity-50' : ''
                            }`}
                          >
                            <Checkbox
                              id={drawing.id}
                              checked={selectedDrawings.has(drawing.id)}
                              disabled={drawing.existsInRoadmap}
                              onCheckedChange={() => handleToggleDrawing(drawing.id)}
                            />
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <label
                              htmlFor={drawing.id}
                              className="flex-1 text-sm cursor-pointer"
                            >
                              <span className="font-mono text-xs">
                                {drawing.drawing_number}
                              </span>
                              <span className="mx-2">-</span>
                              <span>{drawing.drawing_title}</span>
                            </label>
                            <Badge variant="outline" className="text-xs">
                              Rev {drawing.current_revision}
                            </Badge>
                            {drawing.existsInRoadmap && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSync}
            disabled={selectedDrawings.size === 0 || syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Route className="h-4 w-4 mr-2" />
                Sync {selectedDrawings.size} to Roadmap
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
