import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHandoverLinkStatus } from "./useHandoverLinkStatus";

interface CompletionBreakdown {
  tenantSchedule: number;
  handoverDocs: number;
  handoverLinks: number;
  beneficialOccupation: number;
  bulkServices: number;
  documentation: number;
}

interface ProjectCompletion {
  overall: number;
  breakdown: CompletionBreakdown;
  isLoading: boolean;
}

export const useProjectCompletion = (projectId: string): ProjectCompletion => {
  const { data: linkStatus } = useHandoverLinkStatus(projectId);

  // Fetch tenants for schedule completion
  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Fetch handover documents for document completion
  const { data: handoverDocs = [] } = useQuery({
    queryKey: ["handover-docs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("handover_documents" as any)
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Fetch bulk services for configuration completion
  const { data: bulkServicesData } = useQuery({
    queryKey: ["bulk-services-completion", projectId],
    queryFn: async () => {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("baseline_water_temp, baseline_inlet_temp, baseline_geyser_capacity, baseline_occupants")
        .eq("id", projectId)
        .single();
      
      if (projectError) throw projectError;

      const { data: docs, error: docsError } = await supabase
        .from("bulk_services_documents")
        .select("*, bulk_services_sections(*)")
        .eq("project_id", projectId);
      
      if (docsError) throw docsError;

      return { project, docs: docs || [] };
    },
    enabled: !!projectId,
  });

  // Fetch cost reports, budgets, cable schedules for documentation completion
  const { data: documentation } = useQuery({
    queryKey: ["documentation", projectId],
    queryFn: async () => {
      const [costReports, budgets, cableSchedules] = await Promise.all([
        supabase.from("cost_reports").select("id").eq("project_id", projectId),
        supabase.from("electrical_budgets").select("id").eq("project_id", projectId),
        supabase.from("cable_schedules").select("id").eq("project_id", projectId),
      ]);

      return {
        costReports: costReports.data?.length || 0,
        budgets: budgets.data?.length || 0,
        cableSchedules: cableSchedules.data?.length || 0,
      };
    },
    enabled: !!projectId,
  });

  // Calculate tenant schedule completion
  const calculateTenantScheduleCompletion = () => {
    if (tenants.length === 0) return 100;
    
    const totalChecks = tenants.length * 5; // 5 checkboxes per tenant
    let completedChecks = 0;
    
    tenants.forEach((tenant: any) => {
      if (tenant.sow_received) completedChecks++;
      if (tenant.layout_received) completedChecks++;
      if (tenant.db_ordered) completedChecks++;
      if (tenant.lighting_ordered) completedChecks++;
      if (tenant.cost_reported) completedChecks++;
    });
    
    return (completedChecks / totalChecks) * 100;
  };

  // Calculate handover documents completion
  const calculateHandoverDocsCompletion = () => {
    if (tenants.length === 0) return 100;
    
    const requiredDocsPerTenant = 6;
    const totalRequired = tenants.length * requiredDocsPerTenant;
    
    const docsCount = handoverDocs.length;
    const completion = Math.min((docsCount / totalRequired) * 100, 100);
    
    return completion;
  };

  // Calculate handover links completion
  const calculateHandoverLinksCompletion = () => {
    if (tenants.length === 0) return 100;
    const linkedCount = linkStatus?.totalLinked || 0;
    return (linkedCount / tenants.length) * 100;
  };

  // Calculate beneficial occupation completion (on-time vs overdue)
  const calculateBeneficialOccupationCompletion = () => {
    if (tenants.length === 0) return 100;
    
    const now = new Date();
    let onTrack = 0;
    
    tenants.forEach((tenant: any) => {
      if (!tenant.opening_date) return;
      
      const openingDate = new Date(tenant.opening_date);
      const beneficialDate = new Date(openingDate);
      beneficialDate.setDate(beneficialDate.getDate() - 14);
      
      const equipmentDeadline = new Date(openingDate);
      equipmentDeadline.setDate(equipmentDeadline.getDate() - 30);
      
      const isBeneficialComplete = tenant.beneficial_occupation_complete;
      const isEquipmentComplete = tenant.equipment_on_site;
      
      if (now < beneficialDate || isBeneficialComplete) {
        onTrack++;
      } else if (now < equipmentDeadline || isEquipmentComplete) {
        onTrack += 0.5; // Partial credit if equipment deadline not passed
      }
    });
    
    return (onTrack / tenants.length) * 100;
  };

  // Calculate bulk services completion
  const calculateBulkServicesCompletion = () => {
    if (!bulkServicesData) return 100;
    
    const { project, docs } = bulkServicesData;
    const requiredParams = ['baseline_water_temp', 'baseline_inlet_temp', 'baseline_geyser_capacity', 'baseline_occupants'];
    const missingParams = requiredParams.filter(param => !project[param]);
    
    if (docs.length === 0) return missingParams.length === 0 ? 100 : 50;
    
    const incompleteDocsCount = docs.filter((doc: any) => {
      const sections = doc.bulk_services_sections || [];
      return sections.length === 0 || missingParams.length > 0;
    }).length;
    
    const docsCompletion = docs.length === 0 ? 100 : ((docs.length - incompleteDocsCount) / docs.length) * 100;
    const paramsCompletion = ((4 - missingParams.length) / 4) * 100;
    
    return (docsCompletion + paramsCompletion) / 2;
  };

  // Calculate documentation completion
  const calculateDocumentationCompletion = () => {
    if (!documentation) return 0;
    
    const { costReports, budgets, cableSchedules } = documentation;
    const totalDocs = costReports + budgets + cableSchedules;
    
    // Score based on having at least one of each type
    let score = 0;
    if (costReports > 0) score += 33.33;
    if (budgets > 0) score += 33.33;
    if (cableSchedules > 0) score += 33.33;
    
    return score;
  };

  const breakdown: CompletionBreakdown = {
    tenantSchedule: calculateTenantScheduleCompletion(),
    handoverDocs: calculateHandoverDocsCompletion(),
    handoverLinks: calculateHandoverLinksCompletion(),
    beneficialOccupation: calculateBeneficialOccupationCompletion(),
    bulkServices: calculateBulkServicesCompletion(),
    documentation: calculateDocumentationCompletion(),
  };

  const overall = (
    breakdown.tenantSchedule * 0.30 +
    breakdown.handoverDocs * 0.25 +
    breakdown.handoverLinks * 0.10 +
    breakdown.beneficialOccupation * 0.20 +
    breakdown.bulkServices * 0.10 +
    breakdown.documentation * 0.05
  );

  const isLoading = !tenants || !documentation || !bulkServicesData;

  return {
    overall: Math.round(overall * 10) / 10,
    breakdown,
    isLoading,
  };
};
