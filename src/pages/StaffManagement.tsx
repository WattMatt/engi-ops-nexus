import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, DollarSign, Award, FileText, Gift, Building, LayoutDashboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddEmployeeDialog } from "@/components/hr/AddEmployeeDialog";
import { EmployeeList } from "@/components/hr/EmployeeList";
import { DepartmentsManager } from "@/components/hr/DepartmentsManager";
import { LeaveManager } from "@/components/hr/LeaveManager";
import { AttendanceManager } from "@/components/hr/AttendanceManager";
import { PayrollManager } from "@/components/hr/PayrollManager";
import { PerformanceManager } from "@/components/hr/PerformanceManager";
import { OnboardingManager } from "@/components/hr/OnboardingManager";
import { BenefitsManager } from "@/components/hr/BenefitsManager";
import { HRDashboard } from "@/components/hr/HRDashboard";
import { useQueryClient } from "@tanstack/react-query";

const StaffManagement = () => {
  const queryClient = useQueryClient();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    departments: 0,
    pendingLeaves: 0,
    activeGoals: 0,
  });
  const { toast } = useToast();

  const handleEmployeeAdded = () => {
    // Invalidate and refetch employee-related queries
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    loadStats();
  };

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [employeesRes, deptRes, leavesRes, goalsRes] = await Promise.all([
        supabase.from("employees").select("id", { count: "exact" }),
        supabase.from("departments").select("id", { count: "exact" }),
        supabase.from("leave_requests").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("performance_goals").select("id", { count: "exact" }).eq("status", "in_progress"),
      ]);

      setStats({
        totalEmployees: employeesRes.count || 0,
        departments: deptRes.count || 0,
        pendingLeaves: leavesRes.count || 0,
        activeGoals: goalsRes.count || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  return (
    <div className="container mx-auto px-6 py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">HR Management Portal</h1>
          <p className="text-muted-foreground">Manage your workforce and HR operations</p>
        </div>
        <AddEmployeeDialog onSuccess={handleEmployeeAdded} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.departments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingLeaves}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeGoals}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="dashboard">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="employees">
            <Users className="mr-2 h-4 w-4" />
            Employees
          </TabsTrigger>
          <TabsTrigger value="departments">
            <Building className="mr-2 h-4 w-4" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="leaves">
            <Calendar className="mr-2 h-4 w-4" />
            Leave
          </TabsTrigger>
          <TabsTrigger value="attendance">
            <Calendar className="mr-2 h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="payroll">
            <DollarSign className="mr-2 h-4 w-4" />
            Payroll
          </TabsTrigger>
          <TabsTrigger value="performance">
            <Award className="mr-2 h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="onboarding">
            <FileText className="mr-2 h-4 w-4" />
            Onboarding
          </TabsTrigger>
          <TabsTrigger value="benefits">
            <Gift className="mr-2 h-4 w-4" />
            Benefits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <HRDashboard />
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employee Management</CardTitle>
              <CardDescription>View and manage all employees</CardDescription>
            </CardHeader>
            <CardContent>
              <EmployeeList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Departments & Positions</CardTitle>
              <CardDescription>Manage organizational structure</CardDescription>
            </CardHeader>
            <CardContent>
              <DepartmentsManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Leave Management</CardTitle>
              <CardDescription>Track and approve leave requests</CardDescription>
            </CardHeader>
            <CardContent>
              <LeaveManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Tracking</CardTitle>
              <CardDescription>Monitor employee attendance</CardDescription>
            </CardHeader>
            <CardContent>
              <AttendanceManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Management</CardTitle>
              <CardDescription>Process payroll and manage compensation</CardDescription>
            </CardHeader>
            <CardContent>
              <PayrollManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Reviews</CardTitle>
              <CardDescription>Track performance and goals</CardDescription>
            </CardHeader>
            <CardContent>
              <PerformanceManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Onboarding & Offboarding</CardTitle>
              <CardDescription>Manage employee lifecycle</CardDescription>
            </CardHeader>
            <CardContent>
              <OnboardingManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benefits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Benefits Administration</CardTitle>
              <CardDescription>Manage employee benefits and perks</CardDescription>
            </CardHeader>
            <CardContent>
              <BenefitsManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffManagement;
