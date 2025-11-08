import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Users,
  Timer,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { formatDistanceToNow, differenceInHours, format, subDays, startOfDay } from "date-fns";

interface AnalyticsData {
  totalIssues: number;
  totalSuggestions: number;
  resolvedIssues: number;
  resolvedSuggestions: number;
  averageResolutionTimeHours: number;
  userVerifiedCount: number;
  reopenedCount: number;
  awaitingUserCount: number;
  categoryBreakdown: Array<{ category: string; count: number }>;
  severityBreakdown: Array<{ severity: string; count: number }>;
  statusBreakdown: Array<{ status: string; count: number }>;
  resolutionTrend: Array<{ date: string; resolved: number; created: number }>;
  satisfactionRate: number;
}

const COLORS = {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  destructive: "hsl(var(--destructive))",
  success: "hsl(142, 76%, 36%)",
  warning: "hsl(38, 92%, 50%)",
  info: "hsl(221, 83%, 53%)",
};

const FeedbackAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const getDateFilter = () => {
    if (timeRange === "all") return null;
    const days = parseInt(timeRange);
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const dateFilter = getDateFilter();

      // Build queries with optional date filter
      const issuesQuery = supabase.from("issue_reports").select("*");
      const suggestionsQuery = supabase.from("suggestions").select("*");

      if (dateFilter) {
        issuesQuery.gte("created_at", dateFilter);
        suggestionsQuery.gte("created_at", dateFilter);
      }

      const [issuesRes, suggestionsRes] = await Promise.all([
        issuesQuery,
        suggestionsQuery,
      ]);

      if (issuesRes.error) throw issuesRes.error;
      if (suggestionsRes.error) throw suggestionsRes.error;

      const issues = issuesRes.data || [];
      const suggestions = suggestionsRes.data || [];
      const allFeedback = [...issues, ...suggestions];

      // Calculate metrics
      const resolvedIssues = issues.filter(i => i.status === "resolved").length;
      const resolvedSuggestions = suggestions.filter(s => s.status === "resolved").length;
      const totalResolved = resolvedIssues + resolvedSuggestions;

      // Calculate average resolution time
      const resolvedItems = allFeedback.filter(item => item.resolved_at);
      const resolutionTimes = resolvedItems.map(item => 
        differenceInHours(new Date(item.resolved_at), new Date(item.created_at))
      );
      const averageResolutionTimeHours = resolutionTimes.length > 0
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        : 0;

      // User satisfaction metrics
      const userVerifiedCount = allFeedback.filter(item => item.user_verified).length;
      const reopenedCount = allFeedback.filter(item => item.status === "reopened").length;
      const awaitingUserCount = allFeedback.filter(item => item.needs_user_attention).length;
      
      // Satisfaction rate: (verified / (verified + reopened)) * 100
      const satisfactionRate = (userVerifiedCount + reopenedCount) > 0
        ? (userVerifiedCount / (userVerifiedCount + reopenedCount)) * 100
        : 0;

      // Category breakdown (issues only)
      const categoryMap = new Map<string, number>();
      issues.forEach(issue => {
        categoryMap.set(issue.category, (categoryMap.get(issue.category) || 0) + 1);
      });
      const categoryBreakdown = Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      // Severity breakdown (issues only)
      const severityMap = new Map<string, number>();
      issues.forEach(issue => {
        severityMap.set(issue.severity, (severityMap.get(issue.severity) || 0) + 1);
      });
      const severityBreakdown = Array.from(severityMap.entries())
        .map(([severity, count]) => ({ severity, count }))
        .sort((a, b) => {
          const order = { critical: 0, high: 1, medium: 2, low: 3 };
          return order[a.severity as keyof typeof order] - order[b.severity as keyof typeof order];
        });

      // Status breakdown
      const statusMap = new Map<string, number>();
      allFeedback.forEach(item => {
        statusMap.set(item.status, (statusMap.get(item.status) || 0) + 1);
      });
      const statusBreakdown = Array.from(statusMap.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);

      // Resolution trend (last 30 days)
      const resolutionTrend = [];
      for (let i = 29; i >= 0; i--) {
        const date = startOfDay(subDays(new Date(), i));
        const dateStr = format(date, "MM/dd");
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const created = allFeedback.filter(item => {
          const itemDate = new Date(item.created_at);
          return itemDate >= date && itemDate < nextDay;
        }).length;

        const resolved = allFeedback.filter(item => {
          if (!item.resolved_at) return false;
          const itemDate = new Date(item.resolved_at);
          return itemDate >= date && itemDate < nextDay;
        }).length;

        resolutionTrend.push({ date: dateStr, created, resolved });
      }

      setAnalytics({
        totalIssues: issues.length,
        totalSuggestions: suggestions.length,
        resolvedIssues,
        resolvedSuggestions,
        averageResolutionTimeHours,
        userVerifiedCount,
        reopenedCount,
        awaitingUserCount,
        categoryBreakdown,
        severityBreakdown,
        statusBreakdown,
        resolutionTrend,
        satisfactionRate,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatResolutionTime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)} minutes`;
    if (hours < 24) return `${Math.round(hours)} hours`;
    return `${Math.round(hours / 24)} days`;
  };

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  const totalFeedback = analytics.totalIssues + analytics.totalSuggestions;
  const totalResolved = analytics.resolvedIssues + analytics.resolvedSuggestions;
  const resolutionRate = totalFeedback > 0 ? (totalResolved / totalFeedback) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feedback Analytics</h1>
          <p className="text-muted-foreground">
            Track resolution times, user satisfaction, and feedback trends
          </p>
        </div>
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <TabsList>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="90d">90 Days</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFeedback}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalIssues} issues • {analytics.totalSuggestions} suggestions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolutionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {totalResolved} of {totalFeedback} resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatResolutionTime(analytics.averageResolutionTimeHours)}
            </div>
            <p className="text-xs text-muted-foreground">
              From report to resolution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Satisfaction</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.satisfactionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.userVerifiedCount} verified • {analytics.reopenedCount} reopened
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Resolution Trend */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Feedback Trend (Last 30 Days)</CardTitle>
            <CardDescription>Daily created vs resolved feedback items</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.resolutionTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="created" 
                  stroke={COLORS.primary} 
                  strokeWidth={2}
                  name="Created"
                />
                <Line 
                  type="monotone" 
                  dataKey="resolved" 
                  stroke={COLORS.success} 
                  strokeWidth={2}
                  name="Resolved"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Issues by Category</CardTitle>
            <CardDescription>Most common issue categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.categoryBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill={COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Severity Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Issues by Severity</CardTitle>
            <CardDescription>Distribution of issue severity levels</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.severityBreakdown}
                  dataKey="count"
                  nameKey="severity"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.severity}: ${entry.count}`}
                >
                  {analytics.severityBreakdown.map((entry, index) => {
                    const colors = {
                      critical: COLORS.destructive,
                      high: COLORS.warning,
                      medium: COLORS.info,
                      low: COLORS.secondary,
                    };
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={colors[entry.severity as keyof typeof colors] || COLORS.primary} 
                      />
                    );
                  })}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Feedback by Status</CardTitle>
            <CardDescription>Current status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.statusBreakdown.map((item) => {
                const percentage = totalFeedback > 0 ? (item.count / totalFeedback) * 100 : 0;
                return (
                  <div key={item.status} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {item.status.replace(/[-_]/g, " ")}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {item.count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* User Engagement */}
        <Card>
          <CardHeader>
            <CardTitle>User Engagement</CardTitle>
            <CardDescription>Verification and response metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-5 w-5 text-success" />
                  <span className="font-medium">Verified Fixed</span>
                </div>
                <Badge variant="default">{analytics.userVerifiedCount}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <ThumbsDown className="h-5 w-5 text-destructive" />
                  <span className="font-medium">Reopened</span>
                </div>
                <Badge variant="destructive">{analytics.reopenedCount}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-warning" />
                  <span className="font-medium">Awaiting User</span>
                </div>
                <Badge variant="secondary">{analytics.awaitingUserCount}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeedbackAnalytics;
