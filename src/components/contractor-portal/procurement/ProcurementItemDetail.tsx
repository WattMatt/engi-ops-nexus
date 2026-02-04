import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Package, 
  Building2, 
  Mail, 
  Phone, 
  Calendar, 
  FileText, 
  Clock,
  Truck,
  User,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { ProcurementStatusTimeline } from "./ProcurementStatusTimeline";
import { ProcurementDocumentsList } from "./ProcurementDocumentsList";

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
  quoted_amount: number | null;
  actual_amount: number | null;
  quote_valid_until: string | null;
  priority: string | null;
  assigned_to: string | null;
  notes: string | null;
}

interface ProcurementItemDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
  onConfirmDelivery?: () => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  not_started: { label: 'Not Started', variant: 'secondary' },
  pending_quote: { label: 'Pending Quote', variant: 'outline' },
  quote_received: { label: 'Quote Received', variant: 'outline' },
  pending_approval: { label: 'Pending Approval', variant: 'outline' },
  approved: { label: 'Approved', variant: 'default' },
  ordered: { label: 'Ordered', variant: 'default' },
  in_transit: { label: 'In Transit', variant: 'default' },
  delivered: { label: 'Delivered', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-slate-100 text-slate-700' },
  normal: { label: 'Normal', className: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-700' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700' },
};

export function ProcurementItemDetail({ 
  open, 
  onOpenChange, 
  itemId,
  onConfirmDelivery 
}: ProcurementItemDetailProps) {
  const { data: item, isLoading } = useQuery({
    queryKey: ['procurement-item-detail', itemId],
    queryFn: async () => {
      if (!itemId) return null;
      const { data, error } = await supabase
        .from('project_procurement_items')
        .select('*')
        .eq('id', itemId)
        .single();
      
      if (error) throw error;
      return data as ProcurementItem;
    },
    enabled: !!itemId && open,
  });

  if (!itemId) return null;

  const status = item?.status || 'not_started';
  const statusInfo = statusConfig[status] || statusConfig.not_started;
  const priorityInfo = priorityConfig[item?.priority || 'normal'];
  const canConfirmDelivery = status === 'delivered' && onConfirmDelivery;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : item ? (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <DialogTitle className="text-xl">{item.name}</DialogTitle>
                  {item.category && (
                    <DialogDescription>{item.category}</DialogDescription>
                  )}
                </div>
                <div className="flex gap-2">
                  {item.priority && item.priority !== 'normal' && (
                    <Badge className={priorityInfo.className}>
                      {priorityInfo.label}
                    </Badge>
                  )}
                  <Badge variant={statusInfo.variant}>
                    {statusInfo.label}
                  </Badge>
                </div>
              </div>
            </DialogHeader>

            <Tabs defaultValue="details" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                {/* Description */}
                {item.description && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Description
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                )}

                <Separator />

                {/* Supplier Information */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Supplier Information
                  </h4>
                  <div className="grid gap-2 text-sm">
                    {item.supplier_name ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{item.supplier_name}</span>
                        </div>
                        {item.supplier_email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a href={`mailto:${item.supplier_email}`} className="text-primary hover:underline">
                              {item.supplier_email}
                            </a>
                          </div>
                        )}
                        {item.supplier_phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${item.supplier_phone}`} className="text-primary hover:underline">
                              {item.supplier_phone}
                            </a>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground">No supplier assigned</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Order & Tracking */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Order & Tracking
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">PO Number:</span>
                      <p className="font-medium">{item.po_number || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tracking #:</span>
                      <p className="font-medium">{item.tracking_number || '—'}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Delivery Dates */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Delivery Schedule
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Expected Delivery:</span>
                      <p className="font-medium">
                        {item.expected_delivery 
                          ? format(new Date(item.expected_delivery), 'PPP')
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Actual Delivery:</span>
                      <p className="font-medium">
                        {item.actual_delivery 
                          ? format(new Date(item.actual_delivery), 'PPP')
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>


                {/* Assigned To */}
                {item.assigned_to && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Assigned to:</span>
                      <span className="font-medium">{item.assigned_to}</span>
                    </div>
                  </>
                )}

                {/* Notes */}
                {item.notes && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Notes</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {item.notes}
                      </p>
                    </div>
                  </>
                )}

                {/* Confirm Delivery Button */}
                {canConfirmDelivery && (
                  <>
                    <Separator />
                    <Button onClick={onConfirmDelivery} className="w-full gap-2">
                      <Truck className="h-4 w-4" />
                      Confirm Delivery Received
                    </Button>
                  </>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="mt-4">
                <ProcurementStatusTimeline procurementItemId={item.id} />
              </TabsContent>

              <TabsContent value="documents" className="mt-4">
                <ProcurementDocumentsList procurementItemId={item.id} />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Item not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
