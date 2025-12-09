import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Check, X, RotateCcw } from "lucide-react";

interface Tenant {
  id: string;
  shop_name: string;
  shop_number: string;
  area: number | null;
  shop_category: string;
  own_generator_provided: boolean | null;
  generator_zone_id: string | null;
  manual_kw_override: number | null;
}

interface Zone {
  id: string;
  zone_name: string;
  zone_number: number;
}

interface GeneratorTenantListProps {
  tenants: Tenant[];
  capitalCostRecovery?: number;
  onUpdate?: () => void;
  projectId: string;
}

export const GeneratorTenantList = ({ tenants, capitalCostRecovery = 53009.71, onUpdate, projectId }: GeneratorTenantListProps) => {
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [editingKwValue, setEditingKwValue] = useState<string>("");
  
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

  // Fetch zones
  const { data: zones = [] } = useQuery({
    queryKey: ["generator-zones", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generator_zones")
        .select("*")
        .eq("project_id", projectId)
        .order("display_order");

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Calculate loading based on manual override or category and area
  const calculateLoading = (tenant: Tenant): number => {
    if (tenant.own_generator_provided) return 0;
    
    // Use manual override if set
    if (tenant.manual_kw_override !== null && tenant.manual_kw_override !== undefined) {
      return Number(tenant.manual_kw_override);
    }
    
    // Otherwise calculate based on area and category
    if (!tenant.area) return 0;
    
    const kwPerSqm = {
      standard: settings?.standard_kw_per_sqm || 0.03,
      fast_food: settings?.fast_food_kw_per_sqm || 0.045,
      restaurant: settings?.restaurant_kw_per_sqm || 0.045,
      national: settings?.national_kw_per_sqm || 0.03,
    };

    return tenant.area * (kwPerSqm[tenant.shop_category as keyof typeof kwPerSqm] || 0.03);
  };

  // Calculate total loading per zone
  const getZoneLoading = (zoneId: string) => {
    return tenants
      .filter(t => t.generator_zone_id === zoneId && !t.own_generator_provided)
      .reduce((sum, tenant) => sum + calculateLoading(tenant), 0);
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
      // Get tenant info for change summary
      const tenant = tenants.find(t => t.id === tenantId);
      
      const { error } = await supabase
        .from("tenants")
        .update({ [field]: value })
        .eq("id", tenantId);

      if (error) throw error;
      
      // Increment tenant schedule version to track changes
      await supabase.rpc("increment_tenant_schedule_version", {
        p_project_id: projectId,
        p_change_summary: `Tenant ${tenant?.shop_number || 'Unknown'}: ${field} updated`
      });
      
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

  const handleStartEditKw = (tenant: Tenant) => {
    setEditingTenantId(tenant.id);
    const currentValue = tenant.manual_kw_override !== null 
      ? tenant.manual_kw_override.toString() 
      : calculateLoading(tenant).toFixed(2);
    setEditingKwValue(currentValue);
  };

  const handleCancelEditKw = () => {
    setEditingTenantId(null);
    setEditingKwValue("");
  };

  const handleSaveKw = async (tenantId: string) => {
    const numericValue = parseFloat(editingKwValue);
    
    if (isNaN(numericValue) || numericValue < 0) {
      toast.error("Please enter a valid kW value");
      return;
    }

    try {
      const tenant = tenants.find(t => t.id === tenantId);
      
      const { error } = await supabase
        .from("tenants")
        .update({ manual_kw_override: numericValue })
        .eq("id", tenantId);

      if (error) throw error;
      
      // Increment tenant schedule version to track changes
      await supabase.rpc("increment_tenant_schedule_version", {
        p_project_id: projectId,
        p_change_summary: `Tenant ${tenant?.shop_number || 'Unknown'}: manual kW override set to ${numericValue}`
      });
      
      toast.success("Manual kW override saved");
      setEditingTenantId(null);
      setEditingKwValue("");
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error saving manual kW:", error);
      toast.error("Failed to save kW value");
    }
  };

  const handleResetKw = async (tenantId: string) => {
    try {
      const tenant = tenants.find(t => t.id === tenantId);
      
      const { error } = await supabase
        .from("tenants")
        .update({ manual_kw_override: null })
        .eq("id", tenantId);

      if (error) throw error;
      
      // Increment tenant schedule version to track changes
      await supabase.rpc("increment_tenant_schedule_version", {
        p_project_id: projectId,
        p_change_summary: `Tenant ${tenant?.shop_number || 'Unknown'}: manual kW override reset`
      });
      
      toast.success("Reset to automatic calculation");
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error resetting kW:", error);
      toast.error("Failed to reset kW value");
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
            <TableHead className="min-w-[120px]">Zone</TableHead>
            {zones.map((zone) => (
              <TableHead key={zone.id} className="min-w-[120px]">
                {zone.zone_name} (kW)
              </TableHead>
            ))}
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
                const loading = calculateLoading(tenant);
                
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
                    <TableCell>
                      <Select
                        value={tenant.generator_zone_id || "none"}
                        onValueChange={(value) => 
                          handleUpdateTenant(tenant.id, "generator_zone_id", value === "none" ? null : value)
                        }
                        disabled={isOwnGenerator}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Select zone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No zone</SelectItem>
                          {zones.map((zone) => (
                            <SelectItem key={zone.id} value={zone.id}>
                              {zone.zone_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {zones.map((zone) => (
                      <TableCell key={zone.id} className="text-right">
                        {!isOwnGenerator && tenant.generator_zone_id === zone.id ? (
                          <div className="flex items-center justify-end gap-2">
                            {editingTenantId === tenant.id ? (
                              <>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editingKwValue}
                                  onChange={(e) => setEditingKwValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveKw(tenant.id);
                                    if (e.key === "Escape") handleCancelEditKw();
                                  }}
                                  className="w-24 h-8 text-right font-mono"
                                  autoFocus
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSaveKw(tenant.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleCancelEditKw}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className={`font-mono ${tenant.manual_kw_override !== null ? 'font-bold text-primary' : ''}`}>
                                  {loading.toFixed(2)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStartEditKw(tenant)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                {tenant.manual_kw_override !== null && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleResetKw(tenant.id)}
                                    className="h-6 w-6 p-0"
                                    title="Reset to automatic calculation"
                                  >
                                    <RotateCcw className="h-3 w-3 text-muted-foreground" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        ) : "-"}
                      </TableCell>
                    ))}
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
                <TableCell></TableCell>
                {zones.map((zone) => (
                  <TableCell key={zone.id} className="text-right font-mono">
                    {getZoneLoading(zone.id).toFixed(2)}
                  </TableCell>
                ))}
                <TableCell className="text-right">{totals.portionOfLoad.toFixed(2)}%</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.monthlyRental)}</TableCell>
                <TableCell></TableCell>
              </TableRow>

              {/* Average Row */}
              <TableRow className="bg-muted/50">
                <TableCell colSpan={2}>AVERAGE</TableCell>
                <TableCell colSpan={3 + zones.length}></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(averageRentalPerSqm)}</TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
