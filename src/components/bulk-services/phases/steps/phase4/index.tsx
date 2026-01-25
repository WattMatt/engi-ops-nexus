/**
 * Phase 4 Steps - Design & Approval
 * Tracking utility review and formal approval process
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Save, Info, FileCheck, Network, FileImage, 
  FileSignature, CheckCircle2, Clock, AlertTriangle,
  Hourglass, XCircle, CircleDot
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { StepContentProps } from '../StepContentRegistry';

type ReviewStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'revision_required';

const STATUS_OPTIONS: { value: ReviewStatus; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { value: 'pending', label: 'Pending Submission', icon: Clock, color: 'text-muted-foreground' },
  { value: 'in_review', label: 'Under Review', icon: Hourglass, color: 'text-blue-600' },
  { value: 'approved', label: 'Approved', icon: CheckCircle2, color: 'text-green-600' },
  { value: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-destructive' },
  { value: 'revision_required', label: 'Revision Required', icon: AlertTriangle, color: 'text-amber-600' },
];

// ============= Utility Review Step =============
export function UtilityReviewStep({ document }: StepContentProps) {
  const [status, setStatus] = useState<ReviewStatus>('pending');
  const [notes, setNotes] = useState('');

  const selectedStatus = STATUS_OPTIONS.find(s => s.value === status);
  const StatusIcon = selectedStatus?.icon || Clock;

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Utility engineers assess feasibility and grid impact of the application.
          Track review progress and respond to any queries.
        </AlertDescription>
      </Alert>

      {/* Status Selection */}
      <div className="space-y-3">
        <Label>Review Status</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {STATUS_OPTIONS.map(({ value, label, icon: Icon, color }) => (
            <button
              key={value}
              onClick={() => setStatus(value)}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                status === value 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Current Status Display */}
      <div className={`p-4 rounded-lg flex items-center gap-3 ${
        status === 'approved' ? 'bg-green-50 dark:bg-green-950/30' :
        status === 'rejected' ? 'bg-red-50 dark:bg-red-950/30' :
        status === 'revision_required' ? 'bg-amber-50 dark:bg-amber-950/30' :
        'bg-muted/30'
      }`}>
        <StatusIcon className={`h-6 w-6 ${selectedStatus?.color}`} />
        <div>
          <p className="font-medium">{selectedStatus?.label}</p>
          <p className="text-sm text-muted-foreground">
            {status === 'pending' && 'Application not yet submitted to utility.'}
            {status === 'in_review' && 'Utility is evaluating the application.'}
            {status === 'approved' && 'Technical review approved.'}
            {status === 'rejected' && 'Application was rejected. Review feedback.'}
            {status === 'revision_required' && 'Changes needed before approval.'}
          </p>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="review-notes">Review Notes / Queries</Label>
        <Textarea
          id="review-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Track utility feedback and queries here..."
          rows={4}
        />
      </div>
    </div>
  );
}

// ============= Network Assessment Step =============
export function NetworkAssessmentStep({ document }: StepContentProps) {
  const [reinforcementRequired, setReinforcementRequired] = useState<string>('unknown');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [timeline, setTimeline] = useState('');

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Utility evaluates whether feeder or substation upgrades are required.
          Network reinforcement may add time and cost to the connection.
        </AlertDescription>
      </Alert>

      {/* Reinforcement Required */}
      <div className="space-y-3">
        <Label>Network Reinforcement Required?</Label>
        <RadioGroup value={reinforcementRequired} onValueChange={setReinforcementRequired} className="flex gap-4">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="yes" id="reinforce-yes" />
            <Label htmlFor="reinforce-yes">Yes</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="no" id="reinforce-no" />
            <Label htmlFor="reinforce-no">No</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="unknown" id="reinforce-unknown" />
            <Label htmlFor="reinforce-unknown">Awaiting Assessment</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Reinforcement Details */}
      {reinforcementRequired === 'yes' && (
        <div className="space-y-4 p-4 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Network className="h-5 w-5" />
            <span className="font-medium">Reinforcement Required</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated-cost">Estimated Cost (R)</Label>
              <Input
                id="estimated-cost"
                type="number"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeline">Estimated Timeline</Label>
              <Input
                id="timeline"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                placeholder="e.g., 6-12 months"
              />
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Typical reinforcement works:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>New feeder installation</li>
              <li>Substation upgrade</li>
              <li>Transformer addition</li>
              <li>Line reconductoring</li>
            </ul>
          </div>
        </div>
      )}

      {reinforcementRequired === 'no' && (
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="text-green-700 dark:text-green-400">
            Existing network capacity is sufficient.
          </span>
        </div>
      )}
    </div>
  );
}

