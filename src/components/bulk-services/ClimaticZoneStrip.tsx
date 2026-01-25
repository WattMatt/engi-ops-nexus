/**
 * Climatic Zone Strip - Compact map display for header area
 * Shows the SANS 204 map with colored zones and pin location
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Thermometer, Sun, ChevronDown, ChevronUp, RefreshCw, Zap } from 'lucide-react';
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

// SANS 204 Zone colors - matching official specification
const ZONE_COLORS: Record<string, string> = {
  '1': '#7EC8E3', // Light Blue - Cold Interior
  '2': '#F5E6D3', // Cream/Beige - Temperate Interior
  '3': '#E67E50', // Orange - Hot Interior
  '4': '#6B9AC4', // Dark Blue - Temperate Coastal
  '5': '#70B77E', // Green - Sub-tropical Coastal
  '6': '#F4D03F', // Yellow - Arid Interior
};

// Zone information for SANS 204
const ZONE_INFO: Record<string, {
  name: string;
  temp: string;
  characteristics: string;
  vaPerSqm: number;
  cities: string;
}> = {
  '1': { 
    name: 'Cold Interior', 
    temp: '14-16°C',
    characteristics: 'High altitude, cold winters',
    vaPerSqm: 110,
    cities: 'Johannesburg, Bloemfontein'
  },
  '2': { 
    name: 'Temperate Interior', 
    temp: '16-18°C',
    characteristics: 'Moderate climate, warm summers',
    vaPerSqm: 100,
    cities: 'Pretoria, Polokwane'
  },
  '3': { 
    name: 'Hot Interior', 
    temp: '18-22°C',
    characteristics: 'Hot summers, warm winters',
    vaPerSqm: 90,
    cities: 'Makhado, Nelspruit'
  },
  '4': { 
    name: 'Temperate Coastal', 
    temp: '14-18°C',
    characteristics: 'Winter rainfall, ocean influence',
    vaPerSqm: 85,
    cities: 'Cape Town, Port Elizabeth'
  },
  '5': { 
    name: 'Sub-tropical Coastal', 
    temp: '18-22°C',
    characteristics: 'Humid, warm year-round',
    vaPerSqm: 95,
    cities: 'Durban, Richards Bay'
  },
  '6': { 
    name: 'Arid Interior', 
    temp: '16-20°C',
    characteristics: 'Very hot dry summers',
    vaPerSqm: 120,
    cities: 'Kimberley, Upington'
  },
};

// Simplified zone boundaries for South Africa (approximate polygons)
const ZONE_BOUNDARIES: Record<string, number[][][]> = {
  // Zone 1: Cold Interior (Highveld - Johannesburg, Bloemfontein area)
  '1': [[
    [27.5, -25.5], [29.5, -25.5], [30.0, -26.0], [30.0, -27.5],
    [29.0, -29.5], [26.5, -30.0], [25.5, -29.0], [26.0, -27.0],
    [27.0, -26.0], [27.5, -25.5]
  ]],
  // Zone 2: Temperate Interior (Northern regions - Pretoria, Polokwane)
  '2': [[
    [26.0, -22.5], [30.0, -22.5], [31.0, -24.0], [30.0, -25.5],
    [27.5, -25.5], [26.0, -24.5], [25.0, -23.5], [26.0, -22.5]
  ]],
  // Zone 3: Hot Interior (Lowveld - Nelspruit, Makhado)
  '3': [[
    [30.0, -22.5], [32.0, -23.0], [32.0, -25.5], [31.5, -26.5],
    [30.0, -26.0], [30.0, -25.5], [31.0, -24.0], [30.0, -22.5]
  ]],
  // Zone 4: Temperate Coastal (Western Cape - Cape Town, PE)
  '4': [[
    [18.0, -32.0], [18.5, -34.5], [21.0, -35.0], [26.5, -34.0],
    [27.0, -33.0], [25.5, -33.5], [22.0, -34.0], [19.0, -33.0],
    [18.0, -32.0]
  ]],
  // Zone 5: Sub-tropical Coastal (KZN - Durban, Richards Bay)
  '5': [[
    [29.5, -27.0], [32.5, -28.0], [32.0, -30.5], [30.5, -31.0],
    [29.0, -29.5], [30.0, -27.5], [29.5, -27.0]
  ]],
  // Zone 6: Arid Interior (Northern Cape - Kimberley, Upington)
  '6': [[
    [18.0, -28.0], [18.5, -32.0], [22.0, -34.0], [25.5, -33.5],
    [26.5, -30.0], [25.5, -29.0], [26.0, -27.0], [24.0, -25.5],
    [22.0, -26.0], [19.0, -28.5], [18.0, -28.0]
  ]],
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
  const zoneInfo = zone ? ZONE_INFO[zone] : null;

  // Initialize map when expanded
  useEffect(() => {
    if (!isExpanded || !mapContainer.current || map.current) return;

    const initMap = async () => {
      try {
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
          center: [lng || 25.0, lat || -29.0],
          zoom: hasLocation ? 5.5 : 4.5,
          interactive: true,
          attributionControl: false,
        });

        map.current.on('load', () => {
          if (!map.current) return;
          
          setMapLoaded(true);
          
          // Add zone layers
          Object.entries(ZONE_BOUNDARIES).forEach(([zoneId, coordinates]) => {
            const sourceId = `zone-${zoneId}-source`;
            const layerId = `zone-${zoneId}-layer`;
            const outlineId = `zone-${zoneId}-outline`;
            
            map.current!.addSource(sourceId, {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: { zone: zoneId },
                geometry: {
                  type: 'Polygon',
                  coordinates: coordinates
                }
              }
            });
            
            // Fill layer
            map.current!.addLayer({
              id: layerId,
              type: 'fill',
              source: sourceId,
              paint: {
                'fill-color': ZONE_COLORS[zoneId],
                'fill-opacity': zone === zoneId ? 0.6 : 0.35
              }
            });
            
            // Outline layer
            map.current!.addLayer({
              id: outlineId,
              type: 'line',
              source: sourceId,
              paint: {
                'line-color': ZONE_COLORS[zoneId],
                'line-width': zone === zoneId ? 3 : 1.5,
                'line-opacity': 0.8
              }
            });
          });
          
          // Add marker if we have coordinates
          if (hasLocation) {
            marker.current = new mapboxgl.Marker({ 
              color: '#000000',
              scale: 1.2
            })
              .setLngLat([lng!, lat!])
              .addTo(map.current!);
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

  // Update marker and highlight when location changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Update zone highlighting
    Object.keys(ZONE_BOUNDARIES).forEach(zoneId => {
      const layerId = `zone-${zoneId}-layer`;
      const outlineId = `zone-${zoneId}-outline`;
      
      if (map.current!.getLayer(layerId)) {
        map.current!.setPaintProperty(layerId, 'fill-opacity', zone === zoneId ? 0.6 : 0.35);
      }
      if (map.current!.getLayer(outlineId)) {
        map.current!.setPaintProperty(outlineId, 'line-width', zone === zoneId ? 3 : 1.5);
      }
    });

    if (hasLocation) {
      if (marker.current) {
        marker.current.setLngLat([lng!, lat!]);
      } else {
        marker.current = new mapboxgl.Marker({ 
          color: '#000000',
          scale: 1.2
        })
          .setLngLat([lng!, lat!])
          .addTo(map.current);
      }
      
      map.current.flyTo({ center: [lng!, lat!], zoom: 5.5 });
    }
  }, [lat, lng, zone, mapLoaded]);

  const handleMapClick = useCallback(async (e: mapboxgl.MapMouseEvent) => {
    const { lng: clickLng, lat: clickLat } = e.lngLat;
    
    const closestCity = findClosestCity(clickLng, clickLat);
    if (!closestCity) {
      toast.error('Could not determine zone for this location');
      return;
    }

    if (marker.current) {
      marker.current.setLngLat([clickLng, clickLat]);
    } else if (map.current) {
      marker.current = new mapboxgl.Marker({ 
        color: '#000000',
        scale: 1.2
      })
        .setLngLat([clickLng, clickLat])
        .addTo(map.current);
    }

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
                  style={{ backgroundColor: ZONE_COLORS[zone], color: zone === '2' ? '#333' : 'white' }}
                  className="font-bold"
                >
                  Zone {zone}
                </Badge>
                <span className="text-sm text-muted-foreground">{city}</span>
                <div className="hidden md:flex items-center gap-2 text-sm">
                  <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{zoneInfo?.name}</span>
                </div>
                {zoneInfo && (
                  <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted text-xs">
                    <Zap className="h-3 w-3" />
                    <span className="font-medium">{zoneInfo.vaPerSqm} VA/m²</span>
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

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t">
            {/* Map */}
            <div 
              ref={mapContainer} 
              className="w-full h-56 bg-muted"
              style={{ minHeight: '224px' }}
            />
            
            {/* Coordinates Bar */}
            <div className="px-4 py-2 bg-muted/30 text-xs text-muted-foreground flex items-center justify-between border-b">
              <span>Click on the map to set or update the project location</span>
              {hasLocation && (
                <span>
                  {Math.abs(lat!).toFixed(4)}°S, {Math.abs(lng!).toFixed(4)}°E
                </span>
              )}
            </div>
            
            {/* Zone Legend */}
            <div className="p-4 bg-card">
              <p className="text-xs font-medium text-muted-foreground mb-3">SANS 204 Climatic Zones</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {Object.entries(ZONE_INFO).map(([zoneId, info]) => (
                  <div 
                    key={zoneId}
                    className={cn(
                      "p-2 rounded-lg border transition-all",
                      zone === zoneId 
                        ? "border-primary ring-2 ring-primary/20 bg-primary/5" 
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div 
                        className="w-4 h-4 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: ZONE_COLORS[zoneId] }}
                      />
                      <span className="font-bold text-sm">Zone {zoneId}</span>
                    </div>
                    <p className="text-xs font-medium">{info.name}</p>
                    <p className="text-xs text-muted-foreground">{info.temp}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs">
                      <Zap className="h-3 w-3 text-primary" />
                      <span className="font-medium text-primary">{info.vaPerSqm} VA/m²</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
