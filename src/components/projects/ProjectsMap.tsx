import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, X, Navigation } from "lucide-react";
import { toast } from "sonner";

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

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  completed: "#3b82f6",
  on_hold: "#f59e0b",
  cancelled: "#ef4444",
  planning: "#8b5cf6",
};

export const ProjectsMap = ({ projects, onProjectSelect, onLocationUpdate }: ProjectsMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [placingPin, setPlacingPin] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets');

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

    // Handle click for placing pins
    map.current.on("click", async (e) => {
      if (placingPin) {
        const { lng, lat } = e.lngLat;
        
        try {
          const { error } = await supabase
            .from("projects")
            .update({ latitude: lat, longitude: lng })
            .eq("id", placingPin);

          if (error) throw error;

          toast.success("Project location saved!");
          onLocationUpdate?.(placingPin, lat, lng);
          setPlacingPin(null);
        } catch (error) {
          console.error("Error saving location:", error);
          toast.error("Failed to save location");
        }
      }
    });

    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      map.current?.remove();
    };
  }, [mapboxToken]);

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
        const color = STATUS_COLORS[project.status] || "#6b7280";
        
        // Create custom marker element
        const el = document.createElement("div");
        el.className = "project-marker";
        el.innerHTML = `
          <div style="
            width: 32px;
            height: 32px;
            background: ${color};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s;
          ">
            <span style="color: white; font-size: 12px; font-weight: bold;">
              ${project.project_number.slice(-2)}
            </span>
          </div>
        `;
        el.style.cursor = "pointer";

        el.addEventListener("mouseenter", () => {
          el.querySelector("div")!.style.transform = "scale(1.2)";
        });
        el.addEventListener("mouseleave", () => {
          el.querySelector("div")!.style.transform = "scale(1)";
        });

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px 12px; min-width: 180px;">
            <strong style="font-size: 14px;">${project.name}</strong><br/>
            <span style="color: #666; font-size: 12px;">${project.project_number}</span><br/>
            ${project.city ? `<span style="color: #888; font-size: 11px;">${project.city}${project.province ? `, ${project.province}` : ''}</span><br/>` : ''}
            <span style="
              display: inline-block;
              margin-top: 6px;
              padding: 2px 8px;
              background: ${color}20;
              color: ${color};
              border-radius: 4px;
              font-size: 11px;
              font-weight: 500;
              text-transform: capitalize;
            ">${project.status.replace('_', ' ')}</span>
            <button 
              onclick="window.selectProject('${project.id}')"
              style="
                display: block;
                width: 100%;
                margin-top: 8px;
                padding: 6px 12px;
                background: hsl(var(--primary));
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
              "
            >Open Project</button>
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

  if (loading) {
    return (
      <Card className="h-[500px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (!mapboxToken) {
    return (
      <Card className="h-[500px] flex items-center justify-center">
        <p className="text-muted-foreground">Unable to load map</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Map style toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={mapStyle === 'streets' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMapStyle('streets')}
          >
            Streets
          </Button>
          <Button
            variant={mapStyle === 'satellite' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMapStyle('satellite')}
          >
            Satellite
          </Button>
        </div>

        {/* Status legend */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-muted-foreground capitalize">
                {status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Card className="relative overflow-hidden">
        <div 
          ref={mapContainer} 
          className="h-[500px] w-full"
          style={{ cursor: placingPin ? 'crosshair' : 'grab' }}
        />

        {/* Pin placement mode indicator */}
        {placingPin && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-10">
            <MapPin className="h-4 w-4" />
            <span className="text-sm font-medium">Click on the map to place pin</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-primary-foreground/20"
              onClick={() => setPlacingPin(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </Card>

      {/* Projects without location */}
      {projectsWithoutLocation.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Navigation className="h-4 w-4 text-muted-foreground" />
            Projects without location ({projectsWithoutLocation.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {projectsWithoutLocation.map(project => (
              <Button
                key={project.id}
                variant={placingPin === project.id ? "default" : "outline"}
                size="sm"
                onClick={() => setPlacingPin(placingPin === project.id ? null : project.id)}
                className="gap-2"
              >
                <MapPin className="h-3 w-3" />
                {project.project_number} - {project.name}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Click a project button, then click on the map to set its location
          </p>
        </Card>
      )}
    </div>
  );
};
