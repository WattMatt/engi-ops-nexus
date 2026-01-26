import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function PushNotificationToggle() {
  const { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 opacity-50">
              <BellOff className="h-4 w-4" />
              <span className="text-sm">Push notifications not supported</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Your browser doesn't support push notifications</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (permission === "denied") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 text-destructive">
              <BellOff className="h-4 w-4" />
              <span className="text-sm">Notifications blocked</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Please enable notifications in your browser settings</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <div className="flex items-center gap-3">
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Switch
            id="push-notifications"
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
          <Label htmlFor="push-notifications" className="flex items-center gap-2 cursor-pointer">
            {isSubscribed ? (
              <>
                <Bell className="h-4 w-4 text-primary" />
                <span className="text-sm">Push notifications on</span>
              </>
            ) : (
              <>
                <BellOff className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Enable push notifications</span>
              </>
            )}
          </Label>
        </>
      )}
    </div>
  );
}
