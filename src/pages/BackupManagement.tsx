import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BackupDashboard } from "@/components/backup/BackupDashboard";
import { RestoreDialog } from "@/components/backup/RestoreDialog";
import { DropboxConnector } from "@/components/storage/DropboxConnector";
import { DropboxBrowser } from "@/components/storage/DropboxBrowser";
import { StorageProviderCard, GoogleDriveIcon, OneDriveIcon, S3Icon } from "@/components/storage/StorageProviderCard";
import { Download, Cloud, HardDrive, CheckCircle2, AlertCircle } from "lucide-react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useDropbox } from "@/hooks/useDropbox";
import { Navigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const BackupManagement = () => {
  const { isAdmin, loading } = useRoleAccess("admin");
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { isConnected: dropboxConnected } = useDropbox();

  // Handle OAuth callback messages
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'dropbox_connected') {
      toast({
        title: 'Dropbox Connected',
        description: 'Your Dropbox account has been successfully linked.',
      });
      // Clean up URL
      window.history.replaceState({}, '', '/backup');
    }

    if (error) {
      toast({
        title: 'Connection Error',
        description: decodeURIComponent(error),
        variant: 'destructive'
      });
      window.history.replaceState({}, '', '/backup');
    }
  }, [searchParams, toast]);

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
          <TabsTrigger value="storage">
            Storage Providers
            {dropboxConnected && <CheckCircle2 className="ml-2 h-3 w-3 text-primary" />}
          </TabsTrigger>
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

        <TabsContent value="storage" className="space-y-6">
          {/* Connection Alert */}
          {dropboxConnected && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Cloud Storage Connected</AlertTitle>
              <AlertDescription>
                Your Dropbox account is connected. Backups can now be synced to the cloud.
              </AlertDescription>
            </Alert>
          )}

          {/* Storage Providers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DropboxConnector />
            
            <StorageProviderCard
              name="Google Drive"
              description="Google cloud storage"
              icon={<GoogleDriveIcon className="h-6 w-6 text-primary" />}
              connected={false}
              comingSoon={true}
            />
            
            <StorageProviderCard
              name="OneDrive"
              description="Microsoft cloud storage"
              icon={<OneDriveIcon className="h-6 w-6 text-primary" />}
              connected={false}
              comingSoon={true}
            />
            
            <StorageProviderCard
              name="AWS S3"
              description="Amazon cloud storage"
              icon={<S3Icon className="h-6 w-6 text-primary" />}
              connected={false}
              comingSoon={true}
            />
          </div>

          {/* Dropbox File Browser */}
          {dropboxConnected && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Dropbox Files</h3>
              <DropboxBrowser />
            </div>
          )}
        </TabsContent>
      </Tabs>

      <RestoreDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen} />
    </div>
  );
};

export default BackupManagement;
