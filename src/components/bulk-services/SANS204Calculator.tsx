import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClimaticZoneMap } from "./ClimaticZoneMap";
import { toast } from "sonner";

interface SANS204CalculatorProps {
  documentId: string;
  onZoneSelect?: (zone: string) => void;
}

export const SANS204Calculator = ({ documentId, onZoneSelect }: SANS204CalculatorProps) => {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  // Fetch the document to get the current zone
  const { data: document } = useQuery({
    queryKey: ["bulk-services-document", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bulk_services_documents")
        .select("climatic_zone")
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

  const handleZoneSelect = async (zone: string) => {
    setSelectedZone(zone);
    onZoneSelect?.(zone);
    
    // Save the zone selection to the database
    try {
      const { error } = await supabase
        .from("bulk_services_documents")
        .update({ climatic_zone: zone })
        .eq("id", documentId);

      if (error) throw error;
      toast.success(`Zone ${zone} selected and saved`);
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
        />
      </CardContent>
    </Card>
  );
};
