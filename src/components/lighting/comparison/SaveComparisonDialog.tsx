import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ComparisonSettings } from './comparisonTypes';

interface SaveComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fittingIds: string[];
  settings: ComparisonSettings;
  projectId?: string | null;
  onSaved?: () => void;
}

export const SaveComparisonDialog = ({
  open,
  onOpenChange,
  fittingIds,
  settings,
  projectId,
  onSaved,
}: SaveComparisonDialogProps) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('lighting_comparisons').insert({
        comparison_name: name,
        fitting_ids: fittingIds,
        comparison_criteria: settings as unknown as Json,
        notes: notes || null,
        project_id: projectId || null,
        created_by: user.user?.id || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Comparison saved');
      queryClient.invalidateQueries({ queryKey: ['lighting-comparisons'] });
      onSaved?.();
      onOpenChange(false);
      setName('');
      setNotes('');
    },
    onError: (error) => {
      toast.error('Failed to save comparison', { description: error.message });
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a name for the comparison');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Comparison</DialogTitle>
          <DialogDescription>
            Save this comparison for future reference. You're comparing {fittingIds.length} fittings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Comparison Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Office Panel Comparison"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this comparison..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : 'Save Comparison'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
