/**
 * Phase 5 Steps - Construction & Installation
 * Tracking construction milestones and commissioning
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Info, Building, Shield, Network, Gauge, 
  CheckCircle2, Clock, Wrench, Zap, 
  ClipboardCheck, Calendar, AlertTriangle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { StepContentProps } from '../StepContentRegistry';

// ============= Internal Infrastructure Step =============
export function InternalInfrastructureStep({ document }: StepContentProps) {
  const [milestones, setMilestones] = useState({
    civilWorks: false,
    cableInstallation: false,
    switchgearInstallation: false,
    transformerInstallation: false,
    dbInstallation: false,
    earthingSystem: false,
  });

  const completedCount = Object.values(milestones).filter(Boolean).length;
  const totalCount = Object.keys(milestones).length;
  const progress = (completedCount / totalCount) * 100;

  const MILESTONE_LABELS: Record<keyof typeof milestones, { label: string; description: string }> = {
    civilWorks: { label: 'Civil Works', description: 'Substation building, cable trenches' },
    cableInstallation: { label: 'Cable Installation', description: 'MV/LV cable pulling and termination' },
    switchgearInstallation: { label: 'Switchgear', description: 'MV switchgear/RMU installation' },
    transformerInstallation: { label: 'Transformer', description: 'Transformer installation and connection' },
    dbInstallation: { label: 'Distribution Boards', description: 'LV DB installation and wiring' },
    earthingSystem: { label: 'Earthing System', description: 'Earth grid and bonding' },
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Build internal electrical infrastructure including switchgear, cabling, and transformers.
          Track construction milestones to monitor progress.
        </AlertDescription>
      </Alert>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Construction Progress</span>
          <span className="font-medium">{completedCount}/{totalCount} milestones</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      {/* Milestones */}
      <div className="space-y-3">
        {Object.entries(milestones).map(([key, completed]) => {
          const milestone = MILESTONE_LABELS[key as keyof typeof milestones];
          return (
            <div 
              key={key}
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                completed 
                  ? 'border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setMilestones(prev => ({ ...prev, [key]: !prev[key as keyof typeof milestones] }))}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{milestone.label}</p>
                    <p className="text-sm text-muted-foreground">{milestone.description}</p>
                  </div>
                </div>
                <Badge variant={completed ? 'default' : 'outline'}>
                  {completed ? 'Complete' : 'Pending'}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============= Specification Compliance Step =============
export function SpecificationComplianceStep({ document }: StepContentProps) {
  const standard = document?.electrical_standard || 'SANS 10142-1';

  const COMPLIANCE_ITEMS = [
    { category: 'Wiring Standards', items: ['SANS 10142-1', 'SANS 10199', 'OHS Act'] },
    { category: 'Equipment Standards', items: ['IEC 61439 (switchgear)', 'IEC 60076 (transformers)', 'SANS 1507 (cables)'] },
    { category: 'Utility Specifications', items: ['Utility-specific technical specs', 'Protection settings', 'Metering requirements'] },
  ];

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Ensure all equipment meets utility specifications and applicable standards.
          Non-compliant equipment will be rejected during inspection.
        </AlertDescription>
      </Alert>

      {/* Current Standard */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
        <Shield className="h-6 w-6 mx-auto mb-2 text-primary" />
        <p className="text-xs text-muted-foreground">Applicable Standard</p>
        <p className="text-xl font-bold">{standard}</p>
      </div>

      {/* Compliance Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COMPLIANCE_ITEMS.map(({ category, items }) => (
          <div key={category} className="p-4 rounded-lg border bg-card">
            <p className="font-medium text-sm mb-3">{category}</p>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Key Requirements */}
      <div className="p-4 rounded-lg bg-muted/30">
        <p className="text-sm font-medium mb-2">Key Compliance Requirements:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• All equipment must have type test certificates</li>
          <li>• Fault ratings must match or exceed network fault level</li>
          <li>• Metering must be utility-approved type</li>
          <li>• Protection settings per utility coordination study</li>
        </ul>
      </div>
    </div>
  );
}

// ============= Grid Extension Step =============
export function GridExtensionStep({ document }: StepContentProps) {
  const [extensionStatus, setExtensionStatus] = useState<'not_started' | 'in_progress' | 'complete'>('not_started');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Coordinate with utility for grid extension to point of supply.
          Utility extends their network to the agreed connection point.
        </AlertDescription>
      </Alert>

      {/* Status Selection */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: 'not_started' as const, label: 'Not Started', icon: Clock },
          { value: 'in_progress' as const, label: 'In Progress', icon: Wrench },
          { value: 'complete' as const, label: 'Complete', icon: CheckCircle2 },
        ].map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setExtensionStatus(value)}
            className={`p-4 rounded-lg border-2 text-center transition-all ${
              extensionStatus === value 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            <Icon className={`h-5 w-5 mx-auto mb-2 ${
              extensionStatus === value ? 'text-primary' : 'text-muted-foreground'
            }`} />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* Extension Details */}
      <div className="space-y-4 p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-primary" />
          <span className="font-medium">Grid Extension Details</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="target-date">Target Completion Date</Label>
          <Input
            id="target-date"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="extension-notes">Notes</Label>
          <Textarea
            id="extension-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Track utility extension progress, contact details, etc."
            rows={3}
          />
        </div>
      </div>

      {/* Typical Works */}
      <div className="p-4 rounded-lg bg-muted/30">
        <p className="text-sm font-medium mb-2">Utility Extension Works May Include:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• New MV feeder installation</li>
          <li>• Pole line construction</li>
          <li>• Underground cable installation</li>
          <li>• Mini-substation installation</li>
        </ul>
      </div>
    </div>
  );
}

// ============= Testing & Commissioning Step =============
export function TestingCommissioningStep({ document }: StepContentProps) {
  const [tests, setTests] = useState({
    insulationTest: false,
    continuityTest: false,
    protectionTest: false,
    meteringTest: false,
    functionalTest: false,
    loadTest: false,
  });

  const TEST_LABELS: Record<keyof typeof tests, { label: string; description: string }> = {
    insulationTest: { label: 'Insulation Resistance', description: 'All cables and equipment' },
    continuityTest: { label: 'Continuity Test', description: 'Protective conductors' },
    protectionTest: { label: 'Protection Testing', description: 'Relay settings, trip tests' },
    meteringTest: { label: 'Metering Verification', description: 'Accuracy and CT ratios' },
    functionalTest: { label: 'Functional Tests', description: 'Switching operations' },
    loadTest: { label: 'Load Test', description: 'Initial load application' },
  };

  const completedCount = Object.values(tests).filter(Boolean).length;
  const totalCount = Object.keys(tests).length;
  const allComplete = completedCount === totalCount;

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Complete testing and commissioning of all electrical equipment.
          All tests must pass before utility energization.
        </AlertDescription>
      </Alert>

      {/* Test Progress */}
      <div className="p-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <span className="font-medium">Commissioning Tests</span>
          </div>
          <Badge variant={allComplete ? 'default' : 'outline'}>
            {completedCount}/{totalCount} Complete
          </Badge>
        </div>

        <Progress value={(completedCount / totalCount) * 100} className="h-2 mb-4" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(tests).map(([key, completed]) => {
            const test = TEST_LABELS[key as keyof typeof tests];
            return (
              <div 
                key={key}
                onClick={() => setTests(prev => ({ ...prev, [key]: !prev[key as keyof typeof tests] }))}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                  completed 
                    ? 'bg-green-50 dark:bg-green-950/30' 
                    : 'bg-muted/30 hover:bg-muted/50'
                }`}
              >
                {completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{test.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{test.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ready for Energization */}
      {allComplete && (
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 flex items-center gap-3">
          <Zap className="h-6 w-6 text-green-600" />
          <div>
            <p className="font-medium text-green-700 dark:text-green-400">Ready for Energization</p>
            <p className="text-sm text-green-600">All commissioning tests complete. Request utility energization.</p>
          </div>
        </div>
      )}

      {!allComplete && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-400">Testing Incomplete</p>
            <p className="text-sm text-amber-600">Complete all tests before requesting energization.</p>
          </div>
        </div>
      )}
    </div>
  );
}
