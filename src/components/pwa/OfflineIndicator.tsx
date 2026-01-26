import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { toast } from "sonner";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(false);
      toast.success("You're back online", {
        icon: <Wifi className="h-4 w-4" />,
        duration: 3000,
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
      toast.warning("You're offline", {
        icon: <WifiOff className="h-4 w-4" />,
        description: "Some features may be limited",
        duration: 5000,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Show banner if starting offline
    if (!navigator.onLine) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline || !showBanner) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-warning text-warning-foreground py-2 px-4 text-center text-sm font-medium z-50 flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      <span>You're offline - some features may be limited</span>
      <button
        onClick={() => setShowBanner(false)}
        className="ml-4 underline hover:no-underline"
      >
        Dismiss
      </button>
    </div>
  );
}
