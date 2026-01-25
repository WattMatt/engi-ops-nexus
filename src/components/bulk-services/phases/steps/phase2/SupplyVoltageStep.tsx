/**
 * Supply Voltage Step
 * Determine the supply voltage level (LV/MV/HV)
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Save, Info, Zap, Building2, Factory, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { StepContentProps } from '../StepContentRegistry';

const VOLTAGE_OPTIONS = [
  { value: '400V', label: 'Low Voltage (400V)', level: 'LV', icon: Zap, demand: '< 500 kVA', description: 'Standard commercial/residential supply' },
  { value: '11kV', label: 'Medium Voltage (11kV)', level: 'MV', icon: Building2, demand: '500 kVA - 5 MVA', description: 'Large commercial, light industrial' },
  { value: '22kV', label: 'Medium Voltage (22kV)', level: 'MV', icon: Building2, demand: '1 MVA - 10 MVA', description: 'Industrial, large facilities' },
  { value: '33kV', label: 'Medium Voltage (33kV)', level: 'MV', icon: Factory, demand: '> 5 MVA', description: 'Heavy industrial, municipal' },
  { value: '66kV', label: 'High Voltage (66kV)', level: 'HV', icon: Factory, demand: '> 20 MVA', description: 'Large industrial, utility interconnection' },
];

export function SupplyVoltageStep({ document, documentId, onUpdate }: StepContentProps) {
  const queryClient = useQueryClient();
  const [voltage, setVoltage] = useState(document?.primary_voltage || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('bulk_services_documents')
        .update({ primary_voltage: voltage })
        .eq('id', documentId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['bulk-services-document', documentId] });
      toast.success('Supply voltage updated');
      onUpdate?.();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const maxDemand = document?.maximum_demand || 0;
  const suggestedVoltage = maxDemand > 5000 ? '33kV' : maxDemand > 500 ? '11kV' : '400V';

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Supply voltage is determined by your maximum demand. 
          Higher demands require medium or high voltage supply with customer-owned transformers.
        </AlertDescription>
      </Alert>

      {maxDemand > 0 && (
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-sm">Based on your demand of <strong>{maxDemand.toLocaleString()} kVA</strong></span>
            <Badge variant="default">Suggested: {suggestedVoltage}</Badge>
          </div>
        </div>
      )}

      <RadioGroup value={voltage} onValueChange={setVoltage} className="space-y-3">
        {VOLTAGE_OPTIONS.map(({ value, label, level, icon: Icon, demand, description }) => (
          <div key={value} className="flex items-start">
            <RadioGroupItem value={value} id={value} className="mt-1" />
            <Label 
              htmlFor={value} 
              className="flex-1 ml-3 p-4 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{label}</span>
                    <Badge variant="outline">{level}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                  <p className="text-xs text-muted-foreground mt-1">Typical demand: {demand}</p>
                </div>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>

      {voltage && voltage !== '400V' && (
        <Alert variant="default" className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            Medium/High voltage supply requires customer-owned step-down transformers 
            and compliance with utility specifications.
          </AlertDescription>
        </Alert>
      )}

      {document?.primary_voltage && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
          <span className="text-sm text-muted-foreground">Current saved value:</span>
          <span className="text-lg font-bold">{document.primary_voltage}</span>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving || !voltage} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Saving...' : 'Save Voltage Selection'}
      </Button>
    </div>
  );
}
