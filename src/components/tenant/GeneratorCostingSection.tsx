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
        .select("id, own_generator_provided")
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

  const handleSettingUpdate = async (field: string, value: number) => {
    let settingsId = settings?.id;

    // If no settings exist, create them first
    if (!settingsId) {
      const { data: newSettings, error: createError } = await supabase
        .from("generator_settings")
        .insert({ 
          project_id: projectId,
          [field]: value 
        })
        .select()
        .single();

      if (createError) {
        toast.error("Failed to create generator settings");
        return;
      }

      settingsId = newSettings.id;
      toast.success("Settings initialized and updated");
      return;
    }

    // Update existing settings
    const { error } = await supabase
      .from("generator_settings")
      .update({ [field]: value })
      .eq("id", settingsId);

    if (error) {
      toast.error(`Failed to update ${field}`);
      return;
    }

    toast.success("Updated successfully");
  };

  const formatCurrency = (value: number): string => {
    return `R ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const tenantCount = tenants.length;
  const tenantRate = settings?.tenant_rate || 0;
  
  // Calculate generator cost accounting for quantity per zone
  const generatorCost = zones.reduce((sum, zone) => {
    const numGens = zone.num_generators || 1;
    const costPerGen = zone.generator_cost || 0;
    return sum + (costPerGen * numGens);
  }, 0);
  
  const tenantCost = tenantCount * tenantRate;
  
  // Auto-calculate number of tenant DBs (tenants without their own generator)
  const numTenantDBs = tenants.filter(t => !t.own_generator_provided).length;
  const ratePerTenantDB = settings?.rate_per_tenant_db || 0;
  const tenantDBsCost = numTenantDBs * ratePerTenantDB;
  
  const numMainBoards = settings?.num_main_boards || 0;
  const ratePerMainBoard = settings?.rate_per_main_board || 0;
  const mainBoardsCost = numMainBoards * ratePerMainBoard;
  
  const additionalCablingCost = settings?.additional_cabling_cost || 0;
  const controlWiringCost = settings?.control_wiring_cost || 0;
  
  const totalCost = generatorCost + tenantDBsCost + mainBoardsCost + additionalCablingCost + controlWiringCost;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generator Equipment Costing</CardTitle>
        <CardDescription>
          Cost breakdown per generator zone
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Rate (R)</TableHead>
              <TableHead className="text-right">Cost (excl. VAT)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No generator zones configured yet
                </TableCell>
              </TableRow>
            ) : (
              <>
                {zones.map((zone, index) => {
                  const numGens = zone.num_generators || 1;
                  const costPerGen = zone.generator_cost || 0;
                  const totalCost = costPerGen * numGens;
                  
                  return (
                    <TableRow key={zone.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        {zone.zone_name} - {zone.generator_size || "-"}
                        {zone.num_generators > 1 && ` (${zone.num_generators} Synchronized)`}
                      </TableCell>
                      <TableCell className="font-mono">{numGens}</TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(costPerGen)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(totalCost)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                <TableRow>
                  <TableCell className="font-medium">{zones.length + 1}</TableCell>
                  <TableCell>Number of Tenant DBs</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={numTenantDBs}
                      disabled
                      className="w-20 font-semibold bg-background"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={ratePerTenantDB}
                      onBlur={(e) => handleSettingUpdate('rate_per_tenant_db', Number(e.target.value))}
                      className="w-32"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(tenantDBsCost)}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">{zones.length + 2}</TableCell>
                  <TableCell>Number of Main Boards</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      defaultValue={numMainBoards}
                      onBlur={(e) => handleSettingUpdate('num_main_boards', Number(e.target.value))}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={ratePerMainBoard}
                      onBlur={(e) => handleSettingUpdate('rate_per_main_board', Number(e.target.value))}
                      className="w-32"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(mainBoardsCost)}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">{zones.length + 3}</TableCell>
                  <TableCell>Additional Cabling</TableCell>
                  <TableCell>1</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={additionalCablingCost}
                      onBlur={(e) => handleSettingUpdate('additional_cabling_cost', Number(e.target.value))}
                      className="w-32"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(additionalCablingCost)}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">{zones.length + 4}</TableCell>
                  <TableCell>Control Wiring</TableCell>
                  <TableCell>1</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={controlWiringCost}
                      onBlur={(e) => handleSettingUpdate('control_wiring_cost', Number(e.target.value))}
                      className="w-32"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(controlWiringCost)}
                  </TableCell>
                </TableRow>

                <TableRow className="bg-primary/5 font-bold border-t-2">
                  <TableCell colSpan={4}>TOTAL CAPITAL COST</TableCell>
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
