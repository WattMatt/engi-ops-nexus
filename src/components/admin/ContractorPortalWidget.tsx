import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MetricCard, MetricGrid } from "@/components/common/MetricCard";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Key, Users, AlertTriangle, Clock, RefreshCw, BarChart3, RotateCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { formatDistanceToNow, format, addDays, differenceInDays, subDays, startOfWeek, eachDayOfInterval, eachWeekOfInterval } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type TrendMode = "daily" | "weekly";

function useVisitorTrends(mode: TrendMode) {
  return useQuery({
    queryKey: ["contractor-portal-visitor-trends", mode],
    queryFn: async () => {
      const daysBack = mode === "daily" ? 30 : 90;
      const since = subDays(new Date(), daysBack).toISOString();

      const { data, error } = await supabase
        .from("contractor_portal_access_log")
        .select("accessed_at")
        .gte("accessed_at", since)
        .order("accessed_at", { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const now = new Date();

      if (mode === "daily") {
        const interval = { start: subDays(now, 29), end: now };
        const days = eachDayOfInterval(interval);
        const counts = new Map<string, number>();
        days.forEach((d) => counts.set(format(d, "yyyy-MM-dd"), 0));

        data.forEach((row) => {
          const key = format(new Date(row.accessed_at), "yyyy-MM-dd");
          if (counts.has(key)) counts.set(key, (counts.get(key) || 0) + 1);
        });

        return Array.from(counts.entries()).map(([date, visits]) => ({
          label: format(new Date(date), "dd MMM"),
          visits,
        }));
      } else {
        const interval = { start: subDays(now, 89), end: now };
        const weeks = eachWeekOfInterval(interval, { weekStartsOn: 1 });
        const counts = new Map<string, number>();
        weeks.forEach((w) => counts.set(format(w, "yyyy-MM-dd"), 0));

        data.forEach((row) => {
          const weekStart = startOfWeek(new Date(row.accessed_at), { weekStartsOn: 1 });
          const key = format(weekStart, "yyyy-MM-dd");
          if (counts.has(key)) counts.set(key, (counts.get(key) || 0) + 1);
        });

        return Array.from(counts.entries()).map(([date, visits]) => ({
          label: format(new Date(date), "dd MMM"),
          visits,
        }));
      }
    },
  });
}

export function ContractorPortalWidget() {
  const queryClient = useQueryClient();
  const [trendMode, setTrendMode] = useState<TrendMode>("daily");

  // Active tokens
  const { data: activeTokens = [] } = useQuery({
    queryKey: ["contractor-portal-active-tokens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_portal_tokens")
        .select("*")
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString());
      if (error) throw error;
      return data || [];
    },
  });

  // Expiring tokens (within 14 days)
  const expiringTokens = activeTokens.filter((t) => {
    const daysLeft = differenceInDays(new Date(t.expires_at), new Date());
    return daysLeft <= 14 && daysLeft >= 0;
  });

  // Recent visitors
  const { data: recentVisitors = [] } = useQuery({
    queryKey: ["contractor-portal-recent-visitors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_user_sessions")
        .select("*, contractor_portal_tokens(contractor_name, short_code)")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  // Total visitors last 30 days
  const { data: visitorCount = 0 } = useQuery({
    queryKey: ["contractor-portal-visitor-count-30d"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count, error } = await supabase
        .from("portal_user_sessions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo.toISOString());
      if (error) throw error;
      return count || 0;
    },
  });

  // Visitor trends
  const { data: trendData = [], isLoading: trendsLoading } = useVisitorTrends(trendMode);

  // Extend token mutation
  const extendMutation = useMutation({
    mutationFn: async (token: { id: string; expires_at: string }) => {
      const newExpiry = addDays(new Date(token.expires_at), 30).toISOString();
      const { error } = await supabase
        .from("contractor_portal_tokens")
        .update({ expires_at: newExpiry })
        .eq("id", token.id);
      if (error) throw error;
      return newExpiry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-portal-active-tokens"] });
      toast.success("Token extended by 30 days");
    },
    onError: () => toast.error("Failed to extend token"),
  });

  // Toggle auto-renew mutation
  const toggleAutoRenewMutation = useMutation({
    mutationFn: async ({ id, auto_renew }: { id: string; auto_renew: boolean }) => {
      const { error } = await supabase
        .from("contractor_portal_tokens")
        .update({ auto_renew })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contractor-portal-active-tokens"] });
      toast.success(`Auto-renew ${variables.auto_renew ? "enabled" : "disabled"}`);
    },
    onError: () => toast.error("Failed to update auto-renew"),
  });

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Contractor Portal Activity</CardTitle>
        </div>
        <CardDescription>Real-time summary of portal access and visitor activity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Metrics */}
        <MetricGrid columns={3}>
          <MetricCard
            label="Active Tokens"
            value={activeTokens.length}
            icon={Key}
            variant="primary"
          />
          <MetricCard
            label="Visitors (30 days)"
            value={visitorCount}
            icon={Users}
          />
          <MetricCard
            label="Expiring Soon"
            value={expiringTokens.length}
            icon={AlertTriangle}
            variant={expiringTokens.length > 0 ? "warning" : "success"}
            description={expiringTokens.length > 0 ? "Within 14 days" : "All tokens healthy"}
          />
        </MetricGrid>

        {/* Visitor Trends Chart */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Visitor Trends
            </h4>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={trendMode === "daily" ? "default" : "ghost"}
                className="h-7 text-xs px-3"
                onClick={() => setTrendMode("daily")}
              >
                Daily
              </Button>
              <Button
                size="sm"
                variant={trendMode === "weekly" ? "default" : "ghost"}
                className="h-7 text-xs px-3"
                onClick={() => setTrendMode("weekly")}
              >
                Weekly
              </Button>
            </div>
          </div>
          {trendsLoading ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
              Loading trends…
            </div>
          ) : trendData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
              No visitor data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="portalVisitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  interval={trendMode === "daily" ? 4 : 1}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "hsl(var(--popover-foreground))",
                  }}
                  formatter={(value: number) => [value, "Visits"]}
                />
                <Area
                  type="monotone"
                  dataKey="visits"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#portalVisitGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Active tokens with auto-renew toggles */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
            <RotateCw className="h-4 w-4 text-muted-foreground" />
            Active Tokens — Auto-Renew
          </h4>
          {activeTokens.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active tokens</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-center">Auto-Renew</TableHead>
                  <TableHead className="w-[100px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeTokens
                  .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime())
                  .map((token) => {
                    const daysLeft = differenceInDays(new Date(token.expires_at), new Date());
                    const isExpiring = daysLeft <= 14;
                    return (
                      <TableRow key={token.id}>
                        <TableCell className="font-medium">{token.contractor_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {token.short_code}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={
                            daysLeft <= 3
                              ? "text-destructive font-medium"
                              : isExpiring
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-muted-foreground"
                          }>
                            {daysLeft} day{daysLeft !== 1 ? "s" : ""}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={token.auto_renew ?? true}
                            onCheckedChange={(checked) =>
                              toggleAutoRenewMutation.mutate({ id: token.id, auto_renew: checked })
                            }
                            disabled={toggleAutoRenewMutation.isPending}
                          />
                        </TableCell>
                        <TableCell>
                          {isExpiring && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={extendMutation.isPending}
                              onClick={() => extendMutation.mutate({ id: token.id, expires_at: token.expires_at })}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              +30 days
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Tokens with auto-renew enabled are automatically extended by 30 days when they are 7 days from expiring.
          </p>
        </div>

        {/* Recent visitors table */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Recent Visitors
          </h4>
          {recentVisitors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent visitor activity</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentVisitors.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.user_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{v.user_email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {(v.contractor_portal_tokens as any)?.short_code || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
