import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHandoverLinkStatus } from "./useHandoverLinkStatus";

export interface ProjectIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'tenants' | 'documents' | 'deadlines' | 'configuration';
  title: string;
  description: string;
  count?: number;
  navigationPath: string;
  actionLabel: string;
}

export const useProjectIssues = (projectId: string) => {
  const { data: linkStatus } = useHandoverLinkStatus(projectId);

  return useQuery({
    queryKey: ["project-issues", projectId],
    queryFn: async () => {
      const issues: ProjectIssue[] = [];

      // Fetch all data in parallel
      const [tenantsResult, handoverDocsResult, bulkServicesResult, scheduleVersionResult] = await Promise.all([
        supabase.from("tenants").select("*").eq("project_id", projectId),
        supabase.from("handover_documents" as any).select("*").eq("project_id", projectId),
        supabase.from("projects").select("baseline_water_temp, baseline_inlet_temp, baseline_geyser_capacity, baseline_occupants").eq("id", projectId).single(),
        supabase.from("tenant_schedule_versions").select("version_number").eq("project_id", projectId).order("version_number", { ascending: false }).limit(1),
      ]);

      const tenants = tenantsResult.data || [];
      const handoverDocs = handoverDocsResult.data || [];
      const bulkServicesProject = bulkServicesResult.data;
      const currentVersion = scheduleVersionResult.data?.[0]?.version_number;

      // Check for overdue beneficial occupation deadlines
      const now = new Date();
      const overdueDeadlines = tenants.filter((tenant: any) => {
        if (!tenant.opening_date || tenant.beneficial_occupation_complete) return false;
        const openingDate = new Date(tenant.opening_date);
        const beneficialDate = new Date(openingDate);
        beneficialDate.setDate(beneficialDate.getDate() - 14);
        return now > beneficialDate;
      });

      if (overdueDeadlines.length > 0) {
        issues.push({
          id: 'overdue-beneficial',
          severity: 'critical',
          category: 'deadlines',
          title: 'Overdue Beneficial Occupation Deadlines',
          description: `${overdueDeadlines.length} tenant(s) have passed their beneficial occupation deadline`,
          count: overdueDeadlines.length,
          navigationPath: '/dashboard/tenant-tracker',
          actionLabel: 'View Tenants',
        });
      }

      // Check for overdue equipment deadlines
      const overdueEquipment = tenants.filter((tenant: any) => {
        if (!tenant.opening_date || tenant.equipment_on_site) return false;
        const openingDate = new Date(tenant.opening_date);
        const equipmentDeadline = new Date(openingDate);
        equipmentDeadline.setDate(equipmentDeadline.getDate() - 30);
        return now > equipmentDeadline;
      });

      if (overdueEquipment.length > 0) {
        issues.push({
          id: 'overdue-equipment',
          severity: 'critical',
          category: 'deadlines',
          title: 'Overdue Equipment Deadlines',
          description: `${overdueEquipment.length} tenant(s) have passed their equipment delivery deadline`,
          count: overdueEquipment.length,
          navigationPath: '/dashboard/tenant-tracker',
          actionLabel: 'View Tenants',
        });
      }

      // Check for incomplete tenant schedules
      const incompleteSchedules = tenants.filter((tenant: any) => {
        return !tenant.sow_received || !tenant.layout_received || !tenant.db_ordered || !tenant.lighting_ordered || !tenant.cost_reported;
      });

      if (incompleteSchedules.length > 0) {
        issues.push({
          id: 'incomplete-schedules',
          severity: 'warning',
          category: 'tenants',
          title: 'Incomplete Tenant Schedules',
          description: `${incompleteSchedules.length} tenant(s) have incomplete schedule checkboxes`,
          count: incompleteSchedules.length,
          navigationPath: '/dashboard/tenant-tracker',
          actionLabel: 'Complete Schedules',
        });
      }

      // Check for tenants missing handover documents
      const tenantsWithDocs = new Set(handoverDocs.map((doc: any) => doc.tenant_id));
      const tenantsWithoutDocs = tenants.filter((tenant: any) => !tenantsWithDocs.has(tenant.id));

      if (tenantsWithoutDocs.length > 0) {
        issues.push({
          id: 'missing-handover-docs',
          severity: 'warning',
          category: 'documents',
          title: 'Missing Handover Documents',
          description: `${tenantsWithoutDocs.length} tenant(s) have no handover documents uploaded`,
          count: tenantsWithoutDocs.length,
          navigationPath: '/dashboard/handover',
          actionLabel: 'Upload Documents',
        });
      }

      // Check for tenants not linked to handover
      const unlinkedTenants = tenants.length - (linkStatus?.totalLinked || 0);
      if (unlinkedTenants > 0) {
        issues.push({
          id: 'unlinked-handover',
          severity: 'warning',
          category: 'documents',
          title: 'Tenants Not Linked to Handover',
          description: `${unlinkedTenants} tenant(s) have not been linked to handover folders`,
          count: unlinkedTenants,
          navigationPath: '/dashboard/tenant-tracker',
          actionLabel: 'Link Tenants',
        });
      }

      // Check for missing bulk services baseline parameters
      if (bulkServicesProject) {
        const requiredParams = ['baseline_water_temp', 'baseline_inlet_temp', 'baseline_geyser_capacity', 'baseline_occupants'];
        const missingParams = requiredParams.filter(param => !bulkServicesProject[param]);

        if (missingParams.length > 0) {
          issues.push({
            id: 'missing-baseline-params',
            severity: 'critical',
            category: 'configuration',
            title: 'Missing Bulk Services Baseline Parameters',
            description: `${missingParams.length} baseline parameter(s) need to be configured`,
            count: missingParams.length,
            navigationPath: '/dashboard/project-settings',
            actionLabel: 'Configure Parameters',
          });
        }
      }

      // Check for outdated generator reports
      if (currentVersion) {
        const { data: outdatedReports } = await supabase
          .from("generator_reports")
          .select("id")
          .eq("project_id", projectId)
          .neq("tenant_schedule_version", currentVersion);

        if (outdatedReports && outdatedReports.length > 0) {
          issues.push({
            id: 'outdated-reports',
            severity: 'warning',
            category: 'documents',
            title: 'Outdated Generator Reports',
            description: `${outdatedReports.length} generator report(s) need to be regenerated with the latest schedule`,
            count: outdatedReports.length,
            navigationPath: '/dashboard/generator-report',
            actionLabel: 'Update Reports',
          });
        }
      }

      // Check for approaching beneficial occupation deadlines (within 7 days)
      const approachingDeadlines = tenants.filter((tenant: any) => {
        if (!tenant.opening_date || tenant.beneficial_occupation_complete) return false;
        const openingDate = new Date(tenant.opening_date);
        const beneficialDate = new Date(openingDate);
        beneficialDate.setDate(beneficialDate.getDate() - 14);
        const daysUntilDeadline = Math.ceil((beneficialDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDeadline > 0 && daysUntilDeadline <= 7;
      });

      if (approachingDeadlines.length > 0) {
        issues.push({
          id: 'approaching-deadlines',
          severity: 'info',
          category: 'deadlines',
          title: 'Approaching Beneficial Occupation Deadlines',
          description: `${approachingDeadlines.length} tenant(s) have deadlines within the next 7 days`,
          count: approachingDeadlines.length,
          navigationPath: '/dashboard/tenant-tracker',
          actionLabel: 'View Deadlines',
        });
      }

      // Sort by severity (critical first, then warning, then info)
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      return issues;
    },
    enabled: !!projectId,
  });
};
