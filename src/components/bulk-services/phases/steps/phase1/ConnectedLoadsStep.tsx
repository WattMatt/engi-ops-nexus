/**
 * Connected Loads Step
 * Identifies and documents all electrical loads
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Lightbulb, Wind, Cpu, Cog, Plug, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { StepContentProps } from '../StepContentRegistry';

const LOAD_CATEGORIES = [
  { key: 'lighting', label: 'Lighting', icon: Lightbulb, typical: '15-25 W/m²' },
  { key: 'hvac', label: 'HVAC', icon: Wind, typical: '40-80 W/m²' },
  { key: 'it', label: 'IT Equipment', icon: Cpu, typical: '5-15 W/m²' },
  { key: 'motors', label: 'Motors & Pumps', icon: Cog, typical: 'Varies by application' },
  { key: 'general', label: 'General Power', icon: Plug, typical: '10-20 W/m²' },
];

export function ConnectedLoadsStep({ document, documentId, onUpdate }: StepContentProps) {
  const queryClient = useQueryClient();
  const [totalLoad, setTotalLoad] = useState(
    document?.total_connected_load?.toString() || ''
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('bulk_services_documents')
        .update({ total_connected_load: parseFloat(totalLoad) || null })
        .eq('id', documentId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['bulk-services-document', documentId] });
      toast.success('Connected load updated');
      onUpdate?.();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Guidance */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Document all electrical loads including lighting, HVAC, machinery, IT equipment, and motors.
          This forms the basis for demand calculations.
        </AlertDescription>
      </Alert>

      {/* Load Categories Reference */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {LOAD_CATEGORIES.map(({ key, label, icon: Icon, typical }) => (
          <div 
            key={key}
            className="flex items-center gap-3 p-3 rounded-lg border bg-card"
          >
            <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{label}</p>
              <p className="text-xs text-muted-foreground">{typical}</p>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">Typical</Badge>
          </div>
        ))}
      </div>

      {/* Total Connected Load Input */}
      <div className="p-4 rounded-lg border-2 border-dashed bg-muted/20 space-y-4">
        <Label htmlFor="total-load" className="text-base font-semibold">
          Total Connected Load
        </Label>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              id="total-load"
              type="number"
              step="0.1"
              min={0}
              value={totalLoad}
              onChange={(e) => setTotalLoad(e.target.value)}
              placeholder="Enter total connected load"
              className="text-lg h-12"
            />
          </div>
          <span className="text-lg font-medium text-muted-foreground">kVA</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Sum of all individual load ratings at 100% capacity
        </p>
      </div>

      {/* Current Value Display */}
      {document?.total_connected_load && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
          <span className="text-sm text-muted-foreground">Current saved value:</span>
          <span className="text-lg font-bold">{document.total_connected_load.toLocaleString()} kVA</span>
        </div>
      )}

      {/* Save Button */}
      <Button 
        onClick={handleSave} 
        disabled={saving || !totalLoad}
        className="w-full"
      >
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Saving...' : 'Save Connected Load'}
      </Button>
    </div>
  );
}
