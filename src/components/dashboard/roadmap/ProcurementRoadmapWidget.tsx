import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Package, Clock, Truck, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface ProcurementRoadmapWidgetProps {
  projectId: string;
}

export function ProcurementRoadmapWidget({ projectId }: ProcurementRoadmapWidgetProps) {
  const { data: items = [] } = useQuery({
    queryKey: ["procurement-summary", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procurement_items")
        .select("id, name, status, priority, category, expected_delivery_date")
        .eq("project_id", projectId)
        .neq("status", "cancelled")
        .order("priority", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  if (items.length === 0) return null;

  const stats = {
    total: items.length,
    pendingQuote: items.filter(i => i.status === "pending_quote").length,
    pendingApproval: items.filter(i => i.status === "pending_approval").length,
    ordered: items.filter(i => ["ordered", "in_transit"].includes(i.status)).length,
    delivered: items.filter(i => i.status === "delivered").length,
  };

  const deliveryProgress = items.length > 0 
    ? Math.round((stats.delivered / items.length) * 100) 
    : 0;

  const urgentItems = items.filter(
    i => i.priority === "urgent" && !["delivered", "cancelled"].includes(i.status)
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Procurement Status
          </span>
          <Link 
            to="/dashboard/final-accounts" 
            className="text-xs text-muted-foreground hover:text-primary"
          >
            View All →
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Delivery Progress</span>
            <span className="font-medium">{stats.delivered}/{stats.total} items</span>
          </div>
          <Progress value={deliveryProgress} className="h-2" />
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <Clock className="h-4 w-4 mx-auto mb-1 text-amber-500" />
            <div className="text-lg font-semibold">{stats.pendingQuote}</div>
            <div className="text-[10px] text-muted-foreground">Pending Quote</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <AlertCircle className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <div className="text-lg font-semibold">{stats.pendingApproval}</div>
            <div className="text-[10px] text-muted-foreground">Awaiting Approval</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <Truck className="h-4 w-4 mx-auto mb-1 text-purple-500" />
            <div className="text-lg font-semibold">{stats.ordered}</div>
            <div className="text-[10px] text-muted-foreground">On Order</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <div className="text-lg font-semibold">{stats.delivered}</div>
            <div className="text-[10px] text-muted-foreground">Delivered</div>
          </div>
        </div>

        {/* Urgent Items Alert */}
        {urgentItems.length > 0 && (
          <div className="bg-destructive/10 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-2">
              <AlertCircle className="h-4 w-4" />
              Urgent Items Requiring Attention
            </div>
            <div className="space-y-1">
              {urgentItems.slice(0, 3).map(item => (
                <div key={item.id} className="text-xs flex items-center justify-between">
                  <span className="truncate">{item.name}</span>
                  <Badge variant="outline" className="text-[10px] h-5">
                    {item.category}
                  </Badge>
                </div>
              ))}
              {urgentItems.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{urgentItems.length - 3} more urgent items
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
