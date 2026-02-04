import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Package, Calendar, FileText, MapPin, ClipboardList, Truck, Building2, Phone, Mail } from "lucide-react";

interface ProcurementItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  category: string | null;
  supplier_name: string | null;
  supplier_email: string | null;
  supplier_phone: string | null;
  expected_delivery: string | null;
  actual_delivery: string | null;
  po_number: string | null;
  tracking_number: string | null;
  priority: string | null;
  notes: string | null;
  location_group: string | null;
  instruction_date?: string | null;
  order_date?: string | null;
}

interface ContractorEditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ProcurementItem;
  contractorName: string;
  onSuccess: () => void;
}

export function ContractorEditItemDialog({
  open,
  onOpenChange,
  item,
  contractorName,
  onSuccess
}: ContractorEditItemDialogProps) {
  const queryClient = useQueryClient();
  
  // Order details
  const [orderDate, setOrderDate] = useState(item.order_date || '');
  const [poNumber, setPoNumber] = useState(item.po_number || '');
  
  // Supplier details
  const [supplierName, setSupplierName] = useState(item.supplier_name || '');
  const [supplierEmail, setSupplierEmail] = useState(item.supplier_email || '');
  const [supplierPhone, setSupplierPhone] = useState(item.supplier_phone || '');
  
  // Delivery details
  const [expectedDelivery, setExpectedDelivery] = useState(item.expected_delivery || '');
  const [actualDelivery, setActualDelivery] = useState(item.actual_delivery || '');
  const [trackingNumber, setTrackingNumber] = useState(item.tracking_number || '');
  
  // Notes
  const [notes, setNotes] = useState(item.notes || '');

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Determine status based on dates
      let newStatus = 'instructed';
      if (orderDate) {
        newStatus = 'ordered';
      }
      if (actualDelivery) {
        newStatus = 'delivered';
      }
      
      const { error } = await supabase
        .from('project_procurement_items')
        .update({
          order_date: orderDate || null,
          po_number: poNumber || null,
          supplier_name: supplierName || null,
          supplier_email: supplierEmail || null,
          supplier_phone: supplierPhone || null,
          expected_delivery: expectedDelivery || null,
          actual_delivery: actualDelivery || null,
          tracking_number: trackingNumber || null,
          notes: notes || null,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor-procurement'] });
      toast.success("Item updated successfully");
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast.error("Failed to update item");
    }
  });

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Update Procurement Item
          </DialogTitle>
          <DialogDescription>
            Enter order and delivery information for this item
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Item Info (Read-only) */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium">{item.name}</h4>
                {item.description && (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                )}
              </div>
              {item.priority && item.priority !== 'normal' && (
                <Badge variant={item.priority === 'critical' ? 'destructive' : 'secondary'}>
                  {item.priority}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {item.category && (
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {item.category}
                </span>
              )}
              {item.location_group && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {item.location_group}
                </span>
              )}
            </div>
          </div>

          {/* Instruction Date (Read-only) */}
          <div className="rounded-lg border p-3 bg-primary/5">
            <div className="flex items-center gap-2 text-sm">
              <ClipboardList className="h-4 w-4 text-primary" />
              <span className="font-medium">Instruction Tabled:</span>
              <span>{formatDate(item.instruction_date)}</span>
            </div>
          </div>

          <Separator />

          {/* Tabbed sections for contractor input */}
          <Tabs defaultValue="order" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="order">Order Details</TabsTrigger>
              <TabsTrigger value="supplier">Supplier</TabsTrigger>
              <TabsTrigger value="delivery">Delivery</TabsTrigger>
            </TabsList>

            {/* Order Details Tab */}
            <TabsContent value="order" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Order Date *
                  </Label>
                  <Input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Date order was placed with supplier
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    PO / Reference Number
                  </Label>
                  <Input
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    placeholder="e.g., PO-2024-001"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this order (special instructions, delivery requirements, etc.)"
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* Supplier Tab */}
            <TabsContent value="supplier" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Supplier Name *
                </Label>
                <Input
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="e.g., ABC Electrical Supplies"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Supplier Email
                  </Label>
                  <Input
                    type="email"
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                    placeholder="orders@supplier.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Supplier Phone
                  </Label>
                  <Input
                    type="tel"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    placeholder="+27 11 123 4567"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Delivery Tab */}
            <TabsContent value="delivery" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Expected Delivery
                  </Label>
                  <Input
                    type="date"
                    value={expectedDelivery}
                    onChange={(e) => setExpectedDelivery(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    When item is expected on site
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Tracking Number
                  </Label>
                  <Input
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="e.g., TRK123456789"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-green-600" />
                  Actual Delivery Date
                </Label>
                <Input
                  type="date"
                  value={actualDelivery}
                  onChange={(e) => setActualDelivery(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Set this when the item has been delivered to site
                </p>
              </div>

              {actualDelivery && (
                <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                    ✓ Setting actual delivery will mark this item as Delivered
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
