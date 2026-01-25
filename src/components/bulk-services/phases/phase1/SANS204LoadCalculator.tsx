/**
 * SANS 204 Load Calculator
 * Calculates connected load based on building classification and area
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Calculator, Building2 } from 'lucide-react';

export interface SANS204Entry {
  id: string;
  buildingClass: string;
  description: string;
  areaSqm: number;
  climaticZone: number;
  vaPerSqm: number;
  totalVa: number;
}

interface SANS204LoadCalculatorProps {
  entries: SANS204Entry[];
  onEntriesChange: (entries: SANS204Entry[]) => void;
  climaticZone?: number;
}

// SANS 10142-1 Table 10.1 - Load Demand per Floor Area (VA/m²)
// These are actual electrical demand estimation values from the Wiring Code
// Values are fixed (not climate-dependent) - climate affects HVAC sizing separately
const BUILDING_CLASSES = [
  // Assembly Buildings (A)
  { code: 'A1', name: 'Entertainment & Public Assembly', vaPerSqm: { 1: 50, 2: 50, 3: 50, 4: 50, 5: 50, 6: 50 } },
  { code: 'A2', name: 'Theatrical Performance', vaPerSqm: { 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 } },
  { code: 'A3', name: 'Places of Instruction (Schools)', vaPerSqm: { 1: 25, 2: 25, 3: 25, 4: 25, 5: 25, 6: 25 } },
  { code: 'A4', name: 'Worship', vaPerSqm: { 1: 30, 2: 30, 3: 30, 4: 30, 5: 30, 6: 30 } },
  // Commercial/Mercantile Buildings (B/F)
  { code: 'B1', name: 'High Risk Commercial (Labs)', vaPerSqm: { 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 } },
  { code: 'B2', name: 'Moderate Risk Commercial', vaPerSqm: { 1: 75, 2: 75, 3: 75, 4: 75, 5: 75, 6: 75 } },
  { code: 'B3', name: 'Low Risk Commercial', vaPerSqm: { 1: 50, 2: 50, 3: 50, 4: 50, 5: 50, 6: 50 } },
  { code: 'C1', name: 'Exhibition Hall', vaPerSqm: { 1: 50, 2: 50, 3: 50, 4: 50, 5: 50, 6: 50 } },
  { code: 'C2', name: 'Museum', vaPerSqm: { 1: 40, 2: 40, 3: 40, 4: 40, 5: 40, 6: 40 } },
  // Industrial Buildings (D)
  { code: 'D1', name: 'High Risk Industrial', vaPerSqm: { 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 } },
  { code: 'D2', name: 'Moderate Risk Industrial', vaPerSqm: { 1: 75, 2: 75, 3: 75, 4: 75, 5: 75, 6: 75 } },
  { code: 'D3', name: 'Low Risk Industrial/Warehouse', vaPerSqm: { 1: 25, 2: 25, 3: 25, 4: 25, 5: 25, 6: 25 } },
  // Institutional Buildings (E)
  { code: 'E1', name: 'Place of Detention', vaPerSqm: { 1: 50, 2: 50, 3: 50, 4: 50, 5: 50, 6: 50 } },
  { code: 'E2', name: 'Hospital', vaPerSqm: { 1: 150, 2: 150, 3: 150, 4: 150, 5: 150, 6: 150 } },
  { code: 'E3', name: 'Other Institutional (Clinics)', vaPerSqm: { 1: 75, 2: 75, 3: 75, 4: 75, 5: 75, 6: 75 } },
  // Mercantile Buildings (F)
  { code: 'F1', name: 'Large Shop/Mall (>250m²)', vaPerSqm: { 1: 75, 2: 75, 3: 75, 4: 75, 5: 75, 6: 75 } },
  { code: 'F2', name: 'Small Shop (<250m²)', vaPerSqm: { 1: 50, 2: 50, 3: 50, 4: 50, 5: 50, 6: 50 } },
  { code: 'F3', name: 'Wholesaler/Storage', vaPerSqm: { 1: 25, 2: 25, 3: 25, 4: 25, 5: 25, 6: 25 } },
  // Office Buildings (G)
  { code: 'G1', name: 'Offices (General)', vaPerSqm: { 1: 50, 2: 50, 3: 50, 4: 50, 5: 50, 6: 50 } },
  { code: 'G1-IT', name: 'Offices (High IT Density)', vaPerSqm: { 1: 80, 2: 80, 3: 80, 4: 80, 5: 80, 6: 80 } },
  // Residential/Hospitality (H)
  { code: 'H1', name: 'Hotel', vaPerSqm: { 1: 50, 2: 50, 3: 50, 4: 50, 5: 50, 6: 50 } },
  { code: 'H2', name: 'Dormitory/Hostel', vaPerSqm: { 1: 30, 2: 30, 3: 30, 4: 30, 5: 30, 6: 30 } },
  { code: 'H3', name: 'Domestic Residence (Flats)', vaPerSqm: { 1: 30, 2: 30, 3: 30, 4: 30, 5: 30, 6: 30 } },
  { code: 'H4', name: 'Dwelling House', vaPerSqm: { 1: 50, 2: 50, 3: 50, 4: 50, 5: 50, 6: 50 } },
  { code: 'H5', name: 'Restaurant/Kitchen', vaPerSqm: { 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100 } },
  // Parking & Ancillary
  { code: 'J1', name: 'Parking Garage (Covered)', vaPerSqm: { 1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 10 } },
  { code: 'J2', name: 'Plant Room/Service Areas', vaPerSqm: { 1: 25, 2: 25, 3: 25, 4: 25, 5: 25, 6: 25 } },
];

export function SANS204LoadCalculator({ 
  entries, 
  onEntriesChange, 
  climaticZone = 3 
}: SANS204LoadCalculatorProps) {
  const [selectedZone, setSelectedZone] = useState(climaticZone);

  useEffect(() => {
    setSelectedZone(climaticZone);
  }, [climaticZone]);

  const getVaPerSqm = (buildingClass: string, zone: number): number => {
    const building = BUILDING_CLASSES.find(b => b.code === buildingClass);
    if (!building) return 0;
    return building.vaPerSqm[zone as keyof typeof building.vaPerSqm] || 100;
  };

  const addEntry = () => {
    const newEntry: SANS204Entry = {
      id: crypto.randomUUID(),
      buildingClass: 'G1',
      description: '',
      areaSqm: 0,
      climaticZone: selectedZone,
      vaPerSqm: getVaPerSqm('G1', selectedZone),
      totalVa: 0,
    };
    onEntriesChange([...entries, newEntry]);
  };

  const updateEntry = (id: string, updates: Partial<SANS204Entry>) => {
    onEntriesChange(entries.map(entry => {
      if (entry.id !== id) return entry;
      
      const updated = { ...entry, ...updates };
      
      // Recalculate VA/m² if building class or zone changes
      if (updates.buildingClass || updates.climaticZone) {
        updated.vaPerSqm = getVaPerSqm(
          updates.buildingClass || entry.buildingClass,
          updates.climaticZone || entry.climaticZone
        );
      }
      
      // Recalculate total
      updated.totalVa = updated.areaSqm * updated.vaPerSqm;
      
      return updated;
    }));
  };

  const removeEntry = (id: string) => {
    onEntriesChange(entries.filter(e => e.id !== id));
  };

  const totalVa = entries.reduce((sum, e) => sum + e.totalVa, 0);
  const totalArea = entries.reduce((sum, e) => sum + e.areaSqm, 0);
  const effectiveVaPerSqm = totalArea > 0 ? totalVa / totalArea : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">SANS 204 Building Classifications</CardTitle>
          </div>
          <Badge variant="outline">Zone {selectedZone}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Zone Selector */}
        <div className="flex items-center gap-4">
          <Label className="text-sm text-muted-foreground">Climatic Zone:</Label>
          <Select 
            value={selectedZone.toString()} 
            onValueChange={(v) => {
              const zone = parseInt(v);
              setSelectedZone(zone);
              // Update all entries with new zone
              onEntriesChange(entries.map(e => ({
                ...e,
                climaticZone: zone,
                vaPerSqm: getVaPerSqm(e.buildingClass, zone),
                totalVa: e.areaSqm * getVaPerSqm(e.buildingClass, zone),
              })));
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6].map(z => (
                <SelectItem key={z} value={z.toString()}>Zone {z}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Entries Table */}
        {entries.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Class</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-28 text-right">Area (m²)</TableHead>
                  <TableHead className="w-28 text-right">VA/m²</TableHead>
                  <TableHead className="w-32 text-right">Total (VA)</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Select
                        value={entry.buildingClass}
                        onValueChange={(v) => updateEntry(entry.id, { buildingClass: v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BUILDING_CLASSES.map(b => (
                            <SelectItem key={b.code} value={b.code}>
                              {b.code} - {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={entry.description}
                        onChange={(e) => updateEntry(entry.id, { description: e.target.value })}
                        placeholder="e.g., Ground Floor Office"
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
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {entry.vaPerSqm.toFixed(0)}
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
          Add Building Zone
        </Button>

        {/* Summary */}
        {entries.length > 0 && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Area</p>
              <p className="text-lg font-bold">{totalArea.toLocaleString()} m²</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Avg VA/m²</p>
              <p className="text-lg font-bold">{effectiveVaPerSqm.toFixed(1)}</p>
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
