import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ProcurementItem {
  id: string;
  project_id?: string;
  name: string;
  description: string | null;
  source_type: string;
  supplier_name: string | null;
  supplier_email: string | null;
  supplier_phone: string | null;
  expected_delivery: string | null;
  actual_delivery: string | null;
  status: string;
  category: string | null;
  po_number: string | null;
  tracking_number: string | null;
  quoted_amount: number | null;
  actual_amount: number | null;
  quote_valid_until: string | null;
  priority: string | null;
  assigned_to: string | null;
  notes: string | null;
  tenant_id?: string | null;
  location_group?: string | null;
}

interface Tenant {
  id: string;
  shop_number: string | null;
  shop_name: string | null;
}

interface EditProcurementItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ProcurementItem;
  onSuccess: () => void;
}

const statusOptions = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'pending_quote', label: 'Pending Quote' },
  { value: 'quote_received', label: 'Quote Received' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const categoryOptions = [
  'Switchgear',
  'Transformers',
  'Distribution Boards',
  'Cables & Accessories',
  'Lighting',
  'Emergency Systems',
  'Metering',
  'Earthing & Lightning Protection',
  'Fire Detection',
  'Access Control',
  'CCTV',
  'Other',
];

const LOCATION_GROUPS = [
  { value: 'general', label: 'General' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'back_of_house', label: 'Back of House' },
  { value: 'front_of_house', label: 'Front of House' },
];

export function EditProcurementItemDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: EditProcurementItemDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    supplier_name: '',
    supplier_email: '',
    supplier_phone: '',
    expected_delivery: '',
    actual_delivery: '',
    status: 'not_started',
    po_number: '',
    tracking_number: '',
    quoted_amount: '',
    actual_amount: '',
    quote_valid_until: '',
    priority: 'normal',
    assigned_to: '',
    notes: '',
    tenant_id: '',
    location_group: 'general',
  });

  // Fetch tenants for dropdown
  const { data: tenants } = useQuery({
    queryKey: ['project-tenants', item.project_id],
    queryFn: async () => {
      if (!item.project_id) return [];
      const { data, error } = await supabase
        .from('tenants')
        .select('id, shop_number, shop_name')
        .eq('project_id', item.project_id)
        .order('shop_number', { ascending: true });
      
      if (error) throw error;
      return data as Tenant[];
    },
    enabled: open && !!item.project_id
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        category: item.category || '',
        supplier_name: item.supplier_name || '',
        supplier_email: item.supplier_email || '',
        supplier_phone: item.supplier_phone || '',
        expected_delivery: item.expected_delivery || '',
        actual_delivery: item.actual_delivery || '',
        status: item.status || 'not_started',
        po_number: item.po_number || '',
        tracking_number: item.tracking_number || '',
        quoted_amount: item.quoted_amount?.toString() || '',
        actual_amount: item.actual_amount?.toString() || '',
        quote_valid_until: item.quote_valid_until || '',
        priority: item.priority || 'normal',
        assigned_to: item.assigned_to || '',
        notes: item.notes || '',
        tenant_id: item.tenant_id || '',
        location_group: item.location_group || 'general',
      });
    }
  }, [item]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('project_procurement_items')
        .update({
          name: formData.name,
          description: formData.description || null,
          category: formData.category || null,
          supplier_name: formData.supplier_name || null,
          supplier_email: formData.supplier_email || null,
          supplier_phone: formData.supplier_phone || null,
          expected_delivery: formData.expected_delivery || null,
          actual_delivery: formData.actual_delivery || null,
          status: formData.status,
          po_number: formData.po_number || null,
          tracking_number: formData.tracking_number || null,
          quoted_amount: formData.quoted_amount ? parseFloat(formData.quoted_amount) : null,
          actual_amount: formData.actual_amount ? parseFloat(formData.actual_amount) : null,
          quote_valid_until: formData.quote_valid_until || null,
          priority: formData.priority || 'normal',
          assigned_to: formData.assigned_to || null,
          notes: formData.notes || null,
          tenant_id: formData.tenant_id || null,
          location_group: formData.location_group || 'general',
        })
        .eq('id', item.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Procurement item updated');
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error('Failed to update item: ' + error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Item name is required');
      return;
    }
    updateMutation.mutate();
  };

  // When tenant is selected, auto-set location group to 'tenant'
  const handleTenantChange = (tenantId: string) => {
    setFormData(prev => ({
      ...prev,
      tenant_id: tenantId,
      location_group: tenantId ? 'tenant' : prev.location_group,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Procurement Item</DialogTitle>
          <DialogDescription>
            Update item details, tracking, and supplier information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="details" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="supplier">Supplier</TabsTrigger>
              <TabsTrigger value="tracking">Tracking</TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit-name">Item Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-location-group">Location Group</Label>
                  <Select
                    value={formData.location_group}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, location_group: value }))}
                  >
                    <SelectTrigger id="edit-location-group">
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
                  <Label htmlFor="edit-tenant">Tenant</Label>
                  <Select
                    value={formData.tenant_id}
                    onValueChange={handleTenantChange}
                  >
                    <SelectTrigger id="edit-tenant">
                      <SelectValue placeholder="Select tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {tenants?.map(tenant => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.shop_number ? `${tenant.shop_number} - ` : ''}{tenant.shop_name || 'Unnamed'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger id="edit-category">
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger id="edit-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-assigned">Assigned To</Label>
                  <Input
                    id="edit-assigned"
                    value={formData.assigned_to}
                    onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                    placeholder="Person responsible..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* Supplier Tab */}
            <TabsContent value="supplier" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-supplier">Supplier Name</Label>
                <Input
                  id="edit-supplier"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
                  placeholder="Enter supplier name..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-supplier-email">Supplier Email</Label>
                  <Input
                    id="edit-supplier-email"
                    type="email"
                    value={formData.supplier_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier_email: e.target.value }))}
                    placeholder="supplier@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-supplier-phone">Supplier Phone</Label>
                  <Input
                    id="edit-supplier-phone"
                    type="tel"
                    value={formData.supplier_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier_phone: e.target.value }))}
                    placeholder="+27..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-quoted">Quoted Amount (R)</Label>
                  <Input
                    id="edit-quoted"
                    type="number"
                    step="0.01"
                    value={formData.quoted_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, quoted_amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-actual">Actual Amount (R)</Label>
                  <Input
                    id="edit-actual"
                    type="number"
                    step="0.01"
                    value={formData.actual_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, actual_amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-quote-valid">Quote Valid Until</Label>
                <Input
                  id="edit-quote-valid"
                  type="date"
                  value={formData.quote_valid_until}
                  onChange={(e) => setFormData(prev => ({ ...prev, quote_valid_until: e.target.value }))}
                />
              </div>
            </TabsContent>

            {/* Tracking Tab */}
            <TabsContent value="tracking" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-po">PO Number</Label>
                  <Input
                    id="edit-po"
                    value={formData.po_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, po_number: e.target.value }))}
                    placeholder="PO-2024-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-tracking">Tracking Number</Label>
                  <Input
                    id="edit-tracking"
                    value={formData.tracking_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, tracking_number: e.target.value }))}
                    placeholder="Shipment tracking..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-expected">Expected Delivery</Label>
                  <Input
                    id="edit-expected"
                    type="date"
                    value={formData.expected_delivery}
                    onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-actual-delivery">Actual Delivery</Label>
                  <Input
                    id="edit-actual-delivery"
                    type="date"
                    value={formData.actual_delivery}
                    onChange={(e) => setFormData(prev => ({ ...prev, actual_delivery: e.target.value }))}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
