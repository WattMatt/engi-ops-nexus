import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Cable, Search, AlertCircle, ArrowRight
} from "lucide-react";
import { useState } from "react";

interface ContractorCableStatusProps {
  projectId: string;
}

interface CableEntry {
  id: string;
  cable_tag: string | null;
  cable_type: string | null;
  cable_size: string | null;
  from_location: string | null;
  to_location: string | null;
  total_length: number | null;
  notes: string | null;
}

export function ContractorCableStatus({ projectId }: ContractorCableStatusProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch cable entries via cable_schedules
  const { data: cables, isLoading } = useQuery({
    queryKey: ["contractor-cables", projectId],
    queryFn: async () => {
      // First get the cable schedule for this project
      const { data: schedules, error: scheduleError } = await supabase
        .from("cable_schedules")
        .select("id")
        .eq("project_id", projectId);
      
      if (scheduleError) throw scheduleError;
      if (!schedules || schedules.length === 0) return [];
      
      const scheduleIds = schedules.map(s => s.id);
      
      const { data, error } = await supabase
        .from("cable_entries")
        .select(`
          id,
          cable_tag,
          cable_type,
          cable_size,
          from_location,
          to_location,
          total_length,
          notes
        `)
        .in("schedule_id", scheduleIds)
        .order("cable_tag");

      if (error) throw error;
      return (data || []) as CableEntry[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Calculate statistics
  const stats = cables?.reduce(
    (acc, cable) => {
      acc.total++;
      if (cable.total_length) {
        acc.totalLength += cable.total_length;
      }
      return acc;
    },
    { total: 0, totalLength: 0 }
  ) || { total: 0, totalLength: 0 };

  // Filter cables
  const filteredCables = cables?.filter((cable) => {
    const matchesSearch =
      !searchTerm ||
      cable.cable_tag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cable.from_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cable.to_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cable.cable_type?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cable className="h-5 w-5" />
            Cable Schedule Overview
          </CardTitle>
          <CardDescription>
            View the cable schedule for this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Cables</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-2xl font-bold">{stats.totalLength.toLocaleString()}m</p>
              <p className="text-xs text-muted-foreground">Total Length</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-2xl font-bold">{filteredCables.length}</p>
              <p className="text-xs text-muted-foreground">Displayed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cable List */}
      <Card>
        <CardHeader>
          <CardTitle>Cable Schedule</CardTitle>
          <CardDescription>All cables in the project schedule</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by cable tag, location, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Cable List */}
          {filteredCables.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No cables found</p>
              <p className="text-sm">
                {cables?.length === 0 
                  ? "No cable schedule data available for this project"
                  : "Try adjusting your search criteria"}
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {filteredCables.map((cable) => (
                <div
                  key={cable.id}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-medium">
                          {cable.cable_tag || "No Tag"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="truncate">{cable.from_location || "TBD"}</span>
                        <ArrowRight className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{cable.to_location || "TBD"}</span>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {cable.cable_type && (
                          <Badge variant="outline" className="font-mono">
                            {cable.cable_type}
                          </Badge>
                        )}
                        {cable.cable_size && (
                          <Badge variant="secondary" className="font-mono">
                            {cable.cable_size}
                          </Badge>
                        )}
                        {cable.total_length && (
                          <span>{cable.total_length}m</span>
                        )}
                      </div>

                      {cable.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          {cable.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary Footer */}
          <div className="pt-4 border-t text-sm text-muted-foreground">
            Showing {filteredCables.length} of {cables?.length || 0} cables
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
