import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, Download, Play, Clock, HardDrive, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const BackupDashboard = () => {
  const { data: backupStats } = useQuery({
    queryKey: ["backup-stats"],
    queryFn: async () => {
      const { data: history } = await supabase
        .from("backup_history")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: lastBackup } = await supabase
        .from("backup_history")
        .select("*")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .single();

      const totalBackups = history?.length || 0;
      const successfulBackups = history?.filter(b => b.status === "completed").length || 0;
      const failedBackups = history?.filter(b => b.status === "failed").length || 0;
      const totalSize = history?.reduce((sum, b) => sum + (b.file_size_bytes || 0), 0) || 0;

      return {
        lastBackup,
        totalBackups,
        successfulBackups,
        failedBackups,
        totalSize,
        history: history || [],
      };
    },
  });

  const handleManualBackup = async () => {
    try {
      toast.loading("Starting manual backup...");
      
      const { data, error } = await supabase.functions.invoke("backup-database", {
        body: { backup_type: "full", job_id: "manual-backup" },
      });

      if (error) throw error;

      toast.success("Backup completed successfully!");
    } catch (error) {
      console.error("Backup error:", error);
      toast.error("Failed to create backup");
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "running":
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Backup</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {backupStats?.lastBackup
                ? format(new Date(backupStats.lastBackup.completed_at), "MMM d, HH:mm")
                : "Never"}
            </div>
            <p className="text-xs text-muted-foreground">
              {backupStats?.lastBackup?.backup_type || "No backups yet"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Backups</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backupStats?.totalBackups || 0}</div>
            <p className="text-xs text-muted-foreground">
              {backupStats?.successfulBackups || 0} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(backupStats?.totalSize || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all backups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Action</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button onClick={handleManualBackup} className="w-full" size="sm">
              <Database className="mr-2 h-4 w-4" />
              Run Backup Now
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Backups */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Backups</CardTitle>
          <CardDescription>Last 10 backup operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {backupStats?.history.slice(0, 10).map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  {getStatusIcon(backup.status)}
                  <div>
                    <p className="font-medium">
                      {backup.backup_type.charAt(0).toUpperCase() + backup.backup_type.slice(1)} Backup
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(backup.started_at), "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatBytes(backup.file_size_bytes || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {backup.tables_included?.length || 0} tables
                    </p>
                  </div>
                  <Badge variant={backup.status === "completed" ? "default" : "destructive"}>
                    {backup.status}
                  </Badge>
                  {backup.status === "completed" && (
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
