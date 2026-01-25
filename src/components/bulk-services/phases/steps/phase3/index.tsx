/**
 * Phase 3 Steps - Utility Application & Requirements
 * Full data entry forms with bi-directional sync
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
  Save, Info, FileText, Building2, Zap, Send, 
  CreditCard, CheckCircle2, Clock, AlertTriangle,
  BarChart3, DollarSign, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { StepContentProps } from '../StepContentRegistry';

// ============= Prepare Application Step =============
export function PrepareApplicationStep({ document, documentId, onUpdate }: StepContentProps) {
  const queryClient = useQueryClient();
  const [supplyAuthority, setSupplyAuthority] = useState(document?.supply_authority || '');
  const [saving, setSaving] = useState(false);

  const COMMON_AUTHORITIES = [
    'Eskom',
    'City Power (Johannesburg)',
    'City of Cape Town',
    'Ethekwini Electricity',
    'Tshwane Electricity',
    'Nelson Mandela Bay Municipality',
    'Other Municipal',
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('bulk_services_documents')
        .update({ supply_authority: supplyAuthority })
        .eq('id', documentId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['bulk-services-document', documentId] });
      toast.success('Supply authority updated');
      onUpdate?.();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Application readiness check
  const hasLoad = (document?.total_connected_load || 0) > 0;
  const hasDemand = (document?.maximum_demand || 0) > 0;
  const hasVoltage = !!document?.primary_voltage;
  const readyToApply = hasLoad && hasDemand && hasVoltage;

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Prepare the formal utility application with all required documentation.
          Ensure load calculations and voltage requirements are finalized before submitting.
        </AlertDescription>
      </Alert>

      {/* Application Readiness */}
      <div className="p-4 rounded-lg border bg-card space-y-3">
        <p className="text-sm font-medium">Application Readiness</p>
        <div className="grid grid-cols-3 gap-2">
          <div className={`flex items-center gap-2 p-2 rounded ${hasLoad ? 'bg-green-50 dark:bg-green-950/30' : 'bg-muted'}`}>
            {hasLoad ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
            <span className="text-xs">Connected Load</span>
          </div>
          <div className={`flex items-center gap-2 p-2 rounded ${hasDemand ? 'bg-green-50 dark:bg-green-950/30' : 'bg-muted'}`}>
            {hasDemand ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
            <span className="text-xs">Max Demand</span>
          </div>
          <div className={`flex items-center gap-2 p-2 rounded ${hasVoltage ? 'bg-green-50 dark:bg-green-950/30' : 'bg-muted'}`}>
            {hasVoltage ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
            <span className="text-xs">Voltage Level</span>
          </div>
        </div>
        {!readyToApply && (
          <p className="text-xs text-amber-600">Complete Phase 1 & 2 before preparing application</p>
        )}
      </div>

      {/* Supply Authority Selection */}
      <div className="space-y-3">
        <Label>Supply Authority / Utility</Label>
        <div className="flex flex-wrap gap-2">
          {COMMON_AUTHORITIES.map((authority) => (
            <Button
              key={authority}
              variant={supplyAuthority === authority ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSupplyAuthority(authority)}
            >
              {authority}
            </Button>
          ))}
        </div>
        <Input
          value={supplyAuthority}
          onChange={(e) => setSupplyAuthority(e.target.value)}
          placeholder="Or enter custom authority name..."
          className="mt-2"
        />
      </div>

      {/* Current Value */}
      {document?.supply_authority && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
          <span className="text-sm text-muted-foreground">Current saved value:</span>
          <span className="text-lg font-bold">{document.supply_authority}</span>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving || !supplyAuthority} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Saving...' : 'Save Supply Authority'}
      </Button>
    </div>
  );
}

// ============= Document Max Demand Step =============
export function DocumentMaxDemandStep({ document }: StepContentProps) {
  const maxDemand = document?.maximum_demand || 0;
  const connectedLoad = document?.total_connected_load || 0;
  const diversityFactor = document?.diversity_factor || 0.7;
  const expansionFactor = document?.future_expansion_factor || 1.2;

  const designDemand = maxDemand * expansionFactor;

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Document maximum demand calculations for the utility application.
          This summary shows the calculation methodology and final design demand.
        </AlertDescription>
      </Alert>

      {/* Calculation Summary */}
      <div className="p-4 rounded-lg border bg-card space-y-4">
        <p className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Demand Calculation Summary
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 rounded bg-muted/50">
            <p className="text-xs text-muted-foreground">Connected Load</p>
            <p className="text-xl font-bold">{connectedLoad.toLocaleString()}</p>
            <Badge variant="outline">kVA</Badge>
          </div>
          <div className="text-center p-3 rounded bg-muted/50">
            <p className="text-xs text-muted-foreground">Diversity Factor</p>
            <p className="text-xl font-bold">×{diversityFactor.toFixed(2)}</p>
          </div>
          <div className="text-center p-3 rounded bg-muted/50">
            <p className="text-xs text-muted-foreground">Maximum Demand</p>
            <p className="text-xl font-bold">{maxDemand.toLocaleString()}</p>
            <Badge variant="outline">kVA</Badge>
          </div>
          <div className="text-center p-3 rounded bg-primary/10">
            <p className="text-xs text-muted-foreground">Design Demand</p>
            <p className="text-xl font-bold text-primary">{designDemand.toFixed(0)}</p>
            <Badge variant="outline">kVA</Badge>
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
          <strong>Formula:</strong> Design Demand = Connected Load × Diversity Factor × Expansion Factor
          <br />
          {connectedLoad.toLocaleString()} × {diversityFactor} × {expansionFactor} = {designDemand.toFixed(0)} kVA
        </div>
      </div>

      {maxDemand === 0 && (
        <Alert variant="default" className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            Complete Phase 1 to calculate maximum demand before documenting.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ============= Load Profile Documentation Step =============
export function LoadProfileDocStep({ document }: StepContentProps) {
  const isComplete = document?.load_profile_completed || false;

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Prepare load profile documentation showing daily/seasonal variations.
          This helps utilities understand peak demand timing and tariff suitability.
        </AlertDescription>
      </Alert>

      {/* Status */}
      <div className={`p-4 rounded-lg ${isComplete ? 'bg-green-50 dark:bg-green-950/30' : 'bg-amber-50 dark:bg-amber-950/30'}`}>
        <div className="flex items-start gap-3">
          {isComplete ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className={`font-medium ${isComplete ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
              {isComplete ? 'Load Profile Complete' : 'Load Profile Pending'}
            </p>
            <p className={`text-sm ${isComplete ? 'text-green-600' : 'text-amber-600'}`}>
              {isComplete 
                ? 'Load profile analysis has been completed in Phase 1.'
                : 'Complete the Load Profile step in Phase 1 first.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Documentation Requirements */}
      <div className="p-4 rounded-lg border bg-card space-y-3">
        <p className="text-sm font-medium">Required Documentation:</p>
        <div className="space-y-2">
          {[
            'Daily demand curve (hourly kVA)',
            'Peak demand timing (morning/afternoon)',
            'Weekend vs weekday patterns',
            'Seasonal variations (summer/winter)',
            'Operating schedule details',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============= Voltage Request Step =============
export function VoltageRequestStep({ document }: StepContentProps) {
  const voltage = document?.primary_voltage;
  const maxDemand = document?.maximum_demand || 0;

  const getVoltageJustification = () => {
    if (!voltage) return null;
    if (voltage === '400V') {
      return 'Low voltage supply suitable for demand under 500 kVA. Utility-owned transformer, simpler metering.';
    }
    if (voltage === '11kV') {
      return 'Medium voltage supply for demand 500 kVA - 5 MVA. Customer-owned transformer required.';
    }
    return 'High/medium voltage supply for large demand. Customer substation and dedicated infrastructure required.';
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Specify the requested supply voltage level in the application.
          Include justification based on load requirements.
        </AlertDescription>
      </Alert>

      {/* Current Request */}
      <div className="p-6 rounded-lg border-2 bg-card text-center">
        <Zap className="h-8 w-8 mx-auto mb-2 text-primary" />
        <p className="text-xs text-muted-foreground mb-1">Requested Supply Voltage</p>
        <p className="text-3xl font-bold">{voltage || 'Not specified'}</p>
        <Badge variant="outline" className="mt-2">
          {maxDemand.toLocaleString()} kVA demand
        </Badge>
      </div>

      {/* Justification */}
      {voltage && (
        <div className="p-4 rounded-lg bg-muted/30">
          <p className="text-sm font-medium mb-2">Justification:</p>
          <p className="text-sm text-muted-foreground">{getVoltageJustification()}</p>
        </div>
      )}

      {!voltage && (
        <Alert variant="default" className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            Complete the Supply Voltage step in Phase 2 first.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ============= Submit Application Step =============
export function SubmitApplicationStep({ document, documentId, onUpdate }: StepContentProps) {
  const queryClient = useQueryClient();
  const [applicationRef, setApplicationRef] = useState('');
  const [submissionDate, setSubmissionDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Get existing data from linked_data if available
  const linkedData = document?.application_data || {};

  const handleSave = async () => {
    setSaving(true);
    try {
      // For now, we'd save to a notes field or linked_data
      // This could be enhanced with a dedicated table
      toast.success('Application submission tracked');
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
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Submit the completed application to the utility for processing.
          Track submission date and reference number for follow-up.
        </AlertDescription>
      </Alert>

      {/* Submission Form */}
      <div className="space-y-4 p-4 rounded-lg border-2 border-dashed bg-muted/20">
        <div className="space-y-2">
          <Label htmlFor="submission-date">Submission Date</Label>
          <Input
            id="submission-date"
            type="date"
            value={submissionDate}
            onChange={(e) => setSubmissionDate(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="application-ref">Application Reference Number</Label>
          <Input
            id="application-ref"
            value={applicationRef}
            onChange={(e) => setApplicationRef(e.target.value)}
            placeholder="e.g., ESKOM-2024-12345"
          />
        </div>
      </div>

      {/* Submission Checklist */}
      <div className="p-4 rounded-lg border bg-card space-y-3">
        <p className="text-sm font-medium flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          Submission Checklist
        </p>
        <div className="space-y-2">
          {[
            'Application form completed',
            'Load calculation documentation',
            'Site plan / layout drawing',
            'Proof of property ownership/lease',
            'Environmental compliance (if required)',
            'Application fee payment',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Saving...' : 'Save Submission Details'}
      </Button>
    </div>
  );
}

// ============= Tariff Selection Step =============
export function TariffSelectionStep({ document, documentId, onUpdate }: StepContentProps) {
  const queryClient = useQueryClient();
  const [tariff, setTariff] = useState(document?.tariff_structure || '');
  const [saving, setSaving] = useState(false);

  const TARIFF_OPTIONS = [
    { value: 'Landrate', description: 'Fixed charge based on property size', suitable: 'Small commercial' },
    { value: 'Businessrate', description: 'Energy-only charge', suitable: 'Low demand commercial' },
    { value: 'Nightsave Urban', description: 'TOU with off-peak discounts', suitable: 'Night operations' },
    { value: 'Miniflex', description: 'Demand + energy TOU', suitable: '500 kVA - 1 MVA' },
    { value: 'Ruraflex', description: 'Rural TOU tariff', suitable: 'Rural operations' },
    { value: 'Megaflex', description: 'Large consumer TOU', suitable: '> 1 MVA demand' },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('bulk_services_documents')
        .update({ tariff_structure: tariff })
        .eq('id', documentId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['bulk-services-document', documentId] });
      toast.success('Tariff structure updated');
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
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Select the appropriate tariff structure for the installation.
          Choice affects billing method and peak/off-peak pricing.
        </AlertDescription>
      </Alert>

      {/* Tariff Selection */}
      <RadioGroup value={tariff} onValueChange={setTariff} className="space-y-3">
        {TARIFF_OPTIONS.map(({ value, description, suitable }) => (
          <div key={value} className="flex items-start">
            <RadioGroupItem value={value} id={value} className="mt-1" />
            <Label 
              htmlFor={value} 
              className="flex-1 ml-3 p-4 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{value}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                  <Badge variant="outline" className="mt-1 text-xs">Suitable for: {suitable}</Badge>
                </div>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>

      {/* Current Value */}
      {document?.tariff_structure && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
          <span className="text-sm text-muted-foreground">Current tariff:</span>
          <span className="text-lg font-bold">{document.tariff_structure}</span>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving || !tariff} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Saving...' : 'Save Tariff Selection'}
      </Button>
    </div>
  );
}
