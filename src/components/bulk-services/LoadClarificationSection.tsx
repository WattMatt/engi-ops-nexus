import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Zap, Building2, TrendingUp } from "lucide-react";
import { StaticZoneDisplay } from "./StaticZoneDisplay";

interface LoadClarificationSectionProps {
  documentId: string;
}

export const LoadClarificationSection = ({ documentId }: LoadClarificationSectionProps) => {
  const { data: document } = useQuery({
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

  const { data: project } = useQuery({
    queryKey: ["project", document?.project_id],
    queryFn: async () => {
      if (!document?.project_id) return null;
      
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", document.project_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!document?.project_id,
  });

  if (!document) return null;

  const vaPerSqm = document.building_calculation_type === 'sans_204' 
    ? (document.va_per_sqm || 0) 
    : document.building_calculation_type === 'sans_10142'
    ? 40
    : 25;

  const totalConnectedLoad = document.total_connected_load || 0;
  const maximumDemand = document.maximum_demand || 0;
  const diversityFactor = document.diversity_factor || 0.8;

  const climaticZoneNames: Record<string, string> = {
    '1': 'Cold Interior (Zone 1)',
    '2': 'Temperate Interior (Zone 2)',
    '3': 'Hot Interior (Zone 3)',
    '4': 'Temperate Coastal (Zone 4)',
    '5': 'Sub-tropical Coastal (Zone 5)',
    '6': 'Arid Interior (Zone 6)',
  };

  return (
    <div className="space-y-6">
      {/* Supply Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Supply Authority & Voltage Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Supply Authority</div>
            <div className="text-lg font-semibold">{document.supply_authority || 'Not specified'}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Primary Voltage</div>
            <div className="text-lg font-semibold">{document.primary_voltage || 'Not specified'}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Electrical Standard</div>
            <div className="text-lg font-semibold">{document.electrical_standard || 'SANS 10142-1'}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Connection Size</div>
            <div className="text-lg font-semibold">{document.connection_size || 'TBD'}</div>
          </div>
        </CardContent>
      </Card>

      {/* Load Calculation KPIs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Load Calculation Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Total Connected Load */}
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Total Connected Load</div>
              <div className="text-3xl font-bold text-primary">
                {(totalConnectedLoad / 1000).toFixed(2)}
                <span className="text-lg ml-1">kVA</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Based on {document.project_area?.toLocaleString()} m² @ {vaPerSqm} VA/m²
              </div>
            </div>

            {/* Diversity Factor */}
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Diversity Factor</div>
              <div className="text-3xl font-bold text-amber-600">
                {(diversityFactor * 100).toFixed(0)}
                <span className="text-lg ml-1">%</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Applied to calculate maximum demand
              </div>
            </div>

            {/* Maximum Demand */}
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Maximum Demand</div>
              <div className="text-3xl font-bold text-green-600">
                {(maximumDemand / 1000).toFixed(2)}
                <span className="text-lg ml-1">kVA</span>
              </div>
              <div className="text-xs text-muted-foreground">
                After diversity = {(totalConnectedLoad / 1000).toFixed(2)} × {diversityFactor}
              </div>
            </div>
          </div>

          {/* Visual Load Bar */}
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Load Utilization</span>
              <span className="font-medium">{((maximumDemand / totalConnectedLoad) * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full h-4 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                style={{ width: `${((maximumDemand / totalConnectedLoad) * 100).toFixed(1)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Building & Climate Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Building & Climate Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Project Area</div>
              <div className="text-lg font-semibold">{document.project_area?.toLocaleString() || 'N/A'} m²</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Calculation Method</div>
              <div className="text-lg font-semibold">
                {(document.building_calculation_type || 'sans_204').toUpperCase().replace('_', ' ')}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">VA per m²</div>
              <div className="text-lg font-semibold">{vaPerSqm} VA/m²</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Climatic Zone</div>
              <div className="text-lg font-semibold">
                {climaticZoneNames[document.climatic_zone || '3'] || 'Not specified'}
              </div>
            </div>
          </div>

          {/* Climatic Zone Display */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground mb-2">Climatic Zone</div>
            <StaticZoneDisplay selectedZone={document.climatic_zone || '3'} />
          </div>
        </CardContent>
      </Card>

      {/* Project Information */}
      {project && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Project Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Project:</span>{' '}
              <span className="font-medium">{project.name}</span>
            </div>
            {project.project_number && (
              <div className="text-sm">
                <span className="text-muted-foreground">Project Number:</span>{' '}
                <span className="font-medium">{project.project_number}</span>
              </div>
            )}
            {document.client_name && (
              <div className="text-sm">
                <span className="text-muted-foreground">Client:</span>{' '}
                <span className="font-medium">{document.client_name}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
