import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDropbox } from "@/hooks/useDropbox";
import { Cloud, CloudOff, Loader2, User, HardDrive, RefreshCw, AlertCircle, ExternalLink } from "lucide-react";
import { formatBytes } from "@/lib/utils";

export function DropboxConnector() {
  const {
    isConnected,
    isLoading,
    isConnecting,
    connectionError,
    accountInfo,
    connect,
    disconnect,
    refreshConnection,
    clearError
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
            {isConnecting ? "Connecting..." : isConnected ? "Connected" : "Not Connected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Error Display */}
        {connectionError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{connectionError}</span>
              <Button variant="ghost" size="sm" onClick={clearError} className="ml-2 h-auto py-1 px-2">
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Connecting State */}
        {isConnecting && (
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Redirecting to Dropbox...</p>
              <p className="text-sm text-muted-foreground">
                You'll be asked to authorize access to your Dropbox account.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              <span>Opening Dropbox authorization page</span>
            </div>
          </div>
        )}

        {/* Connected State */}
        {isConnected && !isConnecting ? (
          <>
            {accountInfo && (
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
            )}

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
        ) : !isConnecting ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Connect your Dropbox account to enable cloud backups and document storage.
            </p>
            <Button 
              onClick={() => connect()} 
              className="w-full"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Cloud className="h-4 w-4 mr-2" />
                  Connect to Dropbox
                </>
              )}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
