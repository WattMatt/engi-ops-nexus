/**
 * ADMD Residential Calculator
 * Calculates After Diversity Maximum Demand for residential developments
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Home, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

// ADMD values per fitting level (kVA per unit)
const ADMD_VALUES = {
  basic: { label: 'Basic (15A SP)', admd: 3.5, description: 'Single phase, 15A main breaker' },
  standard: { label: 'Standard (60A SP)', admd: 5.0, description: 'Single phase, 60A main breaker' },
  high: { label: 'High (80A SP)', admd: 8.0, description: 'Single phase, 80A main breaker' },
  luxury: { label: 'Luxury (100A TP)', admd: 15.0, description: 'Three phase, 100A main breaker' },
};

// Diversity factors based on number of units (NRS 034)
const getDiversityFactor = (units: number): number => {
  if (units <= 1) return 1.0;
  if (units <= 5) return 0.85;
  if (units <= 10) return 0.75;
  if (units <= 20) return 0.65;
  if (units <= 30) return 0.55;
  if (units <= 50) return 0.50;
  if (units <= 100) return 0.45;
  return 0.40;
};

const UNIT_TYPES = [
  'Studio Apartment',
  '1-Bedroom Apartment',
  '2-Bedroom Apartment',
  '3-Bedroom Apartment',
  'Townhouse',
  'Duplex',
  'Single House',
  'Cluster House',
  'Retirement Unit',
  'Staff Quarters',
];

export function ADMDResidentialCalculator({ entries, onEntriesChange }: ADMDResidentialCalculatorProps) {
  const addEntry = () => {
    const newEntry: ADMDEntry = {
      id: crypto.randomUUID(),
      unitType: '2-Bedroom Apartment',
      fittingLevel: 'standard',
      numberOfUnits: 1,
      admdPerUnit: ADMD_VALUES.standard.admd,
      diversityFactor: 1.0,
      totalDemand: ADMD_VALUES.standard.admd,
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
      
      // Recalculate diversity factor based on number of units
      if (updates.numberOfUnits !== undefined) {
        updated.diversityFactor = getDiversityFactor(updates.numberOfUnits);
      }
      
      // Recalculate total demand
      updated.totalDemand = updated.numberOfUnits * updated.admdPerUnit * updated.diversityFactor;
      
      return updated;
    }));
  };

  const removeEntry = (id: string) => {
    onEntriesChange(entries.filter(e => e.id !== id));
  };

  // Calculate totals
  const totalUnits = entries.reduce((sum, e) => sum + e.numberOfUnits, 0);
  const totalDemand = entries.reduce((sum, e) => sum + e.totalDemand, 0);
  const connectedLoad = entries.reduce((sum, e) => sum + (e.numberOfUnits * e.admdPerUnit), 0);
  const overallDiversity = connectedLoad > 0 ? totalDemand / connectedLoad : 1;

  // Phase balance calculation
  const phaseLoads = { A: 0, B: 0, C: 0 };
  entries.forEach(e => {
    if (e.phase === 'balanced') {
      const perPhase = e.totalDemand / 3;
      phaseLoads.A += perPhase;
      phaseLoads.B += perPhase;
      phaseLoads.C += perPhase;
    } else {
      phaseLoads[e.phase] += e.totalDemand;
    }
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">ADMD Residential Calculator</CardTitle>
          </div>
          <Badge variant="outline">NRS 034</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            After Diversity Maximum Demand (ADMD) applies diversity factors from NRS 034 based on the number of units.
            Diversity reduces as unit count increases, reflecting realistic simultaneous usage patterns.
          </AlertDescription>
        </Alert>

        {/* Reference Values */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {Object.entries(ADMD_VALUES).map(([key, data]) => (
            <div key={key} className="p-2 bg-muted rounded text-center">
              <p className="font-medium">{data.label}</p>
              <p className="text-lg font-bold text-primary">{data.admd} kVA</p>
              <p className="text-muted-foreground">{data.description}</p>
            </div>
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
                  <TableHead className="w-20 text-right">Units</TableHead>
                  <TableHead className="w-24 text-right">ADMD</TableHead>
                  <TableHead className="w-24 text-right">Diversity</TableHead>
                  <TableHead className="w-20">Phase</TableHead>
                  <TableHead className="w-28 text-right">Demand (kVA)</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Select
                        value={entry.unitType}
                        onValueChange={(v) => updateEntry(entry.id, { unitType: v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
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
                    <TableCell className="text-right text-sm">
                      {entry.admdPerUnit} kVA
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {(entry.diversityFactor * 100).toFixed(0)}%
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
                      {entry.totalDemand.toFixed(1)}
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

        {/* Add Entry Button */}
        <Button variant="outline" size="sm" onClick={addEntry} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Unit Type
        </Button>

        {/* Summary */}
        {entries.length > 0 && (
          <div className="space-y-3">
            {/* Main Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Total Units</p>
                <p className="text-lg font-bold">{totalUnits}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Connected Load</p>
                <p className="text-lg font-bold">{connectedLoad.toFixed(1)} kVA</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Effective Diversity</p>
                <p className="text-lg font-bold">{(overallDiversity * 100).toFixed(0)}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Max Demand</p>
                <p className="text-lg font-bold text-primary">{totalDemand.toFixed(1)} kVA</p>
              </div>
            </div>

            {/* Phase Balance */}
            <div className="grid grid-cols-3 gap-2">
              {(['A', 'B', 'C'] as const).map(phase => (
                <div key={phase} className="p-2 bg-muted rounded text-center">
                  <p className="text-xs text-muted-foreground">Phase {phase}</p>
                  <p className="font-bold">{phaseLoads[phase].toFixed(1)} kVA</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
