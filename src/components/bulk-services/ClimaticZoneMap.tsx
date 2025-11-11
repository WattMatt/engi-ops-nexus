import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Map, Satellite, Mountain, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SA_CITIES_ZONES, findClosestCity } from "@/data/saCitiesZones";

interface ClimaticZoneMapProps {
  selectedZone: string;
  onZoneSelect: (zone: string) => void;
  showReferenceMap?: boolean;
}

const ZONE_COLORS = {
  "1": "#7EC8E3", // Light Blue - Cold Interior
  "2": "#F5E6D3", // Cream/Beige - Temperate Interior
  "3": "#E67E50", // Orange - Hot Interior
  "4": "#6B9AC4", // Dark Blue - Temperate Coastal
  "5": "#70B77E", // Green - Sub-tropical Coastal
  "6": "#F4D03F", // Yellow - Arid Interior
};

const ZONE_INFO = {
  "1": { 
    name: "Cold Interior", 
    cities: "Johannesburg, Bloemfontein",
    temp: "14-16°C mean annual",
    characteristics: "High altitude, cold winters, moderate summers"
  },
  "2": { 
    name: "Temperate Interior", 
    cities: "Pretoria, Polokwane",
    temp: "16-18°C mean annual",
    characteristics: "Moderate climate, warm summers, mild winters"
  },
  "3": { 
    name: "Hot Interior", 
    cities: "Makhado, Nelspruit",
    temp: "18-22°C mean annual",
    characteristics: "Hot summers, warm winters, summer rainfall"
  },
  "4": { 
    name: "Temperate Coastal", 
    cities: "Cape Town, Port Elizabeth",
    temp: "14-18°C mean annual",
    characteristics: "Moderate climate, winter rainfall, ocean influence"
  },
  "5": { 
    name: "Sub-tropical Coastal", 
    cities: "Durban, Richards Bay, East London",
    temp: "18-22°C mean annual",
    characteristics: "Humid, warm year-round, high rainfall"
  },
  "6": { 
    name: "Arid Interior", 
    cities: "Kimberley, Upington",
    temp: "16-20°C mean annual",
    characteristics: "Very hot dry summers, cold nights, low rainfall"
  },
};

