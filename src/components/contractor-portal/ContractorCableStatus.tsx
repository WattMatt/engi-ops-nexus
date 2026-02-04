import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Cable, 
  MapPin, 
  Send, 
  Loader2,
  Check,
  Wrench,
  Ruler,
  Search
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ContractorCableStatusProps {
  projectId: string;
}

interface CableEntry {
  id: string;
  cable_tag: string;
  base_cable_tag: string | null;
  cable_number: number | null;
  parallel_group_id: string | null;
  parallel_total_count: number | null;
  cable_size: string | null;
  cable_type: string | null;
  from_location: string;
  to_location: string;
  total_length: number | null;
  measured_length: number | null;
  extra_length: number | null;
  installation_method: string;
  voltage: number | null;
  load_amps: number | null;
  contractor_confirmed: boolean | null;
  contractor_installed: boolean | null;
  contractor_measured_length: number | null;
  contractor_notes: string | null;
  contractor_submitted_at: string | null;
}

interface LocalChanges {
  [cableId: string]: {
    confirmed?: boolean;
    installed?: boolean;
    measuredLength?: string;
    notes?: string;
  };
}

export function ContractorCableStatus({ projectId }: ContractorCableStatusProps) {
  const queryClient = useQueryClient();
  const [localChanges, setLocalChanges] = useState<LocalChanges>({});
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch cable schedules for this project
  const { data: schedules } = useQuery({
    queryKey: ["contractor-cable-schedules-list", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cable_schedules")
        .select("id, schedule_name, schedule_number, revision")
        .eq("project_id", projectId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Fetch floor plan IDs for this project
  const { data: floorPlans } = useQuery({
    queryKey: ["contractor-floor-plans-list", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("floor_plan_projects")
        .select("id, name")
        .eq("project_id", projectId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Fetch all cable entries
  const { data: cables, isLoading } = useQuery({
    queryKey: ["contractor-cable-entries", projectId, schedules?.map(s => s.id), floorPlans?.map(f => f.id)],
    queryFn: async () => {
      const scheduleIds = schedules?.map(s => s.id) || [];
      const floorPlanIds = floorPlans?.map(f => f.id) || [];

      if (scheduleIds.length === 0 && floorPlanIds.length === 0) {
        return [];
      }

      let query = supabase
        .from("cable_entries")
        .select(`
          id, 
          cable_tag, 
          base_cable_tag, 
          cable_number, 
          parallel_group_id, 
          parallel_total_count, 
          cable_size, 
          cable_type,
          from_location,
          to_location,
          total_length,
          measured_length,
          extra_length,
          installation_method,
          voltage,
          load_amps,
          contractor_confirmed,
          contractor_installed,
          contractor_measured_length,
          contractor_notes,
          contractor_submitted_at
        `);

      const conditions: string[] = [];
      if (scheduleIds.length > 0) {
        conditions.push(`schedule_id.in.(${scheduleIds.join(",")})`);
      }
      if (floorPlanIds.length > 0) {
        conditions.push(`floor_plan_id.in.(${floorPlanIds.join(",")})`);
      }

      if (conditions.length > 0) {
        query = query.or(conditions.join(","));
      }

      const { data, error } = await query.order("cable_tag", { ascending: true });

      if (error) throw error;
      return (data || []) as CableEntry[];
    },
    enabled: !!projectId && (!!schedules || !!floorPlans),
  });

  // Submit changes mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(localChanges).map(([cableId, changes]) => {
        const updateData: Record<string, unknown> = {
          contractor_submitted_at: new Date().toISOString(),
        };
        
        if (changes.confirmed !== undefined) {
          updateData.contractor_confirmed = changes.confirmed;
          if (changes.confirmed) {
            updateData.contractor_confirmed_at = new Date().toISOString();
          }
        }
        if (changes.installed !== undefined) {
          updateData.contractor_installed = changes.installed;
          if (changes.installed) {
            updateData.contractor_installed_at = new Date().toISOString();
          }
        }
        if (changes.measuredLength !== undefined && changes.measuredLength !== '') {
          updateData.contractor_measured_length = parseFloat(changes.measuredLength);
        }
        if (changes.notes !== undefined) {
          updateData.contractor_notes = changes.notes;
        }

        return supabase
          .from("cable_entries")
          .update(updateData)
          .eq("id", cableId);
      });

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} cables`);
      }
    },
    onSuccess: () => {
      toast.success("Cable updates submitted successfully");
      setLocalChanges({});
      queryClient.invalidateQueries({ queryKey: ["contractor-cable-entries"] });
    },
    onError: (error) => {
      toast.error(`Failed to submit: ${error.message}`);
    },
  });

  const handleConfirmChange = (cableId: string, confirmed: boolean) => {
    setLocalChanges(prev => ({
      ...prev,
      [cableId]: { ...prev[cableId], confirmed }
    }));
  };

  const handleInstalledChange = (cableId: string, installed: boolean) => {
    setLocalChanges(prev => ({
      ...prev,
      [cableId]: { ...prev[cableId], installed }
    }));
  };

  const handleLengthChange = (cableId: string, length: string) => {
    setLocalChanges(prev => ({
      ...prev,
      [cableId]: { ...prev[cableId], measuredLength: length }
    }));
  };

  const handleNotesChange = (cableId: string, notes: string) => {
    setLocalChanges(prev => ({
      ...prev,
      [cableId]: { ...prev[cableId], notes }
    }));
  };

  const getEffectiveValue = (cable: CableEntry, field: keyof LocalChanges[string]) => {
    const localChange = localChanges[cable.id];
    if (localChange && localChange[field] !== undefined) {
      return localChange[field];
    }
    switch (field) {
      case 'confirmed': return cable.contractor_confirmed ?? false;
      case 'installed': return cable.contractor_installed ?? false;
      case 'measuredLength': return cable.contractor_measured_length?.toString() ?? '';
      case 'notes': return cable.contractor_notes ?? '';
      default: return undefined;
    }
  };

  const hasChanges = Object.keys(localChanges).length > 0;

  // Filter cables by search
  const filteredCables = cables?.filter(cable => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      cable.cable_tag?.toLowerCase().includes(search) ||
      cable.from_location?.toLowerCase().includes(search) ||
      cable.to_location?.toLowerCase().includes(search) ||
      cable.cable_size?.toLowerCase().includes(search)
    );
  }) || [];

  // Calculate stats from filtered cables
  const confirmedCount = filteredCables.filter(c => 
    getEffectiveValue(c, 'confirmed') === true
  ).length;
  const installedCount = filteredCables.filter(c => 
    getEffectiveValue(c, 'installed') === true
  ).length;
  const totalCables = filteredCables.length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading cable schedule...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!cables || cables.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cable className="h-5 w-5" />
            Cable Status Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Cable className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No cables found for this project.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cable className="h-5 w-5" />
              Cable Status Tracker
            </CardTitle>
            <CardDescription>
              Confirm receipt, track installation, and record measured lengths
            </CardDescription>
          </div>
          {hasChanges && (
            <Button 
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="gap-2"
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit Updates
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-primary">{totalCables}</div>
            <div className="text-xs text-muted-foreground">Total Cables</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600 flex items-center justify-center gap-1">
              <Check className="h-5 w-5" />
              {confirmedCount}
            </div>
            <div className="text-xs text-muted-foreground">Confirmed</div>
          </div>
          <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
              <Wrench className="h-5 w-5" />
              {installedCount}
            </div>
            <div className="text-xs text-muted-foreground">Installed</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by cable tag, location, or size..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Checkbox checked disabled className="h-4 w-4" />
            <span><strong>Confirmed:</strong> Received & acknowledged</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked disabled className="h-4 w-4 data-[state=checked]:bg-green-600" />
            <span><strong>Installed:</strong> Cable pulled & terminated</span>
          </div>
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            <span><strong>Measured:</strong> Actual site measurement</span>
          </div>
        </div>

        {/* Table */}
        <ScrollArea className="w-full">
          <div className="rounded-md border min-w-[900px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[180px]">Cable Tag</TableHead>
                  <TableHead className="w-[140px]">From → To</TableHead>
                  <TableHead className="text-center w-20">Size</TableHead>
                  <TableHead className="text-center w-24">Design (m)</TableHead>
                  <TableHead className="text-center w-20">
                    <div className="flex flex-col items-center">
                      <Check className="h-4 w-4 mb-1" />
                      <span>Confirmed</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center w-20">
                    <div className="flex flex-col items-center">
                      <Wrench className="h-4 w-4 mb-1" />
                      <span>Installed</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center w-28">
                    <div className="flex flex-col items-center">
                      <Ruler className="h-4 w-4 mb-1" />
                      <span>Measured (m)</span>
                    </div>
                  </TableHead>
                  <TableHead className="w-[100px]">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCables.map((cable) => {
                  const isConfirmed = getEffectiveValue(cable, 'confirmed') as boolean;
                  const isInstalled = getEffectiveValue(cable, 'installed') as boolean;
                  const measuredLength = getEffectiveValue(cable, 'measuredLength') as string;
                  const notes = getEffectiveValue(cable, 'notes') as string;
                  const hasLocalChange = !!localChanges[cable.id];
                  
                  const designLength = cable.total_length || 
                    ((cable.measured_length || 0) + (cable.extra_length || 0));

                  const isParallel = cable.parallel_group_id && 
                    cable.parallel_total_count && 
                    cable.parallel_total_count > 1;

                  let displayTag = cable.cable_tag || '';
                  if (isParallel) {
                    const baseTag = cable.base_cable_tag || cable.cable_tag || '';
                    displayTag = `${baseTag} (${cable.cable_number || 1}/${cable.parallel_total_count})`;
                  }

                  return (
                    <TableRow 
                      key={cable.id}
                      className={cn(
                        hasLocalChange && "bg-amber-50 dark:bg-amber-950/20",
                        isInstalled && !hasLocalChange && "bg-green-50/50 dark:bg-green-950/20"
                      )}
                    >
                      <TableCell>
                        <div className="font-medium text-sm">{displayTag}</div>
                        {cable.cable_type && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {cable.cable_type}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{cable.from_location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{cable.to_location}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {cable.cable_size ? (
                          <Badge variant="secondary" className="font-mono text-xs">
                            {cable.cable_size}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">
                        {designLength > 0 ? designLength.toFixed(1) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={isConfirmed}
                          onCheckedChange={(checked) => 
                            handleConfirmChange(cable.id, checked as boolean)
                          }
                          className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={isInstalled}
                          onCheckedChange={(checked) => 
                            handleInstalledChange(cable.id, checked as boolean)
                          }
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="0.0"
                          value={measuredLength}
                          onChange={(e) => handleLengthChange(cable.id, e.target.value)}
                          className="h-8 w-20 text-center font-mono text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        {expandedNotes === cable.id ? (
                          <Textarea
                            value={notes}
                            onChange={(e) => handleNotesChange(cable.id, e.target.value)}
                            onBlur={() => setExpandedNotes(null)}
                            placeholder="Notes..."
                            className="min-h-[60px] text-xs"
                            autoFocus
                          />
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-8 w-full text-xs justify-start",
                              notes && "text-foreground"
                            )}
                            onClick={() => setExpandedNotes(cable.id)}
                          >
                            {notes ? (
                              <span className="truncate">{notes}</span>
                            ) : (
                              <span className="text-muted-foreground">Add note...</span>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>

        {/* Pending changes indicator */}
        {hasChanges && (
          <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <span className="text-sm text-amber-800 dark:text-amber-200">
              You have {Object.keys(localChanges).length} unsaved changes
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocalChanges({})}
              >
                Discard
              </Button>
              <Button
                size="sm"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="gap-2"
              >
                {submitMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Submit
              </Button>
            </div>
          </div>
        )}

        {/* Summary Footer */}
        <div className="pt-4 border-t text-sm text-muted-foreground">
          Showing {filteredCables.length} of {cables?.length || 0} cables
        </div>
      </CardContent>
    </Card>
  );
}