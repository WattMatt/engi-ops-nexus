import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MoreVertical, Settings, Plus, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GENERATOR_SIZING_TABLE } from "@/utils/generatorSizing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GeneratorCostSettingsDialog } from "./GeneratorCostSettingsDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface GeneratorCostingSectionProps {
  projectId: string;
}

export const GeneratorCostingSection = ({ projectId }: GeneratorCostingSectionProps) => {
  const queryClient = useQueryClient();
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  const { data: zones = [] } = useQuery({
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

  // Get zone IDs for dependent query - use a stable string key
  const zoneIds = zones.map(z => z.id);
  const zoneIdsKey = zoneIds.sort().join(",");

  const { data: zoneGenerators = [], refetch: refetchZoneGenerators } = useQuery({
    queryKey: ["zone-generators-costing", projectId, zoneIdsKey],
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
      return data;
    },
    enabled: !!projectId,
  });

  const formatCurrency = (value: number): string => {
    return `R ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calculate costs from settings
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

  const handleUpdateGeneratorSize = async (generatorId: string, size: string | null) => {
    try {
      const { error } = await supabase
        .from("zone_generators")
        .update({ generator_size: size })
        .eq("id", generatorId);

      if (error) throw error;
      toast.success("Generator size updated");
      refetchZoneGenerators();
      // Sync with settings tab and capital recovery
      queryClient.invalidateQueries({ queryKey: ["zone-generators", projectId] });
      queryClient.invalidateQueries({ queryKey: ["zone-generators-report", projectId] });
      queryClient.invalidateQueries({ queryKey: ["zone-generators-capital", projectId] });
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
      // Sync with settings tab and capital recovery
      queryClient.invalidateQueries({ queryKey: ["zone-generators", projectId] });
      queryClient.invalidateQueries({ queryKey: ["zone-generators-report", projectId] });
      queryClient.invalidateQueries({ queryKey: ["zone-generators-capital", projectId] });
    } catch (error) {
      console.error("Error updating generator cost:", error);
      toast.error("Failed to update generator cost");
    }
  };

  const handleAddGenerator = async (zoneId: string) => {
    try {
      const existingGenerators = zoneGenerators.filter(g => g.zone_id === zoneId);
      const newGeneratorNumber = existingGenerators.length + 1;
      
      // Update zone's num_generators
      const zone = zones.find(z => z.id === zoneId);
      const newNumGenerators = Math.max((zone?.num_generators || 0) + 1, newGeneratorNumber);
      
      await supabase
        .from("generator_zones")
        .update({ num_generators: newNumGenerators })
        .eq("id", zoneId);

      // Insert new generator
      const { error } = await supabase
        .from("zone_generators")
        .insert({
          zone_id: zoneId,
          generator_number: newGeneratorNumber,
          generator_size: null,
          generator_cost: 0,
        });

      if (error) throw error;
      toast.success("Generator added");
      refetchZoneGenerators();
      queryClient.invalidateQueries({ queryKey: ["generator-zones-costing", projectId] });
      queryClient.invalidateQueries({ queryKey: ["zone-generators", projectId] });
      queryClient.invalidateQueries({ queryKey: ["zone-generators-capital", projectId] });
    } catch (error) {
      console.error("Error adding generator:", error);
      toast.error("Failed to add generator");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Generator Equipment Costing</CardTitle>
              <CardDescription>
                Cost breakdown per generator zone
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowSettingsDialog(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Cost Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Zone / Generator</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Cost (R)</TableHead>
                <TableHead className="text-right">Total</TableHead>
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
                  {/* Flat list of all generators with direct editing */}
                  {zones.map((zone, zoneIndex) => {
                    const generators = getZoneGenerators(zone.id);
                    const zoneTotalCost = getZoneTotalCost(zone.id);
                    
                    return (
                      <React.Fragment key={zone.id}>
                        {/* Zone header row */}
                        <TableRow className="bg-muted/30 border-t">
                          <TableCell className="font-bold">{zoneIndex + 1}</TableCell>
                          <TableCell colSpan={3}>
                            <div className="flex items-center gap-2 font-medium">
                              <div 
                                className="w-3 h-3 rounded-full shrink-0" 
                                style={{ backgroundColor: zone.zone_color || "#3b82f6" }}
                              />
                              {zone.zone_name}
                              {generators.length === 0 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertCircle className="h-4 w-4 text-amber-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>No generators configured - add one to enter costs</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {formatCurrency(zoneTotalCost)}
                          </TableCell>
                        </TableRow>
                        
                        {/* Generator rows - always visible, directly editable */}
                        {generators.length === 0 ? (
                          <TableRow>
                            <TableCell className="pl-6"></TableCell>
                            <TableCell colSpan={3}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAddGenerator(zone.id)}
                                className="text-primary hover:text-primary/80"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Generator
                              </Button>
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        ) : (
                          generators.map((gen) => (
                          <TableRow key={gen.id}>
                            <TableCell className="text-muted-foreground text-xs pl-6">
                              #{gen.generator_number}
                            </TableCell>
                            <TableCell className="text-sm">
                              Generator {gen.generator_number}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={gen.generator_size || "none"}
                                onValueChange={(value) => handleUpdateGeneratorSize(gen.id, value === "none" ? null : value)}
                              >
                                <SelectTrigger className="w-[130px] h-8 text-xs">
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
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={gen.generator_cost || ""}
                                onChange={(e) => {
                                  const newCost = parseFloat(e.target.value) || 0;
                                  queryClient.setQueryData(
                                    ["zone-generators-costing", projectId, zoneIdsKey],
                                    (old: any[]) => old?.map(g => 
                                      g.id === gen.id ? { ...g, generator_cost: newCost } : g
                                    )
                                  );
                                }}
                                onBlur={(e) => handleUpdateGeneratorCost(gen.id, parseFloat(e.target.value) || 0)}
                                className="w-32 h-8 font-mono"
                                placeholder="Enter cost"
                              />
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(Number(gen.generator_cost) || 0)}
                            </TableCell>
                          </TableRow>
                          ))
                        )}
                      </React.Fragment>
                    );
                  })}
                  
                  {/* Cost Line Items - now read-only, configured via settings dialog */}
                  <TableRow>
                    <TableCell className="font-medium">{zones.length + 1}</TableCell>
                    <TableCell>Tenant Distribution Boards</TableCell>
                    <TableCell>
                      <span className="font-mono text-muted-foreground">{numTenantDBs} units</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">{formatCurrency(ratePerTenantDB)}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(tenantDBsCost)}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium">{zones.length + 2}</TableCell>
                    <TableCell>Main Boards</TableCell>
                    <TableCell>
                      <span className="font-mono text-muted-foreground">{numMainBoards} units</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">{formatCurrency(ratePerMainBoard)}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(mainBoardsCost)}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium">{zones.length + 3}</TableCell>
                    <TableCell>Additional Cabling</TableCell>
                    <TableCell>
                      <span className="font-mono text-muted-foreground">1 item</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">{formatCurrency(additionalCablingCost)}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(additionalCablingCost)}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-medium">{zones.length + 4}</TableCell>
                    <TableCell>Control Wiring</TableCell>
                    <TableCell>
                      <span className="font-mono text-muted-foreground">1 item</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">{formatCurrency(controlWiringCost)}</span>
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

      {/* Settings Dialog */}
      <GeneratorCostSettingsDialog
        projectId={projectId}
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
        settings={settings}
        onSaved={refetchSettings}
      />
    </>
  );
};
