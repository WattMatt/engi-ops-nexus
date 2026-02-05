import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Download, 
  Smartphone, 
  Bell, 
  BellOff, 
  Database, 
  Trash2, 
  RefreshCw,
  CheckCircle2,
  Wifi,
  HardDrive,
  Cloud,
  Share,
  Plus,
  AlertTriangle,
  Sun,
  Moon,
  Monitor,
  Palette,
  Upload,
  FileJson,
  Settings2,
  RotateCcw,
  History
} from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
 import { StorageStatusCard } from "@/components/pwa";

interface StorageEstimate {
  usage: number;
  quota: number;
  usageDetails?: {
    caches?: number;
    indexedDB?: number;
    serviceWorkerRegistrations?: number;
  };
}

interface NotificationSettings {
  enabled: boolean;
  messages: boolean;
  projectUpdates: boolean;
  reminders: boolean;
}

interface DisplaySettings {
  compactMode: boolean;
  animationsEnabled: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  messages: true,
  projectUpdates: true,
  reminders: true,
};

const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  compactMode: false,
  animationsEnabled: true,
  fontSize: 'medium',
};

export function PWASettings() {
  const { canInstall, isInstalled, isStandalone, isIOS, install, resetDismiss } = usePWAInstall();
  const { isConnected } = useNetworkStatus();
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  const [storageEstimate, setStorageEstimate] = useState<StorageEstimate | null>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState(true);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(DEFAULT_DISPLAY_SETTINGS);
  const [isExporting, setIsExporting] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false);
  const [lastBackup, setLastBackup] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before rendering theme-dependent content
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load storage estimate
  useEffect(() => {
    const loadStorageEstimate = async () => {
      try {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          setStorageEstimate({
            usage: estimate.usage || 0,
            quota: estimate.quota || 0,
            usageDetails: (estimate as any).usageDetails,
          });
        }
      } catch (error) {
        console.error("Error getting storage estimate:", error);
      } finally {
        setIsLoadingStorage(false);
      }
    };

    loadStorageEstimate();
  }, []);

  // Load notification settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("pwa-notification-settings");
    if (saved) {
      try {
        setNotificationSettings(JSON.parse(saved));
      } catch {
        // Use defaults
      }
    }

    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Load display settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("display-settings");
    if (saved) {
      try {
        setDisplaySettings(JSON.parse(saved));
      } catch {
        // Use defaults
      }
    }

    // Load last backup time
    const backupTime = localStorage.getItem("last-local-backup");
    if (backupTime) {
      setLastBackup(new Date(backupTime));
    }
  }, []);

  // Check for service worker updates
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          setSwUpdateAvailable(true);
        });
      });
    }
  }, []);

  // Save notification settings
  const saveNotificationSettings = (settings: NotificationSettings) => {
    setNotificationSettings(settings);
    localStorage.setItem("pwa-notification-settings", JSON.stringify(settings));
  };

  // Save display settings
  const saveDisplaySettings = (settings: DisplaySettings) => {
    setDisplaySettings(settings);
    localStorage.setItem("display-settings", JSON.stringify(settings));
    
    // Apply font size to document
    document.documentElement.style.fontSize = 
      settings.fontSize === 'small' ? '14px' : 
      settings.fontSize === 'large' ? '18px' : '16px';
    
    // Apply reduced motion preference
    if (!settings.animationsEnabled) {
      document.documentElement.style.setProperty('--transition-base', 'none');
      document.documentElement.style.setProperty('--transition-smooth', 'none');
    } else {
      document.documentElement.style.setProperty('--transition-base', 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)');
      document.documentElement.style.setProperty('--transition-smooth', 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)');
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error("Notifications are not supported in this browser");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === "granted") {
        toast.success("Notifications enabled!");
        saveNotificationSettings({ ...notificationSettings, enabled: true });
      } else if (permission === "denied") {
        toast.error("Notification permission denied. Please enable in browser settings.");
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      toast.error("Failed to request notification permission");
    }
  };

  // Handle install
  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    const result = await install();
    if (result.outcome === "accepted") {
      toast.success("App installed successfully!");
    } else if (result.outcome === "dismissed") {
      toast.info("Installation cancelled");
    }
  };

  // Check for service worker updates
  const checkForUpdates = async () => {
    setIsCheckingUpdates(true);
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();
        
        if (registration.waiting) {
          setSwUpdateAvailable(true);
          toast.info("Update available! Click 'Apply Update' to install.");
        } else {
          toast.success("App is up to date!");
        }
      }
    } catch (error) {
      console.error("Error checking for updates:", error);
      toast.error("Failed to check for updates");
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  // Apply service worker update
  const applyUpdate = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        toast.success("Applying update...");
        setTimeout(() => window.location.reload(), 1000);
      }
    }
  };

  // Export user data
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to export your data");
        return;
      }

      // Gather user data from various sources
      const exportData: Record<string, any> = {
        exportDate: new Date().toISOString(),
        userId: user.id,
        email: user.email,
        settings: {
          notifications: notificationSettings,
          display: displaySettings,
          theme: theme,
        },
      };

      // Try to export profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        exportData.profile = profile;
      }

      // Export to JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wm-consulting-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      localStorage.setItem("last-local-backup", new Date().toISOString());
      setLastBackup(new Date());
      toast.success("Data exported successfully!");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  // Import user data
  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate the import data
      if (!data.exportDate || !data.settings) {
        toast.error("Invalid backup file format");
        return;
      }

      // Restore settings
      if (data.settings.notifications) {
        saveNotificationSettings(data.settings.notifications);
      }
      if (data.settings.display) {
        saveDisplaySettings(data.settings.display);
      }
      if (data.settings.theme) {
        setTheme(data.settings.theme);
      }

      toast.success("Settings restored from backup!");
    } catch (error) {
      console.error("Error importing data:", error);
      toast.error("Failed to import backup file");
    }
    
    // Reset the input
    event.target.value = '';
  };

  // Clear cache
  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Clear IndexedDB offline queue
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases?.() || [];
        for (const db of databases) {
          if (db.name?.includes('offline')) {
            indexedDB.deleteDatabase(db.name);
          }
        }
      }

      // Refresh storage estimate
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        setStorageEstimate({
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
        });
      }

      toast.success("Cache cleared successfully");
    } catch (error) {
      console.error("Error clearing cache:", error);
      toast.error("Failed to clear cache");
    } finally {
      setIsClearingCache(false);
    }
  };

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Calculate storage percentage
  const storagePercentage = storageEstimate 
    ? Math.min(100, (storageEstimate.usage / storageEstimate.quota) * 100)
    : 0;

  // Don't render theme-dependent content until mounted
  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Theme & Display Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme & Display
          </CardTitle>
          <CardDescription>
            Customize the appearance of your app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Color Theme</Label>
            <RadioGroup
              value={theme}
              onValueChange={setTheme}
              className="grid grid-cols-3 gap-3"
            >
              <Label
                htmlFor="theme-light"
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  theme === 'light' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value="light" id="theme-light" className="sr-only" />
                <Sun className="h-6 w-6" />
                <span className="text-sm font-medium">Light</span>
              </Label>
              <Label
                htmlFor="theme-dark"
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  theme === 'dark' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
                <Moon className="h-6 w-6" />
                <span className="text-sm font-medium">Dark</span>
              </Label>
              <Label
                htmlFor="theme-system"
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  theme === 'system' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value="system" id="theme-system" className="sr-only" />
                <Monitor className="h-6 w-6" />
                <span className="text-sm font-medium">System</span>
              </Label>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Currently using: {resolvedTheme === 'dark' ? 'Dark' : 'Light'} mode
            </p>
          </div>

          <Separator />

          {/* Display Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="compact-mode">Compact Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Reduce spacing for more content on screen
                </p>
              </div>
              <Switch
                id="compact-mode"
                checked={displaySettings.compactMode}
                onCheckedChange={(checked) => 
                  saveDisplaySettings({ ...displaySettings, compactMode: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="animations">Animations</Label>
                <p className="text-sm text-muted-foreground">
                  Enable smooth transitions and animations
                </p>
              </div>
              <Switch
                id="animations"
                checked={displaySettings.animationsEnabled}
                onCheckedChange={(checked) => 
                  saveDisplaySettings({ ...displaySettings, animationsEnabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Font Size</Label>
                <p className="text-sm text-muted-foreground">
                  Adjust text size throughout the app
                </p>
              </div>
              <Select
                value={displaySettings.fontSize}
                onValueChange={(value: 'small' | 'medium' | 'large') => 
                  saveDisplaySettings({ ...displaySettings, fontSize: value })
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Export & Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Export & Backup
          </CardTitle>
          <CardDescription>
            Export your settings and data for backup or transfer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Last Backup Info */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <History className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Last Local Backup</p>
                <p className="text-xs text-muted-foreground">
                  {lastBackup 
                    ? lastBackup.toLocaleDateString() + ' at ' + lastBackup.toLocaleTimeString()
                    : 'Never backed up'}
                </p>
              </div>
            </div>
            {lastBackup && (
              <Badge variant="outline" className="text-xs">
                {Math.floor((Date.now() - lastBackup.getTime()) / (1000 * 60 * 60 * 24))} days ago
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button 
              onClick={handleExportData} 
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export Settings
            </Button>

            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline" className="w-full pointer-events-none">
                <Upload className="h-4 w-4 mr-2" />
                Import Backup
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Export includes your notification preferences, display settings, and theme choice. 
            For full database backups, use the admin backup management.
          </p>
        </CardContent>
      </Card>

      {/* Service Worker Controls */}
       {/* Offline Storage - Detailed Breakdown */}
       <StorageStatusCard />
 
       {/* Service Worker Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            App Updates
          </CardTitle>
          <CardDescription>
            Control how the app updates and manages cached content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Update Status */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {swUpdateAvailable ? (
                <RefreshCw className="h-5 w-5 text-primary" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              <div>
                <p className="font-medium text-sm">App Version Status</p>
                <p className="text-xs text-muted-foreground">
                  {swUpdateAvailable 
                    ? 'New version available' 
                    : 'App is up to date'}
                </p>
              </div>
            </div>
            {swUpdateAvailable && (
              <Badge variant="default" className="animate-pulse">
                Update Ready
              </Badge>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={checkForUpdates}
              disabled={isCheckingUpdates}
              className="flex-1"
            >
              {isCheckingUpdates ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Check for Updates
            </Button>
            
            {swUpdateAvailable && (
              <Button onClick={applyUpdate} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" />
                Apply Update
              </Button>
            )}
          </div>

          <Separator />

          {/* Cache Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Storage Used</span>
              <span className="font-medium">
                {isLoadingStorage 
                  ? "Calculating..." 
                  : storageEstimate 
                    ? `${formatBytes(storageEstimate.usage)} / ${formatBytes(storageEstimate.quota)}`
                    : "Not available"}
              </span>
            </div>
            <Progress value={storagePercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {storagePercentage.toFixed(1)}% of available storage used
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh App
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="flex-1" disabled={isClearingCache}>
                  {isClearingCache ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Clear Cache
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Cached Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all cached pages and offline data. You'll need to be online 
                    to use the app and any unsent messages may be lost. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearCache}>
                    Clear Cache
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* App Installation Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            App Installation
          </CardTitle>
          <CardDescription>
            Install WM Consulting as a standalone app for the best experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                isInstalled || isStandalone ? 'bg-primary/10' : 'bg-muted'
              }`}>
                {isInstalled || isStandalone ? (
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                ) : (
                  <Download className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-medium">Installation Status</p>
                <p className="text-sm text-muted-foreground">
                  {isInstalled || isStandalone 
                    ? "App is installed and running in standalone mode" 
                    : "App is running in browser mode"}
                </p>
              </div>
            </div>
            <Badge variant={isInstalled || isStandalone ? "default" : "secondary"}>
              {isInstalled || isStandalone ? "Installed" : "Not Installed"}
            </Badge>
          </div>

          {!isInstalled && !isStandalone && (
            <>
              <Separator />
              <div className="flex flex-col sm:flex-row gap-3">
                {canInstall && (
                  <Button onClick={handleInstall} className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Install App
                  </Button>
                )}
                {isIOS && (
                  <Button onClick={() => setShowIOSModal(true)} className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Install on iOS
                  </Button>
                )}
                {!canInstall && !isIOS && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Installation not available in this browser</span>
                  </div>
                )}
                <Button variant="outline" onClick={resetDismiss}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Install Prompt
                </Button>
              </div>
            </>
          )}

          {/* Platform info */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-primary' : 'bg-destructive'}`} />
              <span className="text-muted-foreground">
                {isConnected ? "Online" : "Offline"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {isIOS ? "iOS Device" : "Standard Browser"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Configure which notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Permission Status */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {notificationPermission === "granted" ? (
                <Bell className="h-5 w-5 text-primary" />
              ) : notificationPermission === "denied" ? (
                <BellOff className="h-5 w-5 text-destructive" />
              ) : (
                <Bell className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-sm">Browser Permission</p>
                <p className="text-xs text-muted-foreground">
                  {notificationPermission === "granted" 
                    ? "Notifications are enabled"
                    : notificationPermission === "denied"
                    ? "Notifications are blocked"
                    : "Permission not yet requested"}
                </p>
              </div>
            </div>
            {notificationPermission !== "granted" && (
              <Button 
                size="sm" 
                onClick={requestNotificationPermission}
                disabled={notificationPermission === "denied"}
              >
                Enable
              </Button>
            )}
          </div>

          <Separator />

          {/* Notification Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-messages">New Messages</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when you receive new messages
                </p>
              </div>
              <Switch
                id="notify-messages"
                checked={notificationSettings.messages}
                onCheckedChange={(checked) => 
                  saveNotificationSettings({ ...notificationSettings, messages: checked })
                }
                disabled={notificationPermission !== "granted"}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-projects">Project Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about project changes and milestones
                </p>
              </div>
              <Switch
                id="notify-projects"
                checked={notificationSettings.projectUpdates}
                onCheckedChange={(checked) => 
                  saveNotificationSettings({ ...notificationSettings, projectUpdates: checked })
                }
                disabled={notificationPermission !== "granted"}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-reminders">Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Get reminded about upcoming tasks and deadlines
                </p>
              </div>
              <Switch
                id="notify-reminders"
                checked={notificationSettings.reminders}
                onCheckedChange={(checked) => 
                  saveNotificationSettings({ ...notificationSettings, reminders: checked })
                }
                disabled={notificationPermission !== "granted"}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* iOS Install Modal */}
      <Dialog open={showIOSModal} onOpenChange={setShowIOSModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Install on iOS</DialogTitle>
            <DialogDescription>
              Follow these steps to install WM Consulting on your device
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div className="flex-1">
                <p className="font-medium">Tap the Share button</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Look for the <Share className="inline h-4 w-4" /> icon at the bottom of your screen
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div className="flex-1">
                <p className="font-medium">Scroll down and tap "Add to Home Screen"</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Look for the <Plus className="inline h-4 w-4" /> Add to Home Screen option
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div className="flex-1">
                <p className="font-medium">Tap "Add" to confirm</p>
                <p className="text-sm text-muted-foreground mt-1">
                  The app will now appear on your home screen
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowIOSModal(false)} className="w-full">
              Got it!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
