/**
 * Future Growth Step
 * Plan for expansion with growth factor
 */

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Save, Info, TrendingUp, Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { StepContentProps } from '../StepContentRegistry';

const HORIZON_PRESETS = [
  { years: 5, factor: 1.15, description: '15% allowance' },
  { years: 10, factor: 1.20, description: '20% allowance' },
  { years: 15, factor: 1.30, description: '30% allowance' },
  { years: 20, factor: 1.40, description: '40% allowance' },
];

export function FutureGrowthStep({ document, documentId, onUpdate }: StepContentProps) {
  const queryClient = useQueryClient();
  const [expansionFactor, setExpansionFactor] = useState(
    document?.future_expansion_factor || 1.20
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('bulk_services_documents')
        .update({ future_expansion_factor: expansionFactor })
        .eq('id', documentId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['bulk-services-document', documentId] });
      toast.success('Future expansion factor updated');
      onUpdate?.();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Calculate impact
  const currentDemand = document?.maximum_demand || 0;
  const futureDemand = currentDemand * expansionFactor;
  const expansionPercentage = (expansionFactor - 1) * 100;
  const additionalCapacity = futureDemand - currentDemand;

  return (
    <div className="space-y-6">
      {/* Guidance */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Plan for future load growth to avoid costly infrastructure upgrades later.
          Typical planning horizons are 10-20 years with 20-40% additional capacity.
        </AlertDescription>
      </Alert>

      {/* Horizon Presets */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Planning Horizon
        </Label>
        <div className="grid grid-cols-4 gap-3">
          {HORIZON_PRESETS.map(({ years, factor, description }) => (
            <button
              key={years}
              onClick={() => setExpansionFactor(factor)}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                Math.abs(expansionFactor - factor) < 0.01
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="font-bold">{years} Years</div>
              <p className="text-xs text-muted-foreground">{description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Slider */}
      <div className="p-4 rounded-lg border-2 border-dashed bg-muted/20 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Expansion Factor</Label>
          <div className="text-right">
            <span className="text-2xl font-bold">{expansionPercentage.toFixed(0)}%</span>
            <span className="text-muted-foreground ml-1 text-sm">(×{expansionFactor.toFixed(2)})</span>
          </div>
        </div>
        
        <Slider
          value={[expansionFactor]}
          onValueChange={([value]) => setExpansionFactor(value)}
          min={1}
          max={2}
          step={0.05}
          className="w-full"
        />
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>No expansion (1.0×)</span>
          <span>Double capacity (2.0×)</span>
        </div>
      </div>

      {/* Impact Calculation */}
      {currentDemand > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted/30 text-center">
            <p className="text-xs text-muted-foreground mb-1">Current Demand</p>
            <p className="text-xl font-bold">{currentDemand.toFixed(1)}</p>
            <Badge variant="outline">kVA</Badge>
          </div>
          <div className="p-4 rounded-lg bg-primary/10 text-center">
            <p className="text-xs text-muted-foreground mb-1">Future Demand</p>
            <p className="text-xl font-bold text-primary">{futureDemand.toFixed(1)}</p>
            <Badge variant="outline">kVA</Badge>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 text-center">
            <p className="text-xs text-muted-foreground mb-1">Additional Capacity</p>
            <p className="text-xl font-bold">+{additionalCapacity.toFixed(1)}</p>
            <Badge variant="outline">kVA</Badge>
          </div>
        </div>
      )}

      {/* Guidance based on factor */}
      <div className={`flex items-start gap-2 p-3 rounded-lg ${
        expansionPercentage < 15 
          ? 'bg-amber-50 dark:bg-amber-950/30' 
          : 'bg-green-50 dark:bg-green-950/30'
      }`}>
        {expansionPercentage < 15 ? (
          <>
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400">
                Consider higher expansion allowance
              </p>
              <p className="text-amber-600 dark:text-amber-500">
                Low expansion allowance may require costly future upgrades.
              </p>
            </div>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-green-700 dark:text-green-400">
                Good expansion allowance
              </p>
              <p className="text-green-600 dark:text-green-500">
                This provides adequate capacity for future growth.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Current Value Display */}
      {document?.future_expansion_factor && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
          <span className="text-sm text-muted-foreground">Current saved value:</span>
          <span className="text-lg font-bold">×{document.future_expansion_factor.toFixed(2)}</span>
        </div>
      )}

      {/* Save Button */}
      <Button 
        onClick={handleSave} 
        disabled={saving}
        className="w-full"
      >
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Saving...' : 'Save Expansion Factor'}
      </Button>
    </div>
  );
}
