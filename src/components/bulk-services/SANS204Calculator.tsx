import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClimaticZoneMap } from "./ClimaticZoneMap";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import html2canvas from "html2canvas";

interface SANS204CalculatorProps {
  documentId: string;
  onZoneSelect?: (zone: string, city?: string, coordinates?: [number, number]) => void;
}

export const SANS204Calculator = ({ documentId, onZoneSelect }: SANS204CalculatorProps) => {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

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

  const handleCaptureMap = async () => {
    if (!mapContainerRef.current || !selectedZone) {
      toast.error("Please select a zone first");
      return;
    }

    setCapturing(true);
    try {
      // Capture the map as canvas
      const canvas = await html2canvas(mapContainerRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });

      // Upload to Supabase storage
      const fileName = `map-snapshot-${documentId}-${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('bulk_services_drawings')
        .upload(fileName, blob, {
          contentType: 'image/png',
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('bulk_services_drawings')
        .getPublicUrl(fileName);

      // Check if a "Climatic Zone Map" section exists
      const { data: existingSections } = await supabase
        .from('bulk_services_sections')
        .select('*')
        .eq('document_id', documentId)
        .eq('section_title', 'Climatic Zone Map');

      if (existingSections && existingSections.length > 0) {
        // Update existing section
        const { error: updateError } = await supabase
          .from('bulk_services_sections')
          .update({
            content: `![Climatic Zone Map](${urlData.publicUrl})\n\nSelected Location: ${document?.climatic_zone_city || 'Zone ' + selectedZone}\n\nThis map shows the selected climatic zone location for the project, which is used for calculating building services requirements according to SANS 204.`,
          })
          .eq('id', existingSections[0].id);

        if (updateError) throw updateError;
      } else {
        // Create new section
        const { data: maxSection } = await supabase
          .from('bulk_services_sections')
          .select('section_number')
          .eq('document_id', documentId)
          .order('section_number', { ascending: false })
          .limit(1);

        const nextSectionNumber = (maxSection && maxSection.length > 0 
          ? Number(maxSection[0].section_number) + 1 
          : 1).toString();

        const { error: createError } = await supabase
          .from('bulk_services_sections')
          .insert([{
            document_id: documentId,
            section_number: nextSectionNumber,
            section_title: 'Climatic Zone Map',
            content: `![Climatic Zone Map](${urlData.publicUrl})\n\nSelected Location: ${document?.climatic_zone_city || 'Zone ' + selectedZone}\n\nThis map shows the selected climatic zone location for the project, which is used for calculating building services requirements according to SANS 204.`,
            sort_order: Number(nextSectionNumber),
          }]);

        if (createError) throw createError;
      }

      toast.success("Map snapshot saved to sections!");
    } catch (error: any) {
      console.error("Error capturing map:", error);
      toast.error("Failed to capture map snapshot");
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Select Climatic Zone</CardTitle>
          <Button
            onClick={handleCaptureMap}
            disabled={capturing || !selectedZone}
            size="sm"
          >
            <Camera className="mr-2 h-4 w-4" />
            {capturing ? "Capturing..." : "Save Map to Sections"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={mapContainerRef}>
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
        </div>
      </CardContent>
    </Card>
  );
};
