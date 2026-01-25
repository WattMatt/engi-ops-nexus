/**
 * Phase 6 Steps - Operation & Monitoring
 * Ongoing requirements for maintaining electrical supply
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { 
  Info, Gauge, TrendingDown, Wrench, FileText,
  CheckCircle2, AlertTriangle, Calendar, BarChart3,
  Clock, Zap, DollarSign
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { StepContentProps } from '../StepContentRegistry';

// ============= Power Factor Step =============
export function PowerFactorStep({ document }: StepContentProps) {
  const [currentPF, setCurrentPF] = useState(0.92);
  const [hasPFC, setHasPFC] = useState(false);
  
  const targetPF = 0.95;
  const isCompliant = currentPF >= targetPF;

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Maintain power factor above 0.95 to avoid utility penalties.
          Low power factor increases kVA demand and may trigger surcharges.
        </AlertDescription>
      </Alert>

      {/* Current Power Factor */}
      <div className="p-4 rounded-lg border-2 border-dashed bg-muted/20 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Current Power Factor</Label>
          <span className={`text-2xl font-bold ${isCompliant ? 'text-green-600' : 'text-amber-600'}`}>
            {currentPF.toFixed(2)}
          </span>
        </div>
        
        <Slider
          value={[currentPF]}
          onValueChange={([value]) => setCurrentPF(value)}
          min={0.7}
          max={1}
          step={0.01}
          className="w-full"
        />
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Poor (0.70)</span>
          <span className="text-primary font-medium">Target: {targetPF}</span>
          <span>Unity (1.00)</span>
        </div>
      </div>

      {/* Compliance Status */}
      <div className={`p-4 rounded-lg flex items-center gap-3 ${
        isCompliant ? 'bg-green-50 dark:bg-green-950/30' : 'bg-amber-50 dark:bg-amber-950/30'
      }`}>
        {isCompliant ? (
          <>
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">Compliant</p>
              <p className="text-sm text-green-600">Power factor meets utility requirements.</p>
            </div>
          </>
        ) : (
          <>
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">Below Target</p>
              <p className="text-sm text-amber-600">Consider power factor correction equipment.</p>
            </div>
          </>
        )}
      </div>

      {/* PFC Equipment */}
      <div className="p-4 rounded-lg border bg-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            <span className="font-medium">Power Factor Correction</span>
          </div>
          <Badge variant={hasPFC ? 'default' : 'secondary'}>
            {hasPFC ? 'Installed' : 'Not Installed'}
          </Badge>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-1">Correction Options:</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            <li>Capacitor banks (fixed or automatic)</li>
            <li>Synchronous condensers</li>
            <li>Active power filters</li>
            <li>VFDs with AFE (for motor loads)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ============= Demand Management Step =============
