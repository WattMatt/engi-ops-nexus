/**
 * Load Profile Step
 * Document daily/seasonal variations to understand demand curve
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Save, Info, BarChart3, Clock, Sun, Moon, Thermometer, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { StepContentProps } from '../StepContentRegistry';

const PROFILE_CONSIDERATIONS = [
  { key: 'daily', label: 'Daily Variation', icon: Clock, description: 'Peak hours vs off-peak' },
  { key: 'daytime', label: 'Day/Night Shifts', icon: Sun, description: 'Extended operating hours' },
  { key: 'seasonal', label: 'Seasonal Changes', icon: Thermometer, description: 'Summer/winter HVAC loads' },
  { key: 'weekend', label: 'Weekend Pattern', icon: Moon, description: 'Reduced weekend operations' },
];

export function LoadProfileStep({ document, documentId, onUpdate }: StepContentProps) {
  const queryClient = useQueryClient();
  const [isCompleted, setIsCompleted] = useState(
    document?.load_profile_completed || false
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('bulk_services_documents')
        .update({ load_profile_completed: isCompleted })
        .eq('id', documentId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['bulk-services-document', documentId] });
      toast.success('Load profile status updated');
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
          A load profile documents how electrical demand varies over time.
          This helps utilities understand your usage pattern and may affect tariff options.
        </AlertDescription>
      </Alert>

      {/* Considerations Checklist */}
      <div className="space-y-3">
        <Label>Profile Considerations</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PROFILE_CONSIDERATIONS.map(({ key, label, icon: Icon, description }) => (
            <div 
              key={key}
              className="flex items-start gap-3 p-4 rounded-lg border bg-card"
            >
              <Icon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Typical Load Profile Description */}
      <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <span className="font-medium">Typical Commercial Profile</span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2 rounded bg-blue-100 dark:bg-blue-900/30">
            <p className="font-medium text-blue-700 dark:text-blue-300">06:00-09:00</p>
            <p className="text-blue-600 dark:text-blue-400">Ramp Up</p>
          </div>
          <div className="p-2 rounded bg-orange-100 dark:bg-orange-900/30">
            <p className="font-medium text-orange-700 dark:text-orange-300">09:00-17:00</p>
            <p className="text-orange-600 dark:text-orange-400">Peak</p>
          </div>
          <div className="p-2 rounded bg-blue-100 dark:bg-blue-900/30">
            <p className="font-medium text-blue-700 dark:text-blue-300">17:00-20:00</p>
            <p className="text-blue-600 dark:text-blue-400">Ramp Down</p>
          </div>
          <div className="p-2 rounded bg-green-100 dark:bg-green-900/30">
            <p className="font-medium text-green-700 dark:text-green-300">20:00-06:00</p>
            <p className="text-green-600 dark:text-green-400">Off-Peak</p>
          </div>
        </div>
      </div>

      {/* Completion Checkbox */}
      <div className="p-4 rounded-lg border-2 border-dashed bg-muted/20">
        <div className="flex items-start gap-3">
          <Checkbox
            id="load-profile-complete"
            checked={isCompleted}
            onCheckedChange={(checked) => setIsCompleted(checked === true)}
          />
          <div className="space-y-1">
            <Label htmlFor="load-profile-complete" className="text-base font-semibold cursor-pointer">
              Load profile analysis completed
            </Label>
            <p className="text-sm text-muted-foreground">
              Check this when you have documented the daily/seasonal load variations
              and understand the demand curve for this installation.
            </p>
          </div>
        </div>
      </div>

      {/* Current Status */}
      <div className={`flex items-center gap-3 p-4 rounded-lg ${
        document?.load_profile_completed
          ? 'bg-green-50 dark:bg-green-950/30'
          : 'bg-muted/30'
      }`}>
        {document?.load_profile_completed ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-700 dark:text-green-400">
              Load profile analysis is complete
            </span>
          </>
        ) : (
          <>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">
              Load profile analysis not yet completed
            </span>
          </>
        )}
      </div>

      {/* Save Button */}
      <Button 
        onClick={handleSave} 
        disabled={saving}
        className="w-full"
      >
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Saving...' : 'Save Status'}
      </Button>
    </div>
  );
}
