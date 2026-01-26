import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Download, 
  Smartphone, 
  Bell, 
  BellOff, 
  Database, 
  Trash2, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  HardDrive,
  Cloud,
  Share,
  Plus,
  AlertTriangle
} from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { toast } from "sonner";
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

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  messages: true,
  projectUpdates: true,
  reminders: true,
};

export function PWASettings() {
  const { canInstall, isInstalled, isStandalone, isIOS, install, resetDismiss } = usePWAInstall();
  const { isConnected } = useNetworkStatus();
  
  const [storageEstimate, setStorageEstimate] = useState<StorageEstimate | null>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState(true);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [isClearingCache, setIsClearingCache] = useState(false);

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

  // Save notification settings
  const saveNotificationSettings = (settings: NotificationSettings) => {
    setNotificationSettings(settings);
    localStorage.setItem("pwa-notification-settings", JSON.stringify(settings));
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

  return (
    <div className="space-y-6">
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
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-destructive'}`} />
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

      {/* Offline Storage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Offline Data Storage
          </CardTitle>
          <CardDescription>
            Manage cached data and offline storage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Storage Usage */}
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

          <Separator />

          {/* Storage Breakdown */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Cloud className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Cached Pages</p>
                  <p className="text-xs text-muted-foreground">
                    Pages available offline
                  </p>
                </div>
              </div>
              <Badge variant="outline">
                {storageEstimate?.usageDetails?.caches 
                  ? formatBytes(storageEstimate.usageDetails.caches)
                  : "Active"}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <HardDrive className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Offline Messages</p>
                  <p className="text-xs text-muted-foreground">
                    Queued messages waiting to sync
                  </p>
                </div>
              </div>
              <Badge variant="outline">
                {storageEstimate?.usageDetails?.indexedDB 
                  ? formatBytes(storageEstimate.usageDetails.indexedDB)
                  : "Active"}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Cache Actions */}
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