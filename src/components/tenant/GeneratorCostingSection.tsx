import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { Pencil, Save, X } from "lucide-react";

interface GeneratorCostingSectionProps {
  projectId: string;
}

export const GeneratorCostingSection = ({ projectId }: GeneratorCostingSectionProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    ratePerTenantDB: 0,
    numMainBoards: 0,
    ratePerMainBoard: 0,
    additionalCablingCost: 0,
    controlWiringCost: 0,
  });

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

  const { data: settings, refetch: refetchSettings } = useQuery({
    queryKey: ["generator-settings-tenant-rate", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generator_settings")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (error) throw error;
      
      // Initialize edit values when settings load
      if (data && !isEditing) {
        setEditValues({
          ratePerTenantDB: data.rate_per_tenant_db || 0,
          numMainBoards: data.num_main_boards || 0,
          ratePerMainBoard: data.rate_per_main_board || 0,
          additionalCablingCost: data.additional_cabling_cost || 0,
          controlWiringCost: data.control_wiring_cost || 0,
        });
      }
      
      return data;
    },
    enabled: !!projectId,
  });

  const handleEdit = () => {
    // Load current values into edit state
    setEditValues({
      ratePerTenantDB: settings?.rate_per_tenant_db || 0,
      numMainBoards: settings?.num_main_boards || 0,
      ratePerMainBoard: settings?.rate_per_main_board || 0,
      additionalCablingCost: settings?.additional_cabling_cost || 0,
      controlWiringCost: settings?.control_wiring_cost || 0,
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    let settingsId = settings?.id;

    try {
      // Map edit values to database column names
      const dbValues = {
        rate_per_tenant_db: editValues.ratePerTenantDB,
        num_main_boards: editValues.numMainBoards,
        rate_per_main_board: editValues.ratePerMainBoard,
        additional_cabling_cost: editValues.additionalCablingCost,
        control_wiring_cost: editValues.controlWiringCost,
      };

      // If no settings exist, create them first
      if (!settingsId) {
        const { data: newSettings, error: createError } = await supabase
          .from("generator_settings")
          .insert({ 
            project_id: projectId,
            ...dbValues
          })
          .select()
          .single();

        if (createError) throw createError;
        
        toast.success("Settings saved");
      } else {
        // Update existing settings
        const { error } = await supabase
          .from("generator_settings")
          .update(dbValues)
          .eq("id", settingsId);

        if (error) throw error;
        
        toast.success("Changes saved");
      }
      
      setIsEditing(false);
      refetchSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save");
    }
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
  
  const numTenantDBs = tenants.filter(t => !t.own_generator_provided).length;
  const ratePerTenantDB = isEditing ? editValues.ratePerTenantDB : (settings?.rate_per_tenant_db || 0);
  const tenantDBsCost = numTenantDBs * ratePerTenantDB;
  
  const numMainBoards = isEditing ? editValues.numMainBoards : (settings?.num_main_boards || 0);
  const ratePerMainBoard = isEditing ? editValues.ratePerMainBoard : (settings?.rate_per_main_board || 0);
  const mainBoardsCost = numMainBoards * ratePerMainBoard;
  
  const additionalCablingCost = isEditing ? editValues.additionalCablingCost : (settings?.additional_cabling_cost || 0);
  const controlWiringCost = isEditing ? editValues.controlWiringCost : (settings?.control_wiring_cost || 0);
  
  const totalCost = generatorCost + tenantDBsCost + mainBoardsCost + additionalCablingCost + controlWiringCost;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Generator Equipment Costing</CardTitle>
            <CardDescription>
              Cost breakdown per generator zone
            </CardDescription>
          </div>
          {!isEditing ? (
            <Button onClick={handleEdit} variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleCancel} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          )}
        </div>
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
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editValues.ratePerTenantDB}
                        onChange={(e) => setEditValues({...editValues, ratePerTenantDB: Number(e.target.value)})}
                        className="w-32"
                      />
                    ) : (
                      <span className="font-mono">{formatCurrency(ratePerTenantDB)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(tenantDBsCost)}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">{zones.length + 2}</TableCell>
                  <TableCell>Number of Main Boards</TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editValues.numMainBoards}
                        onChange={(e) => setEditValues({...editValues, numMainBoards: Number(e.target.value)})}
                        className="w-20"
                      />
                    ) : (
                      <span className="font-mono">{numMainBoards}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editValues.ratePerMainBoard}
                        onChange={(e) => setEditValues({...editValues, ratePerMainBoard: Number(e.target.value)})}
                        className="w-32"
                      />
                    ) : (
                      <span className="font-mono">{formatCurrency(ratePerMainBoard)}</span>
                    )}
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
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editValues.additionalCablingCost}
                        onChange={(e) => setEditValues({...editValues, additionalCablingCost: Number(e.target.value)})}
                        className="w-32"
                      />
                    ) : (
                      <span className="font-mono">{formatCurrency(additionalCablingCost)}</span>
                    )}
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
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editValues.controlWiringCost}
                        onChange={(e) => setEditValues({...editValues, controlWiringCost: Number(e.target.value)})}
                        className="w-32"
                      />
                    ) : (
                      <span className="font-mono">{formatCurrency(controlWiringCost)}</span>
                    )}
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
