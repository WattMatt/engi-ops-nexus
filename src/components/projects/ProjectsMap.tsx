import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, X, Navigation, Map, Satellite, Building2, Search, Crosshair, LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
interface Project {
  id: string;
  project_number: string;
  name: string;
  description: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  province: string | null;
}

interface ProjectsMapProps {
  projects: Project[];
  onProjectSelect: (projectId: string) => void;
  onLocationUpdate?: (projectId: string, lat: number, lng: number) => void;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  active: { color: "#10b981", label: "Active" },
  completed: { color: "#3b82f6", label: "Completed" },
  on_hold: { color: "#f59e0b", label: "On Hold" },
  cancelled: { color: "#ef4444", label: "Cancelled" },
  planning: { color: "#8b5cf6", label: "Planning" },
};

export const ProjectsMap = ({ projects, onProjectSelect, onLocationUpdate }: ProjectsMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const geocoderContainer = useRef<HTMLDivElement>(null);
  const geocoder = useRef<MapboxGeocoder | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const searchMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [placingPin, setPlacingPin] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets');
  const [searchedLocation, setSearchedLocation] = useState<{ lng: number; lat: number; name: string } | null>(null);
  const [showDropPinMode, setShowDropPinMode] = useState(false);
  const MAP_STYLES = {
    streets: 'mapbox://styles/mapbox/light-v11',
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  };

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-mapbox-token");
        
        if (error) {
          console.error("Error fetching Mapbox token:", error);
          toast.error("Failed to load map");
          return;
        }
        
        setMapboxToken(data.token);
      } catch (error) {
        console.error("Error fetching Mapbox token:", error);
        toast.error("Failed to load map");
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLES[mapStyle],
      center: [24.5, -29], // Center on South Africa
      zoom: 5,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    
    // Add geolocate control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showUserHeading: false,
      }),
      "top-right"
    );

    // Initialize Geocoder for address/street search
    if (geocoderContainer.current) {
      geocoder.current = new MapboxGeocoder({
        accessToken: mapboxToken,
        mapboxgl: mapboxgl as any,
        placeholder: "Search street, address, or area...",
        countries: "za", // Limit to South Africa
        types: "address,place,locality,neighborhood,poi",
        language: "en",
        limit: 8,
        marker: false, // We'll add our own marker
      });

      geocoderContainer.current.innerHTML = '';
      geocoderContainer.current.appendChild(geocoder.current.onAdd(map.current));

      // Handle geocoder result
      geocoder.current.on("result", (e: any) => {
        const { center, place_name } = e.result;
        const [lng, lat] = center;
        
        // Remove previous search marker
        if (searchMarker.current) {
          searchMarker.current.remove();
        }

        // Add new search marker
        const el = document.createElement("div");
        el.innerHTML = `
          <div style="
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, hsl(222.2 47.4% 11.2%), hsl(222.2 47.4% 25%));
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
        `;

        searchMarker.current = new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(`
              <div style="padding: 12px; font-family: system-ui;">
                <p style="font-size: 13px; font-weight: 600; margin: 0 0 4px 0; color: #1f2937;">📍 ${place_name}</p>
                <p style="font-size: 11px; color: #6b7280; margin: 0;">Click "Drop Pin Here" to assign a project</p>
              </div>
            `)
          )
          .addTo(map.current!);

        setSearchedLocation({ lng, lat, name: place_name });
        
        // Fly to location with appropriate zoom
        map.current?.flyTo({
          center: [lng, lat],
          zoom: 16,
          duration: 1500,
        });
      });

      geocoder.current.on("clear", () => {
        if (searchMarker.current) {
          searchMarker.current.remove();
          searchMarker.current = null;
        }
        setSearchedLocation(null);
      });
    }

    // Handle click for placing pins
    map.current.on("click", async (e) => {
      if (placingPin) {
        const { lng, lat } = e.lngLat;
        
        try {
          // Reverse geocode to get city/province
          let city: string | null = null;
          let province: string | null = null;
          
          try {
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place,region&access_token=${mapboxToken}`
            );
            const data = await response.json();
            
            if (data.features && data.features.length > 0) {
              // Find city (place) and province (region)
              for (const feature of data.features) {
                if (feature.place_type.includes('place') && !city) {
                  city = feature.text;
                }
                if (feature.place_type.includes('region') && !province) {
                  province = feature.text;
                }
              }
            }
          } catch (geoError) {
            console.warn("Reverse geocoding failed:", geoError);
          }

          const { error } = await supabase
            .from("projects")
            .update({ 
              latitude: lat, 
              longitude: lng,
              ...(city && { city }),
              ...(province && { province })
            })
            .eq("id", placingPin);

          if (error) throw error;

          const locationName = city ? `${city}${province ? `, ${province}` : ''}` : 'location';
          toast.success(`Project pinned to ${locationName}!`);
          onLocationUpdate?.(placingPin, lat, lng);
          setPlacingPin(null);
          setShowDropPinMode(false);
          
          // Clear search marker after placing
          if (searchMarker.current) {
            searchMarker.current.remove();
            searchMarker.current = null;
          }
          setSearchedLocation(null);
          geocoder.current?.clear();
        } catch (error) {
          console.error("Error saving location:", error);
          toast.error("Failed to save location");
        }
      }
    });

    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      if (searchMarker.current) {
        searchMarker.current.remove();
      }
      geocoder.current = null;
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Handle dropping pin at searched location
  const handleDropPinAtSearchedLocation = useCallback(async () => {
    if (!searchedLocation || !placingPin || !mapboxToken) return;

    try {
      // Parse city and province from the searched location name
      const nameParts = searchedLocation.name.split(',').map(p => p.trim());
      let city: string | null = nameParts[0] || null;
      let province: string | null = null;
      
      // Try to find province from the name parts or via reverse geocoding
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${searchedLocation.lng},${searchedLocation.lat}.json?types=region&access_token=${mapboxToken}`
        );
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
          province = data.features[0].text;
        }
      } catch (geoError) {
        console.warn("Failed to get province:", geoError);
        // Fallback: try to extract from name
        if (nameParts.length > 1) {
          province = nameParts[nameParts.length - 2]; // Usually second to last
        }
      }

      const { error } = await supabase
        .from("projects")
        .update({ 
          latitude: searchedLocation.lat, 
          longitude: searchedLocation.lng,
          ...(city && { city }),
          ...(province && { province })
        })
        .eq("id", placingPin);

      if (error) throw error;

      toast.success(`Project pinned to ${city}${province ? `, ${province}` : ''}`);
      onLocationUpdate?.(placingPin, searchedLocation.lat, searchedLocation.lng);
      setPlacingPin(null);
      setShowDropPinMode(false);
      
      if (searchMarker.current) {
        searchMarker.current.remove();
        searchMarker.current = null;
      }
      setSearchedLocation(null);
      geocoder.current?.clear();
    } catch (error) {
      console.error("Error saving location:", error);
      toast.error("Failed to save location");
    }
  }, [searchedLocation, placingPin, onLocationUpdate, mapboxToken]);

  // Update map style
  useEffect(() => {
    if (map.current && mapboxToken) {
      map.current.setStyle(MAP_STYLES[mapStyle]);
    }
  }, [mapStyle, mapboxToken]);

  // Add markers for projects
  useEffect(() => {
    if (!map.current || !mapboxToken) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Add markers for projects with coordinates
    projects.forEach(project => {
      if (project.latitude && project.longitude) {
        const config = STATUS_CONFIG[project.status] || { color: "#6b7280", label: project.status };
        
        // Create custom marker element with improved styling
        const el = document.createElement("div");
        el.className = "project-marker";
        el.innerHTML = `
          <div class="marker-container" style="
            position: relative;
            width: 40px;
            height: 48px;
            cursor: pointer;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.25));
            transition: all 0.2s ease;
          ">
            <svg viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
              <path d="M20 0C8.954 0 0 8.954 0 20c0 14.667 20 28 20 28s20-13.333 20-28C40 8.954 31.046 0 20 0z" fill="${config.color}"/>
              <circle cx="20" cy="18" r="12" fill="white" fill-opacity="0.95"/>
            </svg>
            <span style="
              position: absolute;
              top: 10px;
              left: 50%;
              transform: translateX(-50%);
              font-size: 11px;
              font-weight: 700;
              color: ${config.color};
              font-family: system-ui, -apple-system, sans-serif;
              letter-spacing: -0.5px;
            ">${project.project_number.slice(-3)}</span>
          </div>
        `;

        el.addEventListener("mouseenter", () => {
          const container = el.querySelector(".marker-container") as HTMLElement;
          if (container) {
            container.style.transform = "translateY(-4px) scale(1.1)";
          }
        });
        el.addEventListener("mouseleave", () => {
          const container = el.querySelector(".marker-container") as HTMLElement;
          if (container) {
            container.style.transform = "translateY(0) scale(1)";
          }
        });

        const popup = new mapboxgl.Popup({ 
          offset: [0, -40],
          closeButton: false,
          className: 'project-popup'
        }).setHTML(`
          <div style="
            padding: 16px;
            min-width: 220px;
            font-family: system-ui, -apple-system, sans-serif;
          ">
            <div style="
              display: flex;
              align-items: flex-start;
              gap: 12px;
              margin-bottom: 12px;
            ">
              <div style="
                width: 40px;
                height: 40px;
                background: ${config.color}15;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
              ">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${config.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 21h18"/>
                  <path d="M5 21V7l8-4v18"/>
                  <path d="M19 21V11l-6-4"/>
                  <path d="M9 9v.01"/>
                  <path d="M9 12v.01"/>
                  <path d="M9 15v.01"/>
                  <path d="M9 18v.01"/>
                </svg>
              </div>
              <div style="flex: 1; min-width: 0;">
                <h3 style="
                  font-size: 14px;
                  font-weight: 600;
                  color: #1f2937;
                  margin: 0 0 2px 0;
                  line-height: 1.3;
                ">${project.name}</h3>
                <p style="
                  font-size: 12px;
                  color: #6b7280;
                  margin: 0;
                ">${project.project_number}</p>
              </div>
            </div>
            ${project.city ? `
              <div style="
                display: flex;
                align-items: center;
                gap: 6px;
                margin-bottom: 12px;
                padding: 8px 10px;
                background: #f9fafb;
                border-radius: 6px;
              ">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span style="font-size: 12px; color: #4b5563;">${project.city}${project.province ? `, ${project.province}` : ''}</span>
              </div>
            ` : ''}
            <div style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
            ">
              <span style="
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 10px;
                background: ${config.color}15;
                color: ${config.color};
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
              ">
                <span style="width: 6px; height: 6px; background: ${config.color}; border-radius: 50%;"></span>
                ${config.label}
              </span>
              <button 
                onclick="window.selectProject('${project.id}')"
                style="
                  padding: 8px 14px;
                  background: hsl(222.2 47.4% 11.2%);
                  color: white;
                  border: none;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 12px;
                  font-weight: 500;
                  transition: all 0.15s ease;
                "
                onmouseover="this.style.opacity='0.9'"
                onmouseout="this.style.opacity='1'"
              >Open Project</button>
            </div>
          </div>
        `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([project.longitude, project.latitude])
          .setPopup(popup)
          .addTo(map.current!);

        markers.current.push(marker);
      }
    });

    // Global function for popup button
    (window as any).selectProject = (projectId: string) => {
      onProjectSelect(projectId);
    };

    return () => {
      delete (window as any).selectProject;
    };
  }, [projects, mapboxToken, onProjectSelect]);

  // Get projects without location
  const projectsWithoutLocation = projects.filter(p => !p.latitude || !p.longitude);
  const projectsWithLocation = projects.filter(p => p.latitude && p.longitude);

  if (loading) {
    return (
      <Card className="h-[600px] flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </Card>
    );
  }

  if (!mapboxToken) {
    return (
      <Card className="h-[600px] flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-3">
          <Map className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">Unable to load map</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Address/Street Search */}
          <div 
            ref={geocoderContainer} 
            className="geocoder-container"
            style={{ minWidth: '320px' }}
          />

          {/* Map style toggle */}
          <div className="inline-flex items-center rounded-lg border bg-background p-1 shadow-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMapStyle('streets')}
              className={cn(
                "gap-2 rounded-md px-3",
                mapStyle === 'streets' && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
              )}
            >
              <Map className="h-4 w-4" />
              Streets
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMapStyle('satellite')}
              className={cn(
                "gap-2 rounded-md px-3",
                mapStyle === 'satellite' && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
              )}
            >
              <Satellite className="h-4 w-4" />
              Satellite
            </Button>
          </div>

          {/* Stats badge */}
          <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
            <Building2 className="h-3.5 w-3.5" />
            {projectsWithLocation.length} of {projects.length} mapped
          </Badge>
        </div>

        {/* Status legend */}
        <div className="flex flex-wrap items-center gap-3">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <div key={status} className="flex items-center gap-2">
              <div 
                className="w-2.5 h-2.5 rounded-full shadow-sm" 
                style={{ backgroundColor: config.color, boxShadow: `0 0 0 2px ${config.color}30` }}
              />
              <span className="text-xs font-medium text-muted-foreground">
                {config.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Map container */}
      <Card className="relative overflow-hidden border-2 shadow-lg">
        <div 
          ref={mapContainer} 
          className="h-[600px] w-full"
          style={{ cursor: placingPin ? 'crosshair' : 'grab' }}
        />

        {/* Pin placement mode indicator */}
        {placingPin && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-primary text-primary-foreground px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="w-8 h-8 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="pr-2">
                <p className="text-sm font-semibold">Place Project Pin</p>
                <p className="text-xs opacity-80">
                  {searchedLocation 
                    ? "Click 'Drop Pin Here' or click on map" 
                    : "Search an address or click on map"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-primary-foreground/20 rounded-full"
                onClick={() => {
                  setPlacingPin(null);
                  setShowDropPinMode(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Drop pin at searched location button */}
        {searchedLocation && placingPin && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <Button
              size="lg"
              onClick={handleDropPinAtSearchedLocation}
              className="gap-2 shadow-xl animate-in fade-in slide-in-from-bottom-2"
            >
              <LocateFixed className="h-5 w-5" />
              Drop Pin Here
              <span className="text-xs opacity-80 ml-1">
                ({searchedLocation.name.split(',')[0]})
              </span>
            </Button>
          </div>
        )}

        {/* Searched location info panel */}
        {searchedLocation && !placingPin && (
          <div className="absolute bottom-4 left-4 z-10 max-w-sm">
            <Card className="shadow-xl border-2">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Search className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{searchedLocation.name.split(',')[0]}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {searchedLocation.name.split(',').slice(1).join(',')}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                  <Crosshair className="h-3.5 w-3.5" />
                  Select a project below to pin it here
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </Card>

      {/* Projects without location */}
      {projectsWithoutLocation.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Navigation className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <span>Unmapped Projects</span>
                <Badge variant="secondary" className="ml-2">{projectsWithoutLocation.length}</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {projectsWithoutLocation.map(project => {
                const config = STATUS_CONFIG[project.status] || { color: "#6b7280", label: project.status };
                return (
                  <Button
                    key={project.id}
                    variant={placingPin === project.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPlacingPin(placingPin === project.id ? null : project.id)}
                    className={cn(
                      "gap-2 transition-all",
                      placingPin === project.id && "ring-2 ring-offset-2"
                    )}
                    style={{
                      borderColor: placingPin !== project.id ? `${config.color}40` : undefined,
                    }}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="font-medium">{project.project_number}</span>
                    <span className="text-muted-foreground font-normal">- {project.name}</span>
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
              Click a project, then click on the map to set its location
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};