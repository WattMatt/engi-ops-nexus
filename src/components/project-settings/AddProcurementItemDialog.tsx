import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Package } from "lucide-react";

interface AddProcurementItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

interface PCItem {
  id: string;
  description: string;
  item_code: string | null;
  section_id: string;
}

interface Tenant {
  id: string;
  shop_number: string | null;
  shop_name: string | null;
}

const LOCATION_GROUPS = [
  { value: 'general', label: 'General' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'back_of_house', label: 'Back of House' },
  { value: 'front_of_house', label: 'Front of House' },
];

export function AddProcurementItemDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: AddProcurementItemDialogProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'pc_items'>('manual');
  const [manualForm, setManualForm] = useState({
    name: '',
    description: '',
    tenant_id: '',
    location_group: 'general',
  });
  const [selectedPCItems, setSelectedPCItems] = useState<string[]>([]);

  // Fetch tenants for this project
  const { data: tenants } = useQuery({
    queryKey: ['project-tenants', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, shop_number, shop_name')
        .eq('project_id', projectId)
        .order('shop_number', { ascending: true });
      
      if (error) throw error;
      return data as Tenant[];
    },
    enabled: open
  });

  // Fetch available PC items from Final Accounts
  const { data: pcItems, isLoading: loadingPCItems } = useQuery({
    queryKey: ['available-pc-items', projectId],
    queryFn: async () => {
      // Get final accounts for this project
      const { data: finalAccounts, error: faError } = await supabase
        .from('final_accounts')
        .select('id')
        .eq('project_id', projectId);
      
      if (faError) throw faError;
      if (!finalAccounts?.length) return [];
      
      const faIds = finalAccounts.map(fa => fa.id);
      
      // Get bills
      const { data: bills, error: billsError } = await supabase
        .from('final_account_bills')
        .select('id, final_account_id');
      
      if (billsError) throw billsError;
      
      const validBillIds = (bills || [])
        .filter(b => faIds.includes(b.final_account_id))
        .map(b => b.id);
      
      if (!validBillIds.length) return [];
      
      // Get sections
      const { data: sections, error: secError } = await supabase
        .from('final_account_sections')
        .select('id, bill_id');
      
      if (secError) throw secError;
      
      const validSectionIds = (sections || [])
        .filter(s => validBillIds.includes(s.bill_id))
        .map(s => s.id);
      
      if (!validSectionIds.length) return [];
      
      // Get PC items not already tracked
      const { data: existingTracked } = await supabase
        .from('project_procurement_items')
        .select('source_item_id')
        .eq('project_id', projectId)
        .eq('source_type', 'final_account')
        .not('source_item_id', 'is', null);
      
      const trackedIds = (existingTracked || []).map(t => t.source_item_id);
      
      // Fetch PC items
      let query = supabase
        .from('final_account_items')
        .select('id, description, item_code, section_id')
        .eq('is_prime_cost', true)
        .order('created_at', { ascending: false });
      
      const { data: items, error: itemsError } = await query;
      
      if (itemsError) throw itemsError;
      
      // Filter by valid sections and exclude already tracked
      return (items || []).filter(
        item => validSectionIds.includes(item.section_id) && !trackedIds.includes(item.id)
      ) as PCItem[];
    },
    enabled: open && activeTab === 'pc_items'
  });

  const addManualMutation = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('project_procurement_items')
        .insert({
          project_id: projectId,
          source_type: 'manual',
          name: manualForm.name,
          description: manualForm.description || null,
          tenant_id: manualForm.tenant_id || null,
          location_group: manualForm.location_group,
          status: 'not_started',
          created_by: user.user?.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Procurement item added');
      setManualForm({ name: '', description: '', tenant_id: '', location_group: 'general' });
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error('Failed to add item: ' + error.message);
    }
  });

  const addPCItemsMutation = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      
      const itemsToInsert = selectedPCItems.map(pcItemId => {
        const pcItem = pcItems?.find(item => item.id === pcItemId);
        return {
          project_id: projectId,
          source_type: 'final_account',
          source_item_id: pcItemId,
          name: pcItem?.description || 'PC Item',
          location_group: 'general',
          status: 'not_started',
          created_by: user.user?.id,
        };
      });
      
      const { error } = await supabase
        .from('project_procurement_items')
        .insert(itemsToInsert);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${selectedPCItems.length} item(s) added to tracking`);
      setSelectedPCItems([]);
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error('Failed to add items: ' + error.message);
    }
  });

  const handleSubmit = () => {
    if (activeTab === 'manual') {
      if (!manualForm.name.trim()) {
        toast.error('Please enter an item name');
        return;
      }
      addManualMutation.mutate();
    } else {
      if (selectedPCItems.length === 0) {
        toast.error('Please select at least one PC item');
        return;
      }
      addPCItemsMutation.mutate();
    }
  };

  const togglePCItem = (itemId: string) => {
    setSelectedPCItems(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isSubmitting = addManualMutation.isPending || addPCItemsMutation.isPending;

  // When tenant is selected, auto-set location group to 'tenant'
  const handleTenantChange = (tenantId: string) => {
    setManualForm(prev => ({
      ...prev,
      tenant_id: tenantId,
      location_group: tenantId ? 'tenant' : prev.location_group,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Add Procurement Item</DialogTitle>
          <DialogDescription>
            Add items to track in the Contractor Portal
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'manual' | 'pc_items')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="pc_items">From PC Items</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={manualForm.name}
                onChange={(e) => setManualForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Generator Panels"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location_group">Location Group</Label>
                <Select
                  value={manualForm.location_group}
                  onValueChange={(v) => setManualForm(prev => ({ ...prev, location_group: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_GROUPS.map(group => (
                      <SelectItem key={group.value} value={group.value}>
                        {group.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenant">Tenant (Optional)</Label>
                <Select
                  value={manualForm.tenant_id || "none"}
                  onValueChange={(v) => handleTenantChange(v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {tenants?.map(tenant => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.shop_number ? `${tenant.shop_number} - ` : ''}{tenant.shop_name || 'Unnamed'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={manualForm.description}
                onChange={(e) => setManualForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description..."
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="pc_items" className="mt-4">
            {loadingPCItems ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pcItems && pcItems.length > 0 ? (
              <ScrollArea className="h-[300px] rounded-md border p-2">
                <div className="space-y-2">
                  {pcItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => togglePCItem(item.id)}
                    >
                      <Checkbox
                        checked={selectedPCItems.includes(item.id)}
                        onCheckedChange={() => togglePCItem(item.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{item.description}</p>
                        {item.item_code && (
                          <p className="text-xs text-muted-foreground">Code: {item.item_code}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No PC items available</p>
                <p className="text-sm mt-1">
                  All PC items are already being tracked or none exist in Final Accounts
                </p>
              </div>
            )}
            {selectedPCItems.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {selectedPCItems.length} item(s) selected
              </p>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {activeTab === 'manual' ? 'Add Item' : `Add ${selectedPCItems.length || ''} Item(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
