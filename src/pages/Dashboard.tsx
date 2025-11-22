import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  DollarSign, 
  Cable, 
  FileCheck, 
  Users,
  Settings,
  TrendingUp,
  Activity,
  Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TenantChangesWidget } from "@/components/dashboard/TenantChangesWidget";
import { BeneficialOccupationWidget } from "@/components/dashboard/BeneficialOccupationWidget";
import { BulkServicesWidget } from "@/components/dashboard/BulkServicesWidget";
import { ProjectCompletionCard } from "@/components/dashboard/ProjectCompletionCard";
import { IssuesIncompleteWidget } from "@/components/dashboard/IssuesIncompleteWidget";

const Dashboard = () => {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState(localStorage.getItem("selectedProjectId"));
  const projectName = localStorage.getItem("currentProjectName");

  // Listen for project changes
  useEffect(() => {
    const handleProjectChange = () => {
      setProjectId(localStorage.getItem("selectedProjectId"));
    };
    
    window.addEventListener('projectChanged', handleProjectChange);
    return () => window.removeEventListener('projectChanged', handleProjectChange);
  }, []);

  const { data: costReports = [] } = useQuery({
    queryKey: ["cost-reports", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("cost_reports")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ["budgets", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("electrical_budgets")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: cableSchedules = [] } = useQuery({
    queryKey: ["cable-schedules", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("cable_schedules")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const totalDocuments = costReports.length + budgets.length;

  return (
    <div className="flex-1 space-y-4 px-6 pt-6 pb-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Project Overview</h1>
        <p className="text-muted-foreground">
          Selected Project: <span className="font-semibold">{projectName || "None"}</span>
        </p>
      </div>

      {/* Project Completion Card - Prominent Position */}
      {projectId && (
        <div className="mb-6">
          <ProjectCompletionCard projectId={projectId} />
        </div>
      )}

      {/* Quick Stats - More Compact */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/dashboard/cost-reports")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costReports.length}</div>
            <p className="text-xs text-muted-foreground">Active reports</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/dashboard/budgets/electrical")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budgets</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{budgets.length}</div>
            <p className="text-xs text-muted-foreground">Electrical budgets</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/dashboard/cable-schedules")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cable Schedules</CardTitle>
            <Cable className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cableSchedules.length}</div>
            <p className="text-xs text-muted-foreground">Active schedules</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/dashboard/project-settings")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Settings</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Configure</div>
            <p className="text-xs text-muted-foreground">Manage project</p>
          </CardContent>
        </Card>
      </div>

      {/* Issues & Incomplete Items Widget */}
      {projectId && (
        <div className="mb-6">
          <IssuesIncompleteWidget projectId={projectId} />
        </div>
      )}

      {/* Status Widgets Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Left column - Tenant Changes */}
        <div className="lg:col-span-1">
          <TenantChangesWidget />
        </div>

        {/* Middle column - Beneficial Occupation Deadlines */}
        {projectId && (
          <div className="lg:col-span-1">
            <BeneficialOccupationWidget projectId={projectId} />
          </div>
        )}

        {/* Bulk Services Status Widget */}
        {projectId && (
          <div className="lg:col-span-1">
            <BulkServicesWidget projectId={projectId} />
          </div>
        )}
      </div>

      {/* Secondary Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Right column with stacked cards */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Project Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Documentation</span>
                  <span className="font-medium">{totalDocuments} items</span>
                </div>
                <Progress value={totalDocuments > 0 ? 65 : 0} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Technical Drawings</span>
                  <span className="font-medium">{cableSchedules.length} schedules</span>
                </div>
                <Progress value={cableSchedules.length > 0 ? 45 : 0} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Empty space columns for layout */}
        <div className="lg:col-span-2"></div>
      </div>
    </div>
  );
};

export default Dashboard;