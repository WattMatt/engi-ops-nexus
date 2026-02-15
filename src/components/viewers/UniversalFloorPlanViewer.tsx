import React, { useState, useRef, useEffect } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Upload, 
  X, 
  MapPin, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize, 
  Minimize 
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Coordinate {
  x: number;
  y: number;
}

export interface ViewerPin {
  id: string;
  x: number;
  y: number;
  label?: string;
  status?: 'open' | 'closed' | string;
  color?: string; // Allow custom colors
  icon?: React.ReactNode; // Allow custom icons
  data?: any; // any extra data
}

interface UniversalFloorPlanViewerProps {
  imageUrl?: string | null;
  pins?: ViewerPin[];
  onPinAdd?: (coordinate: Coordinate) => void;
  onPinClick?: (pin: ViewerPin) => void;
  readOnly?: boolean;
  className?: string;
  allowFileUpload?: boolean;
  onImageUpload?: (file: File) => void;
  onClearImage?: () => void;
  title?: string;
}

export const UniversalFloorPlanViewer: React.FC<UniversalFloorPlanViewerProps> = ({
  imageUrl,
  pins = [],
  onPinAdd,
  onPinClick,
  readOnly = false,
  className = "",
  allowFileUpload = true,
  onImageUpload,
  onClearImage,
  title
}) => {
  const transformComponentRef = useRef<ReactZoomPanPinchContentRef | null>(null);
  const [localImage, setLocalImage] = useState<string | null>(imageUrl || null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (imageUrl !== undefined) {
      setLocalImage(imageUrl);
    }
  }, [imageUrl]);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>, scale: number) => {
    if (readOnly || !onPinAdd) return;
    
    // We need to calculate the click position relative to the image itself, 
    // taking into account the current zoom scale.
    // However, react-zoom-pan-pinch handles the scaling of the content.
    // The click event target will be the image or the wrapper div inside TransformComponent.
    
    const target = e.currentTarget; 
    const rect = target.getBoundingClientRect();
    
    // Calculate x and y as percentages (0-1)
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    onPinAdd({ x, y });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onImageUpload) {
        onImageUpload(file);
      } else {
        // Fallback local preview
        const url = URL.createObjectURL(file);
        setLocalImage(url);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen change events (e.g. user presses Esc)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <Card 
      ref={containerRef}
      className={cn(
        "relative overflow-hidden flex flex-col bg-slate-50 border-slate-200", 
        isFullscreen ? "fixed inset-0 z-50 rounded-none h-screen w-screen" : "min-h-[400px]",
        className
      )}
    >
      {title && (
        <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-sm border border-slate-200">
          <h3 className="text-sm font-medium text-slate-800">{title}</h3>
        </div>
      )}

      {!localImage ? (
        <div className="flex flex-col items-center justify-center flex-1 p-8 border-2 border-dashed border-slate-200 m-4 rounded-lg bg-white">
          <Upload className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-base text-slate-600 font-medium mb-1">No Floor Plan Available</p>
          <p className="text-sm text-slate-400 mb-6 text-center max-w-md">
            Upload a floor plan image to start adding pins and managing locations.
          </p>
          
          {allowFileUpload && (
            <>
              <Button variant="default" onClick={() => document.getElementById('universal-viewer-upload')?.click()}>
                Select Image
              </Button>
              <input
                id="universal-viewer-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </>
          )}
        </div>
      ) : (
        <div className="relative w-full h-full flex-1 bg-slate-100 overflow-hidden">
          <TransformWrapper
            ref={transformComponentRef}
            initialScale={1}
            minScale={0.5}
            maxScale={8}
            centerOnInit
            limitToBounds={false}
            wheel={{ step: 0.1 }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                {/* Controls Overlay */}
                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                  <div className="bg-white/90 backdrop-blur-sm rounded-md shadow-sm border border-slate-200 p-1 flex flex-col gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomIn()}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomOut()}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => resetTransform()}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="bg-white/90 backdrop-blur-sm rounded-md shadow-sm border border-slate-200 p-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullscreen}>
                      {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full">
                  <div 
                    className="relative inline-block origin-top-left"
                    onClick={(e) => handleImageClick(e, 1)}
                    style={{ cursor: readOnly ? 'grab' : 'crosshair' }}
                  >
                    <img
                      src={localImage}
                      alt="Floor Plan"
                      className="max-w-none block touch-none select-none"
                      style={{ pointerEvents: 'none' }} // Ensure clicks go to the container div
                      draggable={false}
                    />
                    
                    {pins.map((pin) => (
                      <div
                        key={pin.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
                        style={{ 
                          left: `${pin.x * 100}%`, 
                          top: `${pin.y * 100}%`,
                          // Counter-scale pins so they stay the same visual size regardless of zoom
                          transform: `translate(-50%, -50%) scale(1)`
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onPinClick?.(pin);
                        }}
                      >
                        {pin.icon ? (
                          pin.icon
                        ) : (
                          <div className={cn(
                            "p-1.5 rounded-full shadow-lg transition-transform hover:scale-110 border border-white ring-1 ring-black/10",
                            pin.color ? "" : (pin.status === 'closed' ? 'bg-green-500' : 'bg-red-500')
                          )}
                          style={{ backgroundColor: pin.color }}
                          >
                            <MapPin className="w-5 h-5 text-white drop-shadow-sm" />
                          </div>
                        )}
                        
                        {pin.label && (
                          <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-slate-900/90 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                            {pin.label}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>

          {!readOnly && allowFileUpload && (
            <div className="absolute bottom-4 left-4 z-10 flex gap-2">
              <Button 
                size="sm" 
                variant="secondary"
                className="bg-white/90 backdrop-blur-sm shadow-sm border border-slate-200"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onClearImage) {
                    onClearImage();
                  } else {
                    setLocalImage(null);
                  }
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/90 backdrop-blur-sm shadow-sm border border-slate-200"
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById('floor-plan-upload-change')?.click();
                }}
              >
                <Upload className="w-4 h-4 mr-2" />
                Change Image
              </Button>
              <input
                id="floor-plan-upload-change"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
