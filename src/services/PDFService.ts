import { 
  createDocument, 
  heading, 
  paragraph, 
  sectionHeader,
  pageBreak,
  buildCoverPageContent,
  generateCostReportPDF,
} from '@/utils/pdfmake';
import type { CostReportData } from '@/utils/pdfmake';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { InspectionData } from '@/types/PDFServiceTypes';

// Spec constants from reporting.json
const REPORT_SPEC = {
  fonts: {
    primary: 'Roboto',
    heading: 'Montserrat',
    size_base: 10,
    size_heading: 14
  },
  colors: {
    primary: '#0056D2',
    secondary: '#F4F6F8',
    text: '#1A202C',
    danger: '#E53E3E'
  },
  margins: {
    top: 20,
    bottom: 20,
    left: 15,
    right: 15
  }
};

export class PDFService {
  /**
   * Generates a comprehensive Project Complete Report
   * Merges Cost Data and Compliance Data
   */
  static async generateProjectCompleteReport(projectId: string) {
    try {
      // 1. Fetch Project Data
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (!project) throw new Error('Project not found');

      // 2. Fetch Cost Report Data (Latest)
      const { data: costReport } = await supabase
        .from('cost_reports')
        .select('*, cost_categories(*, cost_line_items(*))')
        .eq('project_id', projectId)
        .order('report_date', { ascending: false })
        .limit(1)
        .single();

      // 3. Fetch Inspection Data (Mock for now, as compliance module integration is pending)
      const inspectionData: InspectionData = {
        siteDetails: {
          location: project.city || 'Unknown Location',
          inspector: 'Compliance Officer',
          date: new Date().toISOString()
        },
        issues: []
      };

      // 4. Build Document
      const doc = createDocument({
        pageSize: 'A4',
        margins: [
          REPORT_SPEC.margins.left,
          REPORT_SPEC.margins.top,
          REPORT_SPEC.margins.right,
          REPORT_SPEC.margins.bottom
        ]
      });

      // Cover Page
      const coverPage = await buildCoverPageContent(
        {
          title: 'Project Complete Report',
          projectName: project.name,
          reportDate: new Date(),
          projectNumber: project.project_number
        },
        {
          companyName: 'WM Office',
          contactName: 'WM Office',
          contactPhone: '+27 12 345 6789',
          company_logo_url: null,
          client_logo_url: null,
        }
      );
      doc.add(coverPage);

      // Executive Summary
      doc.add(pageBreak());
      doc.add(heading('Executive Summary'));
      doc.add(paragraph('This report combines financial status and compliance inspections for the project.'));
      
      // Financial Overview (if data exists)
      if (costReport) {
        doc.add(sectionHeader('Financial Overview'));
        // Re-use existing cost report builder logic here
        // We can adapt buildExecutiveSummaryContent to be more generic or use it directly
        // For now, let's add a simple summary table
        doc.add(paragraph(`Report Date: ${costReport.report_date || 'N/A'}`));
      }

      // Site Inspection Log
      doc.add(pageBreak());
      doc.add(heading('Site Inspection Log'));
      doc.add(paragraph('No inspection data available in this version.'));

      // Sign Off Sheet
      doc.add(pageBreak());
      doc.add(heading('Sign Off Sheet'));
      doc.add(paragraph('Project Manager: ______________________ Date: __________'));
      doc.add(paragraph('Client: _____________________________ Date: __________'));

      // Download
      doc.download(`Project_Complete_${project.project_number}.pdf`);

      return true;
    } catch (error) {
      console.error('Failed to generate Project Complete Report:', error);
      throw error;
    }
  }

  /**
   * Generates the Cost Report using the new Unified Engine
   * Wraps the existing pdfmake/costReportBuilder but ensures spec compliance
   */
  static async generateCostReport(reportId: string) {
    // This delegates to the existing robust builder but we wrap it 
    // to provide a consistent service API
    // Fetch cost report data and delegate to the pdfmake builder
    const { data: reportData, error } = await supabase
      .from('cost_reports')
      .select('*, cost_categories(*, cost_line_items(*))')
      .eq('id', reportId)
      .single();

    if (error || !reportData) throw new Error('Cost report not found');

    return generateCostReportPDF(reportData as unknown as CostReportData);
  }

  /**
   * Generates an Inspection Report (Photo Grids)
   */
  static async generateInspectionReport(inspectionId: string) {
    // Placeholder for Phase 4 compliance integration
    console.log('Generating Inspection Report for:', inspectionId);
    
    const doc = createDocument();
    doc.add(heading('Inspection Report'));
    doc.add(paragraph('Photo grids and compliance issues will appear here.'));
    doc.download(`Inspection_${inspectionId}.pdf`);
  }
}
