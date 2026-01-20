/**
 * Category Totals Entry Card
 * Allows entry of totals per load category
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Wind, Cpu, Cog, Plug, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CategoryTotal {
  category: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  kw: number;
  powerFactor: number;
  demandFactor: number;
  typicalRange: string;
}

interface CategoryTotalsCardProps {
  onTotalChange: (totalKva: number, maxDemandKva: number) => void;
}

const DEFAULT_CATEGORIES: CategoryTotal[] = [
  { category: 'lighting', label: 'Lighting', icon: Lightbulb, kw: 0, powerFactor: 0.95, demandFactor: 0.9, typicalRange: '15-25 W/m²' },
  { category: 'hvac', label: 'HVAC', icon: Wind, kw: 0, powerFactor: 0.85, demandFactor: 0.8, typicalRange: '40-80 W/m²' },
  { category: 'it', label: 'IT Equipment', icon: Cpu, kw: 0, powerFactor: 0.9, demandFactor: 0.7, typicalRange: '5-15 W/m²' },
  { category: 'motors', label: 'Motors & Pumps', icon: Cog, kw: 0, powerFactor: 0.8, demandFactor: 0.6, typicalRange: 'Varies' },
  { category: 'general', label: 'General Power', icon: Plug, kw: 0, powerFactor: 0.85, demandFactor: 0.5, typicalRange: '10-20 W/m²' },
];

export function CategoryTotalsCard({ onTotalChange }: CategoryTotalsCardProps) {
  const [categories, setCategories] = useState<CategoryTotal[]>(DEFAULT_CATEGORIES);

  const updateCategory = (category: string, field: keyof CategoryTotal, value: number) => {
    setCategories(prev => 
      prev.map(cat => 
        cat.category === category ? { ...cat, [field]: value } : cat
      )
    );
  };

  // Calculate totals
  const { totalKw, totalKva, maxDemandKva } = useMemo(() => {
    let totalKw = 0;
    let totalKva = 0;
    let maxDemandKva = 0;

    categories.forEach(cat => {
      const kva = cat.powerFactor > 0 ? cat.kw / cat.powerFactor : 0;
      const demand = kva * cat.demandFactor;
      
      totalKw += cat.kw;
      totalKva += kva;
      maxDemandKva += demand;
    });

    return { totalKw, totalKva, maxDemandKva };
  }, [categories]);

  // Notify parent of total changes
  useEffect(() => {
    onTotalChange(totalKva, maxDemandKva);
  }, [totalKva, maxDemandKva, onTotalChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Totals</CardTitle>
        <CardDescription>
          Enter total load per category with power and demand factors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <TooltipProvider>
          <div className="space-y-4">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const kva = cat.powerFactor > 0 ? cat.kw / cat.powerFactor : 0;
              const demand = kva * cat.demandFactor;

              return (
                <div 
                  key={cat.category}
                  className="grid grid-cols-12 gap-3 items-center p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  {/* Category label */}
                  <div className="col-span-3 flex items-center gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <span className="font-medium text-sm">{cat.label}</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="ml-2 text-xs cursor-help">
                            {cat.typicalRange}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Typical range for {cat.label.toLowerCase()}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {/* kW input */}
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Load (kW)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min={0}
                      value={cat.kw || ''}
                      onChange={(e) => updateCategory(cat.category, 'kw', parseFloat(e.target.value) || 0)}
                      className="h-8"
                      placeholder="0"
                    />
                  </div>

                  {/* Power Factor */}
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      P.F.
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>Power Factor (0-1)</TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      value={cat.powerFactor}
                      onChange={(e) => updateCategory(cat.category, 'powerFactor', parseFloat(e.target.value) || 0)}
                      className="h-8"
                    />
                  </div>

                  {/* Demand Factor */}
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      D.F.
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>Demand Factor (0-1)</TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      value={cat.demandFactor}
                      onChange={(e) => updateCategory(cat.category, 'demandFactor', parseFloat(e.target.value) || 0)}
                      className="h-8"
                    />
                  </div>

                  {/* Calculated values */}
                  <div className="col-span-1 text-right">
                    <Label className="text-xs text-muted-foreground">kVA</Label>
                    <p className="font-mono text-sm font-medium">{kva.toFixed(1)}</p>
                  </div>

                  <div className="col-span-2 text-right">
                    <Label className="text-xs text-muted-foreground">Max Demand</Label>
                    <p className="font-mono text-sm font-medium text-primary">{demand.toFixed(1)} kVA</p>
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Grand Totals */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t bg-primary/5 rounded-lg p-4">
          <div>
            <p className="text-sm text-muted-foreground">Total (kW)</p>
            <p className="text-2xl font-bold">{totalKw.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total (kVA)</p>
            <p className="text-2xl font-bold">{totalKva.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Maximum Demand</p>
            <p className="text-2xl font-bold text-primary">{maxDemandKva.toFixed(1)} kVA</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
