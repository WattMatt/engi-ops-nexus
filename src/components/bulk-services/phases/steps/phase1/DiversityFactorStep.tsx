/**
 * Diversity Factor Step
 * Apply diversity to avoid oversizing
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Save, Info, Building2, Factory, Home, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { StepContentProps } from '../StepContentRegistry';

const BUILDING_TYPES = [
  { type: 'residential', label: 'Residential', icon: Home, factor: 0.5, description: 'Apartments, houses' },
  { type: 'commercial', label: 'Commercial', icon: ShoppingBag, factor: 0.7, description: 'Offices, retail' },
  { type: 'industrial', label: 'Industrial', icon: Factory, factor: 0.8, description: 'Manufacturing' },
  { type: 'mixed', label: 'Mixed Use', icon: Building2, factor: 0.65, description: 'Retail + office' },
];

export function DiversityFactorStep({ document, documentId, onUpdate }: StepContentProps) {
  const queryClient = useQueryClient();
  const [diversityFactor, setDiversityFactor] = useState(
    document?.diversity_factor || 0.7
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('bulk_services_documents')
        .update({ diversity_factor: diversityFactor })
        .eq('id', documentId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['bulk-services-document', documentId] });
      toast.success('Diversity factor updated');
      onUpdate?.();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handlePresetSelect = (factor: number) => {
    setDiversityFactor(factor);
  };

  // Calculate impact
  const connectedLoad = document?.total_connected_load || 0;
  const resultingDemand = connectedLoad * diversityFactor;
  const reduction = connectedLoad - resultingDemand;

  return (
    <div className="space-y-6">
      {/* Guidance */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Diversity factor accounts for the fact that not all loads operate at maximum capacity simultaneously.
          Lower factors mean greater diversity (more reduction in design capacity).
        </AlertDescription>
      </Alert>

      {/* Building Type Presets */}
      <div className="space-y-3">
        <Label>Building Type Presets</Label>
        <div className="grid grid-cols-2 gap-3">
          {BUILDING_TYPES.map(({ type, label, icon: Icon, factor, description }) => (
            <button
              key={type}
              onClick={() => handlePresetSelect(factor)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                Math.abs(diversityFactor - factor) < 0.01
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{description}</p>
              <Badge variant="secondary" className="mt-2">
                DF: {factor}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Slider */}
      <div className="p-4 rounded-lg border-2 border-dashed bg-muted/20 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Diversity Factor</Label>
          <span className="text-2xl font-bold">{diversityFactor.toFixed(2)}</span>
        </div>
        
        <Slider
          value={[diversityFactor]}
          onValueChange={([value]) => setDiversityFactor(value)}
          min={0.3}
          max={1}
          step={0.05}
          className="w-full"
        />
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>High diversity (0.3)</span>
          <span>No diversity (1.0)</span>
        </div>
      </div>

      {/* Impact Calculation */}
      {connectedLoad > 0 && (
        <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/30">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Connected Load</p>
            <p className="text-lg font-bold">{connectedLoad.toFixed(1)}</p>
            <Badge variant="outline">kVA</Badge>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Reduction</p>
            <p className="text-lg font-bold text-destructive">−{reduction.toFixed(1)}</p>
            <Badge variant="outline">kVA</Badge>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Design Demand</p>
            <p className="text-lg font-bold text-primary">{resultingDemand.toFixed(1)}</p>
            <Badge variant="outline">kVA</Badge>
          </div>
        </div>
      )}

      {/* Current Value Display */}
      {document?.diversity_factor && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
          <span className="text-sm text-muted-foreground">Current saved value:</span>
          <span className="text-lg font-bold">{document.diversity_factor.toFixed(2)}</span>
        </div>
      )}

      {/* Save Button */}
      <Button 
        onClick={handleSave} 
        disabled={saving}
        className="w-full"
      >
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Saving...' : 'Save Diversity Factor'}
      </Button>
    </div>
  );
}
