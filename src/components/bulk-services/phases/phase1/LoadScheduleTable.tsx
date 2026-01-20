/**
 * Itemized Load Schedule Table
 * Allows entry of individual electrical loads with quantities and ratings
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Lightbulb, Wind, Cpu, Cog, Plug, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LoadItem {
  id: string;
  category: string;
  description: string;
  quantity: number;
  ratingKw: number;
  powerFactor: number;
  demandFactor: number;
}

interface LoadScheduleTableProps {
  items: LoadItem[];
  onItemsChange: (items: LoadItem[]) => void;
  onTotalChange: (totalKva: number, maxDemandKva: number) => void;
}

const LOAD_CATEGORIES = [
  { value: 'lighting', label: 'Lighting', icon: Lightbulb, defaultPf: 0.95, defaultDf: 0.9 },
  { value: 'hvac', label: 'HVAC', icon: Wind, defaultPf: 0.85, defaultDf: 0.8 },
  { value: 'it', label: 'IT Equipment', icon: Cpu, defaultPf: 0.9, defaultDf: 0.7 },
  { value: 'motors', label: 'Motors', icon: Cog, defaultPf: 0.8, defaultDf: 0.6 },
  { value: 'general', label: 'General Power', icon: Plug, defaultPf: 0.85, defaultDf: 0.5 },
];

const getCategoryInfo = (category: string) => {
  return LOAD_CATEGORIES.find(c => c.value === category) || LOAD_CATEGORIES[4];
};

export function LoadScheduleTable({ items, onItemsChange, onTotalChange }: LoadScheduleTableProps) {
  const addItem = () => {
    const newItem: LoadItem = {
      id: crypto.randomUUID(),
      category: 'general',
      description: '',
      quantity: 1,
      ratingKw: 0,
      powerFactor: 0.85,
      demandFactor: 0.5,
    };
    onItemsChange([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof LoadItem, value: any) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-set PF and DF when category changes
        if (field === 'category') {
          const catInfo = getCategoryInfo(value);
          updatedItem.powerFactor = catInfo.defaultPf;
          updatedItem.demandFactor = catInfo.defaultDf;
        }
        
        return updatedItem;
      }
      return item;
    });
    onItemsChange(updated);
  };

  const removeItem = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id));
  };

  // Calculate totals
  const { totalKw, totalKva, maxDemandKva, categoryTotals } = useMemo(() => {
    let totalKw = 0;
    let totalKva = 0;
    let maxDemandKva = 0;
    const categoryTotals: Record<string, { kw: number; kva: number; demand: number }> = {};

    items.forEach(item => {
      const itemKw = item.quantity * item.ratingKw;
      const itemKva = itemKw / item.powerFactor;
      const itemDemand = itemKva * item.demandFactor;

      totalKw += itemKw;
      totalKva += itemKva;
      maxDemandKva += itemDemand;

      if (!categoryTotals[item.category]) {
        categoryTotals[item.category] = { kw: 0, kva: 0, demand: 0 };
      }
      categoryTotals[item.category].kw += itemKw;
      categoryTotals[item.category].kva += itemKva;
      categoryTotals[item.category].demand += itemDemand;
    });

    return { totalKw, totalKva, maxDemandKva, categoryTotals };
  }, [items]);

  // Notify parent of total changes
  useEffect(() => {
    onTotalChange(totalKva, maxDemandKva);
  }, [totalKva, maxDemandKva, onTotalChange]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Itemized Load Schedule
            </CardTitle>
            <CardDescription>
              Add individual loads with quantities and ratings for accurate calculations
            </CardDescription>
          </div>
          <Button onClick={addItem} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Load
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length > 0 ? (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[80px] text-right">Qty</TableHead>
                  <TableHead className="w-[100px] text-right">Rating (kW)</TableHead>
                  <TableHead className="w-[80px] text-right">P.F.</TableHead>
                  <TableHead className="w-[80px] text-right">D.F.</TableHead>
                  <TableHead className="w-[100px] text-right">kVA</TableHead>
                  <TableHead className="w-[100px] text-right">Max Demand</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const catInfo = getCategoryInfo(item.category);
                  const Icon = catInfo.icon;
                  const itemKw = item.quantity * item.ratingKw;
                  const itemKva = item.powerFactor > 0 ? itemKw / item.powerFactor : 0;
                  const itemDemand = itemKva * item.demandFactor;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Select 
                          value={item.category} 
                          onValueChange={(v) => updateItem(item.id, 'category', v)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LOAD_CATEGORIES.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>
                                <div className="flex items-center gap-2">
                                  <cat.icon className="h-3 w-3" />
                                  {cat.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          placeholder="e.g., AHU-01, LED Panel"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="h-8 text-right"
                          min={0}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.1"
                          value={item.ratingKw}
                          onChange={(e) => updateItem(item.id, 'ratingKw', parseFloat(e.target.value) || 0)}
                          className="h-8 text-right"
                          min={0}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={item.powerFactor}
                          onChange={(e) => updateItem(item.id, 'powerFactor', parseFloat(e.target.value) || 0)}
                          className="h-8 text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={item.demandFactor}
                          onChange={(e) => updateItem(item.id, 'demandFactor', parseFloat(e.target.value) || 0)}
                          className="h-8 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {itemKva.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {itemDemand.toFixed(1)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <Calculator className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">No loads added yet</p>
            <Button onClick={addItem} variant="outline" size="sm" className="mt-3">
              <Plus className="h-4 w-4 mr-1" />
              Add First Load
            </Button>
          </div>
        )}

        {/* Category Summary */}
        {Object.keys(categoryTotals).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 border-t">
            {Object.entries(categoryTotals).map(([cat, totals]) => {
              const catInfo = getCategoryInfo(cat);
              const Icon = catInfo.icon;
              return (
                <div key={cat} className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium">{catInfo.label}</span>
                  </div>
                  <div className="text-lg font-bold">{totals.kva.toFixed(1)} kVA</div>
                  <div className="text-xs text-muted-foreground">
                    MD: {totals.demand.toFixed(1)} kVA
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Grand Totals */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t bg-primary/5 rounded-lg p-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Connected (kW)</p>
            <p className="text-2xl font-bold">{totalKw.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Connected (kVA)</p>
            <p className="text-2xl font-bold">{totalKva.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Maximum Demand (kVA)</p>
            <p className="text-2xl font-bold text-primary">{maxDemandKva.toFixed(1)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
