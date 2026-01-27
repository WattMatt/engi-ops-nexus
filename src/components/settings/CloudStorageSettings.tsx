import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropboxConnector } from "@/components/storage/DropboxConnector";
import { useDropbox } from "@/hooks/useDropbox";
import { useDropboxActivityLogs } from "@/hooks/useDropboxActivityLogs";
import { useToast } from "@/hooks/use-toast";
import { 
  Cloud, 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  FolderPlus,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  FolderOpen
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatBytes } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useRoleAccess } from "@/hooks/useRoleAccess";

const actionIcons: Record<string, React.ReactNode> = {
  upload: <Upload className="h-3 w-3" />,
  download: <Download className="h-3 w-3" />,
  delete: <Trash2 className="h-3 w-3" />,
  create_folder: <FolderPlus className="h-3 w-3" />,
  list_folder: <FolderOpen className="h-3 w-3" />,
};

const actionLabels: Record<string, string> = {
  upload: "Uploaded",
  download: "Downloaded",
  delete: "Deleted",
  create_folder: "Created folder",
  list_folder: "Browsed",
};

export function CloudStorageSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { isConnected, isLoading: dropboxLoading, accountInfo, listFolder } = useDropbox();
  const { logs, isLoading: logsLoading, fetchLogs, getActivityStats } = useDropboxActivityLogs();
  const { isAdmin } = useRoleAccess("admin");
  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, number> | null>(null);

  // Handle OAuth callback success/error URL parameters
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    
    // Log OAuth return for debugging
    if (success || error) {
      const correlationId = sessionStorage.getItem('dropbox_oauth_correlation_id');
      const startedAt = sessionStorage.getItem('dropbox_oauth_started_at');
      
      console.log('[Dropbox] OAuth callback received', {
        correlationId,
        success,
        error,
        startedAt,
        completedAt: new Date().toISOString(),
        duration: startedAt ? `${Date.now() - new Date(startedAt).getTime()}ms` : 'unknown'
      });
      
      // Clear stored OAuth tracking data
      sessionStorage.removeItem('dropbox_oauth_correlation_id');
      sessionStorage.removeItem('dropbox_oauth_started_at');
    }
    
    if (success === 'dropbox_connected') {
      toast({
        title: 'Dropbox Connected!',
        description: 'Your Dropbox account has been successfully connected.',
      });
      // Clear the success param from URL
      searchParams.delete('success');
      setSearchParams(searchParams, { replace: true });
    }
    
    if (error) {
      const errorMessage = decodeURIComponent(error);
      console.error('[Dropbox] OAuth error returned', { error: errorMessage });
      toast({
        title: 'Connection Failed',
        description: errorMessage === 'no_code' 
          ? 'Authorization was cancelled or failed.'
          : errorMessage === 'invalid_state'
          ? 'Invalid authorization state. Please try again.'
          : errorMessage === 'token_exchange_failed'
          ? 'Failed to complete authorization. Please try again.'
          : errorMessage,
        variant: 'destructive'
      });
      // Clear the error param from URL
      searchParams.delete('error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);

  // Fetch recent activity and files when connected
  useEffect(() => {
    if (isConnected) {
      fetchLogs({}, 1, 5);
      getActivityStats(30).then(setStats);
    }
  }, [isConnected, fetchLogs, getActivityStats]);

  // Fetch recent files from Dropbox root
  useEffect(() => {
    const loadRecentFiles = async () => {
      if (!isConnected) return;
      
      setFilesLoading(true);
      try {
        const files = await listFolder('');
        // Get 5 most recent files (not folders)
        const fileEntries = files
          .filter(f => f.type === 'file')
          .slice(0, 5);
        setRecentFiles(fileEntries);
      } catch (error) {
        console.error('Failed to load recent files:', error);
      } finally {
        setFilesLoading(false);
      }
    };

    loadRecentFiles();
  }, [isConnected, listFolder]);

  return (
    <div className="space-y-6">
      {/* Dropbox Connection Card */}
      <DropboxConnector />

      {/* Connected State - Additional Info */}
      {isConnected && (
        <>
          {/* Activity Stats */}
          {stats && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Activity Summary (Last 30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-primary">{stats.uploads}</div>
                    <div className="text-xs text-muted-foreground">Uploads</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-primary">{stats.downloads}</div>
                    <div className="text-xs text-muted-foreground">Downloads</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-primary">{stats.successful}</div>
                    <div className="text-xs text-muted-foreground">Successful</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Files Preview */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Recent Files
                  </CardTitle>
                  <CardDescription>Files in your Dropbox root folder</CardDescription>
                </div>
                {isAdmin && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/admin/backup">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Full File Manager
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {filesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : recentFiles.length > 0 ? (
                <div className="space-y-2">
                  {recentFiles.map((file, index) => (
                    <div 
                      key={file.id || index}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{file.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {file.size ? formatBytes(file.size) : 'Unknown size'}
                          </div>
                        </div>
                      </div>
                      {file.modifiedAt && (
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {formatDistanceToNow(new Date(file.modifiedAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Cloud className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No files in your Dropbox root folder</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
              <CardDescription>Your latest Dropbox operations</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : logs.length > 0 ? (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div 
                        key={log.id}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className={`p-1.5 rounded-full shrink-0 ${
                          log.status === 'success' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                        }`}>
                          {actionIcons[log.action] || <Cloud className="h-3 w-3" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {actionLabels[log.action] || log.action}
                            </span>
                            {log.status === 'success' ? (
                              <CheckCircle2 className="h-3 w-3 text-primary" />
                            ) : (
                              <XCircle className="h-3 w-3 text-destructive" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {log.file_name || log.file_path}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </div>
                        </div>
                        {log.file_size && (
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {formatBytes(log.file_size)}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help Text */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Using Dropbox in Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Now that your Dropbox is connected, you can:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Save generated reports directly to Dropbox</li>
                <li>Import files from Dropbox when uploading documents</li>
                <li>Link specific Dropbox folders to projects for organized storage</li>
              </ul>
              <p>
                Your access is limited to the files and folders you have permission to view in Dropbox.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Not Connected - Help Text */}
      {!isConnected && !dropboxLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Why Connect Dropbox?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Connecting your Dropbox account allows you to:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Save generated PDF reports directly to your Dropbox</li>
              <li>Import documents and drawings from Dropbox into projects</li>
              <li>Link project folders for organized file management</li>
              <li>Access only the files you have permission to view</li>
            </ul>
            <Separator className="my-4" />
            <p className="text-xs">
              Your Dropbox credentials are securely stored and used only for file operations within this application.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
