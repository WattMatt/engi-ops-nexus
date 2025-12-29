import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Check, Search, ChevronRight, X } from 'lucide-react';

interface FinalAccountItem {
  id: string;
  item_code: string | null;
  description: string;
  unit: string | null;
  supply_rate: number | null;
  install_rate: number | null;
  section_name?: string;
}

interface MasterMaterial {
  id: string;
  material_code: string | null;
  material_name: string;
  unit: string | null;
  standard_supply_cost: number | null;
  standard_install_cost: number | null;
}

interface BOQItemSelectorProps {
  finalAccountItems: FinalAccountItem[] | undefined;
  masterMaterials: MasterMaterial[] | undefined;
  selectedItemId: string | undefined;
  selectedSource: 'final_account' | 'master' | undefined;
  onSelect: (id: string, source: 'final_account' | 'master') => void;
  mappedLabel?: string;
  mappedRate?: number;
  mappedUnit?: string;
  mappedSectionName?: string;
}

export function BOQItemSelector({
  finalAccountItems,
  masterMaterials,
  selectedItemId,
  selectedSource,
  onSelect,
  mappedLabel,
  mappedRate,
  mappedUnit,
  mappedSectionName,
}: BOQItemSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const sectionName = finalAccountItems?.[0]?.section_name || 'Selected Section';

  const filteredItems = useMemo(() => {
    if (!finalAccountItems) return [];
    const search = searchTerm.toLowerCase();
    if (!search) return finalAccountItems;
    return finalAccountItems.filter(fa =>
      fa.description?.toLowerCase().includes(search) ||
      fa.item_code?.toLowerCase().includes(search)
    );
  }, [finalAccountItems, searchTerm]);

  const filteredMasterMaterials = useMemo(() => {
    if (!masterMaterials) return [];
    const search = searchTerm.toLowerCase();
    if (!search) return masterMaterials;
    return masterMaterials.filter(mm =>
      mm.material_name?.toLowerCase().includes(search) ||
      mm.material_code?.toLowerCase().includes(search)
    );
  }, [masterMaterials, searchTerm]);

  const handleSelect = (id: string, source: 'final_account' | 'master') => {
    onSelect(id, source);
    setOpen(false);
    setSearchTerm('');
  };

  const isMapped = selectedItemId && selectedSource;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={`w-full justify-between text-left font-normal h-auto min-h-[40px] py-2 ${isMapped ? 'border-primary/50 bg-primary/5' : ''}`}
        >
          {isMapped ? (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {selectedSource === 'final_account' ? 'FA' : 'MM'}
                </Badge>
                <span className="truncate text-sm">{mappedLabel}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                {mappedSectionName && (
                  <span className="text-primary/70">{mappedSectionName}</span>
                )}
                <span>R{(mappedRate || 0).toFixed(2)}/{mappedUnit}</span>
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">Select BOQ item...</span>
          )}
          <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle>Select BOQ Item</DialogTitle>
        </DialogHeader>
        
        {/* Search input */}
        <div className="flex items-center border-b px-4 py-2 shrink-0">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {searchTerm && (
            <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Section header with count */}
        <div className="px-4 py-2 text-xs font-medium border-b bg-muted/50 text-primary shrink-0">
          {sectionName} ({filteredItems.length} of {finalAccountItems?.length || 0} items)
        </div>

        {/* Scrollable items list */}
        <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: '50vh' }}>
          {filteredItems.length === 0 && filteredMasterMaterials.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {searchTerm ? `No items found matching "${searchTerm}"` : 'No items in this section'}
            </div>
          ) : (
            <div className="p-2">
              {/* Final Account Items */}
              {filteredItems.map((fa) => {
                const hasCode = fa.item_code && fa.item_code.trim().length > 0;
                const isParentItem = hasCode && /^[A-Za-z]+\d+$/.test(fa.item_code!.trim());
                const isDescriptionRow = !hasCode;

                if (isParentItem) {
                  return (
                    <div
                      key={fa.id}
                      className="px-3 py-2 text-xs font-semibold text-primary bg-muted/30 mt-3 first:mt-0 rounded-sm border-l-2 border-primary"
                    >
                      <span className="font-mono mr-2 font-bold">{fa.item_code}</span>
                      <span className="uppercase">{fa.description}</span>
                    </div>
                  );
                }

                if (isDescriptionRow) {
                  return (
                    <div
                      key={fa.id}
                      className="px-4 py-1 text-xs text-muted-foreground italic bg-muted/10 ml-2"
                    >
                      {fa.description}
                    </div>
                  );
                }

                // Child item - selectable
                const isSelected = selectedItemId === fa.id && selectedSource === 'final_account';
                return (
                  <div
                    key={fa.id}
                    onClick={() => handleSelect(fa.id, 'final_account')}
                    className={`relative flex cursor-pointer select-none items-center rounded-sm pl-8 pr-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${
                      isSelected ? 'bg-accent/50' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-primary font-medium shrink-0">{fa.item_code}</span>
                        <span className="truncate">{fa.description}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        R{((fa.supply_rate || 0) + (fa.install_rate || 0)).toFixed(2)}/{fa.unit}
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                );
              })}

              {/* Master Materials section */}
              {filteredMasterMaterials.length > 0 && (
                <div className="mt-4 border-t pt-3">
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    Master Materials
                  </div>
                  {filteredMasterMaterials.map((mm) => {
                    const isSelected = selectedItemId === mm.id && selectedSource === 'master';
                    return (
                      <div
                        key={mm.id}
                        onClick={() => handleSelect(mm.id, 'master')}
                        className={`relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${
                          isSelected ? 'bg-accent/50' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {mm.material_code && (
                              <span className="font-mono text-xs text-muted-foreground shrink-0">{mm.material_code}</span>
                            )}
                            <span className="truncate">{mm.material_name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            R{((mm.standard_supply_cost || 0) + (mm.standard_install_cost || 0)).toFixed(2)}/{mm.unit}
                          </div>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
