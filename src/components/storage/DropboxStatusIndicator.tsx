import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDropbox } from "@/hooks/useDropbox";
import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

interface DropboxStatusIndicatorProps {
  showLabel?: boolean;
  size?: "sm" | "md";
}

export function DropboxStatusIndicator({ 
  showLabel = false,
  size = "sm" 
}: DropboxStatusIndicatorProps) {
  const { isConnected, isLoading, accountInfo } = useDropbox();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className={`animate-spin text-muted-foreground ${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'}`} />
        {showLabel && <span className="text-xs text-muted-foreground">Checking...</span>}
      </div>
    );
  }

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto py-1 px-2"
            asChild
          >
            <Link to="/settings?tab=storage">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <>
                    <Cloud className={`${iconSize} text-primary`} />
                    {showLabel && (
                      <span className="text-xs font-medium">
                        {accountInfo?.name || 'Connected'}
                      </span>
                    )}
                    <Badge variant="default" className="h-1.5 w-1.5 p-0 rounded-full" />
                  </>
                ) : (
                  <>
                    <CloudOff className={`${iconSize} text-muted-foreground`} />
                    {showLabel && (
                      <span className="text-xs text-muted-foreground">Connect Dropbox</span>
                    )}
                  </>
                )}
              </div>
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isConnected 
            ? `Dropbox: ${accountInfo?.email || 'Connected'}`
            : 'Click to connect Dropbox'
          }
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
