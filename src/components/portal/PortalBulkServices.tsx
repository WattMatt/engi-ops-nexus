import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Zap, 
  Building2, 
  Activity, 
  Gauge, 
  CheckCircle2, 
  Clock, 
  FileText,
  MapPin,
  Plug,
  Calculator,
  TrendingUp,
  Users
} from "lucide-react";

interface PortalBulkServicesProps {
  projectId: string;
}

export const PortalBulkServices = ({ projectId }: PortalBulkServicesProps) => {
  // Fetch bulk services document for this project
  const { data: document, isLoading: docLoading } = useQuery({
    queryKey: ["portal-bulk-services-doc", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bulk_services_documents")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch workflow phases if document exists
  const { data: phases, isLoading: phasesLoading } = useQuery({
    queryKey: ["portal-bulk-services-phases", document?.id],
    queryFn: async () => {
      if (!document?.id) return [];
      const { data, error } = await supabase
        .from("bulk_services_workflow_phases")
        .select("*")
        .eq("document_id", document.id)
        .order("phase_number", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!document?.id,
  });

  // Fetch all tasks for phases
  const { data: tasks } = useQuery({
    queryKey: ["portal-bulk-services-tasks", phases?.map(p => p.id)],
    queryFn: async () => {
      if (!phases || phases.length === 0) return [];
      const phaseIds = phases.map(p => p.id);
      const { data, error } = await supabase
        .from("bulk_services_workflow_tasks")
        .select("*")
        .in("phase_id", phaseIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!phases && phases.length > 0,
  });

  // Fetch tenants for load breakdown
  const { data: tenants } = useQuery({
    queryKey: ["portal-bulk-services-tenants", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, shop_name, shop_number, area, manual_kw_override, shop_category")
        .eq("project_id", projectId)
        .order("shop_number");

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const isLoading = docLoading || phasesLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            Loading bulk services data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!document) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Zap className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No bulk services application found for this project.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate stats
  const totalConnectedLoad = document.total_connected_load || 0;
  const maximumDemand = document.maximum_demand || 0;
  const diversityFactor = document.diversity_factor || 0;
  const transformerSize = document.transformer_size_kva || 0;
  const primaryVoltage = document.primary_voltage || "-";
  const supplyAuthority = document.supply_authority || "-";
  const connectionSize = document.connection_size || "-";

  // Workflow progress
  const completedTasks = tasks?.filter(t => t.is_completed).length || 0;
  const totalTasks = tasks?.length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Load breakdown by category
  const categoryBreakdown = tenants?.reduce((acc, t) => {
    const cat = t.shop_category || "Other";
    if (!acc[cat]) acc[cat] = { count: 0, area: 0, load: 0 };
    acc[cat].count++;
    acc[cat].area += t.area || 0;
    acc[cat].load += t.manual_kw_override || 0;
    return acc;
  }, {} as Record<string, { count: number; area: number; load: number }>);

  const getPhaseStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/10 text-green-700 border-green-200">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500/10 text-blue-700 border-blue-200">In Progress</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Bulk Services Application
          </CardTitle>
          <CardDescription>
            Document: {document.document_number} | Revision: {document.revision}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Application Progress</span>
                <span className="text-sm font-medium">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
            <Badge variant="outline" className="shrink-0">
              {completedTasks}/{totalTasks} Tasks
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Connected Load
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {totalConnectedLoad > 0 ? `${totalConnectedLoad.toLocaleString()} kVA` : "-"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total installed capacity</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Gauge className="h-4 w-4 text-blue-500" />
              Maximum Demand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {maximumDemand > 0 ? `${maximumDemand.toLocaleString()} kVA` : "-"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">After diversity applied</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calculator className="h-4 w-4 text-emerald-500" />
              Diversity Factor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              {diversityFactor > 0 ? `${(diversityFactor * 100).toFixed(0)}%` : "-"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Load reduction factor</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-violet-500/10 to-violet-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-violet-500" />
              Transformer Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-violet-600">
              {transformerSize > 0 ? `${transformerSize} kVA` : "-"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Specified capacity</p>
          </CardContent>
        </Card>
      </div>

      {/* Supply Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plug className="h-4 w-4" />
            Supply Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Supply Authority</p>
              <p className="font-medium">{supplyAuthority}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Primary Voltage</p>
              <p className="font-medium">{primaryVoltage}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Connection Size</p>
              <p className="font-medium">{connectionSize}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Phases */}
      {phases && phases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Application Phases
            </CardTitle>
            <CardDescription>
              6-phase process for obtaining electrical power from utility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {phases.map((phase) => {
                const phaseTasks = tasks?.filter(t => t.phase_id === phase.id) || [];
                const phaseCompleted = phaseTasks.filter(t => t.is_completed).length;
                const phaseTotal = phaseTasks.length;
                const phaseProgress = phaseTotal > 0 ? Math.round((phaseCompleted / phaseTotal) * 100) : 0;

                return (
                  <div key={phase.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{phase.phase_number}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{phase.phase_name}</p>
                        {getPhaseStatusBadge(phase.status)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={phaseProgress} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground shrink-0">
                          {phaseCompleted}/{phaseTotal}
                        </span>
                      </div>
                    </div>
                    {phase.status === "completed" && (
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    )}
                    {phase.status === "in_progress" && (
                      <Clock className="h-5 w-5 text-blue-500 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Load Breakdown by Category */}
      {categoryBreakdown && Object.keys(categoryBreakdown).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Load Breakdown by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(categoryBreakdown).map(([category, data]) => (
                <div key={category} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">{category}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {data.count} tenant{data.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="font-medium">{data.area.toLocaleString()} m²</p>
                      <p className="text-xs text-muted-foreground">Area</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-amber-600">{data.load.toFixed(1)} kW</p>
                      <p className="text-xs text-muted-foreground">Load</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
