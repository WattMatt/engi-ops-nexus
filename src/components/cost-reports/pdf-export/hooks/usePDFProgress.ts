import { useState, useCallback } from "react";
import { PDFExportProgress } from "../types";
import { PDFSectionOptions } from "../../PDFExportSettings";

// Define the export steps with their weights
const EXPORT_STEPS = [
  { key: 'init', label: 'Initializing PDF export', weight: 1 },
  { key: 'data', label: 'Fetching report data', weight: 2 },
  { key: 'coverPage', label: 'Generating cover page', weight: 2 },
  { key: 'tableOfContents', label: 'Creating table of contents', weight: 1 },
  { key: 'categoryDetails', label: 'Adding category performance', weight: 2 },
  { key: 'executiveSummary', label: 'Generating executive summary', weight: 2 },
  { key: 'projectInfo', label: 'Adding project information', weight: 1 },
  { key: 'detailedLineItems', label: 'Processing line items', weight: 3 },
  { key: 'variations', label: 'Adding variations', weight: 2 },
  { key: 'charts', label: 'Capturing charts', weight: 3 },
  { key: 'toc', label: 'Updating table of contents', weight: 1 },
  { key: 'pageNumbers', label: 'Adding page numbers', weight: 1 },
  { key: 'save', label: 'Saving PDF', weight: 2 },
] as const;

type ExportStepKey = typeof EXPORT_STEPS[number]['key'];

export function usePDFProgress(sections: PDFSectionOptions) {
  const [progress, setProgress] = useState<PDFExportProgress>({
    currentStep: 0,
    totalSteps: 0,
    currentSection: '',
    percentage: 0,
  });
  const [isExporting, setIsExporting] = useState(false);

  // Calculate total steps based on enabled sections
  const calculateTotalSteps = useCallback(() => {
    let total = 0;
    
    // Always include init, data, pageNumbers, and save
    total += EXPORT_STEPS.find(s => s.key === 'init')?.weight || 1;
    total += EXPORT_STEPS.find(s => s.key === 'data')?.weight || 1;
    total += EXPORT_STEPS.find(s => s.key === 'pageNumbers')?.weight || 1;
    total += EXPORT_STEPS.find(s => s.key === 'save')?.weight || 1;
    total += EXPORT_STEPS.find(s => s.key === 'toc')?.weight || 1;
    
    // Add section-specific steps
    if (sections.coverPage) total += EXPORT_STEPS.find(s => s.key === 'coverPage')?.weight || 1;
    if (sections.tableOfContents) total += EXPORT_STEPS.find(s => s.key === 'tableOfContents')?.weight || 1;
    if (sections.categoryDetails) total += EXPORT_STEPS.find(s => s.key === 'categoryDetails')?.weight || 1;
    if (sections.executiveSummary) total += EXPORT_STEPS.find(s => s.key === 'executiveSummary')?.weight || 1;
    if (sections.projectInfo) total += EXPORT_STEPS.find(s => s.key === 'projectInfo')?.weight || 1;
    if (sections.detailedLineItems) total += EXPORT_STEPS.find(s => s.key === 'detailedLineItems')?.weight || 1;
    if (sections.variations) total += EXPORT_STEPS.find(s => s.key === 'variations')?.weight || 1;
    if (sections.visualSummary) total += EXPORT_STEPS.find(s => s.key === 'charts')?.weight || 1;
    
    return total;
  }, [sections]);

  const startExport = useCallback(() => {
    const totalSteps = calculateTotalSteps();
    setIsExporting(true);
    setProgress({
      currentStep: 0,
      totalSteps,
      currentSection: 'Initializing...',
      percentage: 0,
    });
    return totalSteps;
  }, [calculateTotalSteps]);

  const updateProgress = useCallback((stepKey: ExportStepKey, customLabel?: string) => {
    const step = EXPORT_STEPS.find(s => s.key === stepKey);
    if (!step) return;

    setProgress(prev => {
      const newStep = prev.currentStep + step.weight;
      const percentage = Math.min(100, Math.round((newStep / prev.totalSteps) * 100));
      
      return {
        ...prev,
        currentStep: newStep,
        currentSection: customLabel || step.label,
        percentage,
      };
    });
  }, []);

  const completeExport = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      currentStep: prev.totalSteps,
      currentSection: 'Complete!',
      percentage: 100,
    }));
    
    // Reset after a short delay
    setTimeout(() => {
      setIsExporting(false);
      setProgress({
        currentStep: 0,
        totalSteps: 0,
        currentSection: '',
        percentage: 0,
      });
    }, 1000);
  }, []);

  const resetProgress = useCallback(() => {
    setIsExporting(false);
    setProgress({
      currentStep: 0,
      totalSteps: 0,
      currentSection: '',
      percentage: 0,
    });
  }, []);

  return {
    progress,
    isExporting,
    startExport,
    updateProgress,
    completeExport,
    resetProgress,
  };
}
