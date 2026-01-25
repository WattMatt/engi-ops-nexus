/**
 * Switchgear & Panels Step
 */

import { Info, LayoutGrid, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { StepContentProps } from '../StepContentRegistry';

export function SwitchgearPanelsStep({ document }: StepContentProps) {
  const voltage = document?.primary_voltage || '400V';
  
  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Specify distribution equipment for internal electrical distribution.
          All equipment must comply with utility specifications.
        </AlertDescription>
      </Alert>

      <div className="p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-2 mb-3">
          <LayoutGrid className="h-5 w-5 text-primary" />
          <p className="font-medium">Distribution Equipment</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          {voltage !== '400V' && (
            <div className="p-3 rounded bg-amber-50 dark:bg-amber-950/30">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">MV Switchgear</p>
              <ul className="text-xs text-amber-600 dark:text-amber-500 mt-1 space-y-0.5">
                <li>• Ring Main Unit</li>
                <li>• Circuit breakers</li>
                <li>• Protection panels</li>
              </ul>
            </div>
          )}
          <div className="p-3 rounded bg-muted/50">
            <p className="text-sm font-medium">LV Distribution</p>
            <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
              <li>• Main Distribution Board</li>
              <li>• Sub-distribution boards</li>
              <li>• Final circuits</li>
            </ul>
          </div>
          <div className="p-3 rounded bg-muted/50">
            <p className="text-sm font-medium">Ancillary Equipment</p>
            <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
              <li>• Capacitor banks</li>
              <li>• Surge protection</li>
              <li>• Earthing system</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5">
        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm">
          Document switchgear specifications in the Sections tab when complete.
        </p>
      </div>
    </div>
  );
}
