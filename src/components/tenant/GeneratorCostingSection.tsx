import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GeneratorCostingSectionProps {
  projectId: string;
}

export const GeneratorCostingSection = ({ projectId }: GeneratorCostingSectionProps) => {
  const { data: zones = [], refetch: refetchZones } = useQuery({
    queryKey: ["generator-zones-costing", projectId],
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

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants-costing", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id")
        .eq("project_id", projectId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: settings } = useQuery({
    queryKey: ["generator-settings-tenant-rate", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generator_settings")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const handleTenantRateUpdate = async (value: number) => {
    if (!settings?.id) return;

    const { error } = await supabase
      .from("generator_settings")
      .update({ tenant_rate: value })
      .eq("id", settings.id);

    if (error) {
      toast.error("Failed to update tenant rate");
      return;
    }

    toast.success("Tenant rate updated");
  };

  const formatCurrency = (value: number): string => {
    return `R ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const tenantCount = tenants.length;
  const tenantRate = settings?.tenant_rate || 0;
  const generatorCost = zones.reduce((sum, zone) => sum + (zone.generator_cost || 0), 0);
  const tenantCost = tenantCount * tenantRate;
  const totalCost = generatorCost + tenantCost;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generator Equipment Costing</CardTitle>
        <CardDescription>
          Cost breakdown per generator zone
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <Label>Number of Tenants</Label>
            <Input
              type="number"
              value={tenantCount}
              disabled
              className="font-semibold bg-background"
            />
          </div>
          <div>
            <Label htmlFor="tenantRate">Rate per Tenant (R)</Label>
            <Input
              id="tenantRate"
              type="number"
              step="0.01"
              defaultValue={tenantRate}
              onBlur={(e) => handleTenantRateUpdate(Number(e.target.value))}
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zone</TableHead>
              <TableHead>No. of Generators</TableHead>
              <TableHead>Generator Size</TableHead>
              <TableHead className="text-right">Cost (excl. VAT)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No generator zones configured yet
                </TableCell>
              </TableRow>
            ) : (
              <>
                {zones.map((zone) => (
                  <TableRow key={zone.id}>
                    <TableCell className="font-medium">{zone.zone_name}</TableCell>
                    <TableCell>
                      {zone.num_generators === 1 
                        ? "1 Generator" 
                        : `${zone.num_generators} Synchronized`}
                    </TableCell>
                    <TableCell>{zone.generator_size || "-"}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(zone.generator_cost || 0)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2">
                  <TableCell colSpan={3} className="font-medium">Tenant Charges</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(tenantCost)}
                  </TableCell>
                </TableRow>
                <TableRow className="bg-primary/5 font-bold">
                  <TableCell colSpan={3}>TOTAL CAPITAL COST</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(totalCost)}</TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
