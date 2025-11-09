import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { History, TrendingUp, TrendingDown, RotateCcw } from "lucide-react";

interface KwOverrideAuditLogProps {
  projectId: string;
  tenantId?: string; // Optional: filter by specific tenant
}

export function KwOverrideAuditLog({ projectId, tenantId }: KwOverrideAuditLogProps) {
  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ["kw-override-audit", projectId, tenantId],
    queryFn: async () => {
      let query = supabase
        .from("tenant_kw_override_audit")
        .select(`
          *,
          tenants!inner(shop_number, shop_name),
          profiles:changed_by(full_name, email)
        `)
        .eq("project_id", projectId)
        .order("changed_at", { ascending: false })
        .limit(100);

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case "set":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "reset":
        return <RotateCcw className="h-4 w-4 text-blue-600" />;
      case "update":
        return <TrendingDown className="h-4 w-4 text-orange-600" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const getChangeBadgeVariant = (changeType: string) => {
    switch (changeType) {
      case "set":
        return "default";
      case "reset":
        return "secondary";
      case "update":
        return "outline";
      default:
        return "outline";
    }
  };

  const formatValue = (value: number | null) => {
    if (value === null || value === undefined) return "Auto";
    return `${Number(value).toFixed(2)} kW`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            kW Override Audit Log
          </CardTitle>
          <CardDescription>Loading audit history...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          kW Override Audit Log
        </CardTitle>
        <CardDescription>
          Track all manual kW override changes with timestamps and user details
        </CardDescription>
      </CardHeader>
      <CardContent>
        {auditLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No kW override changes recorded yet
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Change Type</TableHead>
                  <TableHead>Old Value</TableHead>
                  <TableHead>New Value</TableHead>
                  <TableHead>Changed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(log.changed_at), "yyyy-MM-dd HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{log.tenants?.shop_number}</div>
                        <div className="text-sm text-muted-foreground">
                          {log.tenants?.shop_name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={getChangeBadgeVariant(log.change_type)}
                        className="flex items-center gap-1 w-fit"
                      >
                        {getChangeIcon(log.change_type)}
                        {log.change_type.charAt(0).toUpperCase() + log.change_type.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatValue(log.old_value)}
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-primary">
                      {formatValue(log.new_value)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {log.profiles?.full_name || "Unknown User"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {log.profiles?.email}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
