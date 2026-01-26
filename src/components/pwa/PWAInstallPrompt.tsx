import { useState } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Button } from "@/components/ui/button";
import { X, Download, Share, Plus, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PWAInstallPrompt() {
  const { canInstall, isIOS, showIOSPrompt, install, dismiss, isInstalled } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Don't show anything if already installed
  if (isInstalled) {
    return null;
  }

  // Show iOS install prompt
  if (showIOSPrompt) {
    return (
      <>
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-card border border-border rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-bottom-5">
          <button
            onClick={dismiss}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
          
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">Install WM Consulting</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add to your home screen for the best experience
              </p>
              
              <Button
                onClick={() => setShowIOSModal(true)}
                className="mt-3 w-full"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Learn How to Install
              </Button>
            </div>
          </div>
        </div>

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
            
            <Button onClick={() => setShowIOSModal(false)} className="w-full">
              Got it!
            </Button>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Show standard install prompt for Chrome/Edge/etc
  if (canInstall) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-card border border-border rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-bottom-5">
        <button
          onClick={dismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden">
            <img
              src="/icons/icon-96x96.png"
              alt="WM Consulting"
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">Install WM Consulting</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Install for quick access and offline support
            </p>
            
            <div className="flex gap-2 mt-3">
              <Button onClick={install} size="sm" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Install
              </Button>
              <Button onClick={dismiss} variant="outline" size="sm">
                Later
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
