/**
 * Location Capture Button Component
 * Captures GPS coordinates for verification records
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  MapPinOff, 
  Loader2, 
  CheckCircle2,
  AlertTriangle 
} from "lucide-react";
import { useGeolocation, GeolocationPosition } from "@/hooks/useGeolocation";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LocationCaptureButtonProps {
  onLocationCaptured?: (position: GeolocationPosition) => void;
  capturedLocation?: GeolocationPosition | null;
  className?: string;
  variant?: "default" | "compact";
}

export function LocationCaptureButton({
  onLocationCaptured,
  capturedLocation,
  className,
  variant = "default",
}: LocationCaptureButtonProps) {
  const { position, error, isLoading, isSupported, captureLocation } = useGeolocation();
  const [hasCaptured, setHasCaptured] = useState(false);

  const currentPosition = capturedLocation || position;

  const handleCapture = async () => {
    const pos = await captureLocation();
    if (pos) {
      setHasCaptured(true);
      onLocationCaptured?.(pos);
    }
  };

  const formatAccuracy = (meters: number): string => {
    if (meters < 10) return "High accuracy";
    if (meters < 50) return "Good accuracy";
    if (meters < 100) return "Fair accuracy";
    return "Low accuracy";
  };

  if (!isSupported) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={variant === "compact" ? "sm" : "default"}
              disabled
              className={cn("gap-2", className)}
            >
              <MapPinOff className="h-4 w-4" />
              {variant !== "compact" && "Location unavailable"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Geolocation is not supported by this browser</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (currentPosition && hasCaptured) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge variant="outline" className="gap-1.5 text-green-600 border-green-200 bg-green-50">
          <CheckCircle2 className="h-3 w-3" />
          <span className="font-normal">
            {variant === "compact" ? "GPS" : formatAccuracy(currentPosition.accuracy)}
          </span>
        </Badge>
        {variant !== "compact" && (
          <span className="text-xs text-muted-foreground">
            ±{Math.round(currentPosition.accuracy)}m
          </span>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={variant === "compact" ? "sm" : "default"}
              onClick={handleCapture}
              className={cn("gap-2 border-amber-200 text-amber-600", className)}
            >
              <AlertTriangle className="h-4 w-4" />
              {variant !== "compact" && "Retry Location"}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{error.message}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      variant="outline"
      size={variant === "compact" ? "sm" : "default"}
      onClick={handleCapture}
      disabled={isLoading}
      className={cn("gap-2", className)}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {variant !== "compact" && "Getting location..."}
        </>
      ) : (
        <>
          <MapPin className="h-4 w-4" />
          {variant !== "compact" && "Capture Location"}
        </>
      )}
    </Button>
  );
}

interface LocationDisplayProps {
  latitude: number;
  longitude: number;
  accuracy?: number;
  className?: string;
}

export function LocationDisplay({ 
  latitude, 
  longitude, 
  accuracy, 
  className 
}: LocationDisplayProps) {
  const mapsUrl = `https://maps.google.com/maps?q=${latitude},${longitude}`;

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <MapPin className="h-4 w-4 text-muted-foreground" />
      <a 
        href={mapsUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        {latitude.toFixed(6)}, {longitude.toFixed(6)}
      </a>
      {accuracy && (
        <span className="text-muted-foreground">
          (±{Math.round(accuracy)}m)
        </span>
      )}
    </div>
  );
}
