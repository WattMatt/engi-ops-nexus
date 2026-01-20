/**
 * Phase 1: Load Estimation & Demand Analysis
 * Card-based workflow to gather all electrical load data
 */

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PhaseContentWrapper } from './PhaseContentWrapper';
import { BulkServicesKPICard } from '../BulkServicesKPICard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator, 
  Zap, 
  TrendingUp, 
  Activity, 
  Save,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import {
  LoadEntryModeSelector,
  LoadEntryMode,
  LoadScheduleTable,
  LoadItem,
  CategoryTotalsCard,
  TypicalValuesReference,
  FutureExpansionCard,
  ElectricalStandardsCard,
} from './phase1';

interface Phase1LoadEstimationProps {
  documentId: string;
  phaseId: string;
  document: any;
  mapSelectedZone?: string | null;
}

export function Phase1LoadEstimation({ 
  documentId, 
  phaseId, 
  document,
  mapSelectedZone 
}: Phase1LoadEstimationProps) {
  const queryClient = useQueryClient();
  
  // State for load entry
  const [entryMode, setEntryMode] = useState<LoadEntryMode>('total');
  const [loadItems, setLoadItems] = useState<LoadItem[]>([]);
  const [totalKva, setTotalKva] = useState(document?.total_connected_load || 0);
  const [maxDemandKva, setMaxDemandKva] = useState(document?.maximum_demand || 0);
  const [expansionFactor, setExpansionFactor] = useState(document?.future_expansion_factor || 1.2);
  const [electricalStandard, setElectricalStandard] = useState(document?.electrical_standard || 'SANS 10142-1');
  
  // UI state
  const [saving, setSaving] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);

  // Handle totals from load entry components
  const handleTotalChange = useCallback((newTotalKva: number, newMaxDemandKva: number) => {
    setTotalKva(newTotalKva);
    setMaxDemandKva(newMaxDemandKva);
  }, []);

  // Save all Phase 1 data
  const handleSavePhase = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('bulk_services_documents')
        .update({
          total_connected_load: totalKva,
          maximum_demand: maxDemandKva,
          future_expansion_factor: expansionFactor,
          electrical_standard: electricalStandard,
        })
        .eq('id', documentId);

      if (error) throw error;
      
      await queryClient.invalidateQueries({ queryKey: ['bulk-services-document', documentId] });
      toast.success('Phase 1 data saved successfully');
    } catch (error) {
      console.error('Error saving Phase 1 data:', error);
      toast.error('Failed to save Phase 1 data');
    } finally {
      setSaving(false);
    }
  };

  // Calculate final values
  const finalDemand = maxDemandKva * expansionFactor;
  const recommendedSize = Math.ceil((finalDemand * 1.1) / 50) * 50; // Round up to nearest 50 kVA

  // Check completion status
  const isLoadComplete = totalKva > 0;
  const isDemandComplete = maxDemandKva > 0;
  const isExpansionComplete = expansionFactor > 1;
  const isStandardComplete = !!electricalStandard;
  const allComplete = isLoadComplete && isDemandComplete && isExpansionComplete && isStandardComplete;

  return (
    <PhaseContentWrapper
      phaseId={phaseId}
      phaseName="Load Estimation & Demand Analysis"
      phaseDescription="Identify and calculate all electrical loads to determine peak demand requirements"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task 1: Connected Loads Entry */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  <CardTitle>Connected Loads</CardTitle>
                  {isLoadComplete && (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription>
                Choose how to enter your connected load data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mode Selector */}
              <LoadEntryModeSelector mode={entryMode} onModeChange={setEntryMode} />

              {/* Entry Content based on mode */}
              <div className="pt-4 border-t">
                {entryMode === 'itemized' && (
                  <LoadScheduleTable
                    items={loadItems}
                    onItemsChange={setLoadItems}
                    onTotalChange={handleTotalChange}
                  />
                )}
                
                {entryMode === 'category' && (
                  <CategoryTotalsCard onTotalChange={handleTotalChange} />
                )}
                
                {entryMode === 'total' && (
                  <BulkServicesKPICard 
                    documentId={documentId} 
                    mapSelectedZone={mapSelectedZone} 
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Task 2: Future Expansion */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <CardTitle>Future Growth Planning</CardTitle>
                {isExpansionComplete && (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Set
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <FutureExpansionCard
                currentDemand={maxDemandKva}
                expansionFactor={expansionFactor}
                onExpansionFactorChange={setExpansionFactor}
              />
            </CardContent>
          </Card>

          {/* Task 3: Electrical Standards */}
          <ElectricalStandardsCard
            standard={electricalStandard}
            onStandardChange={setElectricalStandard}
          />
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Summary Card */}
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Phase 1 Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Completion</span>
                  <span className="font-medium">
                    {[isLoadComplete, isDemandComplete, isExpansionComplete, isStandardComplete].filter(Boolean).length}/4
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all"
                    style={{ 
                      width: `${([isLoadComplete, isDemandComplete, isExpansionComplete, isStandardComplete].filter(Boolean).length / 4) * 100}%` 
                    }}
                  />
                </div>
              </div>

              {/* Key Values */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Connected Load</span>
                  <span className="font-mono font-bold">{(totalKva / 1000).toFixed(1)} MVA</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Maximum Demand</span>
                  <span className="font-mono font-bold">{(maxDemandKva / 1000).toFixed(1)} MVA</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Expansion Factor</span>
                  <span className="font-mono font-bold">×{expansionFactor.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="text-sm font-medium">Final Demand</span>
                  <span className="text-lg font-bold text-primary">{(finalDemand / 1000).toFixed(2)} MVA</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Recommended Size</span>
                  <Badge variant="secondary" className="font-mono">
                    {recommendedSize} kVA
                  </Badge>
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-2 pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Checklist</p>
                <div className="space-y-1">
                  {[
                    { label: 'Connected loads identified', done: isLoadComplete },
                    { label: 'Maximum demand calculated', done: isDemandComplete },
                    { label: 'Expansion factor set', done: isExpansionComplete },
                    { label: 'Standard selected', done: isStandardComplete },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-sm">
                      {item.done ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={item.done ? 'text-muted-foreground line-through' : ''}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <Button 
                onClick={handleSavePhase} 
                disabled={saving}
                className="w-full"
                variant={allComplete ? 'default' : 'secondary'}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Phase 1 Data'}
              </Button>
            </CardContent>
          </Card>

          {/* Reference Panel (Collapsible) */}
          <Collapsible open={referenceOpen} onOpenChange={setReferenceOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                Reference Values
                {referenceOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <TypicalValuesReference />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </PhaseContentWrapper>
  );
}
