/**
 * Climatic Zone Strip - Compact map display for header area
 * Shows the SANS 204 map with pin location between KPI cards and phase tabs
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Thermometer, Sun, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { findClosestCity } from '@/data/saCitiesZones';
import { cn } from '@/lib/utils';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface ClimaticZoneStripProps {
  documentId: string;
  document: {
    climatic_zone?: string | null;
    climatic_zone_city?: string | null;
    climatic_zone_lat?: number | null;
    climatic_zone_lng?: number | null;
    project_id?: string | null;
    project_area?: number | null;
  } | null;
}

// Zone colors matching the full map
const ZONE_COLORS: Record<string, string> = {
  '1': '#1E40AF', // Cold Interior
  '2': '#3B82F6', // Temperate Interior
  '3': '#22C55E', // Hot Interior
  '4': '#EAB308', // Temperate Coastal
  '5': '#F97316', // Sub-tropical Coastal
  '6': '#EF4444', // Arid Interior
};

const ZONE_NAMES: Record<string, string> = {
  '1': 'Cold Interior',
  '2': 'Temperate Interior',
  '3': 'Hot Interior',
  '4': 'Temperate Coastal',
  '5': 'Sub-tropical Coastal',
  '6': 'Arid Interior',
};

// VA/m² values per zone
const ZONE_VA_VALUES: Record<string, number> = {
  '1': 110,
  '2': 100,
  '3': 90,
  '4': 85,
  '5': 95,
  '6': 120,
};

export function ClimaticZoneStrip({ documentId, document }: ClimaticZoneStripProps) {
  const queryClient = useQueryClient();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const zone = document?.climatic_zone;
  const city = document?.climatic_zone_city;
  const lat = document?.climatic_zone_lat;
  const lng = document?.climatic_zone_lng;
  const hasLocation = lat && lng;

  // Initialize map when expanded
  useEffect(() => {
    if (!isExpanded || !mapContainer.current || map.current) return;

    const initMap = async () => {
      try {
        // Get Mapbox token from edge function (same pattern as other map components)
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-mapbox-token');
        
        const token = tokenData?.token || import.meta.env.VITE_MAPBOX_TOKEN;
        if (!token || tokenError) {
          console.error('No Mapbox token available');
          return;
        }

        mapboxgl.accessToken = token;

        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [lng || 28.0, lat || -26.0],
          zoom: hasLocation ? 6 : 5,
          interactive: true,
          attributionControl: false,
        });

        map.current.on('load', () => {
          setMapLoaded(true);
          
          // Add marker if we have coordinates
          if (hasLocation && map.current) {
            marker.current = new mapboxgl.Marker({ color: ZONE_COLORS[zone || '3'] || '#22C55E' })
              .setLngLat([lng!, lat!])
              .addTo(map.current);
          }
        });

        // Handle map click to update location
        map.current.on('click', handleMapClick);
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        marker.current = null;
        setMapLoaded(false);
      }
    };
  }, [isExpanded]);

  // Update marker when location changes
  useEffect(() => {
    if (!map.current || !mapLoaded || !hasLocation) return;

    if (marker.current) {
      marker.current.setLngLat([lng!, lat!]);
    } else {
      marker.current = new mapboxgl.Marker({ color: ZONE_COLORS[zone || '3'] || '#22C55E' })
        .setLngLat([lng!, lat!])
        .addTo(map.current);
    }

    map.current.flyTo({ center: [lng!, lat!], zoom: 7 });
  }, [lat, lng, zone, mapLoaded]);

  const handleMapClick = useCallback(async (e: mapboxgl.MapMouseEvent) => {
    const { lng: clickLng, lat: clickLat } = e.lngLat;
    
    // Find closest city and zone
    const closestCity = findClosestCity(clickLng, clickLat);
    if (!closestCity) {
      toast.error('Could not determine zone for this location');
      return;
    }

    // Update marker
    if (marker.current) {
      marker.current.setLngLat([clickLng, clickLat]);
    } else if (map.current) {
      marker.current = new mapboxgl.Marker({ color: ZONE_COLORS[closestCity.zone] || '#22C55E' })
        .setLngLat([clickLng, clickLat])
        .addTo(map.current);
    }

    // Save to database
    const { error } = await supabase
      .from('bulk_services_documents')
      .update({
        climatic_zone: closestCity.zone,
        climatic_zone_city: closestCity.city,
        climatic_zone_lat: clickLat,
        climatic_zone_lng: clickLng,
      })
      .eq('id', documentId);

    if (error) {
      toast.error('Failed to update location');
    } else {
      toast.success(`Location set: ${closestCity.city} (Zone ${closestCity.zone})`);
      queryClient.invalidateQueries({ queryKey: ['bulk-services-document', documentId] });
    }
  }, [documentId, queryClient]);

  const handleSyncFromProject = async () => {
    if (!document?.project_id) return;

    setSyncing(true);
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .select('city, latitude, longitude')
        .eq('id', document.project_id)
        .single();

      if (error || !project?.latitude || !project?.longitude) {
        toast.error('Project has no location data');
        return;
      }

      const closestCity = findClosestCity(project.longitude, project.latitude);
      if (!closestCity) {
        toast.error('Could not determine zone');
        return;
      }

      await supabase
        .from('bulk_services_documents')
        .update({
          climatic_zone: closestCity.zone,
          climatic_zone_city: project.city || closestCity.city,
          climatic_zone_lat: project.latitude,
          climatic_zone_lng: project.longitude,
        })
        .eq('id', documentId);

      toast.success(`Synced from project: ${project.city || closestCity.city}`);
      queryClient.invalidateQueries({ queryKey: ['bulk-services-document', documentId] });
    } catch (error) {
      toast.error('Failed to sync location');
    } finally {
      setSyncing(false);
    }
  };

  const vaPerSqm = zone ? ZONE_VA_VALUES[zone] || 90 : null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Compact Header - Always Visible */}
        <div 
          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">SANS 204 Location</span>
            </div>
            
            {hasLocation && zone ? (
              <div className="flex items-center gap-3">
                <Badge 
                  style={{ backgroundColor: ZONE_COLORS[zone], color: 'white' }}
                  className="font-bold"
                >
                  Zone {zone}
                </Badge>
                <span className="text-sm text-muted-foreground">{city}</span>
                <div className="hidden md:flex items-center gap-2 text-sm">
                  <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{ZONE_NAMES[zone]}</span>
                </div>
                {vaPerSqm && (
                  <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted text-xs">
                    <Sun className="h-3 w-3" />
                    <span className="font-medium">{vaPerSqm} VA/m²</span>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Click to set project location</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {document?.project_id && !hasLocation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSyncFromProject();
                }}
                disabled={syncing}
                className="text-xs"
              >
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1", syncing && "animate-spin")} />
                Sync from Project
              </Button>
            )}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Expanded Map View */}
        {isExpanded && (
          <div className="border-t">
            <div 
              ref={mapContainer} 
              className="w-full h-48 bg-muted"
              style={{ minHeight: '192px' }}
            />
            <div className="px-4 py-2 bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
              <span>Click on the map to set or update the project location</span>
              {hasLocation && (
                <span>
                  Coordinates: {lat?.toFixed(4)}°S, {lng?.toFixed(4)}°E
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
