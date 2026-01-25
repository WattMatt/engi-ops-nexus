/**
 * SANS 10142-1 Socket Outlet Load Calculator
 * Calculates connected load based on socket outlets and lighting by building type
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Zap } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export interface SANS10142Entry {
  id: string;
  buildingType: 'residential' | 'office' | 'retail' | 'industrial' | 'education' | 'healthcare';
  description: string;
  areaSqm: number;
  socketLoadVaPerSqm: number;
  lightingLoadVaPerSqm: number;
  totalVa: number;
}

interface SANS10142LoadCalculatorProps {
  entries: SANS10142Entry[];
  onEntriesChange: (entries: SANS10142Entry[]) => void;
}

// SANS 10142-1 Table values for socket outlets and lighting
const BUILDING_TYPES = {
  residential: { 
    label: 'Residential', 
    socketVa: 25, 
    lightingVa: 10,
    description: 'Houses, apartments, townhouses'
  },
  office: { 
    label: 'Office', 
    socketVa: 35, 
    lightingVa: 15,
    description: 'General offices, call centres'
  },
  retail: { 
    label: 'Retail', 
    socketVa: 40, 
    lightingVa: 25,
    description: 'Shops, shopping centres, malls'
  },
  industrial: { 
    label: 'Industrial', 
    socketVa: 50, 
    lightingVa: 15,
    description: 'Factories, warehouses, workshops'
  },
  education: { 
    label: 'Education', 
    socketVa: 30, 
    lightingVa: 18,
    description: 'Schools, universities, training centres'
  },
  healthcare: { 
    label: 'Healthcare', 
    socketVa: 45, 
    lightingVa: 20,
    description: 'Hospitals, clinics, medical facilities'
  },
};

export function SANS10142LoadCalculator({ entries, onEntriesChange }: SANS10142LoadCalculatorProps) {
  const addEntry = () => {
    const defaultType = 'office';
    const typeData = BUILDING_TYPES[defaultType];
    const newEntry: SANS10142Entry = {
      id: crypto.randomUUID(),
      buildingType: defaultType,
      description: '',
      areaSqm: 0,
      socketLoadVaPerSqm: typeData.socketVa,
      lightingLoadVaPerSqm: typeData.lightingVa,
      totalVa: 0,
    };
    onEntriesChange([...entries, newEntry]);
  };

  const updateEntry = (id: string, updates: Partial<SANS10142Entry>) => {
    onEntriesChange(entries.map(entry => {
      if (entry.id !== id) return entry;
      
      const updated = { ...entry, ...updates };
      
      // Update default values if building type changes
      if (updates.buildingType) {
        const typeData = BUILDING_TYPES[updates.buildingType];
        updated.socketLoadVaPerSqm = typeData.socketVa;
        updated.lightingLoadVaPerSqm = typeData.lightingVa;
      }
      
      // Recalculate total
      updated.totalVa = updated.areaSqm * (updated.socketLoadVaPerSqm + updated.lightingLoadVaPerSqm);
      
      return updated;
    }));
  };

  const removeEntry = (id: string) => {
    onEntriesChange(entries.filter(e => e.id !== id));
  };

  const totalVa = entries.reduce((sum, e) => sum + e.totalVa, 0);
  const totalArea = entries.reduce((sum, e) => sum + e.areaSqm, 0);
  const totalSocketVa = entries.reduce((sum, e) => sum + (e.areaSqm * e.socketLoadVaPerSqm), 0);
  const totalLightingVa = entries.reduce((sum, e) => sum + (e.areaSqm * e.lightingLoadVaPerSqm), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">SANS 10142-1 Socket & Lighting Loads</CardTitle>
          </div>
          <Badge variant="outline">Area-Based</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Reference Table */}
        <div className="text-xs text-muted-foreground">
          <p className="mb-2 font-medium">Reference Values (VA/m²):</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {Object.entries(BUILDING_TYPES).map(([key, data]) => (
              <div key={key} className="p-2 bg-muted rounded text-center">
                <p className="font-medium">{data.label}</p>
                <p>Socket: {data.socketVa}</p>
                <p>Light: {data.lightingVa}</p>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Entries Table */}
        {entries.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-28 text-right">Area (m²)</TableHead>
                  <TableHead className="w-24 text-right">Socket</TableHead>
                  <TableHead className="w-24 text-right">Lighting</TableHead>
                  <TableHead className="w-32 text-right">Total (VA)</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Select
                        value={entry.buildingType}
                        onValueChange={(v) => updateEntry(entry.id, { buildingType: v as keyof typeof BUILDING_TYPES })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(BUILDING_TYPES).map(([key, data]) => (
                            <SelectItem key={key} value={key}>
                              {data.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={entry.description}
                        onChange={(e) => updateEntry(entry.id, { description: e.target.value })}
                        placeholder="e.g., 1st Floor Offices"
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={entry.areaSqm || ''}
                        onChange={(e) => updateEntry(entry.id, { areaSqm: parseFloat(e.target.value) || 0 })}
                        className="h-8 text-sm text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={entry.socketLoadVaPerSqm || ''}
                        onChange={(e) => updateEntry(entry.id, { socketLoadVaPerSqm: parseFloat(e.target.value) || 0 })}
                        className="h-8 text-sm text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={entry.lightingLoadVaPerSqm || ''}
                        onChange={(e) => updateEntry(entry.id, { lightingLoadVaPerSqm: parseFloat(e.target.value) || 0 })}
                        className="h-8 text-sm text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {entry.totalVa.toLocaleString()}
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
          Add Building Area
        </Button>

        {/* Summary */}
        {entries.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Area</p>
              <p className="text-lg font-bold">{totalArea.toLocaleString()} m²</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Socket Load</p>
              <p className="text-lg font-bold">{(totalSocketVa / 1000).toFixed(1)} kVA</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Lighting Load</p>
              <p className="text-lg font-bold">{(totalLightingVa / 1000).toFixed(1)} kVA</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Load</p>
              <p className="text-lg font-bold text-primary">{(totalVa / 1000).toFixed(1)} kVA</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
