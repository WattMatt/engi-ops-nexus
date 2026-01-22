import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, CheckCircle2, Clock, Truck, ShoppingCart, AlertCircle } from "lucide-react";

interface ContractorProcurementStatusProps {
  projectId: string;
}

interface ProcurementItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  supplier_name: string | null;
  expected_delivery: string | null;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  not_started: { label: 'Not Started', icon: <Clock className="h-3 w-3" /> },
  pending_quote: { label: 'Pending Quote', icon: <Clock className="h-3 w-3" /> },
  quote_received: { label: 'Quote Received', icon: <Clock className="h-3 w-3" /> },
  pending_approval: { label: 'Pending Approval', icon: <Clock className="h-3 w-3" /> },
  approved: { label: 'Approved', icon: <CheckCircle2 className="h-3 w-3" /> },
  ordered: { label: 'Ordered', icon: <ShoppingCart className="h-3 w-3" /> },
  in_transit: { label: 'In Transit', icon: <Truck className="h-3 w-3" /> },
  delivered: { label: 'Delivered', icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: 'Cancelled', icon: <AlertCircle className="h-3 w-3" /> },
};

async function fetchProcurementItems(projectId: string): Promise<ProcurementItem[]> {
  // Fetch from the curated project_procurement_items table
  const { data, error } = await supabase
    .from('project_procurement_items')
    .select('id, name, description, status, supplier_name, expected_delivery')
    .eq('project_id', projectId)
    .order('display_order', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export function ContractorProcurementStatus({ projectId }: ContractorProcurementStatusProps) {
  const { data: procurementItems, isLoading } = useQuery({
    queryKey: ['contractor-procurement', projectId],
    queryFn: () => fetchProcurementItems(projectId)
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const statusCounts = procurementItems?.reduce((acc, item) => {
    const status = item.status || 'not_started';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const totalItems = procurementItems?.length || 0;
  const deliveredCount = statusCounts['delivered'] || 0;
  const progressPercent = totalItems > 0 ? Math.round((deliveredCount / totalItems) * 100) : 0;

  // Show main status categories for the overview
  const overviewStatuses = ['not_started', 'ordered', 'in_transit', 'delivered'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Procurement Overview
          </CardTitle>
          <CardDescription>Current status of project procurement items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Delivery Progress</span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
            <div className="grid grid-cols-4 gap-4 pt-4">
              {overviewStatuses.map((status) => {
                const config = statusConfig[status] || statusConfig.not_started;
                return (
                  <div key={status} className="text-center p-3 rounded-lg bg-muted">
                    <p className="text-2xl font-bold">{statusCounts[status] || 0}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Procurement Items</CardTitle></CardHeader>
        <CardContent>
          <div className="divide-y">
            {procurementItems?.map((item) => {
              const status = item.status || 'not_started';
              const config = statusConfig[status] || statusConfig.not_started;
              return (
                <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="font-medium">{item.name}</p>
                    {item.supplier_name && (
                      <p className="text-sm text-muted-foreground">Supplier: {item.supplier_name}</p>
                    )}
                    {item.expected_delivery && (
                      <p className="text-xs text-muted-foreground">
                        Expected: {new Date(item.expected_delivery).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
                    {config.icon}
                    <span>{config.label}</span>
                  </Badge>
                </div>
              );
            })}
            {(!procurementItems || procurementItems.length === 0) && (
              <div className="py-8 text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No procurement items found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
