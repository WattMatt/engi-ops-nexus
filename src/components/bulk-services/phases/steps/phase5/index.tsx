// Phase 5 Steps - Construction & Installation
import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { StepContentProps } from '../StepContentRegistry';

export function InternalInfrastructureStep({}: StepContentProps) {
  return (
    <div className="space-y-4">
      <Alert><Info className="h-4 w-4" /><AlertDescription>Build internal electrical infrastructure including switchgear, cabling, and transformers.</AlertDescription></Alert>
      <div className="p-4 rounded-lg bg-muted/30"><p className="text-sm">Install customer-owned equipment per approved designs.</p></div>
    </div>
  );
}

export function SpecificationComplianceStep({ document }: StepContentProps) {
  return (
    <div className="space-y-4">
      <Alert><Info className="h-4 w-4" /><AlertDescription>Ensure all equipment meets utility specifications and standards.</AlertDescription></Alert>
      <div className="p-4 rounded-lg border bg-card text-center"><p className="text-xs text-muted-foreground mb-1">Standard</p><p className="text-xl font-bold">{document?.electrical_standard || 'SANS 10142'}</p></div>
    </div>
  );
}

export function GridExtensionStep({}: StepContentProps) {
  return (
    <div className="space-y-4">
      <Alert><Info className="h-4 w-4" /><AlertDescription>Coordinate with utility for grid extension to point of supply.</AlertDescription></Alert>
      <div className="p-4 rounded-lg bg-muted/30"><p className="text-sm">Utility extends their network to the agreed point of supply.</p></div>
    </div>
  );
}

export function TestingCommissioningStep({}: StepContentProps) {
  return (
    <div className="space-y-4">
      <Alert><Info className="h-4 w-4" /><AlertDescription>Complete testing and commissioning of all electrical equipment.</AlertDescription></Alert>
      <div className="p-4 rounded-lg bg-muted/30"><p className="text-sm">Verify safety systems, protection settings, and metering before energization.</p></div>
    </div>
  );
}
