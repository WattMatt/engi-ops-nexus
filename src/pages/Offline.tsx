import { WifiOff, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Offline() {
  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
          <WifiOff className="h-10 w-10 text-muted-foreground" />
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-2">
          You're Offline
        </h1>
        
        <p className="text-muted-foreground mb-6">
          It looks like you've lost your internet connection. Some features may not be available until you're back online.
        </p>
        
        <div className="space-y-3">
          <Button onClick={handleRetry} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          
          <Button onClick={handleGoHome} variant="outline" className="w-full">
            <Home className="h-4 w-4 mr-2" />
            Go to Home
          </Button>
        </div>
        
        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <h2 className="font-medium text-foreground mb-2">Available Offline:</h2>
          <ul className="text-sm text-muted-foreground space-y-1 text-left">
            <li>• Previously viewed pages (cached)</li>
            <li>• Downloaded documents</li>
            <li>• Draft messages (will sync when online)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
