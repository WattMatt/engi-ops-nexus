// Phase 6 Steps - Operation & Monitoring
import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { StepContentProps } from '../StepContentRegistry';

export function PowerFactorStep({}: StepContentProps) {
  return (
    <div className="space-y-4">
      <Alert><Info className="h-4 w-4" /><AlertDescription>Maintain power factor above 0.95 to avoid utility penalties.</AlertDescription></Alert>
      <div className="p-4 rounded-lg bg-muted/30"><p className="text-sm">Install power factor correction if necessary.</p></div>
    </div>
  );
}

export function DemandManagementStep({}: StepContentProps) {
  return (
    <div className="space-y-4">
      <Alert><Info className="h-4 w-4" /><AlertDescription>Implement demand-side management to optimize energy costs.</AlertDescription></Alert>
      <div className="p-4 rounded-lg bg-muted/30"><p className="text-sm">Load shifting, peak shaving, and energy efficiency measures.</p></div>
    </div>
  );
}

export function EquipmentMaintenanceStep({}: StepContentProps) {
  return (
    <div className="space-y-4">
      <Alert><Info className="h-4 w-4" /><AlertDescription>Establish routine maintenance schedules for customer-owned equipment.</AlertDescription></Alert>
      <div className="p-4 rounded-lg bg-muted/30"><p className="text-sm">Regular inspection, testing, and preventive maintenance.</p></div>
    </div>
  );
}

export function ReportingProceduresStep({}: StepContentProps) {
  return (
    <div className="space-y-4">
      <Alert><Info className="h-4 w-4" /><AlertDescription>Establish reporting procedures for utility compliance.</AlertDescription></Alert>
      <div className="p-4 rounded-lg bg-muted/30"><p className="text-sm">Energy consumption reporting, incident reporting, and compliance documentation.</p></div>
    </div>
  );
}
