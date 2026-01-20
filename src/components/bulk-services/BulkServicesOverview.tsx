import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Satellite, ClipboardList } from "lucide-react";
import { BulkServicesHeader } from "./BulkServicesHeader";
import { BulkServicesSections } from "./BulkServicesSections";
import { BulkServicesExportPDFButton } from "./BulkServicesExportPDFButton";
import { BulkServicesSavedReportsList } from "./BulkServicesSavedReportsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { BulkServicesSettingsOverview } from "./BulkServicesSettingsOverview";
import { BulkServicesKPICard } from "./BulkServicesKPICard";
import { SANS204Calculator } from "./SANS204Calculator";
import { BulkServicesDrawingMarkup } from "./BulkServicesDrawingMarkup";
import { SatelliteMarkup } from "./SatelliteMarkup";
import { WorkflowDashboard } from "./workflow";
interface BulkServicesOverviewProps {
  documentId: string;
  onBack: () => void;
}

export const BulkServicesOverview = ({ documentId, onBack }: BulkServicesOverviewProps) => {
  const [activeTab, setActiveTab] = useState("workflow");
  const [reportsRefreshTrigger, setReportsRefreshTrigger] = useState(0);
  const [mapSelectedZone, setMapSelectedZone] = useState<string | null>(null);
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [detectedMunicipality, setDetectedMunicipality] = useState<string | null>(null);
  const [detectedProvince, setDetectedProvince] = useState<string | null>(null);

  // Handler for workflow navigation to other tabs
  const handleNavigateToTab = (tabId: string) => {
    setActiveTab(tabId);
  };
  
  const { data: document, isLoading } = useQuery({
    queryKey: ["bulk-services-document", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bulk_services_documents")
        .select("*")
        .eq("id", documentId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: sections } = useQuery({
    queryKey: ["bulk-services-sections", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bulk_services_sections")
        .select("*")
        .eq("document_id", documentId)
        .order("sort_order");

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-center text-muted-foreground">Document not found</p>
      </div>
    );
  }

  const handleZoneSelect = (zone: string) => {
    setMapSelectedZone(zone);
  };

  const handleMunicipalityDetected = (municipality: string, province: string) => {
    setDetectedMunicipality(municipality);
    setDetectedProvince(province);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <BulkServicesExportPDFButton
          documentId={documentId}
          onReportSaved={() => setReportsRefreshTrigger(prev => prev + 1)}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="workflow" className="flex items-center gap-1.5">
            <ClipboardList className="h-4 w-4" />
            Workflow
          </TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="map">Zone Map</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="markup">Drawing Markup</TabsTrigger>
          <TabsTrigger value="saved-reports">Saved Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="space-y-4">
          <WorkflowDashboard 
            documentId={documentId} 
            document={document}
            onNavigateToTab={handleNavigateToTab}
          />
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <BulkServicesKPICard documentId={documentId} mapSelectedZone={mapSelectedZone} />
          
          <Card>
            <CardHeader>
              <CardTitle>Settings & Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <BulkServicesSettingsOverview
                documentId={documentId}
                currentCalculationType={document?.building_calculation_type}
                currentCity={document?.climatic_zone_city}
                detectedMunicipality={detectedMunicipality}
                detectedProvince={detectedProvince}
                savedTariffId={document?.tariff_structure}
                savedMunicipalityName={document?.supply_authority}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          <SANS204Calculator 
            documentId={documentId} 
            onZoneSelect={handleZoneSelect}
            onMunicipalityDetected={handleMunicipalityDetected}
          />
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Details</CardTitle>
            </CardHeader>
            <CardContent>
              <BulkServicesHeader document={document} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Sections</CardTitle>
            </CardHeader>
            <CardContent>
              <BulkServicesSections
                documentId={documentId}
                sections={sections || []}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="markup" className="space-y-4">
          <Tabs defaultValue="satellite" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="satellite" className="flex items-center gap-2">
                <Satellite className="h-4 w-4" />
                Satellite Markup
              </TabsTrigger>
              <TabsTrigger value="drawing" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Drawing Markup
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="satellite">
              <SatelliteMarkup 
                documentId={documentId}
                coordinates={
                  document?.climatic_zone_lat && document?.climatic_zone_lng
                    ? { lat: document.climatic_zone_lat, lng: document.climatic_zone_lng }
                    : null
                }
                locationName={document?.climatic_zone_city || undefined}
              />
            </TabsContent>
            
            <TabsContent value="drawing">
              <BulkServicesDrawingMarkup documentId={documentId} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="saved-reports" className="space-y-4">
          <BulkServicesSavedReportsList 
            key={reportsRefreshTrigger}
            documentId={documentId} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
