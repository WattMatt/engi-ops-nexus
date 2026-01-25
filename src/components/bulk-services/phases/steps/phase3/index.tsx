// Phase 3 Steps - Utility Application
import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { StepContentProps } from '../StepContentRegistry';

export function PrepareApplicationStep({ document }: StepContentProps) {
  return (
    <div className="space-y-4">
      <Alert><Info className="h-4 w-4" /><AlertDescription>Prepare the formal utility application with all required documentation.</AlertDescription></Alert>
      <div className="p-4 rounded-lg bg-muted/30"><p className="text-sm">Complete the application form with project details, load requirements, and supporting documents.</p></div>
    </div>
  );
}

export function DocumentMaxDemandStep({ document }: StepContentProps) {
  return (
    <div className="space-y-4">
      <Alert><Info className="h-4 w-4" /><AlertDescription>Document maximum demand calculations for the utility application.</AlertDescription></Alert>
      <div className="p-4 rounded-lg border bg-card text-center"><p className="text-xs text-muted-foreground mb-1">Maximum Demand</p><p className="text-2xl font-bold">{document?.maximum_demand?.toLocaleString() || '—'} kVA</p></div>
    </div>
  );
}

export function LoadProfileDocStep({ document }: StepContentProps) {
  return (
    <div className="space-y-4">
      <Alert><Info className="h-4 w-4" /><AlertDescription>Prepare load profile documentation showing daily/seasonal variations.</AlertDescription></Alert>
      <div className="p-4 rounded-lg bg-muted/30"><p className="text-sm">Include demand curves, operating schedules, and seasonal variations.</p></div>
    </div>
  );
}

export function VoltageRequestStep({ document }: StepContentProps) {
  return (
    <div className="space-y-4">
      <Alert><Info className="h-4 w-4" /><AlertDescription>Specify the requested supply voltage level in the application.</AlertDescription></Alert>
      <div className="p-4 rounded-lg border bg-card text-center"><p className="text-xs text-muted-foreground mb-1">Requested Voltage</p><p className="text-2xl font-bold">{document?.primary_voltage || 'Not specified'}</p></div>
    </div>
  );
}

export function SubmitApplicationStep({}: StepContentProps) {
  return (
    <div className="space-y-4">
      <Alert><Info className="h-4 w-4" /><AlertDescription>Submit the completed application to the utility for processing.</AlertDescription></Alert>
      <div className="p-4 rounded-lg bg-muted/30"><p className="text-sm">Track application submission date and reference number.</p></div>
    </div>
  );
}

export function TariffSelectionStep({ document }: StepContentProps) {
  return (
    <div className="space-y-4">
      <Alert><Info className="h-4 w-4" /><AlertDescription>Select the appropriate tariff structure for the installation.</AlertDescription></Alert>
      <div className="p-4 rounded-lg border bg-card text-center"><p className="text-xs text-muted-foreground mb-1">Selected Tariff</p><p className="text-xl font-bold">{document?.tariff_structure || 'Not selected'}</p></div>
    </div>
  );
}
