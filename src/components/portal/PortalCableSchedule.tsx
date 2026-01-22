import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Cable, Zap, MapPin, CheckCircle2, FileText } from "lucide-react";

interface PortalCableScheduleProps {
  projectId: string;
}

export const PortalCableSchedule = ({ projectId }: PortalCableScheduleProps) => {
  // Fetch cable schedules for this project
  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ["portal-cable-schedules-list", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cable_schedules")
        .select("id, schedule_name, schedule_number, revision, schedule_date")
        .eq("project_id", projectId)
        .order("schedule_date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Fetch floor plan IDs for this project
  const { data: floorPlans, isLoading: floorPlansLoading } = useQuery({
    queryKey: ["portal-floor-plans-list", projectId],
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

  // Fetch all cable entries for schedules AND floor plans (matching dashboard behavior)
  const { data: cables, isLoading: cablesLoading } = useQuery({
    queryKey: ["portal-cable-schedule-entries", projectId, schedules?.map(s => s.id), floorPlans?.map(f => f.id)],
    queryFn: async () => {
      const scheduleIds = schedules?.map(s => s.id) || [];
      const floorPlanIds = floorPlans?.map(f => f.id) || [];

      if (scheduleIds.length === 0 && floorPlanIds.length === 0) {
        return [];
      }

      // Build OR query to match dashboard behavior
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
          installation_method,
          circuit_type,
          voltage,
          load_amps,
          quantity,
          insulation_type,
          core_configuration,
          schedule_id,
          floor_plan_id,
          display_order
        `);

      // Build conditions for OR query
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

      const { data, error } = await query.order("display_order", { ascending: true });

      if (error) throw error;

      // Sort by display_order, then by cable_tag
      return (data || []).sort((a, b) => {
        // First by display_order
        if ((a.display_order || 0) !== (b.display_order || 0)) {
          return (a.display_order || 0) - (b.display_order || 0);
        }
        
        // Then by cable_tag
        const tagA = a.cable_tag || '';
        const tagB = b.cable_tag || '';
        return tagA.localeCompare(tagB, undefined, { numeric: true, sensitivity: "base" });
      });
    },
    enabled: !!projectId && (!!schedules || !!floorPlans),
  });

  const isLoading = schedulesLoading || floorPlansLoading || cablesLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            Loading cable schedule...
          </div>
        </CardContent>
      </Card>
    );
  }

  const getMaterialBadge = (type: string | null) => {
    if (!type) return <span className="text-muted-foreground">-</span>;
    const isAluminium = type.toLowerCase().includes("alu");
    return (
      <Badge variant={isAluminium ? "secondary" : "outline"} className="text-xs">
        {isAluminium ? "Aluminium" : "Copper"}
      </Badge>
    );
  };

  const getCircuitTypeBadge = (type: string | null) => {
    if (!type) return <span className="text-muted-foreground">-</span>;
    const colors: Record<string, string> = {
      power: "bg-blue-500/10 text-blue-700 border-blue-200",
      lighting: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
      hvac: "bg-cyan-500/10 text-cyan-700 border-cyan-200",
      motor: "bg-purple-500/10 text-purple-700 border-purple-200",
      data: "bg-green-500/10 text-green-700 border-green-200",
    };
    return (
      <Badge variant="outline" className={`text-xs capitalize ${colors[type.toLowerCase()] || ""}`}>
        {type}
      </Badge>
    );
  };

  const getInstallMethodBadge = (method: string | null) => {
    if (!method) return <span className="text-muted-foreground">-</span>;
    const methodMap: Record<string, string> = {
      'air': 'Air',
      'tray': 'Tray',
      'conduit': 'Conduit',
      'buried': 'Buried',
      'duct': 'Duct',
      'ladder': 'Ladder',
    };
    return (
      <Badge variant="outline" className="text-xs">
        {methodMap[method.toLowerCase()] || method}
      </Badge>
    );
  };

  // Calculate summary stats
  const totalLength = cables?.reduce((sum, c) => sum + (c.total_length || 0), 0) || 0;
  const totalLoad = cables?.reduce((sum, c) => sum + (c.load_amps || 0), 0) || 0;

  const hasNoData = (!schedules || schedules.length === 0) && (!floorPlans || floorPlans.length === 0);
  const hasNoCables = !cables || cables.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cable className="h-5 w-5" />
          Cable Schedule
        </CardTitle>
        <CardDescription>
          Complete cable schedule with specifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasNoData ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No cable schedules or floor plans found for this project.</p>
          </div>
        ) : hasNoCables ? (
          <div className="text-center py-12 text-muted-foreground">
            <Cable className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No cable entries found.</p>
            <p className="text-sm mt-2">Add cables to your cable schedules or floor plans to see them here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Schedule/Source Info */}
            <div className="flex flex-wrap gap-2 text-sm">
              {schedules && schedules.map(schedule => (
                <Badge key={schedule.id} variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" />
                  {schedule.schedule_name} 
                  {schedule.schedule_number && ` (#${schedule.schedule_number})`}
                  {schedule.revision && ` Rev ${schedule.revision}`}
                </Badge>
              ))}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-primary">{cables?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Total Cables</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-primary">{totalLength.toLocaleString()}m</div>
                <div className="text-xs text-muted-foreground">Total Length</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-primary">{totalLoad.toLocaleString()}A</div>
                <div className="text-xs text-muted-foreground">Total Load</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-2xl font-bold flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  {cables?.filter(c => c.cable_size).length || 0}
                </div>
                <div className="text-xs text-muted-foreground">Sized</div>
              </div>
            </div>

            {/* Table */}
            <ScrollArea className="w-full">
              <div className="rounded-md border min-w-[1200px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead className="min-w-[200px]">Cable Tag</TableHead>
                      <TableHead className="min-w-[150px]">From</TableHead>
                      <TableHead className="min-w-[150px]">To</TableHead>
                      <TableHead className="text-center w-16">Qty</TableHead>
                      <TableHead className="text-center w-20">Voltage</TableHead>
                      <TableHead className="text-center w-20">Load (A)</TableHead>
                      <TableHead className="text-center w-24">Cable Type</TableHead>
                      <TableHead className="text-center w-20">Install</TableHead>
                      <TableHead className="text-center w-24">Size</TableHead>
                      <TableHead className="text-right w-24">Length (m)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cables?.map((cable, index) => {
                      const cableNumber = cable.cable_number || 1;
                      const isParallel =
                        cable.parallel_group_id &&
                        cable.parallel_total_count &&
                        cable.parallel_total_count > 1;

                      // Use base_cable_tag for display, build descriptive format like dashboard
                      // e.g., "Main Board 1.2-Shop 1-Alu-185mm"
                      const baseTag = cable.base_cable_tag || cable.cable_tag || '';
                      const materialShort = cable.cable_type === 'Aluminium' ? 'Alu' : 
                                            cable.cable_type === 'Copper' ? 'Cu' : 
                                            cable.cable_type || '';
                      const sizeShort = cable.cable_size?.replace('mm²', 'mm') || '';
                      
                      let displayTag = baseTag;
                      if (materialShort) displayTag += `-${materialShort}`;
                      if (sizeShort) displayTag += `-${sizeShort}`;
                      
                      if (isParallel) {
                        displayTag += ` (${cableNumber}/${cable.parallel_total_count})`;
                      }

                      return (
                        <TableRow key={cable.id}>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-medium text-xs">
                              {index + 1}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">
                              {displayTag || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="truncate">{cable.from_location || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="truncate">{cable.to_location || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {cable.quantity || 1}
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm">
                            {cable.voltage ? `${cable.voltage}V` : "-"}
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm">
                            {cable.load_amps ? cable.load_amps.toFixed(0) : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {getMaterialBadge(cable.cable_type)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getInstallMethodBadge(cable.installation_method)}
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
                          <TableCell className="text-right font-mono text-sm">
                            {cable.total_length?.toFixed(2) || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
