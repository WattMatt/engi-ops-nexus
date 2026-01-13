import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Send, Eye, MousePointer, AlertTriangle } from "lucide-react";

export function EmailAnalyticsDashboard() {
  // Placeholder analytics - will be populated once emails start being tracked
  const stats = [
    { label: "Emails Sent", value: "0", icon: Send, change: null },
    { label: "Delivered", value: "0%", icon: Send, change: null },
    { label: "Open Rate", value: "0%", icon: Eye, change: null },
    { label: "Click Rate", value: "0%", icon: MousePointer, change: null },
    { label: "Bounce Rate", value: "0%", icon: AlertTriangle, change: null },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Email Performance
          </CardTitle>
          <CardDescription>
            Track email delivery, opens, and clicks over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">No Data Yet</h3>
            <p className="text-muted-foreground mt-1 max-w-md">
              Analytics will appear here once you start sending emails using your templates.
              Track opens, clicks, and delivery rates to optimize your communications.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Templates</CardTitle>
          <CardDescription>
            Templates ranked by engagement rate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <p>No template performance data available yet</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
