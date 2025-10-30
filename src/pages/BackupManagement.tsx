import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BackupDashboard } from "@/components/backup/BackupDashboard";
import { RestoreDialog } from "@/components/backup/RestoreDialog";
import { Download } from "lucide-react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { Navigate } from "react-router-dom";

const BackupManagement = () => {
  const { isAdmin, loading } = useRoleAccess("admin");
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container max-w-7xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Backup & Recovery</h1>
          <p className="text-muted-foreground">
            Manage automated backups and restore your data
          </p>
        </div>
        <Button onClick={() => setRestoreDialogOpen(true)}>
          <Download className="mr-2 h-4 w-4" />
          Restore from Backup
        </Button>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="storage">Storage Providers</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <BackupDashboard />
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Backup schedules coming soon...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Currently running: Daily full backup at 2 AM, Incremental backup every 6 hours
            </p>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Detailed backup history coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
          <div className="text-center py-12">
            <p className="text-muted-foreground">External storage providers coming soon...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Google Drive, OneDrive, Dropbox, and AWS S3 integration
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <RestoreDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen} />
    </div>
  );
};

export default BackupManagement;
