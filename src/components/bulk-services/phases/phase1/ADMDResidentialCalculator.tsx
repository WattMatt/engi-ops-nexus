/**
 * ADMD Residential Calculator
 * Calculates After Diversity Maximum Demand for residential developments
 * Based on NRS 034-1:2007 and SANS 507
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Home, Info, AlertTriangle, Scale, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface ADMDEntry {
  id: string;
  unitType: string;
  fittingLevel: 'basic' | 'standard' | 'high' | 'luxury';
  numberOfUnits: number;
  admdPerUnit: number;
  diversityFactor: number;
  totalDemand: number;
  phase: 'A' | 'B' | 'C' | 'balanced';
}

interface ADMDResidentialCalculatorProps {
  entries: ADMDEntry[];
  onEntriesChange: (entries: ADMDEntry[]) => void;
}

// ADMD values per fitting level (kVA per unit) - NRS 034-1 Table 1
const ADMD_VALUES = {
  basic: { 
    label: 'Basic (15A SP)', 
    admd: 3.5, 
    description: 'Single phase, 15A main breaker',
    typical: 'Low-cost housing, RDP'
  },
  standard: { 
    label: 'Standard (60A SP)', 
    admd: 5.0, 
    description: 'Single phase, 60A main breaker',
    typical: 'Apartments, townhouses'
  },
  high: { 
    label: 'High (80A SP)', 
    admd: 8.0, 
    description: 'Single phase, 80A main breaker',
    typical: 'Larger homes, cluster houses'
  },
  luxury: { 
    label: 'Luxury (100A TP)', 
    admd: 15.0, 
    description: 'Three phase, 100A main breaker',
    typical: 'Luxury estates, large villas'
  },
};

// NRS 034-1:2007 Diversity Factor Table (cumulative)
// This table provides diversity factors for different unit counts
const NRS034_DIVERSITY_TABLE = [
  { units: 1, factor: 1.00 },
  { units: 2, factor: 0.95 },
  { units: 3, factor: 0.90 },
  { units: 4, factor: 0.86 },
  { units: 5, factor: 0.83 },
  { units: 6, factor: 0.80 },
  { units: 7, factor: 0.78 },
  { units: 8, factor: 0.76 },
  { units: 9, factor: 0.74 },
  { units: 10, factor: 0.72 },
  { units: 12, factor: 0.69 },
  { units: 14, factor: 0.67 },
  { units: 16, factor: 0.65 },
  { units: 18, factor: 0.63 },
  { units: 20, factor: 0.62 },
  { units: 25, factor: 0.59 },
  { units: 30, factor: 0.56 },
  { units: 35, factor: 0.54 },
  { units: 40, factor: 0.52 },
  { units: 45, factor: 0.51 },
  { units: 50, factor: 0.50 },
  { units: 60, factor: 0.48 },
  { units: 70, factor: 0.46 },
  { units: 80, factor: 0.45 },
  { units: 90, factor: 0.44 },
  { units: 100, factor: 0.43 },
  { units: 150, factor: 0.41 },
  { units: 200, factor: 0.40 },
  { units: 300, factor: 0.38 },
  { units: 500, factor: 0.36 },
  { units: 1000, factor: 0.34 },
];

// Interpolate diversity factor from NRS 034 table
const getDiversityFactor = (units: number): number => {
  if (units <= 0) return 1.0;
  if (units === 1) return 1.0;
  
  // Find the two table entries to interpolate between
  let lower = NRS034_DIVERSITY_TABLE[0];
  let upper = NRS034_DIVERSITY_TABLE[NRS034_DIVERSITY_TABLE.length - 1];
  
  for (let i = 0; i < NRS034_DIVERSITY_TABLE.length - 1; i++) {
    if (units >= NRS034_DIVERSITY_TABLE[i].units && units <= NRS034_DIVERSITY_TABLE[i + 1].units) {
      lower = NRS034_DIVERSITY_TABLE[i];
      upper = NRS034_DIVERSITY_TABLE[i + 1];
      break;
    }
  }
  
  // If units exceed table, use minimum factor
  if (units >= upper.units) return upper.factor;
  
  // Linear interpolation
  const ratio = (units - lower.units) / (upper.units - lower.units);
  return lower.factor - ratio * (lower.factor - upper.factor);
};

// Calculate aggregate diversity factor for multiple unit types
const getAggregateDiversityFactor = (totalUnits: number): number => {
  return getDiversityFactor(totalUnits);
};

const UNIT_TYPES = [
  { value: 'studio', label: 'Studio Apartment', defaultFitting: 'basic' as const },
  { value: '1bed', label: '1-Bedroom Apartment', defaultFitting: 'standard' as const },
  { value: '2bed', label: '2-Bedroom Apartment', defaultFitting: 'standard' as const },
  { value: '3bed', label: '3-Bedroom Apartment', defaultFitting: 'high' as const },
  { value: 'townhouse', label: 'Townhouse', defaultFitting: 'high' as const },
  { value: 'duplex', label: 'Duplex', defaultFitting: 'high' as const },
  { value: 'single', label: 'Single House', defaultFitting: 'high' as const },
  { value: 'cluster', label: 'Cluster House', defaultFitting: 'high' as const },
  { value: 'estate', label: 'Estate / Villa', defaultFitting: 'luxury' as const },
  { value: 'retirement', label: 'Retirement Unit', defaultFitting: 'standard' as const },
  { value: 'staff', label: 'Staff Quarters', defaultFitting: 'basic' as const },
  { value: 'rdp', label: 'RDP / Low-cost', defaultFitting: 'basic' as const },
];

export function ADMDResidentialCalculator({ entries, onEntriesChange }: ADMDResidentialCalculatorProps) {
  const [showDiversityTable, setShowDiversityTable] = useState(false);

  const addEntry = (unitTypeValue?: string) => {
    const unitType = UNIT_TYPES.find(u => u.value === unitTypeValue) || UNIT_TYPES[2]; // Default to 2-bed
    const fittingLevel = unitType.defaultFitting;
    
    const newEntry: ADMDEntry = {
      id: crypto.randomUUID(),
      unitType: unitType.label,
      fittingLevel,
      numberOfUnits: 1,
      admdPerUnit: ADMD_VALUES[fittingLevel].admd,
      diversityFactor: 1.0,
      totalDemand: ADMD_VALUES[fittingLevel].admd,
      phase: 'balanced',
    };
    onEntriesChange([...entries, newEntry]);
  };

  const updateEntry = (id: string, updates: Partial<ADMDEntry>) => {
    onEntriesChange(entries.map(entry => {
      if (entry.id !== id) return entry;
      
      const updated = { ...entry, ...updates };
      
      // Update ADMD value if fitting level changes
      if (updates.fittingLevel) {
        updated.admdPerUnit = ADMD_VALUES[updates.fittingLevel].admd;
      }
      
      // Recalculate total demand (diversity applied at aggregate level)
      updated.totalDemand = updated.numberOfUnits * updated.admdPerUnit;
      
      return updated;
    }));
  };

  const removeEntry = (id: string) => {
    onEntriesChange(entries.filter(e => e.id !== id));
  };

  // Calculate totals with aggregate diversity
  const calculations = useMemo(() => {
    const totalUnits = entries.reduce((sum, e) => sum + e.numberOfUnits, 0);
    const connectedLoad = entries.reduce((sum, e) => sum + (e.numberOfUnits * e.admdPerUnit), 0);
    
    // Apply aggregate diversity factor based on total units
    const aggregateDiversityFactor = getAggregateDiversityFactor(totalUnits);
    const maxDemand = connectedLoad * aggregateDiversityFactor;
    
    // Per-entry diversity for display (individual row calculations)
    const entriesWithDiversity = entries.map(e => ({
      ...e,
      diversityFactor: getDiversityFactor(e.numberOfUnits),
      individualDemand: e.numberOfUnits * e.admdPerUnit * getDiversityFactor(e.numberOfUnits)
    }));

    // Phase balance calculation
    const phaseLoads = { A: 0, B: 0, C: 0 };
    const phaseUnits = { A: 0, B: 0, C: 0 };
    
    entries.forEach(e => {
      const entryDemand = (e.numberOfUnits * e.admdPerUnit * aggregateDiversityFactor);
      
      if (e.phase === 'balanced') {
        const perPhase = entryDemand / 3;
        const unitsPerPhase = e.numberOfUnits / 3;
        phaseLoads.A += perPhase;
        phaseLoads.B += perPhase;
        phaseLoads.C += perPhase;
        phaseUnits.A += unitsPerPhase;
        phaseUnits.B += unitsPerPhase;
        phaseUnits.C += unitsPerPhase;
      } else {
        phaseLoads[e.phase] += entryDemand;
        phaseUnits[e.phase] += e.numberOfUnits;
      }
    });

    // Calculate phase imbalance
    const maxPhaseLoad = Math.max(phaseLoads.A, phaseLoads.B, phaseLoads.C);
    const minPhaseLoad = Math.min(phaseLoads.A, phaseLoads.B, phaseLoads.C);
    const avgPhaseLoad = (phaseLoads.A + phaseLoads.B + phaseLoads.C) / 3;
    const imbalancePercent = avgPhaseLoad > 0 ? ((maxPhaseLoad - minPhaseLoad) / avgPhaseLoad) * 100 : 0;
    const isBalanced = imbalancePercent <= 15; // 15% threshold

    return {
      totalUnits,
      connectedLoad,
      aggregateDiversityFactor,
      maxDemand,
      entriesWithDiversity,
      phaseLoads,
      phaseUnits,
      imbalancePercent,
      isBalanced,
      maxPhaseLoad,
    };
  }, [entries]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">ADMD Residential Calculator</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">NRS 034-1:2007</Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowDiversityTable(!showDiversityTable)}
              className="text-xs"
            >
              {showDiversityTable ? 'Hide' : 'Show'} Table
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            ADMD (After Diversity Maximum Demand) calculations per NRS 034-1. 
            Diversity factors are applied to the <strong>aggregate</strong> unit count, 
            not individual rows. Phase balancing ensures load distribution within 15%.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="calculator" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger value="reference">ADMD Values</TabsTrigger>
            <TabsTrigger value="diversity">Diversity Table</TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="space-y-4">
            {/* Quick Add Unit Types */}
            <div className="flex flex-wrap gap-2">
              {UNIT_TYPES.slice(0, 6).map(type => (
                <Button
                  key={type.value}
                  variant="outline"
                  size="sm"
                  onClick={() => addEntry(type.value)}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {type.label}
                </Button>
              ))}
            </div>

            {/* Entries Table */}
            {entries.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit Type</TableHead>
                      <TableHead className="w-36">Fitting Level</TableHead>
                      <TableHead className="w-24 text-right">Units</TableHead>
                      <TableHead className="w-24 text-right">ADMD/Unit</TableHead>
                      <TableHead className="w-24">Phase</TableHead>
                      <TableHead className="w-28 text-right">Connected (kVA)</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Select
                            value={UNIT_TYPES.find(u => u.label === entry.unitType)?.value || '2bed'}
                            onValueChange={(v) => {
                              const type = UNIT_TYPES.find(u => u.value === v);
                              if (type) {
                                updateEntry(entry.id, { 
                                  unitType: type.label,
                                  fittingLevel: type.defaultFitting,
                                  admdPerUnit: ADMD_VALUES[type.defaultFitting].admd
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNIT_TYPES.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={entry.fittingLevel}
                            onValueChange={(v) => updateEntry(entry.id, { fittingLevel: v as keyof typeof ADMD_VALUES })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ADMD_VALUES).map(([key, data]) => (
                                <SelectItem key={key} value={key}>{data.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={entry.numberOfUnits || ''}
                            onChange={(e) => updateEntry(entry.id, { numberOfUnits: parseInt(e.target.value) || 0 })}
                            className="h-8 text-sm text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {entry.admdPerUnit} kVA
                        </TableCell>
                        <TableCell>
                          <Select
                            value={entry.phase}
                            onValueChange={(v) => updateEntry(entry.id, { phase: v as ADMDEntry['phase'] })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="balanced">Balanced</SelectItem>
                              <SelectItem value="A">Phase A</SelectItem>
                              <SelectItem value="B">Phase B</SelectItem>
                              <SelectItem value="C">Phase C</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {(entry.numberOfUnits * entry.admdPerUnit).toFixed(1)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeEntry(entry.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Add Custom Entry Button */}
            <Button variant="outline" size="sm" onClick={() => addEntry()} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Unit Type
            </Button>

            {/* Summary Section */}
            {entries.length > 0 && (
              <div className="space-y-4">
                <Separator />
                
                {/* Main Calculations */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground mb-1">Total Units</p>
                    <p className="text-2xl font-bold">{calculations.totalUnits}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground mb-1">Connected Load</p>
                    <p className="text-2xl font-bold">{calculations.connectedLoad.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">kVA</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            <p className="text-xs text-muted-foreground mb-1">Diversity Factor</p>
                            <p className="text-2xl font-bold">{(calculations.aggregateDiversityFactor * 100).toFixed(0)}%</p>
                            <p className="text-xs text-muted-foreground">NRS 034</p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Aggregate diversity for {calculations.totalUnits} units</p>
                          <p className="text-xs text-muted-foreground">From NRS 034-1 Table 1</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg text-center border border-primary/20 col-span-2 md:col-span-1">
                    <p className="text-xs text-muted-foreground mb-1">Max Demand (ADMD)</p>
                    <p className="text-2xl font-bold text-primary">{calculations.maxDemand.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">kVA</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground mb-1">Per Phase (Avg)</p>
                    <p className="text-2xl font-bold">{(calculations.maxDemand / 3).toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">kVA</p>
                  </div>
                </div>

                {/* Phase Balance Section */}
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Phase Balance</span>
                    </div>
                    {calculations.isBalanced ? (
                      <Badge variant="default" className="bg-green-500">Balanced</Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Imbalanced ({calculations.imbalancePercent.toFixed(0)}%)
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {(['A', 'B', 'C'] as const).map(phase => {
                      const load = calculations.phaseLoads[phase];
                      const units = calculations.phaseUnits[phase];
                      const percentage = calculations.maxDemand > 0 
                        ? (load / calculations.maxDemand) * 100 
                        : 0;
                      const isMax = load === calculations.maxPhaseLoad && calculations.maxPhaseLoad > 0;
                      
                      return (
                        <div 
                          key={phase} 
                          className={`p-3 rounded-lg text-center ${
                            isMax && !calculations.isBalanced 
                              ? 'bg-destructive/10 border border-destructive/20' 
                              : 'bg-muted'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Zap className="h-3 w-3" />
                            <span className="text-xs font-medium">Phase {phase}</span>
                          </div>
                          <p className="text-lg font-bold">{load.toFixed(1)} kVA</p>
                          <p className="text-xs text-muted-foreground">
                            ~{Math.round(units)} units
                          </p>
                          <Progress 
                            value={percentage * 3} 
                            className="h-1 mt-2" 
                          />
                        </div>
                      );
                    })}
                  </div>
                  
                  {!calculations.isBalanced && (
                    <Alert variant="destructive" className="py-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Phase imbalance exceeds 15%. Consider redistributing units across phases 
                        or selecting "Balanced" for more entries.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="reference" className="space-y-4">
            {/* ADMD Reference Values */}
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(ADMD_VALUES).map(([key, data]) => (
                <div key={key} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{data.label}</span>
                    <Badge variant="secondary">{data.admd} kVA</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{data.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">Typical: {data.typical}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="diversity" className="space-y-4">
            {/* NRS 034 Diversity Table */}
            <div className="text-sm text-muted-foreground mb-2">
              <p>NRS 034-1:2007 Diversity Factors for Residential Developments</p>
            </div>
            <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number of Units</TableHead>
                    <TableHead className="text-right">Diversity Factor</TableHead>
                    <TableHead className="text-right">Effective %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {NRS034_DIVERSITY_TABLE.map((row, idx) => (
                    <TableRow 
                      key={idx}
                      className={calculations.totalUnits >= row.units && 
                        (idx === NRS034_DIVERSITY_TABLE.length - 1 || calculations.totalUnits < NRS034_DIVERSITY_TABLE[idx + 1].units)
                        ? 'bg-primary/10' : ''}
                    >
                      <TableCell>{row.units}</TableCell>
                      <TableCell className="text-right font-mono">{row.factor.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{(row.factor * 100).toFixed(0)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              Linear interpolation is applied between table values. Current calculation uses 
              factor of <strong>{(calculations.aggregateDiversityFactor * 100).toFixed(1)}%</strong> for{' '}
              <strong>{calculations.totalUnits}</strong> units.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
