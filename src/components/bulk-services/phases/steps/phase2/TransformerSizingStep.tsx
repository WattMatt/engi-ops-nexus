/**
 * Transformer Sizing Step
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Info, Zap, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { StepContentProps } from '../StepContentRegistry';

const STANDARD_SIZES = [100, 200, 315, 500, 630, 800, 1000, 1250, 1600, 2000, 2500];

export function TransformerSizingStep({ document, documentId, onUpdate }: StepContentProps) {
  const queryClient = useQueryClient();
  const [transformerSize, setTransformerSize] = useState(
    document?.transformer_size_kva?.toString() || ''
  );
  const [saving, setSaving] = useState(false);

  const voltage = document?.primary_voltage || '';
  const isHighVoltage = voltage && voltage !== '400V';
  const maxDemand = document?.maximum_demand || 0;
  
  // Suggest transformer size (next standard size above demand with 20% margin)
  const requiredCapacity = maxDemand * 1.2;
  const suggestedSize = STANDARD_SIZES.find(s => s >= requiredCapacity) || STANDARD_SIZES[STANDARD_SIZES.length - 1];

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('bulk_services_documents')
        .update({ transformer_size_kva: parseFloat(transformerSize) || null })
        .eq('id', documentId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['bulk-services-document', documentId] });
      toast.success('Transformer size updated');
      onUpdate?.();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // If high voltage, transformers are handled internally
  if (isHighVoltage) {
    return (
      <div className="space-y-6">
        <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-400">
            <strong>Not Applicable:</strong> Bulk supply at {voltage} uses internal (customer-owned) 
            transformers. Transformer sizing will be part of your internal infrastructure design.
          </AlertDescription>
        </Alert>

        <div className="p-4 rounded-lg bg-muted/30 text-center">
          <Badge variant="secondary" className="mb-2">N/A - Bulk Supply</Badge>
          <p className="text-sm text-muted-foreground">
            This task auto-completes for medium/high voltage supply.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          For 400V LV supply, specify the transformer capacity required. 
          Size should accommodate maximum demand plus 20% safety margin.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border bg-card text-center">
          <p className="text-xs text-muted-foreground mb-1">Maximum Demand</p>
          <p className="text-xl font-bold">{maxDemand.toLocaleString()} kVA</p>
        </div>
        <div className="p-4 rounded-lg border bg-primary/10 text-center">
          <p className="text-xs text-muted-foreground mb-1">Suggested Size</p>
          <p className="text-xl font-bold text-primary">{suggestedSize} kVA</p>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Standard Transformer Sizes</Label>
        <div className="flex flex-wrap gap-2">
          {STANDARD_SIZES.map(size => (
            <Button
              key={size}
              variant={transformerSize === size.toString() ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTransformerSize(size.toString())}
              className={size === suggestedSize ? 'ring-2 ring-primary ring-offset-2' : ''}
            >
              {size} kVA
              {size === suggestedSize && <Badge variant="secondary" className="ml-1 text-xs">Suggested</Badge>}
            </Button>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-lg border-2 border-dashed bg-muted/20 space-y-3">
        <Label htmlFor="transformer-size" className="text-base font-semibold">
          Custom Size (kVA)
        </Label>
        <div className="flex items-center gap-4">
          <Input
            id="transformer-size"
            type="number"
            step="1"
            min={0}
            value={transformerSize}
            onChange={(e) => setTransformerSize(e.target.value)}
            placeholder="Enter transformer size"
            className="text-lg h-12"
          />
          <span className="text-lg font-medium text-muted-foreground">kVA</span>
        </div>
      </div>

      {document?.transformer_size_kva && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
          <span className="text-sm text-muted-foreground">Current saved value:</span>
          <span className="text-lg font-bold">{document.transformer_size_kva} kVA</span>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving || !transformerSize} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Saving...' : 'Save Transformer Size'}
      </Button>
    </div>
  );
}