export function DemandManagementStep({ document }: StepContentProps) {
  const maxDemand = document?.maximum_demand || 0;
  const [strategies, setStrategies] = useState({
    loadShifting: false,
    peakShaving: false,
    powerStorage: false,
    solarPV: false,
    loadShedding: false,
    smartMetering: false,
  });

  const STRATEGY_INFO: Record<keyof typeof strategies, { label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = {
    loadShifting: { label: 'Load Shifting', description: 'Move non-critical loads to off-peak hours', icon: Clock },
    peakShaving: { label: 'Peak Shaving', description: 'Reduce peak demand using storage or generators', icon: TrendingDown },
    powerStorage: { label: 'Battery Storage', description: 'Store off-peak energy for peak periods', icon: Zap },
    solarPV: { label: 'Solar PV', description: 'Reduce grid demand with on-site generation', icon: Zap },
    loadShedding: { label: 'Load Shedding', description: 'Automated non-critical load disconnection', icon: AlertTriangle },
    smartMetering: { label: 'Smart Metering', description: 'Real-time monitoring and alerts', icon: BarChart3 },
  };

  const activeCount = Object.values(strategies).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Implement demand-side management to optimize energy costs.
          Managing peak demand reduces capacity charges and improves efficiency.
        </AlertDescription>
      </Alert>

      {/* Current Demand */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
        <TrendingDown className="h-6 w-6 mx-auto mb-2 text-primary" />
        <p className="text-xs text-muted-foreground">Contracted Maximum Demand</p>
        <p className="text-2xl font-bold">{maxDemand.toLocaleString()} kVA</p>
      </div>

      {/* DSM Strategies */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Active Strategies</Label>
          <Badge variant="outline">{activeCount} selected</Badge>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(strategies).map(([key, active]) => {
            const strategy = STRATEGY_INFO[key as keyof typeof strategies];
            const Icon = strategy.icon;
            return (
              <div 
                key={key}
                onClick={() => setStrategies(prev => ({ ...prev, [key]: !prev[key as keyof typeof strategies] }))}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  active 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-medium text-sm">{strategy.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{strategy.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Benefits */}
      <div className="p-4 rounded-lg bg-muted/30 flex items-start gap-3">
        <DollarSign className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">Cost Reduction Potential</p>
          <p className="text-xs text-muted-foreground">
            Effective DSM can reduce electricity costs by 10-30% through peak demand 
            management and time-of-use optimization.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============= Equipment Maintenance Step =============
export function EquipmentMaintenanceStep({ document }: StepContentProps) {
  const [nextInspection, setNextInspection] = useState('');
  const [notes, setNotes] = useState('');

  const MAINTENANCE_SCHEDULE = [
    { item: 'Transformer oil testing', frequency: 'Annual' },
    { item: 'Switchgear inspection', frequency: '6 months' },
    { item: 'Protection relay testing', frequency: 'Annual' },
    { item: 'Thermal imaging survey', frequency: 'Annual' },
    { item: 'Earthing system test', frequency: '2 years' },
    { item: 'Circuit breaker service', frequency: 'As per manufacturer' },
  ];

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Establish routine maintenance schedules for customer-owned equipment.
          Regular maintenance prevents failures and extends equipment life.
        </AlertDescription>
      </Alert>

      {/* Next Inspection */}
      <div className="p-4 rounded-lg border-2 border-dashed bg-muted/20 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <Label className="text-base font-semibold">Next Scheduled Inspection</Label>
        </div>
        <Input
          type="date"
          value={nextInspection}
          onChange={(e) => setNextInspection(e.target.value)}
        />
      </div>

      {/* Maintenance Schedule */}
      <div className="p-4 rounded-lg border bg-card space-y-3">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          <span className="font-medium">Recommended Maintenance Schedule</span>
        </div>
        
        <div className="space-y-2">
          {MAINTENANCE_SCHEDULE.map(({ item, frequency }, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm">{item}</span>
              <Badge variant="outline" className="text-xs">{frequency}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Maintenance Notes */}
      <div className="space-y-2">
        <Label htmlFor="maintenance-notes">Maintenance Notes</Label>
        <Textarea
          id="maintenance-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Record maintenance activities, findings, and follow-up items..."
          rows={4}
        />
      </div>
    </div>
  );
}

// ============= Reporting Procedures Step =============
export function ReportingProceduresStep({ document }: StepContentProps) {
  const [reports, setReports] = useState({
    monthlyConsumption: false,
    peakDemandTracking: false,
    incidentReporting: false,
    complianceDocumentation: false,
    annualReview: false,
  });

  const REPORT_INFO: Record<keyof typeof reports, { label: string; description: string }> = {
    monthlyConsumption: { label: 'Monthly Consumption Reports', description: 'Energy usage trends and costs' },
    peakDemandTracking: { label: 'Peak Demand Tracking', description: 'Maximum demand monitoring' },
    incidentReporting: { label: 'Incident Reporting', description: 'Outages, faults, safety incidents' },
    complianceDocumentation: { label: 'Compliance Documentation', description: 'CoC renewals, inspections' },
    annualReview: { label: 'Annual Review', description: 'Yearly performance summary' },
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Establish reporting procedures for utility compliance and internal tracking.
          Regular reporting helps identify issues early and optimize consumption.
        </AlertDescription>
      </Alert>

      {/* Report Types */}
      <div className="space-y-3">
        <Label>Active Reports</Label>
        {Object.entries(reports).map(([key, active]) => {
          const report = REPORT_INFO[key as keyof typeof reports];
          return (
            <div 
              key={key}
              onClick={() => setReports(prev => ({ ...prev, [key]: !prev[key as keyof typeof reports] }))}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                active 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {active ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{report.label}</p>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                  </div>
                </div>
                <Badge variant={active ? 'default' : 'outline'}>
                  {active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      {/* Key Contacts */}
      <div className="p-4 rounded-lg bg-muted/30 space-y-2">
        <p className="text-sm font-medium">Key Utility Contacts:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Fault reporting hotline</li>
          <li>• Account management</li>
          <li>• Technical queries</li>
          <li>• Metering disputes</li>
        </ul>
      </div>
    </div>
  );
}
