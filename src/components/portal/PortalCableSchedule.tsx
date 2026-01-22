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
import { Cable, Zap, MapPin } from "lucide-react";

interface PortalCableScheduleProps {
  projectId: string;
}

export const PortalCableSchedule = ({ projectId }: PortalCableScheduleProps) => {
  const { data: cables, isLoading } = useQuery({
    queryKey: ["portal-cable-schedule", projectId],
    queryFn: async () => {
      // Get all floor plan IDs for this project
      const { data: floorPlans } = await supabase
        .from("floor_plan_projects")
        .select("id")
        .eq("project_id", projectId);

      const floorPlanIds = floorPlans?.map(fp => fp.id) || [];

      // Get cable schedules for this project
      const { data: schedules } = await supabase
        .from("cable_schedules")
        .select("id")
        .eq("project_id", projectId);

      const scheduleIds = schedules?.map(s => s.id) || [];

      if (floorPlanIds.length === 0 && scheduleIds.length === 0) {
        return [];
      }

      // Get cable entries from floor plans or schedules
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
          circuit_type
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

      const { data, error } = await query;

      if (error) throw error;

      // Sort by base tag first, then by cable number for parallel cables
      return (data || []).sort((a, b) => {
        const baseTagA = a.base_cable_tag || a.cable_tag;
        const baseTagB = b.base_cable_tag || b.cable_tag;

        const tagCompare = baseTagA.localeCompare(baseTagB, undefined, {
          numeric: true,
          sensitivity: "base",
        });
        if (tagCompare !== 0) return tagCompare;

        // For same base tag (parallel cables), sort by cable number
        return (a.cable_number || 0) - (b.cable_number || 0);
      });
    },
    enabled: !!projectId,
  });

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
    if (!type) return null;
    const isAluminium = type.toLowerCase().includes("alu");
    return (
      <Badge variant={isAluminium ? "secondary" : "outline"} className="text-xs">
        {isAluminium ? "Alu" : "Cu"}
      </Badge>
    );
  };

  const getCircuitTypeBadge = (type: string | null) => {
    if (!type) return null;
    const colors: Record<string, string> = {
      power: "bg-blue-500/10 text-blue-700 border-blue-200",
      lighting: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
      hvac: "bg-cyan-500/10 text-cyan-700 border-cyan-200",
      motor: "bg-purple-500/10 text-purple-700 border-purple-200",
    };
    return (
      <Badge variant="outline" className={`text-xs ${colors[type.toLowerCase()] || ""}`}>
        {type}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cable className="h-5 w-5" />
          Cable Tag Schedule
        </CardTitle>
        <CardDescription>
          Complete list of cable tags and specifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!cables || cables.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Cable className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No cable entries found for this project.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4" />
                <span className="font-medium">{cables.length}</span> cables
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">
                  {cables.reduce((sum, c) => sum + (c.total_length || 0), 0).toLocaleString()}m
                </span>{" "}
                total length
              </div>
            </div>

            {/* Table */}
            <ScrollArea className="w-full">
              <div className="rounded-md border min-w-[800px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-16 text-center">#</TableHead>
                      <TableHead>Cable Tag</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead className="text-center">Size</TableHead>
                      <TableHead className="text-center">Type</TableHead>
                      <TableHead className="text-center">Circuit</TableHead>
                      <TableHead className="text-right">Length (m)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cables.map((cable, index) => {
                      const baseTag = cable.base_cable_tag || cable.cable_tag;
                      const cableNumber = cable.cable_number || 1;
                      const isParallel =
                        cable.parallel_group_id &&
                        cable.parallel_total_count &&
                        cable.parallel_total_count > 1;

                      // Build display tag
                      let displayTag = baseTag;
                      if (isParallel) {
                        displayTag += ` (${cableNumber}/${cable.parallel_total_count})`;
                      }

                      return (
                        <TableRow key={cable.id}>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                              {index + 1}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono font-medium">
                            {displayTag}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {cable.from_location || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {cable.to_location || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="font-mono">
                              {cable.cable_size || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {getMaterialBadge(cable.cable_type)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getCircuitTypeBadge(cable.circuit_type)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {cable.total_length?.toLocaleString() || "-"}
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
