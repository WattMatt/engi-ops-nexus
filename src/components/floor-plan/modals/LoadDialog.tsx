import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { listFloorPlans, loadFloorPlanFromCloud } from '@/lib/floorPlan/cloudStorage';
import { useFloorPlan } from '@/contexts/FloorPlanContext';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LoadDialogProps {
  open: boolean;
  onClose: () => void;
}

export function LoadDialog({ open, onClose }: LoadDialogProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { setState } = useFloorPlan();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await listFloorPlans();
      setProjects(data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async (id: string) => {
    setLoading(true);
    try {
      const state = await loadFloorPlanFromCloud(id);
      setState(state);
      toast({ title: 'Loaded', description: 'Floor plan loaded successfully' });
      onClose();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Load Floor Plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {loading ? (
            <p className="text-center text-muted-foreground">Loading...</p>
          ) : projects.length === 0 ? (
            <p className="text-center text-muted-foreground">No saved floor plans</p>
          ) : (
            projects.map((project) => (
              <Card key={project.id} className="p-4 hover:border-primary cursor-pointer" onClick={() => handleLoad(project.id)}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{project.name}</h3>
                    <p className="text-sm text-muted-foreground">{project.design_purpose}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(project.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge>{project.design_purpose}</Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
