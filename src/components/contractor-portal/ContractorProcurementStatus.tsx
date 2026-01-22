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

const statusConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', icon: <Clock className="h-3 w-3" /> },
  ordered: { label: 'Ordered', icon: <ShoppingCart className="h-3 w-3" /> },
  in_transit: { label: 'In Transit', icon: <Truck className="h-3 w-3" /> },
  delivered: { label: 'Delivered', icon: <CheckCircle2 className="h-3 w-3" /> },
};

export function ContractorProcurementStatus({ projectId }: ContractorProcurementStatusProps) {
  const { data: procurementItems, isLoading } = useQuery({
    queryKey: ['contractor-procurement', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('procurement_items')
        .select('id, name, description, status, priority, expected_delivery_date, source_type')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const statusCounts = procurementItems?.reduce((acc, item: any) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const totalItems = procurementItems?.length || 0;
  const deliveredCount = statusCounts['delivered'] || 0;
  const progressPercent = totalItems > 0 ? Math.round((deliveredCount / totalItems) * 100) : 0;

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
              {Object.entries(statusConfig).map(([status, config]) => (
                <div key={status} className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{statusCounts[status] || 0}</p>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Procurement Items</CardTitle></CardHeader>
        <CardContent>
          <div className="divide-y">
            {procurementItems?.map((item: any) => {
              const config = statusConfig[item.status] || statusConfig.pending;
              return (
                <div key={item.id} className="py-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{item.name}</p>
                    {item.description && <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>}
                    {item.expected_delivery_date && (
                      <p className="text-xs text-muted-foreground">
                        Expected: {new Date(item.expected_delivery_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {item.priority === 'urgent' && <Badge variant="destructive" className="text-xs">Urgent</Badge>}
                    {item.priority === 'high' && <Badge variant="outline" className="text-xs">High</Badge>}
                    <Badge variant="secondary">{config.icon}<span className="ml-1">{config.label}</span></Badge>
                  </div>
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
