import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, UserPlus, Edit, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TenantChangeAuditLogProps {
  projectId: string;
}

export function TenantChangeAuditLog({ projectId }: TenantChangeAuditLogProps) {
  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ["tenant-audit-logs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_change_audit_log")
        .select(`
          *,
          version:tenant_schedule_versions(version_number, change_summary)
        `)
        .eq("project_id", projectId)
        .order("changed_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case "created":
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case "updated":
        return <Edit className="h-4 w-4 text-blue-500" />;
      case "deleted":
        return <Trash2 className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getChangeTypeBadge = (changeType: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      created: "default",
      updated: "secondary",
      deleted: "destructive",
    };
    return <Badge variant={variants[changeType] || "default"}>{changeType}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tenant Schedule Change History</CardTitle>
        <CardDescription>
          Track all modifications to tenant data. Changes trigger version updates that affect dependent reports.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading change history...</p>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No changes recorded yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {auditLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="mt-1">{getChangeIcon(log.change_type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getChangeTypeBadge(log.change_type)}
                      {log.version && (
                        <Badge variant="outline">
                          Version {log.version.version_number}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium">
                      {log.version?.change_summary || "Tenant data modified"}
                    </p>
                    {log.changed_fields?.changed_fields && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Fields changed: {log.changed_fields.changed_fields.join(", ")}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(log.changed_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
