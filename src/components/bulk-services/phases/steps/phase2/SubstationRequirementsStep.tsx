/**
 * Substation Requirements Step
 */

import { Info, Building, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { StepContentProps } from '../StepContentRegistry';

export function SubstationRequirementsStep({ document }: StepContentProps) {
  const voltage = document?.primary_voltage || '';
  const maxDemand = document?.maximum_demand || 0;
  const needsSubstation = voltage !== '400V' || maxDemand > 1000;

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Assess whether a dedicated customer substation is required based on 
          voltage level and demand requirements.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border bg-card text-center">
          <p className="text-xs text-muted-foreground mb-1">Supply Voltage</p>
          <p className="text-xl font-bold">{voltage || 'Not set'}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card text-center">
          <p className="text-xs text-muted-foreground mb-1">Maximum Demand</p>
          <p className="text-xl font-bold">{maxDemand.toLocaleString()} kVA</p>
        </div>
      </div>

      <div className={`p-4 rounded-lg ${needsSubstation ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-green-50 dark:bg-green-950/30'}`}>
        <div className="flex items-start gap-3">
          <Building className={`h-5 w-5 ${needsSubstation ? 'text-amber-600' : 'text-green-600'} shrink-0 mt-0.5`} />
          <div>
            <p className={`font-medium ${needsSubstation ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400'}`}>
              {needsSubstation ? 'Customer Substation Required' : 'Utility Distribution Point'}
            </p>
            <p className={`text-sm ${needsSubstation ? 'text-amber-600 dark:text-amber-500' : 'text-green-600 dark:text-green-500'}`}>
              {needsSubstation 
                ? 'MV/HV supply requires customer-owned step-down transformer and switchgear.'
                : 'Standard LV supply from utility distribution network.'
              }
            </p>
          </div>
        </div>
      </div>

      {needsSubstation && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Substation Requirements:</p>
          <div className="grid grid-cols-1 gap-2">
            {[
              'Ring Main Unit (RMU) or switchgear',
              'Step-down transformer(s)',
              'LV distribution boards',
              'Protection relays and metering',
              'Fire protection systems',
              'Adequate ventilation/cooling',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Document substation requirements in the Sections tab when complete.
      </p>
    </div>
  );
}
