import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Layers, Settings } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";

interface BulkServicesWidgetProps {
  projectId: string;
}

export const BulkServicesWidget = ({ projectId }: BulkServicesWidgetProps) => {
  const navigate = useNavigate();

  // Check project baseline parameters
  const { data: projectData } = useQuery({
    queryKey: ["project-baseline-check", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("primary_voltage, connection_size, supply_authority, electrical_standard, diversity_factor, load_category, tariff_structure")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Get bulk services documents with their sections
  const { data: documents } = useQuery({
    queryKey: ["bulk-services-check", projectId],
    queryFn: async () => {
      const { data: docs, error: docsError } = await supabase
        .from("bulk_services_documents")
        .select("*")
        .eq("project_id", projectId);

      if (docsError) throw docsError;

      if (!docs || docs.length === 0) return [];

      // Get sections for each document
      const docsWithSections = await Promise.all(
        docs.map(async (doc) => {
          const { data: sections, error: sectionsError } = await supabase
            .from("bulk_services_sections")
            .select("*")
            .eq("document_id", doc.id);

          if (sectionsError) throw sectionsError;

          return {
            ...doc,
            sections: sections || [],
          };
        })
      );

      return docsWithSections;
    },
    enabled: !!projectId,
  });

  // Check for missing baseline parameters
  const getMissingParameters = () => {
    if (!projectData) return [];

    const parameters = [
      { key: "primary_voltage", label: "Primary Voltage" },
      { key: "connection_size", label: "Connection Size" },
      { key: "supply_authority", label: "Supply Authority" },
      { key: "electrical_standard", label: "Electrical Standard" },
      { key: "diversity_factor", label: "Diversity Factor" },
      { key: "load_category", label: "Load Category" },
      { key: "tariff_structure", label: "Tariff Structure" },
    ];

    return parameters.filter((param) => !projectData[param.key as keyof typeof projectData]);
  };

  // Check for incomplete documents
  const getIncompleteDocuments = () => {
    if (!documents) return [];

    return documents.filter((doc) => {
      // Check if document has missing baseline data
      const hasMissingBaseline = !doc.primary_voltage || !doc.connection_size || !doc.supply_authority;

      // Check if document has missing calculations
      const hasMissingCalculations = !doc.total_connected_load || !doc.maximum_demand;

      // Check if any section is empty
      const hasEmptySections = doc.sections?.some((section: any) => !section.content || section.content.trim() === "");

      return hasMissingBaseline || hasMissingCalculations || hasEmptySections;
    });
  };

  const missingParameters = getMissingParameters();
  const incompleteDocuments = getIncompleteDocuments();
  const totalIssues = missingParameters.length + incompleteDocuments.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Bulk Services Status
            {totalIssues > 0 && <Badge variant="destructive">{totalIssues}</Badge>}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard/bulk-services")}
          >
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {totalIssues === 0 ? (
          <div className="flex flex-col items-center justify-center py-6">
            <CheckCircle2 className="h-12 w-12 text-green-600 mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              All baseline parameters configured and documents complete!
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-4">
              {/* Missing Baseline Parameters */}
              {missingParameters.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Settings className="h-4 w-4 text-orange-600" />
                      Missing Baseline Parameters ({missingParameters.length})
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/dashboard/project-settings")}
                    >
                      Configure
                    </Button>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-md border border-orange-200">
                    <p className="text-xs text-muted-foreground mb-2">
                      Complete these parameters in Project Settings for accurate document generation:
                    </p>
                    <div className="space-y-1">
                      {missingParameters.map((param) => (
                        <div key={param.key} className="flex items-center gap-2 text-xs">
                          <AlertTriangle className="h-3 w-3 text-orange-600" />
                          <span>{param.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Incomplete Documents */}
              {incompleteDocuments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Incomplete Documents ({incompleteDocuments.length})
                  </h4>
                  <div className="space-y-2">
                    {incompleteDocuments.map((doc) => {
                      const hasMissingBaseline = !doc.primary_voltage || !doc.connection_size || !doc.supply_authority;
                      const hasMissingCalculations = !doc.total_connected_load || !doc.maximum_demand;
                      const emptySectionsCount = doc.sections?.filter(
                        (s: any) => !s.content || s.content.trim() === ""
                      ).length || 0;

                      return (
                        <div
                          key={doc.id}
                          className="p-3 bg-amber-50 rounded-md border border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors"
                          onClick={() => navigate("/dashboard/bulk-services")}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <p className="font-medium text-sm">{doc.document_number}</p>
                            <Badge variant="outline" className="text-xs">
                              {new Date(doc.document_date).toLocaleDateString()}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            {hasMissingBaseline && (
                              <div className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                <span>Missing baseline data</span>
                              </div>
                            )}
                            {hasMissingCalculations && (
                              <div className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                <span>Missing load calculations</span>
                              </div>
                            )}
                            {emptySectionsCount > 0 && (
                              <div className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                <span>{emptySectionsCount} empty section{emptySectionsCount > 1 ? 's' : ''}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Summary Stats */}
              {documents && documents.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Total Documents:</span>
                    <span className="font-medium">{documents.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <span>Complete Documents:</span>
                    <span className="font-medium text-green-600">
                      {documents.length - incompleteDocuments.length}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
