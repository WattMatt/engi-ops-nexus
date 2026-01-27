import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CloudOff, Settings } from "lucide-react";
import { Link } from "react-router-dom";

interface DropboxConnectionBannerProps {
  title?: string;
  description?: string;
  showSettingsLink?: boolean;
  compact?: boolean;
}

export function DropboxConnectionBanner({
  title = "Dropbox Not Connected",
  description = "Connect your Dropbox account to enable cloud file operations.",
  showSettingsLink = true,
  compact = false,
}: DropboxConnectionBannerProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-dashed">
        <CloudOff className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
        {showSettingsLink && (
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings?tab=storage">
              <Settings className="h-4 w-4 mr-1" />
              Connect
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <Alert>
      <CloudOff className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>{description}</span>
        {showSettingsLink && (
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings?tab=storage">
              <Settings className="h-4 w-4 mr-2" />
              Go to Settings
            </Link>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
