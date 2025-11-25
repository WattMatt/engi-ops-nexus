import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cable, FileText, DollarSign, Zap, TrendingUp, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CableSchedulesOverviewProps {
  projectId: string;
}

export const CableSchedulesOverview = ({ projectId }: CableSchedulesOverviewProps) => {
  // Fetch all schedules
  const { data: schedules = [] } = useQuery({
    queryKey: ["cable-schedules", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cable_schedules")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all cable entries across all schedules
  const { data: allCables = [] } = useQuery({
    queryKey: ["all-cable-entries", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cable_entries")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch saved reports
  const { data: savedReports = [] } = useQuery({
    queryKey: ["cable-schedule-reports", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cable_schedule_reports")
        .select(`
          *,
          cable_schedules!inner(project_id)
        `)
        .eq("cable_schedules.project_id", projectId);
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate metrics
  const totalSchedules = schedules.length;
  const totalCableEntries = allCables.length;
  const totalLength = allCables.reduce((sum, cable) => sum + (cable.total_length || 0), 0);
  const totalCost = allCables.reduce((sum, cable) => sum + (cable.total_cost || 0), 0);
  const latestSchedule = schedules[0];

  // Get unique cable types
  const cableTypes = new Set(allCables.map(c => c.cable_type).filter(Boolean));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Cable Schedules Overview</h2>
        <p className="text-muted-foreground">
          Summary of all cable schedules, entries, and costs for this project
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schedules</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSchedules}</div>
            <p className="text-xs text-muted-foreground">
              Cable schedule documents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cable Entries</CardTitle>
            <Cable className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCableEntries}</div>
            <p className="text-xs text-muted-foreground">
              {cableTypes.size} unique cable types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Length</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLength.toFixed(0)}m</div>
            <p className="text-xs text-muted-foreground">
              Combined cable length
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Latest Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestSchedule ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{latestSchedule.schedule_name}</span>
                  <Badge variant="outline">{latestSchedule.revision}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Schedule #{latestSchedule.schedule_number}
                </div>
                <div className="text-sm text-muted-foreground">
                  Created: {new Date(latestSchedule.schedule_date).toLocaleDateString()}
                </div>
                {latestSchedule.layout_name && (
                  <div className="text-sm text-muted-foreground">
                    Layout: {latestSchedule.layout_name}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No schedules created yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Saved Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Reports</span>
                <span className="text-2xl font-bold">{savedReports.length}</span>
              </div>
              {savedReports.length > 0 && (
                <>
                  <div className="text-sm text-muted-foreground">
                    Latest: {new Date(savedReports[0].generated_at).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {savedReports[0].report_name}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Cable Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-1">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Average Cable Length</div>
              <div className="text-2xl font-bold">
                {totalCableEntries > 0 ? (totalLength / totalCableEntries).toFixed(1) : 0}m
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
