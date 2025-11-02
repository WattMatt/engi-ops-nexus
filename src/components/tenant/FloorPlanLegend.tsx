import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock } from "lucide-react";

interface Zone {
  id: string;
  color: string;
  tenantId?: string | null;
  tenantName?: string | null;
  category?: string | null;
}

interface Tenant {
  id: string;
  shop_name: string;
  shop_number: string;
  shop_category: string;
  sow_received: boolean;
  layout_received: boolean;
  db_ordered: boolean;
  lighting_ordered: boolean;
}

interface FloorPlanLegendProps {
  zones: Zone[];
  tenants: Tenant[];
  compact?: boolean;
}

export const FloorPlanLegend = ({ zones, tenants, compact = false }: FloorPlanLegendProps) => {
  // Calculate completion status for each tenant
  const getTenantStatus = (tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return { status: 'unknown', label: 'Unknown', icon: null };

    const allComplete = tenant.sow_received && 
                       tenant.layout_received && 
                       tenant.db_ordered && 
                       tenant.lighting_ordered;

    if (allComplete) {
      return { 
        status: 'completed', 
        label: 'Completed',
        icon: CheckCircle2,
        color: 'text-green-600'
      };
    }

    return { 
      status: 'in-progress', 
      label: 'In Progress',
      icon: Clock,
      color: 'text-amber-600'
    };
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      standard: "bg-blue-500 text-white border-blue-600",
      fast_food: "bg-red-500 text-white border-red-600",
      restaurant: "bg-emerald-500 text-white border-emerald-600",
      national: "bg-purple-600 text-white border-purple-700"
    };
    return colors[category as keyof typeof colors] || "bg-gray-500 text-white";
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      standard: "Standard",
      fast_food: "Fast Food",
      restaurant: "Restaurant",
      national: "National"
    };
    return labels[category as keyof typeof labels] || category;
  };

  // Filter zones that have tenants assigned
  const assignedZones = zones.filter(z => z.tenantId && z.tenantName);
  const unassignedZones = zones.filter(z => !z.tenantId || !z.tenantName);

  if (compact) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-sm border space-y-2 max-w-xs">
        <h3 className="font-semibold text-sm mb-2">Zone Legend</h3>
        {assignedZones.map((zone) => {
          const status = getTenantStatus(zone.tenantId!);
          const StatusIcon = status.icon;
          
          return (
            <div key={zone.id} className="flex items-center gap-2 text-xs">
              <div 
                className="w-4 h-4 rounded border border-gray-300 flex-shrink-0" 
                style={{ backgroundColor: zone.color }}
              />
              <span className="font-medium truncate flex-1">{zone.tenantName}</span>
              {StatusIcon && (
                <StatusIcon className={`w-3 h-3 flex-shrink-0 ${status.color}`} />
              )}
            </div>
          );
        })}
        {unassignedZones.length > 0 && (
          <div className="text-xs text-muted-foreground pt-1 border-t">
            {unassignedZones.length} unassigned zone{unassignedZones.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zone Legend</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {zones.length === 0 ? (
          <p className="text-sm text-muted-foreground">No zones drawn yet</p>
        ) : assignedZones.length === 0 ? (
          <p className="text-sm text-muted-foreground">{zones.length} zone{zones.length !== 1 ? 's' : ''} drawn, none assigned to tenants yet</p>
        ) : (
          assignedZones.map((zone) => {
            const status = getTenantStatus(zone.tenantId!);
            const StatusIcon = status.icon;
            
            return (
              <div key={zone.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <div 
                  className="w-6 h-6 rounded border-2 border-gray-300 flex-shrink-0" 
                  style={{ backgroundColor: zone.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{zone.tenantName}</div>
                  {zone.category && (
                    <Badge 
                      variant="outline" 
                      className={`${getCategoryColor(zone.category)} text-xs mt-1`}
                    >
                      {getCategoryLabel(zone.category)}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {StatusIcon && (
                    <StatusIcon className={`w-4 h-4 ${status.color}`} />
                  )}
                  <span className={`text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
        {unassignedZones.length > 0 && assignedZones.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              {unassignedZones.length} unassigned zone{unassignedZones.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};