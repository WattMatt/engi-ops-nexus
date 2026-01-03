import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ComponentVariant } from '@/data/assemblies';

export interface CustomVariantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variantGroupId: string;
  variantGroupName: string;
  onAddVariant: (groupId: string, variant: ComponentVariant) => void;
}

export const CustomVariantDialog: React.FC<CustomVariantDialogProps> = ({
  open,
  onOpenChange,
  variantGroupId,
  variantGroupName,
  onAddVariant,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [boqCode, setBoqCode] = useState('');
  const [supplyRate, setSupplyRate] = useState<string>('');
  const [installRate, setInstallRate] = useState<string>('');

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
    };

    onAddVariant(variantGroupId, variant);
    
    // Reset form
    setName('');
    setDescription('');
    setBoqCode('');
    setSupplyRate('');
    setInstallRate('');
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
            This will be saved and available for future use.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

// Component for managing custom variants (view/delete)
export interface CustomVariantsManagerProps {
  customVariants: Record<string, ComponentVariant[]>;
  onDeleteVariant: (groupId: string, variantId: string) => void;
  variantGroupNames: Record<string, string>;
}

export const CustomVariantsManager: React.FC<CustomVariantsManagerProps> = ({
  customVariants,
  onDeleteVariant,
  variantGroupNames,
}) => {
  const hasAnyVariants = Object.values(customVariants).some(v => v.length > 0);

  if (!hasAnyVariants) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">No custom variants defined yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Click "+ Add Custom" when editing a component to create your own variants
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(customVariants).map(([groupId, variants]) => {
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
                    <p className="text-sm font-medium truncate">{variant.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{variant.description}</p>
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
      })}
    </div>
  );
};
