import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useDropbox } from "@/hooks/useDropbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Cloud, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Database,
  FolderSync
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

interface BackupSyncSettings {
  autoSyncEnabled: boolean;
  syncFrequency: 'manual' | 'daily' | 'weekly';
  lastSyncAt: string | null;
  syncFolder: string;
}

export function DropboxBackupSync() {
  const { isConnected, uploadFile, createFolder, connectionStatus } = useDropbox();
  const { toast } = useToast();
  const [settings, setSettings] = useState<BackupSyncSettings>({
    autoSyncEnabled: false,
    syncFrequency: 'manual',
    lastSyncAt: null,
    syncFolder: '/EngiOps/Backups'
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from database
  useEffect(() => {
    if (isConnected) {
      loadSettings();
    }
  }, [isConnected]);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('storage_providers')
        .select('config')
        .eq('provider_name', 'dropbox')
        .single();

      if (data?.config) {
        const config = data.config as Record<string, unknown>;
        setSettings({
          autoSyncEnabled: config.auto_sync_enabled as boolean || false,
          syncFrequency: config.sync_frequency as 'manual' | 'daily' | 'weekly' || 'manual',
          lastSyncAt: config.last_sync_at as string || null,
          syncFolder: config.sync_folder as string || '/EngiOps/Backups'
        });
      }
    } catch (error) {
      console.error('Failed to load sync settings:', error);
    }
  };

  const saveSettings = async (newSettings: Partial<BackupSyncSettings>) => {
    setIsSaving(true);
    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      const { error } = await supabase
        .from('storage_providers')
        .update({
          config: {
            ...connectionStatus?.config,
            auto_sync_enabled: updatedSettings.autoSyncEnabled,
            sync_frequency: updatedSettings.syncFrequency,
            last_sync_at: updatedSettings.lastSyncAt,
            sync_folder: updatedSettings.syncFolder
          }
        })
        .eq('provider_name', 'dropbox');

      if (error) throw error;

      setSettings(updatedSettings);
      toast({
        title: "Settings Saved",
        description: "Backup sync settings have been updated"
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: "Error",
        description: "Failed to save sync settings",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const syncBackupsToDropbox = async () => {
    setIsSyncing(true);
    
    try {
      // Create backup folder if needed
      await createFolder(settings.syncFolder);

      // Fetch recent completed backups
      const { data: backups, error: backupsError } = await supabase
        .from('backup_history')
        .select('*')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(10);

      if (backupsError) throw backupsError;

      if (!backups || backups.length === 0) {
        toast({
          title: "No Backups",
          description: "No completed backups found to sync"
        });
        return;
      }

      let syncedCount = 0;
      
      for (const backup of backups) {
        if (!backup.file_path) continue;

        try {
          // Download backup from Supabase storage
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('database-backups')
            .download(backup.file_path);

          if (downloadError || !fileData) {
            console.warn(`Failed to download backup ${backup.id}:`, downloadError);
            continue;
          }

          // Upload to Dropbox
          const filename = backup.file_path.split('/').pop() || `backup-${backup.id}.json`;
          const dropboxPath = `${settings.syncFolder}/${filename}`;
          
          const arrayBuffer = await fileData.arrayBuffer();
          const success = await uploadFile(dropboxPath, arrayBuffer, 'application/json');
          
          if (success) {
            syncedCount++;
          }
        } catch (err) {
          console.warn(`Error syncing backup ${backup.id}:`, err);
        }
      }

      // Update last sync time
      const now = new Date().toISOString();
      await saveSettings({ lastSyncAt: now });

      toast({
        title: "Sync Complete",
        description: `Successfully synced ${syncedCount} backup(s) to Dropbox`
      });

    } catch (error) {
      console.error('Backup sync error:', error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync backups",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FolderSync className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Backup Sync</CardTitle>
              <CardDescription>Automatically sync backups to Dropbox</CardDescription>
            </div>
          </div>
          <Badge variant={settings.autoSyncEnabled ? "default" : "secondary"}>
            {settings.autoSyncEnabled ? "Auto-Sync On" : "Manual"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto-sync toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-sync">Automatic Sync</Label>
            <p className="text-sm text-muted-foreground">
              Automatically sync new backups to Dropbox
            </p>
          </div>
          <Switch
            id="auto-sync"
            checked={settings.autoSyncEnabled}
            onCheckedChange={(checked) => saveSettings({ autoSyncEnabled: checked })}
            disabled={isSaving}
          />
        </div>

        {/* Sync frequency */}
        {settings.autoSyncEnabled && (
          <div className="space-y-2">
            <Label>Sync Frequency</Label>
            <Select
              value={settings.syncFrequency}
              onValueChange={(value: 'manual' | 'daily' | 'weekly') => 
                saveSettings({ syncFrequency: value })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Last sync info */}
        <div className="flex items-center gap-2 text-sm">
          {settings.lastSyncAt ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Last synced:</span>
              <span>{format(new Date(settings.lastSyncAt), 'MMM d, yyyy HH:mm')}</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Never synced</span>
            </>
          )}
        </div>

        {/* Sync destination */}
        <div className="text-sm p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Cloud className="h-4 w-4" />
            <span>Syncing to:</span>
            <span className="font-medium text-foreground">{settings.syncFolder}</span>
          </div>
        </div>

        {/* Manual sync button */}
        <Button 
          onClick={syncBackupsToDropbox} 
          disabled={isSyncing}
          className="w-full"
        >
          {isSyncing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Syncing Backups...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Backups Now
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
