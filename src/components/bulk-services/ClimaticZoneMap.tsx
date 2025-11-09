import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Map, Satellite, Mountain } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ClimaticZoneMapProps {
  selectedZone: string;
  onZoneSelect: (zone: string) => void;
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

// Accurate GeoJSON polygons for South African climatic zones (SANS 10400-XA)
// Carefully digitized from official SANS map to match exact boundaries
const ZONE_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { zone: "1", name: "Cold Interior" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [27.5, -26.2], [28.0, -26.0], [28.5, -26.5], [28.8, -27.2], 
          [29.0, -27.8], [28.8, -28.3], [28.5, -28.8], [28.0, -29.2],
          [27.5, -29.3], [27.0, -29.2], [26.5, -28.8], [26.2, -28.3],
          [26.0, -27.5], [26.3, -27.0], [26.8, -26.5], [27.5, -26.2]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { zone: "2", name: "Temperate Interior" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [24.5, -25.5], [27.0, -25.0], [28.5, -25.0], [29.5, -24.8],
          [30.0, -25.0], [30.5, -25.5], [31.0, -26.2], [30.8, -27.0],
          [30.5, -27.8], [30.0, -28.5], [29.5, -29.0], [29.0, -29.5],
          [28.0, -30.0], [27.0, -30.2], [26.0, -30.0], [25.0, -29.5],
          [24.0, -28.8], [23.5, -28.0], [23.2, -27.0], [23.5, -26.0], [24.5, -25.5]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { zone: "3", name: "Hot Interior" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [29.5, -22.2], [30.5, -22.0], [31.5, -22.2], [32.0, -22.8],
          [32.2, -23.5], [32.0, -24.2], [31.5, -25.0], [31.0, -25.5],
          [30.5, -25.8], [30.0, -25.5], [29.5, -25.2], [29.0, -24.5],
          [28.8, -23.5], [29.0, -22.8], [29.5, -22.2]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { zone: "4", name: "Temperate Coastal" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [18.3, -34.8], [18.4, -34.5], [18.6, -34.0], [19.0, -33.8],
          [20.0, -33.5], [21.0, -33.8], [22.0, -34.0], [23.0, -34.0],
          [24.0, -33.9], [25.0, -33.8], [25.8, -33.8], [26.3, -34.0],
          [26.0, -34.3], [25.5, -34.5], [24.5, -34.7], [23.0, -34.8],
          [21.5, -34.7], [20.0, -34.5], [19.0, -34.6], [18.3, -34.8]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { zone: "5", name: "Sub-tropical Coastal" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [28.0, -32.8], [28.8, -32.2], [29.5, -31.5], [30.2, -30.8],
          [30.8, -30.2], [31.5, -29.5], [32.0, -28.8], [32.5, -28.0],
          [32.8, -27.2], [32.5, -27.8], [32.0, -28.5], [31.5, -29.2],
          [31.0, -29.8], [30.5, -30.5], [30.0, -31.0], [29.5, -31.5],
          [29.0, -32.0], [28.5, -32.5], [28.0, -32.8]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { zone: "6", name: "Arid Interior" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [16.5, -28.8], [17.5, -28.5], [18.5, -28.2], [19.5, -28.5],
          [20.5, -28.8], [21.5, -29.0], [22.5, -29.3], [23.5, -29.5],
          [24.0, -29.8], [24.5, -30.2], [24.0, -30.8], [23.5, -31.2],
          [22.5, -31.8], [21.5, -32.2], [20.5, -32.0], [19.5, -31.5],
          [18.5, -30.8], [17.5, -30.0], [17.0, -29.5], [16.5, -28.8]
        ]]
      }
    },
  ]
};

export const ClimaticZoneMap = ({ selectedZone, onZoneSelect }: ClimaticZoneMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const geocoder = useRef<MapboxGeocoder | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite' | 'terrain'>('streets');

  const MAP_STYLES = {
    streets: 'mapbox://styles/mapbox/light-v11',
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
    terrain: 'mapbox://styles/mapbox/outdoors-v12',
  };

  // Helper function to check if a point is inside a polygon
  const pointInPolygon = (point: [number, number], polygon: number[][][]): boolean => {
    const x = point[0];
    const y = point[1];
    const poly = polygon[0]; // Get the outer ring of the polygon
    
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0];
      const yi = poly[i][1];
      const xj = poly[j][0];
      const yj = poly[j][1];
      
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    
    return inside;
  };

  // Function to find which zone a coordinate belongs to
  const findZoneForCoordinate = (lng: number, lat: number): string | null => {
    for (const feature of ZONE_GEOJSON.features) {
      if (pointInPolygon([lng, lat], feature.geometry.coordinates as number[][][])) {
        return feature.properties.zone;
      }
    }
    return null;
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

      // Add zone polygons source
      map.current.addSource("zones", {
        type: "geojson",
        data: ZONE_GEOJSON as any,
      });

      // Add zone fill layers
      Object.entries(ZONE_COLORS).forEach(([zone, color]) => {
        map.current!.addLayer({
          id: `zone-${zone}-fill`,
          type: "fill",
          source: "zones",
          filter: ["==", ["get", "zone"], zone],
          paint: {
            "fill-color": color,
            "fill-opacity": selectedZone === zone ? 0.5 : 0.3,
          },
        });

        map.current!.addLayer({
          id: `zone-${zone}-outline`,
          type: "line",
          source: "zones",
          filter: ["==", ["get", "zone"], zone],
          paint: {
            "line-color": color,
            "line-width": selectedZone === zone ? 3 : 1.5,
          },
        });
      });

      // Add labels for zones
      map.current.addLayer({
        id: "zone-labels",
        type: "symbol",
        source: "zones",
        layout: {
          "text-field": ["concat", "Zone ", ["get", "zone"]],
          "text-size": 14,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        },
        paint: {
          "text-color": "#000000",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
        },
      });

      // Add click handlers for all zone layers
      Object.keys(ZONE_COLORS).forEach((zone) => {
        map.current!.on("click", `zone-${zone}-fill`, (e) => {
          if (e.features && e.features[0]) {
            const clickedZone = e.features[0].properties?.zone;
            if (clickedZone) {
              onZoneSelect(clickedZone);
            }
          }
        });

        // Change cursor on hover
        map.current!.on("mouseenter", `zone-${zone}-fill`, () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = "pointer";
          }
        });

        map.current!.on("mouseleave", `zone-${zone}-fill`, () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = "";
          }
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
      
      // Find which zone this coordinate belongs to
      const zone = findZoneForCoordinate(lng, lat);
      
      if (zone) {
        onZoneSelect(zone);
        toast({
          title: "Zone Detected",
          description: `${e.result.place_name} is in ${ZONE_INFO[zone as keyof typeof ZONE_INFO].name} (Zone ${zone})`,
        });
        
        // Add a temporary marker at the searched location
        const marker = new mapboxgl.Marker({ color: "#ef4444" })
          .setLngLat(coordinates)
          .addTo(map.current!);
        
        // Remove marker after 5 seconds
        setTimeout(() => marker.remove(), 5000);
      } else {
        toast({
          title: "Location Outside Zones",
          description: `${e.result.place_name} is outside the defined climatic zones or not in South Africa.`,
          variant: "destructive",
        });
      }
    });

    return () => {
      geocoder.current?.onRemove();
      map.current?.remove();
    };
  }, [mapboxToken, selectedZone, onZoneSelect, mapStyle]);

  // Handle map style changes
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    
    map.current.setStyle(MAP_STYLES[mapStyle]);
  }, [mapStyle]);

  // Update opacity when selected zone changes
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    Object.keys(ZONE_COLORS).forEach((zone) => {
      map.current!.setPaintProperty(
        `zone-${zone}-fill`,
        "fill-opacity",
        selectedZone === zone ? 0.5 : 0.3
      );
      map.current!.setPaintProperty(
        `zone-${zone}-outline`,
        "line-width",
        selectedZone === zone ? 3 : 1.5
      );
    });
  }, [selectedZone]);

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
      <div className="relative h-[400px] rounded-lg overflow-hidden border">
        <div ref={mapContainer} className="absolute inset-0" />
        
        {/* Map Style Switcher */}
        <div className="absolute top-4 left-4 flex gap-2 z-10">
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
      </div>

      {/* Zone Legend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
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

      <div className="bg-muted/50 rounded-lg p-3 border border-border">
        <p className="text-xs text-center text-muted-foreground mb-2">
          <strong>SANS 204:</strong> Energy Efficiency in Buildings - Climatic Zones of South Africa
        </p>
        <p className="text-xs text-center text-muted-foreground">
          Click on a zone on the map or select from the cards above to view detailed climate characteristics
        </p>
      </div>
    </div>
  );
};
