import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  DollarSign, 
  Cable, 
  FileCheck, 
  Users,
  TrendingUp,
  Activity,
  Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const projectId = localStorage.getItem("selectedProjectId");
  const projectName = localStorage.getItem("currentProjectName");
  const navigate = useNavigate();

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

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const activeEmployees = employees.filter((e: any) => e.employment_status === 'active').length;
  const totalDocuments = costReports.length + budgets.length;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Project Overview</h1>
          <p className="text-muted-foreground mt-1">{projectName || "No project selected"}</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/dashboard/staff")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEmployees}</div>
            <p className="text-xs text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2">
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Employees</span>
                <span className="text-2xl font-bold">{activeEmployees}</span>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate("/dashboard/staff")}
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Staff
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" onClick={() => navigate("/dashboard/cost-reports")}>
              <FileText className="h-4 w-4 mr-2" />
              New Cost Report
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard/budgets/electrical")}>
              <DollarSign className="h-4 w-4 mr-2" />
              New Budget
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard/cable-schedules")}>
              <Cable className="h-4 w-4 mr-2" />
              New Cable Schedule
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard/site-diary")}>
              <Calendar className="h-4 w-4 mr-2" />
              Site Diary
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;