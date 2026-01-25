/**
 * Peak Demand Step
 * Calculate maximum simultaneous usage
 */

import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Calculator, TrendingUp, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { StepContentProps } from '../StepContentRegistry';

export function PeakDemandStep({ document, documentId, onUpdate }: StepContentProps) {
  const queryClient = useQueryClient();
  const [maxDemand, setMaxDemand] = useState(
    document?.maximum_demand?.toString() || ''
  );
  const [saving, setSaving] = useState(false);

  // Calculate suggested demand based on connected load and diversity
  const suggestedDemand = useMemo(() => {
    const connectedLoad = document?.total_connected_load || 0;
    const diversityFactor = document?.diversity_factor || 0.7;
    return connectedLoad * diversityFactor;
  }, [document?.total_connected_load, document?.diversity_factor]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('bulk_services_documents')
        .update({ maximum_demand: parseFloat(maxDemand) || null })
        .eq('id', documentId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['bulk-services-document', documentId] });
      toast.success('Maximum demand updated');
      onUpdate?.();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleUseSuggested = () => {
    setMaxDemand(suggestedDemand.toFixed(2));
  };

  return (
    <div className="space-y-6">
      {/* Guidance */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Peak demand represents the maximum simultaneous electrical load. 
          It's typically calculated by applying a diversity factor to the total connected load.
        </AlertDescription>
      </Alert>

      {/* Calculation Reference */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border bg-card text-center">
          <p className="text-xs text-muted-foreground mb-1">Connected Load</p>
          <p className="text-2xl font-bold">
            {document?.total_connected_load?.toLocaleString() || '—'}
          </p>
          <Badge variant="outline" className="mt-1">kVA</Badge>
        </div>
        <div className="p-4 rounded-lg border bg-card text-center">
          <p className="text-xs text-muted-foreground mb-1">Diversity Factor</p>
          <p className="text-2xl font-bold">
            {document?.diversity_factor?.toFixed(2) || '—'}
          </p>
          <Badge variant="outline" className="mt-1">×</Badge>
        </div>
        <div className="p-4 rounded-lg border bg-primary/10 text-center">
          <p className="text-xs text-muted-foreground mb-1">Suggested Demand</p>
          <p className="text-2xl font-bold text-primary">
            {suggestedDemand > 0 ? suggestedDemand.toFixed(1) : '—'}
          </p>
          <Badge variant="outline" className="mt-1">kVA</Badge>
        </div>
      </div>

      {/* Maximum Demand Input */}
      <div className="p-4 rounded-lg border-2 border-dashed bg-muted/20 space-y-4">
        <Label htmlFor="max-demand" className="text-base font-semibold">
          Maximum Demand
        </Label>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              id="max-demand"
              type="number"
              step="0.1"
              min={0}
              value={maxDemand}
              onChange={(e) => setMaxDemand(e.target.value)}
              placeholder="Enter maximum demand"
              className="text-lg h-12"
            />
          </div>
          <span className="text-lg font-medium text-muted-foreground">kVA</span>
        </div>
        
        {suggestedDemand > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleUseSuggested}
            className="mt-2"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Use Calculated Value ({suggestedDemand.toFixed(1)} kVA)
          </Button>
        )}
      </div>

      {/* Current Value Display */}
      {document?.maximum_demand && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
          <span className="text-sm text-muted-foreground">Current saved value:</span>
          <span className="text-lg font-bold">{document.maximum_demand.toLocaleString()} kVA</span>
        </div>
      )}

      {/* Save Button */}
      <Button 
        onClick={handleSave} 
        disabled={saving || !maxDemand}
        className="w-full"
      >
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Saving...' : 'Save Maximum Demand'}
      </Button>
    </div>
  );
}
