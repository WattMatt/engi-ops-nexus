/**
 * Meter-Shop Linking Component
 * Allows users to link meters to shops and manage load data
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Zap, 
  Activity,
  MoreHorizontal
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { MeterShopLinkage } from './useLoadProfile';

interface MeterShopLinkingProps {
  profileId: string;
  projectId: string;
  linkages: MeterShopLinkage[];
  onAddLinkage: (linkage: Omit<MeterShopLinkage, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateLinkage: (data: Partial<MeterShopLinkage> & { id: string }) => void;
  onDeleteLinkage: (id: string) => void;
}

const METER_TYPES = ['main', 'sub', 'check', 'tenant', 'common'];
const SHOP_CATEGORIES = [
  'Anchor', 'Major', 'Line Shop', 'Food Court', 'Restaurant', 
  'Entertainment', 'Services', 'Kiosk', 'ATM', 'Common Areas'
];

export function MeterShopLinking({
  profileId,
  projectId,
  linkages,
  onAddLinkage,
  onUpdateLinkage,
  onDeleteLinkage,
}: MeterShopLinkingProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingLinkage, setEditingLinkage] = useState<MeterShopLinkage | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    meter_id: '',
    meter_name: '',
    meter_type: 'sub',
    shop_number: '',
    shop_name: '',
    shop_category: '',
    connected_load_kva: 0,
    max_demand_kva: 0,
    power_factor: 0.9,
    diversity_factor: 0.8,
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      meter_id: '',
      meter_name: '',
      meter_type: 'sub',
      shop_number: '',
      shop_name: '',
      shop_category: '',
      connected_load_kva: 0,
      max_demand_kva: 0,
      power_factor: 0.9,
      diversity_factor: 0.8,
      notes: '',
    });
    setEditingLinkage(null);
  };

  const handleSubmit = () => {
    if (!formData.meter_id) return;

    if (editingLinkage) {
      onUpdateLinkage({
        id: editingLinkage.id,
        ...formData,
      });
    } else {
      onAddLinkage({
        profile_id: profileId,
        project_id: projectId,
        ...formData,
        is_active: true,
        external_linkage_id: null,
      });
    }

    resetForm();
    setIsAddDialogOpen(false);
  };

  const handleEdit = (linkage: MeterShopLinkage) => {
    setEditingLinkage(linkage);
    setFormData({
      meter_id: linkage.meter_id,
      meter_name: linkage.meter_name || '',
      meter_type: linkage.meter_type || 'sub',
      shop_number: linkage.shop_number || '',
      shop_name: linkage.shop_name || '',
      shop_category: linkage.shop_category || '',
      connected_load_kva: linkage.connected_load_kva,
      max_demand_kva: linkage.max_demand_kva,
      power_factor: linkage.power_factor,
      diversity_factor: linkage.diversity_factor,
      notes: linkage.notes || '',
    });
    setIsAddDialogOpen(true);
  };

  // Calculate max demand based on connected load and diversity factor
  const calculateMaxDemand = () => {
    const maxDemand = formData.connected_load_kva * formData.diversity_factor;
    setFormData(prev => ({ ...prev, max_demand_kva: Math.round(maxDemand * 100) / 100 }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Meter-Shop Linkages</h3>
          <p className="text-sm text-muted-foreground">
            Connect meters to shops to track load distribution
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Linkage
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingLinkage ? 'Edit Meter-Shop Linkage' : 'Add New Meter-Shop Linkage'}
              </DialogTitle>
              <DialogDescription>
                Link a meter to a shop and specify load parameters
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4 py-4">
              {/* Meter Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Meter Details</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="meter_id">Meter ID *</Label>
                  <Input
                    id="meter_id"
                    value={formData.meter_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, meter_id: e.target.value }))}
                    placeholder="e.g., M-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meter_name">Meter Name</Label>
                  <Input
                    id="meter_name"
                    value={formData.meter_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, meter_name: e.target.value }))}
                    placeholder="e.g., Main Meter Block A"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Meter Type</Label>
                  <Select
                    value={formData.meter_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, meter_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METER_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Shop Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Shop Details</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="shop_number">Shop Number</Label>
                  <Input
                    id="shop_number"
                    value={formData.shop_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, shop_number: e.target.value }))}
                    placeholder="e.g., G-101"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shop_name">Shop Name</Label>
                  <Input
                    id="shop_name"
                    value={formData.shop_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, shop_name: e.target.value }))}
                    placeholder="e.g., Woolworths"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Shop Category</Label>
                  <Select
                    value={formData.shop_category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, shop_category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHOP_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Load Parameters */}
              <div className="col-span-2 space-y-4 pt-4 border-t">
                <h4 className="font-medium text-sm text-muted-foreground">Load Parameters</h4>
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="connected_load">Connected Load (kVA)</Label>
                    <Input
                      id="connected_load"
                      type="number"
                      step="0.01"
                      value={formData.connected_load_kva}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        connected_load_kva: parseFloat(e.target.value) || 0 
                      }))}
                      onBlur={calculateMaxDemand}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="diversity_factor">Diversity Factor</Label>
                    <Input
                      id="diversity_factor"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={formData.diversity_factor}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        diversity_factor: parseFloat(e.target.value) || 0.8 
                      }))}
                      onBlur={calculateMaxDemand}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_demand">Max Demand (kVA)</Label>
                    <Input
                      id="max_demand"
                      type="number"
                      step="0.01"
                      value={formData.max_demand_kva}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        max_demand_kva: parseFloat(e.target.value) || 0 
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="power_factor">Power Factor</Label>
                    <Input
                      id="power_factor"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={formData.power_factor}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        power_factor: parseFloat(e.target.value) || 0.9 
                      }))}
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="col-span-2 space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                resetForm();
                setIsAddDialogOpen(false);
              }}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!formData.meter_id}>
                {editingLinkage ? 'Update Linkage' : 'Add Linkage'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Linkages Table */}
      <Card>
        <CardContent className="pt-6">
          {linkages.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Meter-Shop Linkages</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start by adding meters and linking them to shops
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Linkage
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meter</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Connected (kVA)</TableHead>
                  <TableHead className="text-right">Max Demand (kVA)</TableHead>
                  <TableHead className="text-right">PF</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkages.map((linkage) => (
                  <TableRow key={linkage.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{linkage.meter_id}</p>
                        {linkage.meter_name && (
                          <p className="text-xs text-muted-foreground">{linkage.meter_name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {linkage.meter_type || 'sub'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{linkage.shop_number || '-'}</p>
                        {linkage.shop_name && (
                          <p className="text-xs text-muted-foreground">{linkage.shop_name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {linkage.shop_category && (
                        <Badge variant="secondary">{linkage.shop_category}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {linkage.connected_load_kva?.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {linkage.max_demand_kva?.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {linkage.power_factor?.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(linkage)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onDeleteLinkage(linkage.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
