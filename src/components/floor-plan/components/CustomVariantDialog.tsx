import React, { useState, useRef } from 'react';
import { Plus, Trash2, Download, Upload, Link } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ComponentVariant } from '@/data/assemblies';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

export interface CustomVariantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variantGroupId: string;
  variantGroupName: string;
  onAddVariant: (groupId: string, variant: ComponentVariant) => void;
  projectId?: string;
}

export const CustomVariantDialog: React.FC<CustomVariantDialogProps> = ({
  open,
  onOpenChange,
  variantGroupId,
  variantGroupName,
  onAddVariant,
  projectId,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [boqCode, setBoqCode] = useState('');
  const [supplyRate, setSupplyRate] = useState<string>('');
  const [installRate, setInstallRate] = useState<string>('');
  const [selectedFinalAccountItemId, setSelectedFinalAccountItemId] = useState<string>('');

  // Fetch Final Account items for linking
  const { data: finalAccountItems = [] } = useQuery({
    queryKey: ['final-account-items-for-variant', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data: account } = await supabase
        .from('final_accounts')
        .select('id')
        .eq('project_id', projectId)
        .single();
      
      if (!account) return [];

      const { data: items } = await supabase
        .from('final_account_items')
        .select('id, item_code, description, unit, supply_rate, install_rate')
        .order('item_code');
      
      return items || [];
    },
    enabled: open && !!projectId,
  });

  // Auto-fill fields when a Final Account item is selected
  const handleFinalAccountSelect = (itemId: string) => {
    setSelectedFinalAccountItemId(itemId);
    
    if (itemId && itemId !== 'none') {
      const item = finalAccountItems.find((i: any) => i.id === itemId);
      if (item) {
        if (!name) setName(item.item_code || '');
        if (!description) setDescription(item.description || '');
        setBoqCode(item.item_code || '');
        if (item.supply_rate) setSupplyRate(item.supply_rate.toString());
        if (item.install_rate) setInstallRate(item.install_rate.toString());
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    if (!description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    const variant: ComponentVariant = {
      id: `custom-${variantGroupId}-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      boqCode: boqCode.trim() || undefined,
      supplyRate: supplyRate ? parseFloat(supplyRate) : undefined,
      installRate: installRate ? parseFloat(installRate) : undefined,
      finalAccountItemId: selectedFinalAccountItemId && selectedFinalAccountItemId !== 'none' 
        ? selectedFinalAccountItemId 
        : undefined,
    };

    onAddVariant(variantGroupId, variant);
    
    // Reset form
    setName('');
    setDescription('');
    setBoqCode('');
    setSupplyRate('');
    setInstallRate('');
    setSelectedFinalAccountItemId('');
    onOpenChange(false);
    
    toast.success(`Added custom ${variantGroupName} variant`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Add Custom {variantGroupName}
          </DialogTitle>
          <DialogDescription>
            Create your own custom variant for {variantGroupName.toLowerCase()}. 
            You can optionally link it to a Final Account item.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Final Account Item Selector */}
          {projectId && finalAccountItems.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="final-account-item" className="flex items-center gap-2">
                <Link className="h-3.5 w-3.5 text-primary" />
                Link to Final Account Item
              </Label>
              <Select value={selectedFinalAccountItemId} onValueChange={handleFinalAccountSelect}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select Final Account item to link..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="none">No link</SelectItem>
                  {finalAccountItems.map((item: any) => (
                    <SelectItem key={item.id} value={item.id}>
                      <span className="font-mono text-xs mr-2">{item.item_code}</span>
                      <span className="text-muted-foreground">
                        {item.description?.slice(0, 40)}{item.description?.length > 40 ? '...' : ''}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Selecting an item will auto-fill the fields below
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="variant-name">Name *</Label>
            <Input
              id="variant-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., 80mm Deep Metal Box"
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="variant-desc">Description *</Label>
            <Textarea
              id="variant-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., 80mm deep galvanized steel flush box"
              className="bg-background resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="variant-boq">BOQ Code (optional)</Label>
            <Input
              id="variant-boq"
              value={boqCode}
              onChange={(e) => setBoqCode(e.target.value)}
              placeholder="e.g., E-BOX-80-STL"
              className="bg-background"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="variant-supply">Supply Rate</Label>
              <Input
                id="variant-supply"
                type="number"
                step="0.01"
                min="0"
                value={supplyRate}
                onChange={(e) => setSupplyRate(e.target.value)}
                placeholder="0.00"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="variant-install">Install Rate</Label>
              <Input
                id="variant-install"
                type="number"
                step="0.01"
                min="0"
                value={installRate}
                onChange={(e) => setInstallRate(e.target.value)}
                placeholder="0.00"
                className="bg-background"
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" />
              Add Variant
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Component for managing custom variants (view/delete/export/import)
export interface CustomVariantsManagerProps {
  customVariants: Record<string, ComponentVariant[]>;
  onDeleteVariant: (groupId: string, variantId: string) => void;
  onImportVariants: (variants: Record<string, ComponentVariant[]>) => void;
  variantGroupNames: Record<string, string>;
}

export const CustomVariantsManager: React.FC<CustomVariantsManagerProps> = ({
  customVariants,
  onDeleteVariant,
  onImportVariants,
  variantGroupNames,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasAnyVariants = Object.values(customVariants).some(v => v.length > 0);

  // Export custom variants to JSON file
  const handleExport = () => {
    if (!hasAnyVariants) {
      toast.error('No custom variants to export');
      return;
    }

    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      customVariants,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom-variants-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Custom variants exported successfully');
  };

  // Import custom variants from JSON file
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        // Validate structure
        if (!data.customVariants || typeof data.customVariants !== 'object') {
          toast.error('Invalid file format: missing customVariants');
          return;
        }

        // Validate each variant group
        let totalImported = 0;
        const validatedVariants: Record<string, ComponentVariant[]> = {};

        for (const [groupId, variants] of Object.entries(data.customVariants)) {
          if (!Array.isArray(variants)) continue;

          const validVariants: ComponentVariant[] = [];
          for (const variant of variants as ComponentVariant[]) {
            if (variant.id && variant.name && variant.description) {
              // Regenerate ID to avoid conflicts
              validVariants.push({
                ...variant,
                id: `custom-${groupId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              });
              totalImported++;
            }
          }

          if (validVariants.length > 0) {
            validatedVariants[groupId] = validVariants;
          }
        }

        if (totalImported === 0) {
          toast.error('No valid variants found in file');
          return;
        }

        onImportVariants(validatedVariants);
        toast.success(`Imported ${totalImported} custom variant(s)`);
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Failed to parse import file');
      }
    };

    reader.readAsText(file);
    
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Export/Import buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={!hasAnyVariants}
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1"
        >
          <Upload className="h-4 w-4 mr-2" />
          Import
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
      </div>

      {!hasAnyVariants ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">No custom variants defined yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click the + button next to a component dropdown to create your own variants
          </p>
        </div>
      ) : (
        Object.entries(customVariants).map(([groupId, variants]) => {
          if (variants.length === 0) return null;
          
          return (
            <div key={groupId} className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">
                {variantGroupNames[groupId] || groupId}
              </h4>
              <div className="space-y-1">
                {variants.map(variant => (
                  <div 
                    key={variant.id}
                    className="flex items-center justify-between p-2 bg-muted/30 border rounded-md"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{variant.name}</p>
                        {variant.finalAccountItemId && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            <Link className="h-2.5 w-2.5 mr-1" />
                            Linked
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{variant.description}</span>
                        {variant.boqCode && (
                          <span className="text-[10px] font-mono bg-muted px-1 rounded">
                            {variant.boqCode}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => onDeleteVariant(groupId, variant.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
