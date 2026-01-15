import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClimaticZoneMap } from "./ClimaticZoneMap";
import { toast } from "sonner";
import { findClosestCity } from "@/data/saCitiesZones";
import { MapPin, Building2, RefreshCw } from "lucide-react";

interface SANS204CalculatorProps {
  documentId: string;
  onZoneSelect?: (zone: string, city?: string, coordinates?: [number, number]) => void;
  onMunicipalityDetected?: (municipality: string, province: string) => void;
}

export const SANS204Calculator = ({ documentId, onZoneSelect, onMunicipalityDetected }: SANS204CalculatorProps) => {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [projectLocation, setProjectLocation] = useState<{ city?: string; lat?: number; lng?: number } | null>(null);
  const queryClient = useQueryClient();

  // Fetch the document to get the current zone, location, AND project details
  const { data: document, refetch: refetchDocument } = useQuery({
    queryKey: ["bulk-services-document", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bulk_services_documents")
        .select("climatic_zone, climatic_zone_city, climatic_zone_lng, climatic_zone_lat, project_id")
        .eq("id", documentId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch project location to auto-populate if document has no location
  const { data: project } = useQuery({
    queryKey: ["project-location", document?.project_id],
    queryFn: async () => {
      if (!document?.project_id) return null;
      const { data, error } = await supabase
        .from("projects")
        .select("city, latitude, longitude, name")
        .eq("id", document.project_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!document?.project_id,
  });

  // Auto-initialize from project location if document has coordinates but no zone
  useEffect(() => {
    const autoInitializeZone = async () => {
      // If document has lat/lng but no zone, auto-detect the zone
      if (document?.climatic_zone_lat && document?.climatic_zone_lng && !document?.climatic_zone) {
        const closestCity = findClosestCity(document.climatic_zone_lng, document.climatic_zone_lat);
        if (closestCity) {
          // Auto-save the zone
          const { error } = await supabase
            .from("bulk_services_documents")
            .update({ 
              climatic_zone: closestCity.zone,
              climatic_zone_city: document.climatic_zone_city || closestCity.city,
            })
            .eq("id", documentId);
          
          if (!error) {
            setSelectedZone(closestCity.zone);
            toast.success(`Auto-detected Zone ${closestCity.zone} from project location`);
            refetchDocument();
          }
        }
      }
      // If document has no location at all, try to get from project
      else if (!document?.climatic_zone_lat && !document?.climatic_zone_lng && project?.latitude && project?.longitude) {
        const closestCity = findClosestCity(project.longitude, project.latitude);
        if (closestCity) {
          // Auto-save from project location
          const { error } = await supabase
            .from("bulk_services_documents")
            .update({ 
              climatic_zone: closestCity.zone,
              climatic_zone_city: project.city || closestCity.city,
              climatic_zone_lat: project.latitude,
              climatic_zone_lng: project.longitude,
            })
            .eq("id", documentId);
          
          if (!error) {
            setSelectedZone(closestCity.zone);
            setProjectLocation({ city: project.city, lat: project.latitude, lng: project.longitude });
            toast.success(`Location transferred from project: ${project.city || closestCity.city} (Zone ${closestCity.zone})`);
            refetchDocument();
          }
        }
      }
    };

    if (document) {
      autoInitializeZone();
    }
  }, [document, project, documentId, refetchDocument]);

  // Initialize selected zone from document
  useEffect(() => {
    if (document?.climatic_zone) {
      setSelectedZone(document.climatic_zone);
    }
  }, [document]);

  // Track project location for display
  useEffect(() => {
    if (project?.latitude && project?.longitude) {
      setProjectLocation({ city: project.city, lat: project.latitude, lng: project.longitude });
    }
  }, [project]);

  const handleSyncFromProject = async () => {
    if (!project?.latitude || !project?.longitude) {
      toast.error("Project has no location set. Please set the location in the Projects tab first.");
      return;
    }

    const closestCity = findClosestCity(project.longitude, project.latitude);
    if (closestCity) {
      try {
        const { error } = await supabase
          .from("bulk_services_documents")
          .update({ 
            climatic_zone: closestCity.zone,
            climatic_zone_city: project.city || closestCity.city,
            climatic_zone_lat: project.latitude,
            climatic_zone_lng: project.longitude,
          })
          .eq("id", documentId);
        
        if (error) throw error;
        
        setSelectedZone(closestCity.zone);
        setProjectLocation({ city: project.city, lat: project.latitude, lng: project.longitude });
        toast.success(`Synced from project: ${project.city || closestCity.city} (Zone ${closestCity.zone})`);
        refetchDocument();
        onZoneSelect?.(closestCity.zone, project.city || closestCity.city, [project.longitude, project.latitude]);
      } catch (error: any) {
        console.error("Error syncing from project:", error);
        toast.error("Failed to sync location from project");
      }
    } else {
      toast.error("Could not determine climatic zone from project location");
    }
  };

  const handleZoneSelect = async (zone: string, city?: string, coordinates?: [number, number]) => {
    setSelectedZone(zone);
    onZoneSelect?.(zone, city, coordinates);
    
    // Save the zone selection AND location to the database
    try {
      const updateData: any = { climatic_zone: zone };
      
      if (city && coordinates) {
        updateData.climatic_zone_city = city;
        updateData.climatic_zone_lng = coordinates[0];
        updateData.climatic_zone_lat = coordinates[1];
      }
      
      const { error } = await supabase
        .from("bulk_services_documents")
        .update(updateData)
        .eq("id", documentId);

      if (error) throw error;
      toast.success(`${city || `Zone ${zone}`} selected and saved`);
      refetchDocument();
    } catch (error: any) {
      console.error("Error saving zone:", error);
      toast.error("Failed to save zone selection");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Select Climatic Zone</CardTitle>
            {projectLocation?.city && (
              <CardDescription className="flex items-center gap-2 mt-1">
                <Building2 className="h-4 w-4" />
                Project Location: {projectLocation.city}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            {project?.latitude && project?.longitude && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncFromProject}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Sync from Project
              </Button>
            )}
            {document?.climatic_zone_city && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {document.climatic_zone_city}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ClimaticZoneMap
          onZoneSelect={handleZoneSelect}
          selectedZone={selectedZone}
          selectedCity={document?.climatic_zone_city}
          selectedCoordinates={
            document?.climatic_zone_lng && document?.climatic_zone_lat
              ? [Number(document.climatic_zone_lng), Number(document.climatic_zone_lat)]
              : undefined
          }
          onMunicipalityDetected={onMunicipalityDetected}
        />
      </CardContent>
    </Card>
  );
};