export const ClimaticZoneMap = ({ selectedZone, onZoneSelect, showReferenceMap = true }: ClimaticZoneMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const geocoder = useRef<MapboxGeocoder | null>(null);
  const cityMarkers = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite' | 'terrain'>('streets');
  const [showCityMarkers, setShowCityMarkers] = useState(true);

  const MAP_STYLES = {
    streets: 'mapbox://styles/mapbox/light-v11',
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
    terrain: 'mapbox://styles/mapbox/outdoors-v12',
  };

  useEffect(() => {
    const fetchToken = async () => {
      try {
        // Fetch the Mapbox token from Supabase secrets via edge function
        const { data, error } = await supabase.functions.invoke("get-mapbox-token");
        
        if (error) {
          console.error("Error fetching Mapbox token:", error);
          return;
        }
        
        setMapboxToken(data.token);
      } catch (error) {
        console.error("Error fetching Mapbox token:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLES[mapStyle],
      center: [24.5, -28.5], // Center of South Africa
      zoom: 4.5,
      pitch: 0,
    });

    map.current.on("load", () => {
      if (!map.current) return;

      // Add city markers for each zone
      SA_CITIES_ZONES.forEach((city) => {
        const el = document.createElement('div');
        el.className = 'city-marker';
        el.style.backgroundColor = ZONE_COLORS[city.zone as keyof typeof ZONE_COLORS];
        el.style.width = '12px';
        el.style.height = '12px';
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 4px 8px;">
            <strong>${city.city}</strong><br/>
            <span style="color: #666;">Zone ${city.zone}: ${ZONE_INFO[city.zone as keyof typeof ZONE_INFO].name}</span><br/>
            <span style="color: #888; font-size: 12px;">${city.province}</span>
          </div>
        `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat(city.coordinates)
          .setPopup(popup)
          .addTo(map.current!);

        cityMarkers.current.push(marker);

        // Click handler to select zone
        el.addEventListener('click', () => {
          onZoneSelect(city.zone);
          toast({
            title: "City Selected",
            description: `${city.city} is in ${ZONE_INFO[city.zone as keyof typeof ZONE_INFO].name} (Zone ${city.zone})`,
          });
        });
      });
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add geocoder (search box)
    geocoder.current = new MapboxGeocoder({
      accessToken: mapboxToken,
      mapboxgl: mapboxgl as any,
      marker: false, // We'll handle the marker ourselves
      placeholder: "Search for a city or address...",
      countries: "ZA", // Restrict to South Africa
      proximity: {
        longitude: 24.5,
        latitude: -28.5,
      } as any,
    });

    map.current.addControl(geocoder.current as any, "top-left");

    // Handle geocoder result selection
    geocoder.current.on("result", (e: any) => {
      const coordinates = e.result.geometry.coordinates;
      const [lng, lat] = coordinates;
      
      // Find closest city to this coordinate
      const closestCity = findClosestCity(lng, lat);
      
      if (closestCity) {
        onZoneSelect(closestCity.zone);
        toast({
          title: "Zone Suggested",
          description: `${e.result.place_name} is near ${closestCity.city} in ${ZONE_INFO[closestCity.zone as keyof typeof ZONE_INFO].name} (Zone ${closestCity.zone})`,
        });
        
        // Add a temporary marker at the searched location
        const marker = new mapboxgl.Marker({ color: "#ef4444" })
          .setLngLat(coordinates)
          .addTo(map.current!);
        
        // Remove marker after 5 seconds
        setTimeout(() => marker.remove(), 5000);
        
        // Fly to the location
        map.current!.flyTo({
          center: coordinates,
          zoom: 8,
          duration: 2000,
        });
      } else {
        toast({
          title: "Location Not Found",
          description: `Could not determine climatic zone for ${e.result.place_name}. Please select manually.`,
          variant: "destructive",
        });
      }
    });

    return () => {
      // Cleanup markers first
      cityMarkers.current.forEach(marker => {
        try {
          marker.remove();
        } catch (e) {
          // Silently ignore if marker already removed
        }
      });
      cityMarkers.current = [];
      
      // Remove geocoder control from map before destroying map
      if (map.current && geocoder.current) {
        try {
          map.current.removeControl(geocoder.current as any);
        } catch (e) {
          // Silently ignore if control already removed
        }
      }
      
      // Finally, remove the map
      if (map.current) {
        try {
          map.current.remove();
        } catch (e) {
          // Silently ignore if map already removed
        }
      }
      
      // Clear references
      map.current = null;
      geocoder.current = null;
    };
  }, [mapboxToken, selectedZone, onZoneSelect, mapStyle]);

  // Handle map style changes
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    
    map.current.setStyle(MAP_STYLES[mapStyle]);
  }, [mapStyle]);

  // Toggle city markers visibility
  useEffect(() => {
    cityMarkers.current.forEach(marker => {
      const element = marker.getElement();
      if (showCityMarkers) {
        element.style.display = 'block';
      } else {
        element.style.display = 'none';
      }
    });
  }, [showCityMarkers]);

  if (loading) {
    return (
      <Card className="p-4">
        <p className="text-sm text-center text-muted-foreground">Loading map...</p>
      </Card>
    );
  }

  if (!mapboxToken) {
    return (
      <Card className="p-4">
        <p className="text-sm text-center text-destructive">
          Mapbox token not configured. Please add MAPBOX_PUBLIC_TOKEN to your secrets.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative h-[600px] rounded-lg overflow-hidden border shadow-lg">
        <div ref={mapContainer} className="absolute inset-0" />
        
        {/* Map Style Switcher */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={mapStyle === 'streets' ? 'default' : 'secondary'}
              onClick={() => setMapStyle('streets')}
              className="shadow-lg"
            >
              <Map className="h-4 w-4 mr-2" />
              Streets
            </Button>
            <Button
              size="sm"
              variant={mapStyle === 'satellite' ? 'default' : 'secondary'}
              onClick={() => setMapStyle('satellite')}
              className="shadow-lg"
            >
              <Satellite className="h-4 w-4 mr-2" />
              Satellite
            </Button>
            <Button
              size="sm"
              variant={mapStyle === 'terrain' ? 'default' : 'secondary'}
              onClick={() => setMapStyle('terrain')}
              className="shadow-lg"
            >
              <Mountain className="h-4 w-4 mr-2" />
              Terrain
            </Button>
          </div>
          
          <Button
            size="sm"
            variant={showCityMarkers ? 'default' : 'outline'}
            onClick={() => setShowCityMarkers(!showCityMarkers)}
            className="shadow-lg"
          >
            <MapPin className="h-4 w-4 mr-2" />
            {showCityMarkers ? 'Hide' : 'Show'} Cities
          </Button>
        </div>
      </div>

      {/* Zone Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {Object.entries(ZONE_INFO).map(([zone, info]) => (
          <button
            key={zone}
            onClick={() => onZoneSelect(zone)}
            className={`p-3 rounded-lg border-2 transition-all text-left hover:shadow-md ${
              selectedZone === zone
                ? "border-primary bg-primary/10 shadow-lg"
                : "border-border bg-card hover:border-primary/50"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-5 h-5 rounded shadow-sm border border-border/50"
                style={{ backgroundColor: ZONE_COLORS[zone as keyof typeof ZONE_COLORS] }}
              />
              <Badge variant={selectedZone === zone ? "default" : "outline"} className="text-xs font-semibold">
                Zone {zone}
              </Badge>
            </div>
            <p className="text-sm font-semibold mb-1">{info.name}</p>
            <p className="text-xs text-primary font-medium mb-1">{info.temp}</p>
            <p className="text-xs text-muted-foreground mb-2">{info.characteristics}</p>
            <p className="text-xs text-muted-foreground italic">
              e.g. {info.cities}
            </p>
          </button>
        ))}
      </div>

      {showReferenceMap && (
        <div className="bg-muted/50 rounded-lg p-4 border border-border space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              Official SANS 10400-XA Climatic Zones Reference
            </p>
            <Badge variant="outline">Regulatory Standard</Badge>
          </div>
          
          <div className="relative rounded-lg overflow-hidden border-2 border-border">
            <img 
              src="/images/sans-10400-xa-official-map.png" 
              alt="Official SANS 10400-XA Climatic Zones Map" 
              className="w-full h-auto"
            />
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong>How to use:</strong> Search for your city in the map above, or click on city markers to identify your zone.
            </p>
            <p>
              The interactive map includes {SA_CITIES_ZONES.length} major South African cities color-coded by climatic zone.
            </p>
            <p className="text-center pt-2">
              Cross-reference with the official map above to verify your selection.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
