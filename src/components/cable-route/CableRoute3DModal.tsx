import { useState, useEffect } from 'react';
import { X, Eye, Settings, FileText, CheckSquare, Box } from 'lucide-react';
import { CableRoute } from './types';
import { CableRouteAnalysis } from './CableRouteAnalysis';

interface CableRoute3DModalProps {
  routes: CableRoute[];
  isOpen: boolean;
  onClose: () => void;
}

export function CableRoute3DModal({ routes, isOpen, onClose }: CableRoute3DModalProps) {
  const [selectedRoute, setSelectedRoute] = useState<CableRoute | null>(null);

  useEffect(() => {
    if (routes.length > 0 && !selectedRoute) {
      setSelectedRoute(routes[0]);
    }
  }, [routes, selectedRoute]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative w-[95vw] h-[90vh] bg-card rounded-lg shadow-2xl border border-border flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Box className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold text-foreground">
                3D Cable Route Analysis
              </h2>
              <p className="text-sm text-muted-foreground">
                {routes.length} cable route{routes.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Route Selector */}
        {routes.length > 1 && (
          <div className="flex items-center gap-2 p-3 border-b border-border bg-muted/30">
            <span className="text-sm font-medium text-foreground">Select Route:</span>
            <select
              value={selectedRoute?.id || ''}
              onChange={(e) => {
                const route = routes.find((r) => r.id === e.target.value);
                setSelectedRoute(route || null);
              }}
              className="px-3 py-1.5 bg-background border border-input rounded-md text-sm text-foreground"
            >
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name} - {route.metrics?.totalLength.toFixed(2)}m
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {selectedRoute ? (
            <CableRouteAnalysis
              route={selectedRoute}
              onRouteUpdate={(updatedRoute) => {
                // Update the route in the parent component if needed
                console.log('Route updated:', updatedRoute);
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Box className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold text-foreground mb-2">
                  No Route Selected
                </p>
                <p className="text-sm text-muted-foreground">
                  Select a cable route from the dropdown above
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span>3D Visualization</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              <span>BS 7671 Compliance</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Material Takeoff</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
