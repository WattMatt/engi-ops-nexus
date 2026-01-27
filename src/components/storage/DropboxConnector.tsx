import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDropbox } from "@/hooks/useDropbox";
import { Cloud, CloudOff, Loader2, User, HardDrive, RefreshCw } from "lucide-react";
import { formatBytes } from "@/lib/utils";

export function DropboxConnector() {
  const {
    isConnected,
    isLoading,
    accountInfo,
    connect,
    disconnect,
    refreshConnection
  } = useDropbox();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Checking connection...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-primary" fill="currentColor">
                <path d="M6 2L0 6l6 4-6 4 6 4 6-4 6 4 6-4-6-4 6-4-6-4-6 4-6-4zm6 14.5L5.5 12 12 7.5 18.5 12 12 16.5z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-lg">Dropbox</CardTitle>
              <CardDescription>Cloud storage for backups and documents</CardDescription>
            </div>
          </div>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "Connected" : "Not Connected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && accountInfo ? (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Account:</span>
                <span className="font-medium">{accountInfo.name || accountInfo.email}</span>
              </div>
              
              {accountInfo.spaceUsed !== undefined && accountInfo.spaceAllocated !== undefined && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Storage:</span>
                    <span className="font-medium">
                      {formatBytes(accountInfo.spaceUsed)} / {formatBytes(accountInfo.spaceAllocated)}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ 
                        width: `${Math.min((accountInfo.spaceUsed / accountInfo.spaceAllocated) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshConnection}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={disconnect}
                className="flex-1"
              >
                <CloudOff className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Connect your Dropbox account to enable cloud backups and document storage.
            </p>
            <Button onClick={connect} className="w-full">
              <Cloud className="h-4 w-4 mr-2" />
              Connect to Dropbox
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
