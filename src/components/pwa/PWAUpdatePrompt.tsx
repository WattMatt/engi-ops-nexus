import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

// Simple hook to handle PWA updates without the virtual import
function usePWAUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        setSwRegistration(registration);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setNeedRefresh(true);
              }
            });
          }
        });
      });

      // Listen for controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, []);

  const updateServiceWorker = async () => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  return {
    needRefresh,
    setNeedRefresh,
    updateServiceWorker,
  };
}

export function PWAUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const { needRefresh, setNeedRefresh, updateServiceWorker } = usePWAUpdate();

  useEffect(() => {
    if (needRefresh) {
      setShowPrompt(true);
    }
  }, [needRefresh]);

  const handleUpdate = async () => {
    await updateServiceWorker();
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setNeedRefresh(false);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-card border border-border rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-top-5">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <RefreshCw className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">Update Available</h3>
          <p className="text-sm text-muted-foreground mt-1">
            A new version of WM Consulting is ready
          </p>
          
          <div className="flex gap-2 mt-3">
            <Button onClick={handleUpdate} size="sm" className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Update Now
            </Button>
            <Button onClick={handleDismiss} variant="outline" size="sm">
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
