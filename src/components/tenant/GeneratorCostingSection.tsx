import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { Pencil, Save, X, ChevronDown, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GENERATOR_SIZING_TABLE } from "@/utils/generatorSizing";

interface GeneratorCostingSectionProps {
  projectId: string;
}

export const GeneratorCostingSection = ({ projectId }: GeneratorCostingSectionProps) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());
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

  // Get zone IDs for dependent query
  const zoneIds = zones.map(z => z.id);

  const { data: zoneGenerators = [], refetch: refetchZoneGenerators } = useQuery({
    queryKey: ["zone-generators-costing", projectId, zoneIds],
    queryFn: async () => {
      if (!zoneIds.length) return [];
      
      const { data, error } = await supabase
        .from("zone_generators")
        .select("*")
        .in("zone_id", zoneIds)
        .order("generator_number");

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && zoneIds.length > 0,
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
  
  // Calculate generator cost from zone_generators table
  const generatorCost = zoneGenerators.reduce((sum, gen) => {
    return sum + (Number(gen.generator_cost) || 0);
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

  const getZoneGenerators = (zoneId: string) => {
    return zoneGenerators.filter(g => g.zone_id === zoneId);
  };

  const getZoneTotalCost = (zoneId: string) => {
    return getZoneGenerators(zoneId).reduce((sum, gen) => sum + (Number(gen.generator_cost) || 0), 0);
  };

  const toggleZoneExpanded = (zoneId: string) => {
    setExpandedZones(prev => {
      const newSet = new Set(prev);
      if (newSet.has(zoneId)) {
        newSet.delete(zoneId);
      } else {
        newSet.add(zoneId);
      }
      return newSet;
    });
  };

  const handleUpdateGeneratorSize = async (generatorId: string, size: string | null) => {
    try {
      const { error } = await supabase
        .from("zone_generators")
        .update({ generator_size: size })
        .eq("id", generatorId);

      if (error) throw error;
      toast.success("Generator size updated");
      refetchZoneGenerators();
      // Sync with settings tab
      queryClient.invalidateQueries({ queryKey: ["zone-generators", projectId] });
      queryClient.invalidateQueries({ queryKey: ["zone-generators-report", projectId] });
    } catch (error) {
      console.error("Error updating generator size:", error);
      toast.error("Failed to update generator size");
    }
  };

  const handleUpdateGeneratorCost = async (generatorId: string, cost: number) => {
    try {
      const { error } = await supabase
        .from("zone_generators")
        .update({ generator_cost: cost })
        .eq("id", generatorId);

      if (error) throw error;
      toast.success("Generator cost updated");
      refetchZoneGenerators();
      // Sync with settings tab
      queryClient.invalidateQueries({ queryKey: ["zone-generators", projectId] });
      queryClient.invalidateQueries({ queryKey: ["zone-generators-report", projectId] });
    } catch (error) {
      console.error("Error updating generator cost:", error);
      toast.error("Failed to update generator cost");
    }
  };

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
                  const generators = getZoneGenerators(zone.id);
                  const zoneTotalCost = getZoneTotalCost(zone.id);
                  const isExpanded = expandedZones.has(zone.id);
                  
                  return (
                    <>
                      <TableRow key={zone.id} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleZoneExpanded(zone.id)}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            {index + 1}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full shrink-0" 
                              style={{ backgroundColor: zone.zone_color || "#3b82f6" }}
                            />
                            {zone.zone_name}
                            {zone.num_generators > 1 && ` (${zone.num_generators} Generators)`}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{generators.length}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">—</TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {formatCurrency(zoneTotalCost)}
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded generator rows */}
                      {isExpanded && generators.map((gen) => (
                        <TableRow key={gen.id} className="bg-muted/30">
                          <TableCell></TableCell>
                          <TableCell className="pl-8">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground">Gen #{gen.generator_number}</span>
                              <Select
                                value={gen.generator_size || "none"}
                                onValueChange={(value) => handleUpdateGeneratorSize(gen.id, value === "none" ? null : value)}
                              >
                                <SelectTrigger className="w-[130px] h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                                  <SelectValue placeholder="Select size" />
                                </SelectTrigger>
                                <SelectContent className="z-50 bg-popover">
                                  <SelectItem value="none">Not selected</SelectItem>
                                  {GENERATOR_SIZING_TABLE.map((g) => (
                                    <SelectItem key={g.rating} value={g.rating}>
                                      {g.rating}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={gen.generator_cost || 0}
                              onChange={(e) => {
                                const newCost = parseFloat(e.target.value) || 0;
                                // Optimistic update
                                queryClient.setQueryData(
                                  ["zone-generators-costing", projectId, zoneIds],
                                  (old: any[]) => old?.map(g => 
                                    g.id === gen.id ? { ...g, generator_cost: newCost } : g
                                  )
                                );
                              }}
                              onBlur={(e) => handleUpdateGeneratorCost(gen.id, parseFloat(e.target.value) || 0)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-28 h-8 text-xs"
                              placeholder="Cost"
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(Number(gen.generator_cost) || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
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
