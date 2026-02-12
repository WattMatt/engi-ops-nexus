/**
 * Contractor Floor Plan View
 * Read-only floor plan viewer with tenant zone color coding
 * Displays the same markup from the admin tenant tracker
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Map, 
  CheckCircle2, 
  Clock, 
  ZoomIn,
  ZoomOut,
  Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ContractorFloorPlanViewProps {
  projectId: string;
}

interface Zone {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  tenant_id?: string | null;
  tenant_name?: string | null;
  category?: string | null;
}

interface Tenant {
  id: string;
  shop_number: string;
  shop_name: string | null;
  shop_category: string | null;
  sow_received: boolean | null;
  layout_received: boolean | null;
  db_ordered: boolean | null;
  lighting_ordered: boolean | null;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  standard: { bg: 'bg-blue-500', text: 'text-blue-600', label: 'Standard' },
  fast_food: { bg: 'bg-red-500', text: 'text-red-600', label: 'Fast Food' },
  restaurant: { bg: 'bg-emerald-500', text: 'text-emerald-600', label: 'Restaurant' },
  national: { bg: 'bg-purple-600', text: 'text-purple-600', label: 'National' },
};

export function ContractorFloorPlanView({ projectId }: ContractorFloorPlanViewProps) {
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 800, height: 600 });

  // Fetch floor plan record
  const { data: floorPlanRecord, isLoading: loadingFloorPlan } = useQuery({
    queryKey: ['contractor-floor-plan', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_floor_plans')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  // Fetch zones from tenant_floor_plan_zones table
  const { data: zones = [], isLoading: loadingZones } = useQuery({
    queryKey: ['contractor-floor-plan-zones', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_floor_plan_zones')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      return (data || []).map(z => ({
        id: z.id,
        points: (z.zone_points as any) || [],
        color: z.color || '#9ca3af',
        tenant_id: z.tenant_id,
        tenant_name: z.tenant_name,
        category: z.category,
      })) as Zone[];
    },
  });

  // Fetch tenants
  const { data: tenants = [] } = useQuery({
    queryKey: ['contractor-tenants-for-floorplan', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, shop_number, shop_name, shop_category, sow_received, layout_received, db_ordered, lighting_ordered')
        .eq('project_id', projectId);

      if (error) throw error;
      return data as Tenant[];
    },
  });

  // Get tenant status
  const getTenantStatus = (tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return { status: 'unknown', label: 'Unknown', color: 'text-muted-foreground', icon: null };

    const allComplete = tenant.sow_received && 
                       tenant.layout_received && 
                       tenant.db_ordered && 
                       tenant.lighting_ordered;

    if (allComplete) {
      return { status: 'complete', label: 'Complete', color: 'text-emerald-500', icon: CheckCircle2 };
    }

    return { status: 'in-progress', label: 'In Progress', color: 'text-amber-500', icon: Clock };
  };

  // Get tenant details
  const getTenantDetails = (tenantId: string) => {
    return tenants.find(t => t.id === tenantId);
  };

  // Handle zone click
  const handleZoneClick = (zone: Zone) => {
    if (zone.tenant_id) {
      setSelectedZone(zone);
    }
  };

  // Zoom controls
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  // Handle image load to get dimensions
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
  };

  // Render SVG overlay
  const renderZonesOverlay = () => {
    return (
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${imageDimensions.width} ${imageDimensions.height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {zones.map((zone) => {
          if (!zone.points || zone.points.length < 3) return null;
          const pointsStr = zone.points.map(p => `${p.x},${p.y}`).join(' ');
          
          return (
            <g key={zone.id}>
              <polygon
                points={pointsStr}
                fill={zone.color}
                fillOpacity={0.4}
                stroke={zone.color}
                strokeWidth={2}
                className={zone.tenant_id ? "cursor-pointer pointer-events-auto hover:fill-opacity-60 transition-all" : ""}
                onClick={() => handleZoneClick(zone)}
              />
              {/* Zone label */}
              {zone.tenant_name && zone.points.length > 0 && (
                <text
                  x={zone.points.reduce((sum, p) => sum + p.x, 0) / zone.points.length}
                  y={zone.points.reduce((sum, p) => sum + p.y, 0) / zone.points.length}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground text-xs font-medium pointer-events-none"
                  style={{ fontSize: '12px' }}
                >
                  {zone.tenant_name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  if (loadingFloorPlan || loadingZones) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!floorPlanRecord?.composite_image_url) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Map className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="font-medium">No Floor Plan Available</p>
          <p className="text-sm text-muted-foreground mt-1">
            The project team hasn't uploaded a floor plan yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get composite image URL - already a full public URL
  const getImageUrl = () => {
    const url = floorPlanRecord.composite_image_url!;
    // If already a full URL, use directly; otherwise construct from storage
    if (url.startsWith('http')) {
      return url;
    }
    const { data } = supabase.storage
      .from('floor-plans')
      .getPublicUrl(url);
    return data.publicUrl;
  };

  const assignedZones = zones.filter(z => z.tenant_id && z.tenant_name);

  return (
    <div className="space-y-6">
      {/* Floor Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                Floor Plan
              </CardTitle>
              <CardDescription>
                Click on a zone to view tenant details
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetZoom}>
                {Math.round(zoomLevel * 100)}%
              </Button>
              <Button variant="outline" size="icon" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setFullscreenOpen(true)}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div 
            className="relative overflow-auto border rounded-lg bg-muted/30"
            style={{ maxHeight: '600px' }}
          >
            <div 
              className="relative inline-block min-w-full"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
            >
              <img
                src={getImageUrl()}
                alt="Floor Plan"
                className="max-w-full h-auto"
                onLoad={handleImageLoad}
              />
              {renderZonesOverlay()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zone Legend</CardTitle>
        </CardHeader>
        <CardContent>
          {assignedZones.length === 0 ? (
            <p className="text-sm text-muted-foreground">No zones have been assigned to tenants yet.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {assignedZones.map((zone) => {
                const status = getTenantStatus(zone.tenant_id!);
                const StatusIcon = status.icon;
                const categoryInfo = zone.category ? CATEGORY_COLORS[zone.category] : null;

                return (
                  <div
                    key={zone.id}
                    className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => handleZoneClick(zone)}
                  >
                    <div
                      className="w-5 h-5 rounded border-2 border-border flex-shrink-0"
                      style={{ backgroundColor: zone.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{zone.tenant_name}</p>
                      {categoryInfo && (
                        <Badge variant="outline" className="text-xs mt-0.5">
                          {categoryInfo.label}
                        </Badge>
                      )}
                    </div>
                    {StatusIcon && (
                      <StatusIcon className={`h-4 w-4 flex-shrink-0 ${status.color}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tenant Details Dialog */}
      <Dialog open={!!selectedZone} onOpenChange={(open) => !open && setSelectedZone(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedZone && selectedZone.tenant_id && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: selectedZone.color }}
                  />
                  {selectedZone.tenant_name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {(() => {
                  const tenant = getTenantDetails(selectedZone.tenant_id!);
                  const status = getTenantStatus(selectedZone.tenant_id!);
                  const StatusIcon = status.icon;

                  if (!tenant) return <p className="text-muted-foreground">Tenant details not available</p>;

                  return (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{tenant.shop_number}</Badge>
                        {tenant.shop_category && (
                          <Badge variant="secondary">
                            {CATEGORY_COLORS[tenant.shop_category]?.label || tenant.shop_category}
                          </Badge>
                        )}
                        <div className={`flex items-center gap-1 ml-auto ${status.color}`}>
                          {StatusIcon && <StatusIcon className="h-4 w-4" />}
                          <span className="text-sm font-medium">{status.label}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <StatusItem label="SOW Received" checked={tenant.sow_received} />
                        <StatusItem label="Layout Received" checked={tenant.layout_received} />
                        <StatusItem label="DB Ordered" checked={tenant.db_ordered} />
                        <StatusItem label="Lighting Ordered" checked={tenant.lighting_ordered} />
                      </div>
                    </>
                  );
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Fullscreen Dialog */}
      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-4">
          <DialogHeader>
            <DialogTitle>Floor Plan</DialogTitle>
          </DialogHeader>
          <div className="relative flex-1 overflow-auto">
            <img
              src={getImageUrl()}
              alt="Floor Plan"
              className="max-w-full h-auto"
            />
            {renderZonesOverlay()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper component
function StatusItem({ label, checked }: { label: string; checked: boolean | null }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-md ${checked ? 'bg-emerald-500/10' : 'bg-muted/50'}`}>
      {checked ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      ) : (
        <Clock className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={`text-sm ${checked ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  );
}