// ============= Technical Drawings Step =============
export function TechnicalDrawingsStep({ document }: StepContentProps) {
  const [drawingsSubmitted, setDrawingsSubmitted] = useState(false);
  const hasDrawing = !!document?.drawing_file_path;

  const REQUIRED_DRAWINGS = [
    { name: 'Single Line Diagram', required: true },
    { name: 'Site Layout Plan', required: true },
    { name: 'Cable Route Drawing', required: true },
    { name: 'Protection Scheme', required: true },
    { name: 'Earthing Layout', required: false },
    { name: 'Substation Layout', required: false },
  ];

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Submit technical drawings for utility approval.
          Include single-line diagrams, layout drawings, and protection coordination studies.
        </AlertDescription>
      </Alert>

      {/* Drawing Status */}
      <div className={`p-4 rounded-lg ${hasDrawing ? 'bg-green-50 dark:bg-green-950/30' : 'bg-muted/30'}`}>
        <div className="flex items-center gap-3">
          <FileImage className={`h-5 w-5 ${hasDrawing ? 'text-green-600' : 'text-muted-foreground'}`} />
          <div>
            <p className={`font-medium ${hasDrawing ? 'text-green-700 dark:text-green-400' : ''}`}>
              {hasDrawing ? 'Drawing Uploaded' : 'No Drawing Uploaded'}
            </p>
            <p className="text-sm text-muted-foreground">
              {hasDrawing 
                ? 'Use the Drawing Markup tool to annotate the site drawing.'
                : 'Upload a site drawing in the document settings.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Required Drawings Checklist */}
      <div className="p-4 rounded-lg border bg-card space-y-3">
        <p className="text-sm font-medium flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-primary" />
          Drawing Requirements
        </p>
        <div className="space-y-2">
          {REQUIRED_DRAWINGS.map(({ name, required }) => (
            <div key={name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-muted-foreground" />
                <span>{name}</span>
              </div>
              {required && <Badge variant="outline" className="text-xs">Required</Badge>}
            </div>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Navigate to the Drawing Markup section to add cable routes and equipment positions.
      </p>
    </div>
  );
}

// ============= Connection Agreement Step =============
export function ConnectionAgreementStep({ document }: StepContentProps) {
  const [agreementSigned, setAgreementSigned] = useState(false);
  const [signedDate, setSignedDate] = useState('');
  const [agreementRef, setAgreementRef] = useState('');

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Sign the connection agreement with terms, tariffs, and responsibilities.
          This formalizes the supply contract between customer and utility.
        </AlertDescription>
      </Alert>

      {/* Agreement Form */}
      <div className="space-y-4 p-4 rounded-lg border-2 border-dashed bg-muted/20">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="agreement-signed"
            checked={agreementSigned}
            onChange={(e) => setAgreementSigned(e.target.checked)}
            className="h-5 w-5 rounded"
          />
          <Label htmlFor="agreement-signed" className="text-base font-medium cursor-pointer">
            Connection Agreement Signed
          </Label>
        </div>

        {agreementSigned && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="signed-date">Date Signed</Label>
              <Input
                id="signed-date"
                type="date"
                value={signedDate}
                onChange={(e) => setSignedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agreement-ref">Agreement Reference</Label>
              <Input
                id="agreement-ref"
                value={agreementRef}
                onChange={(e) => setAgreementRef(e.target.value)}
                placeholder="e.g., CA-2024-12345"
              />
            </div>
          </div>
        )}
      </div>

      {/* Agreement Contents */}
      <div className="p-4 rounded-lg border bg-card space-y-3">
        <p className="text-sm font-medium flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-primary" />
          Agreement Typically Includes
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            'Point of supply definition',
            'Supply capacity (kVA)',
            'Voltage level',
            'Tariff structure',
            'Connection charges',
            'Maintenance responsibilities',
            'Fault level limits',
            'Metering requirements',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-3 w-3 text-muted-foreground shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status Display */}
      <div className={`p-4 rounded-lg flex items-center gap-3 ${
        agreementSigned ? 'bg-green-50 dark:bg-green-950/30' : 'bg-muted/30'
      }`}>
        {agreementSigned ? (
          <>
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">Agreement Signed</p>
              <p className="text-sm text-green-600">Ready to proceed with construction.</p>
            </div>
          </>
        ) : (
          <>
            <Clock className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="font-medium">Agreement Pending</p>
              <p className="text-sm text-muted-foreground">Awaiting utility approval and contract signing.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
