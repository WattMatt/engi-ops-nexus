import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClimaticZoneMap } from "./ClimaticZoneMap";
import { toast } from "sonner";

interface SANS204CalculatorProps {
  documentId: string;
  onZoneSelect?: (zone: string, city?: string, coordinates?: [number, number]) => void;
}

export const SANS204Calculator = ({ documentId, onZoneSelect }: SANS204CalculatorProps) => {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  // Fetch the document to get the current zone and location
  const { data: document } = useQuery({
    queryKey: ["bulk-services-document", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bulk_services_documents")
        .select("climatic_zone, climatic_zone_city, climatic_zone_lng, climatic_zone_lat")
        .eq("id", documentId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Initialize selected zone from document
  useEffect(() => {
    if (document?.climatic_zone) {
      setSelectedZone(document.climatic_zone);
    }
  }, [document]);

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
    } catch (error: any) {
      console.error("Error saving zone:", error);
      toast.error("Failed to save zone selection");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Select Climatic Zone</CardTitle>
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
        />
      </CardContent>
    </Card>
  );
};
