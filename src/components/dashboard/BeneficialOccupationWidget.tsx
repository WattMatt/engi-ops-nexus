import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Package } from "lucide-react";
import { differenceInDays, addDays } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { calculateOrderDeadlines } from "@/utils/dateCalculations";

interface BeneficialOccupationWidgetProps {
  projectId: string;
}

export const BeneficialOccupationWidget = ({ projectId }: BeneficialOccupationWidgetProps) => {
  const { data: tenants } = useQuery({
    queryKey: ["tenants-deadlines", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("project_id", projectId)
        .not("opening_date", "is", null)
        .order("opening_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const getCriticalTenants = () => {
    if (!tenants) return { overdue: [], equipmentOverdue: [], approaching: [] };
    
    const today = new Date();
    const overdue: any[] = [];
    const equipmentOverdue: any[] = [];
    const approaching: any[] = [];

    tenants.forEach((tenant) => {
      const openingDate = new Date(tenant.opening_date!);
      const beneficialDays = tenant.beneficial_occupation_days || 90;
      const beneficialDate = addDays(openingDate, -beneficialDays);
      
      // Use centralized 40 business days calculation for equipment deadline
      const deadlines = calculateOrderDeadlines(beneficialDate);
      const equipmentDeadline = deadlines.dbLastOrderDate;
      
      const daysUntilBeneficial = differenceInDays(beneficialDate, today);
      const daysUntilEquipmentDeadline = differenceInDays(equipmentDeadline, today);
      
      const isComplete = tenant.sow_received && tenant.layout_received && 
                        tenant.db_ordered && tenant.lighting_ordered && 
                        tenant.cost_reported;

      if (daysUntilBeneficial < 0 && !isComplete) {
        overdue.push({ ...tenant, daysUntilBeneficial });
      } else if (daysUntilEquipmentDeadline < 0 && (!tenant.db_ordered || !tenant.lighting_ordered)) {
        equipmentOverdue.push({ ...tenant, daysUntilEquipmentDeadline });
      } else if (daysUntilBeneficial >= 0 && daysUntilBeneficial <= 30) {
        approaching.push({ ...tenant, daysUntilBeneficial });
      }
    });

    return { overdue, equipmentOverdue, approaching };
  };

  const { overdue, equipmentOverdue, approaching } = getCriticalTenants();
  const totalCritical = overdue.length + equipmentOverdue.length + approaching.length;

  if (totalCritical === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Critical Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">All tenants are on track!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Critical Deadlines
          <Badge variant="destructive">{totalCritical}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-4">
            {overdue.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Overdue Beneficial Occupation ({overdue.length})
                </h4>
                <div className="space-y-2">
                  {overdue.map((tenant) => (
                    <div key={tenant.id} className="p-2 bg-destructive/10 rounded-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{tenant.shop_number} - {tenant.shop_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {Math.abs(tenant.daysUntilBeneficial)} days overdue
                          </p>
                        </div>
                        <Badge variant="destructive">OVERDUE</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {equipmentOverdue.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-orange-600" />
                  Equipment Order Overdue ({equipmentOverdue.length})
                </h4>
                <div className="space-y-2">
                  {equipmentOverdue.map((tenant) => (
                    <div key={tenant.id} className="p-2 bg-orange-100 rounded-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{tenant.shop_number} - {tenant.shop_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {Math.abs(tenant.daysUntilEquipmentDeadline)} days past deadline
                          </p>
                        </div>
                        <Badge className="bg-orange-600 text-white">LATE</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {approaching.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Approaching Deadlines ({approaching.length})
                </h4>
                <div className="space-y-2">
                  {approaching.map((tenant) => (
                    <div key={tenant.id} className="p-2 bg-amber-50 rounded-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{tenant.shop_number} - {tenant.shop_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {tenant.daysUntilBeneficial} days until beneficial occupation
                          </p>
                        </div>
                        <Badge className="bg-amber-600 text-white">{tenant.daysUntilBeneficial}d</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
