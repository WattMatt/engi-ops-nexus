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
  description: string;
  procurement_status: string | null;
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
  // Chain: final_accounts -> final_account_bills -> final_account_sections -> final_account_items
  
  // Step 1: Get final accounts for this project
  const { data: finalAccounts, error: faError } = await supabase
    .from('final_accounts')
    .select('id')
    .eq('project_id', projectId);
  
  if (faError) throw faError;
  if (!finalAccounts?.length) return [];
  
  const faIds = finalAccounts.map(fa => fa.id);
  
  // Step 2: Get bills for these final accounts
  const { data: bills, error: billsError } = await supabase
    .from('final_account_bills')
    .select('id, final_account_id');
  
  if (billsError) throw billsError;
  
  const validBillIds = (bills || [])
    .filter(b => faIds.includes(b.final_account_id))
    .map(b => b.id);
  
  if (!validBillIds.length) return [];
  
  // Step 3: Get sections for these bills
  const { data: sections, error: secError } = await supabase
    .from('final_account_sections')
    .select('id, bill_id');
  
  if (secError) throw secError;
  
  const validSectionIds = (sections || [])
    .filter(s => validBillIds.includes(s.bill_id))
    .map(s => s.id);
  
  if (!validSectionIds.length) return [];
  
  // Step 4: Get items with procurement status
  const { data: items, error: itemsError } = await supabase
    .from('final_account_items')
    .select('id, description, procurement_status, supplier_name, expected_delivery, section_id')
    .not('procurement_status', 'is', null)
    .order('created_at', { ascending: false });
  
  if (itemsError) throw itemsError;
  
  // Filter by valid section IDs client-side
  const result = (items || [])
    .filter(item => validSectionIds.includes(item.section_id))
    .map(({ section_id: _, ...rest }) => rest);
  
  return result;
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
    const status = item.procurement_status || 'not_started';
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
              const status = item.procurement_status || 'not_started';
              const config = statusConfig[status] || statusConfig.not_started;
              return (
                <div key={item.id} className="py-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{item.description}</p>
                    {item.supplier_name && (
                      <p className="text-sm text-muted-foreground">Supplier: {item.supplier_name}</p>
                    )}
                    {item.expected_delivery && (
                      <p className="text-xs text-muted-foreground">
                        Expected: {new Date(item.expected_delivery).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
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
