import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MetricCard, MetricGrid } from "@/components/common/MetricCard";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Key, Users, AlertTriangle, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format, addDays, differenceInDays } from "date-fns";

export function ContractorPortalWidget() {
  const queryClient = useQueryClient();

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

        {/* Expiring tokens table */}
        {expiringTokens.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Expiring Links
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[100px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringTokens.map((token) => {
                  const daysLeft = differenceInDays(new Date(token.expires_at), new Date());
                  return (
                    <TableRow key={token.id}>
                      <TableCell className="font-medium">{token.contractor_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {token.short_code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={daysLeft <= 3 ? "text-destructive font-medium" : "text-yellow-600 dark:text-yellow-400"}>
                          {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
                        </span>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

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
