import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface ClimaticZoneMapProps {
  selectedZone: string;
  onZoneSelect: (zone: string) => void;
}

const ZONE_COLORS = {
  "1": "#3B82F6", // Blue - Cold Interior
  "2": "#EF4444", // Red - Hot Interior
  "3": "#10B981", // Green - Temperate Coastal
  "4": "#F59E0B", // Amber - Sub-tropical Coastal
  "5": "#8B5CF6", // Purple - Arid Interior
};

const ZONE_INFO = {
  "1": { name: "Cold Interior", cities: "Johannesburg, Bloemfontein" },
  "2": { name: "Hot Interior", cities: "Makhado, Nelspruit" },
  "3": { name: "Temperate Coastal", cities: "Cape Town, Port Elizabeth" },
  "4": { name: "Sub-tropical Coastal", cities: "East London, Durban" },
  "5": { name: "Arid Interior", cities: "Upington, Kimberley" },
};

// Approximate GeoJSON polygons for South African climatic zones
const ZONE_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { zone: "1", name: "Cold Interior" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [26.0, -27.0], [28.5, -27.0], [28.5, -29.5], [26.0, -29.5], [26.0, -27.0]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { zone: "2", name: "Hot Interior" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [29.0, -23.5], [31.5, -23.5], [31.5, -26.0], [29.0, -26.0], [29.0, -23.5]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { zone: "3", name: "Temperate Coastal" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [18.0, -34.5], [26.0, -34.5], [26.0, -32.0], [18.0, -32.0], [18.0, -34.5]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { zone: "4", name: "Sub-tropical Coastal" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [27.5, -30.5], [32.0, -30.5], [32.0, -27.5], [27.5, -27.5], [27.5, -30.5]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { zone: "5", name: "Arid Interior" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [20.0, -29.5], [24.0, -29.5], [24.0, -27.0], [20.0, -27.0], [20.0, -29.5]
        ]]
      }
    },
  ]
};

export const ClimaticZoneMap = ({ selectedZone, onZoneSelect }: ClimaticZoneMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      style: "mapbox://styles/mapbox/light-v11",
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

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, selectedZone, onZoneSelect]);

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
      </div>

      {/* Zone Legend */}
      <div className="grid grid-cols-5 gap-2">
        {Object.entries(ZONE_INFO).map(([zone, info]) => (
          <button
            key={zone}
            onClick={() => onZoneSelect(zone)}
            className={`p-2 rounded-lg border-2 transition-all text-left ${
              selectedZone === zone
                ? "border-primary bg-primary/10"
                : "border-transparent bg-muted hover:bg-muted/80"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: ZONE_COLORS[zone as keyof typeof ZONE_COLORS] }}
              />
              <Badge variant={selectedZone === zone ? "default" : "outline"} className="text-xs">
                Zone {zone}
              </Badge>
            </div>
            <p className="text-xs font-medium">{info.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{info.cities}</p>
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Click on a zone on the map or select from the legend below
      </p>
    </div>
  );
};
