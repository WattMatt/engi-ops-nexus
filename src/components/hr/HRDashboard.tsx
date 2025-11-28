import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { Users, UserCheck, UserX, Clock, TrendingUp, Calendar } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#10b981", "#f59e0b", "#ef4444"];

export function HRDashboard() {
  // Fetch employees by department
  const { data: departmentData = [] } = useQuery({
    queryKey: ["hr-dashboard-departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select(`
          department_id,
          departments!employees_department_id_fkey (name)
        `);
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach((emp: any) => {
        const dept = emp.departments?.name || "Unassigned";
        counts[dept] = (counts[dept] || 0) + 1;
      });
      
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
  });

  // Fetch employee status breakdown
  const { data: statusData = [] } = useQuery({
    queryKey: ["hr-dashboard-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("employment_status");
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach((emp: any) => {
        const status = emp.employment_status || "active";
        counts[status] = (counts[status] || 0) + 1;
      });
      
      return Object.entries(counts).map(([name, value]) => ({ 
        name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '), 
        value 
      }));
    },
  });

  // Fetch recent attendance trends (last 7 days)
  const { data: attendanceData = [] } = useQuery({
    queryKey: ["hr-dashboard-attendance"],
    queryFn: async () => {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from("attendance_records")
        .select("record_date, clock_in, clock_out")
        .gte("record_date", weekAgo.toISOString().split("T")[0])
        .lte("record_date", today.toISOString().split("T")[0]);
      if (error) throw error;
      
      const counts: Record<string, { present: number; total: number }> = {};
      data?.forEach((rec: any) => {
        const date = rec.record_date;
        if (!counts[date]) counts[date] = { present: 0, total: 0 };
        counts[date].total += 1;
        if (rec.clock_in) counts[date].present += 1;
      });
      
      return Object.entries(counts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, vals]) => ({
          date: new Date(date).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric" }),
          present: vals.present,
          absent: vals.total - vals.present,
        }));
    },
  });

  // Fetch leave statistics
  const { data: leaveStats = { pending: 0, approved: 0, rejected: 0 } } = useQuery({
    queryKey: ["hr-dashboard-leaves"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("status");
      if (error) throw error;
      
      const stats = { pending: 0, approved: 0, rejected: 0 };
      data?.forEach((req: any) => {
        if (req.status in stats) {
          stats[req.status as keyof typeof stats] += 1;
        }
      });
      return stats;
    },
  });

  // Fetch payroll summary
  const { data: payrollSummary = { totalMonthly: 0, avgSalary: 0, employeeCount: 0 } } = useQuery({
    queryKey: ["hr-dashboard-payroll"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_records")
        .select("salary_amount, payment_frequency, end_date")
        .is("end_date", null);
      if (error) throw error;
      
      let totalMonthly = 0;
      data?.forEach((rec: any) => {
        let monthly = rec.salary_amount || 0;
        if (rec.payment_frequency === "weekly") monthly *= 4;
        else if (rec.payment_frequency === "bi-weekly") monthly *= 2;
        else if (rec.payment_frequency === "annually") monthly /= 12;
        totalMonthly += monthly;
      });
      
      return {
        totalMonthly,
        avgSalary: data?.length ? totalMonthly / data.length : 0,
        employeeCount: data?.length || 0,
      };
    },
  });

  // Fetch upcoming events (leaves, goals)
  const { data: upcomingLeaves = [] } = useQuery({
    queryKey: ["hr-dashboard-upcoming"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const { data, error } = await supabase
        .from("leave_requests")
        .select(`
          start_date,
          end_date,
          employees!leave_requests_employee_id_fkey (first_name, last_name),
          leave_types!leave_requests_leave_type_id_fkey (name)
        `)
        .eq("status", "approved")
        .gte("start_date", today)
        .lte("start_date", nextWeek.toISOString().split("T")[0])
        .order("start_date")
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Payroll (Monthly)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(payrollSummary.totalMonthly)}</div>
            <p className="text-xs text-muted-foreground">
              {payrollSummary.employeeCount} active employees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Salary</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(payrollSummary.avgSalary)}</div>
            <p className="text-xs text-muted-foreground">Per employee monthly</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Leave Requests</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leaveStats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Leave Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-yellow-600">{leaveStats.pending} Pending</Badge>
              <Badge variant="outline" className="text-green-600">{leaveStats.approved} Approved</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Employees by Department</CardTitle>
            <CardDescription>Distribution across departments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {departmentData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Employment Status */}
        <Card>
          <CardHeader>
            <CardTitle>Employment Status</CardTitle>
            <CardDescription>Breakdown by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))" 
                    }} 
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance and Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Trend (Last 7 Days)</CardTitle>
            <CardDescription>Daily attendance records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))" 
                    }} 
                  />
                  <Legend />
                  <Line type="monotone" dataKey="present" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Leaves */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Leave</CardTitle>
            <CardDescription>Approved leaves in the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingLeaves.length === 0 ? (
              <p className="text-muted-foreground text-sm">No upcoming leaves</p>
            ) : (
              <div className="space-y-3">
                {upcomingLeaves.map((leave: any, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">
                        {leave.employees?.first_name} {leave.employees?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {leave.leave_types?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        {new Date(leave.start_date).toLocaleDateString("en-ZA", { 
                          month: "short", 
                          day: "numeric" 
                        })}
                        {leave.end_date !== leave.start_date && (
                          <> - {new Date(leave.end_date).toLocaleDateString("en-ZA", { 
                            month: "short", 
                            day: "numeric" 
                          })}</>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
