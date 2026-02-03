/**
 * Hook to calculate handover document completion progress for tenants
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TENANT_DOCUMENT_TYPES = [
  "electrical_coc",
  "as_built_drawing", 
  "line_diagram",
  "qc_inspection_report",
  "lighting_guarantee",
  "db_guarantee",
  // Phase 1: New electrical document types
  "cable_certificate",
  "metering_certificate",
  "earth_continuity_test",
  "insulation_resistance_test",
  "loop_impedance_test",
  "rcd_test_certificate",
  "tenant_load_schedule",
];

export interface TenantProgress {
  tenantId: string;
  completedCount: number;
  totalCount: number;
  percentage: number;
  isComplete: boolean;
}

export function useTenantHandoverProgress(projectId: string, tenantIds: string[]) {
  return useQuery({
    queryKey: ["tenant-handover-progress", projectId, tenantIds],
    queryFn: async () => {
      if (!tenantIds.length) return {};

      // Fetch all documents for these tenants
      const { data: documents, error: docError } = await supabase
        .from("handover_documents" as any)
        .select("source_id, document_type")
        .eq("project_id", projectId)
        .eq("source_type", "tenant")
        .in("source_id", tenantIds);

      if (docError) throw docError;

      // Fetch all exclusions (by tenant markings)
      const { data: exclusions, error: exclError } = await supabase
        .from("handover_document_exclusions" as any)
        .select("tenant_id, document_type")
        .in("tenant_id", tenantIds);

      if (exclError) throw exclError;

      // Calculate progress for each tenant
      const progressMap: Record<string, TenantProgress> = {};

      tenantIds.forEach((tenantId) => {
        const tenantDocs = documents?.filter((d: any) => d.source_id === tenantId) || [];
        const tenantExclusions = exclusions?.filter((e: any) => e.tenant_id === tenantId) || [];

        const completedTypes = new Set<string>();

        TENANT_DOCUMENT_TYPES.forEach((type) => {
          const hasDocument = tenantDocs.some((d: any) => d.document_type === type);
          const hasExclusion = tenantExclusions.some((e: any) => e.document_type === type);
          if (hasDocument || hasExclusion) {
            completedTypes.add(type);
          }
        });

        const completedCount = completedTypes.size;
        const totalCount = TENANT_DOCUMENT_TYPES.length;
        const percentage = Math.round((completedCount / totalCount) * 100);

        progressMap[tenantId] = {
          tenantId,
          completedCount,
          totalCount,
          percentage,
          isComplete: percentage === 100,
        };
      });

      return progressMap;
    },
    enabled: tenantIds.length > 0,
    refetchOnWindowFocus: false,
  });
}
