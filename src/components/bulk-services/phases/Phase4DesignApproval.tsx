/**
 * Phase 4: Design & Approval
 * Technical review, network assessment, and formal approval process
 */

import { PhaseContentWrapper } from './PhaseContentWrapper';
import { BulkServicesDrawingMarkup } from '../BulkServicesDrawingMarkup';
import { SatelliteMarkup } from '../SatelliteMarkup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Satellite, ClipboardCheck, Network } from 'lucide-react';

interface Phase4DesignApprovalProps {
  documentId: string;
  phaseId: string;
  document: any;
}

export function Phase4DesignApproval({ 
  documentId, 
  phaseId, 
  document 
}: Phase4DesignApprovalProps) {
  const coordinates = document?.climatic_zone_lat && document?.climatic_zone_lng
    ? { lat: document.climatic_zone_lat, lng: document.climatic_zone_lng }
    : null;

  return (
    <PhaseContentWrapper
      phaseId={phaseId}
      phaseName="Design & Approval"
      phaseDescription="Technical review, network assessment, and formal approval process"
    >
      {/* Approval Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-blue-500" />
              Utility Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">Pending</div>
            <p className="text-xs text-muted-foreground mt-1">
              Utility engineers assess feasibility and grid impact
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Network className="h-4 w-4 text-green-500" />
              Network Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">Pending</div>
            <p className="text-xs text-muted-foreground mt-1">
              Feeder or substation upgrade evaluation
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-500" />
              Connection Agreement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">Pending</div>
            <p className="text-xs text-muted-foreground mt-1">
              Terms, tariffs, and responsibilities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Drawing and Site Layout Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Drawings & Site Layout</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="satellite" className="w-full">
            <TabsList className="mx-6 mt-2">
              <TabsTrigger value="satellite" className="flex items-center gap-2">
                <Satellite className="h-4 w-4" />
                Satellite Markup
              </TabsTrigger>
              <TabsTrigger value="drawing" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Drawing Markup
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="satellite" className="px-6 pb-6">
              <SatelliteMarkup 
                documentId={documentId}
                coordinates={coordinates}
                locationName={document?.climatic_zone_city || undefined}
              />
            </TabsContent>
            
            <TabsContent value="drawing" className="px-6 pb-6">
              <BulkServicesDrawingMarkup documentId={documentId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PhaseContentWrapper>
  );
}
