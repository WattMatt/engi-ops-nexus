// Phase 4 Steps - Design & Approval
import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { StepContentProps } from '../StepContentRegistry';

export function UtilityReviewStep({}: StepContentProps) {
  return (
    <div className="space-y-4">
      <Alert><Info className="h-4 w-4" /><AlertDescription>Utility engineers assess feasibility and grid impact of the application.</AlertDescription></Alert>
      <div className="p-4 rounded-lg bg-muted/30"><p className="text-sm">Await utility technical review and respond to any queries.</p></div>
    </div>
  );
}

export function NetworkAssessmentStep({}: StepContentProps) {
  return (
    <div className="space-y-4">
      <Alert><Info className="h-4 w-4" /><AlertDescription>Utility evaluates whether feeder or substation upgrades are required.</AlertDescription></Alert>
      <div className="p-4 rounded-lg bg-muted/30"><p className="text-sm">Network reinforcement may add time and cost to the connection.</p></div>
    </div>
  );
}

export function TechnicalDrawingsStep({}: StepContentProps) {
  return (
    <div className="space-y-4">
      <Alert><Info className="h-4 w-4" /><AlertDescription>Submit technical drawings for utility approval.</AlertDescription></Alert>
      <div className="p-4 rounded-lg bg-muted/30"><p className="text-sm">Include single-line diagrams, layout drawings, and protection coordination studies.</p></div>
    </div>
  );
}

export function ConnectionAgreementStep({}: StepContentProps) {
  return (
    <div className="space-y-4">
      <Alert><Info className="h-4 w-4" /><AlertDescription>Sign the connection agreement with terms, tariffs, and responsibilities.</AlertDescription></Alert>
      <div className="p-4 rounded-lg bg-muted/30"><p className="text-sm">Review and sign the formal connection agreement with the utility.</p></div>
    </div>
  );
}
