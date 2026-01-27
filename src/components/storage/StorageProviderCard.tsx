import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cloud, HardDrive, Database, CloudOff } from "lucide-react";
import { ReactNode } from "react";

interface StorageProviderCardProps {
  name: string;
  description: string;
  icon: ReactNode;
  connected: boolean;
  status?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onConfigure?: () => void;
  disabled?: boolean;
  comingSoon?: boolean;
}

export function StorageProviderCard({
  name,
  description,
  icon,
  connected,
  status,
  onConnect,
  onDisconnect,
  onConfigure,
  disabled = false,
  comingSoon = false
}: StorageProviderCardProps) {
  return (
    <Card className={`relative ${comingSoon ? 'opacity-60' : ''}`}>
      {comingSoon && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg z-10">
          <Badge variant="secondary" className="text-sm">Coming Soon</Badge>
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              {icon}
            </div>
            <div>
              <CardTitle className="text-base">{name}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
          <Badge variant={connected ? "default" : "secondary"} className="shrink-0">
            {connected ? "Connected" : status || "Not Connected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          {connected ? (
            <>
              {onConfigure && (
                <Button variant="outline" size="sm" onClick={onConfigure} disabled={disabled}>
                  Configure
                </Button>
              )}
              {onDisconnect && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onDisconnect} 
                  disabled={disabled}
                  className="text-destructive hover:text-destructive"
                >
                  <CloudOff className="h-4 w-4 mr-1" />
                  Disconnect
                </Button>
              )}
            </>
          ) : (
            <Button 
              size="sm" 
              onClick={onConnect} 
              disabled={disabled || comingSoon}
              className="w-full"
            >
              <Cloud className="h-4 w-4 mr-1" />
              Connect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Provider-specific icons
export function DropboxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M6 2L0 6l6 4-6 4 6 4 6-4 6 4 6-4-6-4 6-4-6-4-6 4-6-4zm6 14.5L5.5 12 12 7.5 18.5 12 12 16.5z" />
    </svg>
  );
}

export function GoogleDriveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M4.433 22l3.3-5.5H22l-3.3 5.5H4.433zM15.567 2L22 13.5l-3.3 5.5L12.4 8 15.567 2zM2 13.5L8.433 2h6.134L8.3 8 2 13.5z" />
    </svg>
  );
}

export function OneDriveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M10.5 18.5c-2.5 0-4.5-2-4.5-4.5 0-.6.1-1.1.3-1.6C5.5 11.9 5 11 5 10c0-1.7 1.3-3 3-3 .3 0 .6 0 .9.1C10 5.3 11.9 4 14 4c2.8 0 5 2.2 5 5 0 .5-.1 1-.2 1.5 1.3.6 2.2 1.9 2.2 3.5 0 2.2-1.8 4-4 4h-6.5z" />
    </svg>
  );
}

export function S3Icon({ className }: { className?: string }) {
  return <Database className={className} />;
}
