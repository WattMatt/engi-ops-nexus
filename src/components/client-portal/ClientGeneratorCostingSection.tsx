import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ClientGeneratorCostingSectionProps {
  projectId: string;
}

export const ClientGeneratorCostingSection = ({ projectId }: ClientGeneratorCostingSectionProps) => {
  const { data: zones = [] } = useQuery({
    queryKey: ["client-generator-zones-costing", projectId],
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

  const zoneIds = zones.map(z => z.id);

  const { data: zoneGenerators = [] } = useQuery({
    queryKey: ["client-zone-generators-costing", projectId, zoneIds],
    queryFn: async () => {
      if (!zoneIds.length) return [];
      
      const { data, error } = await supabase
        .from("zone_generators")
        .select("*")
        .in("zone_id", zoneIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && zoneIds.length > 0,
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["client-tenants-costing", projectId],
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
    queryKey: ["client-generator-settings-costing", projectId],
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

  const formatCurrency = (value: number): string => {
    return `R ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calculate generator cost from zone_generators table
  const generatorCost = zoneGenerators.reduce((sum, gen) => {
    return sum + (Number(gen.generator_cost) || 0);
  }, 0);
  
  const numTenantDBs = tenants.filter(t => !t.own_generator_provided).length;
  const ratePerTenantDB = settings?.rate_per_tenant_db || 0;
  const tenantDBsCost = numTenantDBs * ratePerTenantDB;
  
  const numMainBoards = settings?.num_main_boards || 0;
  const ratePerMainBoard = settings?.rate_per_main_board || 0;
  const mainBoardsCost = numMainBoards * ratePerMainBoard;
  
  const additionalCablingCost = settings?.additional_cabling_cost || 0;
  const controlWiringCost = settings?.control_wiring_cost || 0;
  
  const totalCost = generatorCost + tenantDBsCost + mainBoardsCost + additionalCablingCost + controlWiringCost;

  const getZoneGenerators = (zoneId: string) => {
    return zoneGenerators.filter(g => g.zone_id === zoneId);
  };

  const getZoneTotalCost = (zoneId: string) => {
    return getZoneGenerators(zoneId).reduce((sum, gen) => sum + (Number(gen.generator_cost) || 0), 0);
  };

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
                  const generators = getZoneGenerators(zone.id);
                  const zoneTotalCost = getZoneTotalCost(zone.id);
                  
                  return (
                    <TableRow key={zone.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        {zone.zone_name}
                        {zone.num_generators > 1 && ` (${zone.num_generators} Generators)`}
                        <div className="text-xs text-muted-foreground mt-1">
                          {generators.map((gen) => (
                            <div key={gen.id}>
                              Gen {gen.generator_number}: {gen.generator_size || "Not set"} - {formatCurrency(Number(gen.generator_cost) || 0)}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{generators.length}</TableCell>
                      <TableCell className="font-mono">-</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(zoneTotalCost)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                <TableRow>
                  <TableCell className="font-medium">{zones.length + 1}</TableCell>
                  <TableCell>Number of Tenant DBs</TableCell>
                  <TableCell className="font-mono">{numTenantDBs}</TableCell>
                  <TableCell className="font-mono">{formatCurrency(ratePerTenantDB)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(tenantDBsCost)}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">{zones.length + 2}</TableCell>
                  <TableCell>Number of Main Boards</TableCell>
                  <TableCell className="font-mono">{numMainBoards}</TableCell>
                  <TableCell className="font-mono">{formatCurrency(ratePerMainBoard)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(mainBoardsCost)}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">{zones.length + 3}</TableCell>
                  <TableCell>Additional Cabling</TableCell>
                  <TableCell className="font-mono">1</TableCell>
                  <TableCell className="font-mono">{formatCurrency(additionalCablingCost)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(additionalCablingCost)}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">{zones.length + 4}</TableCell>
                  <TableCell>Control Wiring</TableCell>
                  <TableCell className="font-mono">1</TableCell>
                  <TableCell className="font-mono">{formatCurrency(controlWiringCost)}</TableCell>
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
