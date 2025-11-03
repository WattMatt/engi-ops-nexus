import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface Tenant {
  id: string;
  shop_name: string;
  shop_number: string;
  area: number | null;
  shop_category: string;
  own_generator_provided: boolean | null;
  generator_loading_sector_1: number | null;
  generator_loading_sector_2: number | null;
}

interface GeneratorTenantListProps {
  tenants: Tenant[];
  capitalCostRecovery?: number;
  onUpdate?: () => void;
  projectId: string;
}

export const GeneratorTenantList = ({ tenants, capitalCostRecovery = 53009.71, onUpdate, projectId }: GeneratorTenantListProps) => {
  // Fetch generator settings
  const { data: settings } = useQuery({
    queryKey: ["generator-settings", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generator_settings")
        .select("*")
        .eq("project_id", projectId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || {
        standard_kw_per_sqm: 0.03,
        fast_food_kw_per_sqm: 0.045,
        restaurant_kw_per_sqm: 0.045,
        national_kw_per_sqm: 0.03,
      };
    },
    enabled: !!projectId,
  });

  // Calculate loading based on category and area
  const calculateLoading = (tenant: Tenant): number => {
    if (!tenant.area || tenant.own_generator_provided) return 0;
    
    const kwPerSqm = {
      standard: settings?.standard_kw_per_sqm || 0.03,
      fast_food: settings?.fast_food_kw_per_sqm || 0.045,
      restaurant: settings?.restaurant_kw_per_sqm || 0.045,
      national: settings?.national_kw_per_sqm || 0.03,
    };

    return tenant.area * (kwPerSqm[tenant.shop_category as keyof typeof kwPerSqm] || 0.03);
  };

  // Calculate total generator loading using calculated values
  const totalLoading = tenants.reduce((sum, tenant) => {
    return sum + calculateLoading(tenant);
  }, 0);

  // Calculate portion of total load and monthly rental for a tenant
  const calculateTenantMetrics = (tenant: Tenant) => {
    if (tenant.own_generator_provided) {
      return {
        loading: 0,
        portionOfLoad: 0,
        monthlyRental: 0,
        rentalPerSqm: 0
      };
    }

    const loading = calculateLoading(tenant);
    const portionOfLoad = totalLoading > 0 ? (loading / totalLoading) * 100 : 0;
    const monthlyRental = (portionOfLoad / 100) * capitalCostRecovery;
    const rentalPerSqm = tenant.area && tenant.area > 0 ? monthlyRental / tenant.area : 0;

    return {
      loading,
      portionOfLoad,
      monthlyRental,
      rentalPerSqm
    };
  };

  const handleUpdateTenant = async (tenantId: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from("tenants")
        .update({ [field]: value })
        .eq("id", tenantId);

      if (error) throw error;
      toast.success("Tenant updated successfully");
      
      // Trigger refetch in parent component
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error updating tenant:", error);
      toast.error("Failed to update tenant");
    }
  };

  const getCategoryVariant = (category: string) => {
    const variants = {
      standard: "bg-blue-500 text-white border-blue-600",
      fast_food: "bg-red-500 text-white border-red-600",
      restaurant: "bg-emerald-500 text-white border-emerald-600",
      national: "bg-purple-600 text-white border-purple-700"
    };
    return variants[category as keyof typeof variants] || "bg-gray-100 text-gray-800";
  };

  const formatCurrency = (value: number): string => {
    return `R ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calculate totals for the bottom row
  const totals = {
    area: tenants.reduce((sum, t) => sum + (t.area || 0), 0),
    loading: tenants.reduce((sum, t) => sum + calculateLoading(t), 0),
    portionOfLoad: tenants.reduce((sum, t) => sum + calculateTenantMetrics(t).portionOfLoad, 0),
    monthlyRental: tenants.reduce((sum, t) => sum + calculateTenantMetrics(t).monthlyRental, 0),
  };
  const averageRentalPerSqm = totals.area > 0 ? totals.monthlyRental / totals.area : 0;

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[80px]">Shop No.</TableHead>
            <TableHead className="min-w-[150px]">Tenant</TableHead>
            <TableHead className="min-w-[100px]">Size (m²)</TableHead>
            <TableHead className="min-w-[120px]">Own Generator</TableHead>
            <TableHead className="min-w-[120px]">Calculated Loading (kW)</TableHead>
            <TableHead className="min-w-[120px]">Portion of Load (%)</TableHead>
            <TableHead className="min-w-[150px]">Monthly Rental (excl. VAT)</TableHead>
            <TableHead className="min-w-[150px]">Rental per m² (excl. VAT)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                No tenants added yet
              </TableCell>
            </TableRow>
          ) : (
            <>
              {tenants.map((tenant) => {
                const metrics = calculateTenantMetrics(tenant);
                const isOwnGenerator = tenant.own_generator_provided || false;
                
                return (
                  <TableRow 
                    key={tenant.id}
                    className={isOwnGenerator ? "bg-red-50 dark:bg-red-950/20" : ""}
                  >
                    <TableCell className="font-medium">{tenant.shop_number}</TableCell>
                    <TableCell className="font-medium">{tenant.shop_name}</TableCell>
                    <TableCell>{tenant.area?.toLocaleString() || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={isOwnGenerator}
                          onCheckedChange={(checked) => 
                            handleUpdateTenant(tenant.id, "own_generator_provided", checked === true)
                          }
                        />
                        <span className="text-sm font-medium">{isOwnGenerator ? "YES" : "NO"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {metrics.loading.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isOwnGenerator ? "0.00%" : `${metrics.portionOfLoad.toFixed(2)}%`}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {isOwnGenerator ? formatCurrency(0) : formatCurrency(metrics.monthlyRental)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isOwnGenerator ? formatCurrency(0) : formatCurrency(metrics.rentalPerSqm)}
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {/* Totals Row */}
              <TableRow className="bg-primary/5 font-bold">
                <TableCell colSpan={2}>OVERALL TOTALS</TableCell>
                <TableCell>{totals.area.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right font-mono">{totals.loading.toFixed(2)}</TableCell>
                <TableCell className="text-right">{totals.portionOfLoad.toFixed(2)}%</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.monthlyRental)}</TableCell>
                <TableCell></TableCell>
              </TableRow>

              {/* Average Row */}
              <TableRow className="bg-muted/50">
                <TableCell colSpan={2}>AVERAGE</TableCell>
                <TableCell colSpan={5}></TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(averageRentalPerSqm)}</TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
