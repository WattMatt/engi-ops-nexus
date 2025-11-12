import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";
import { HIGH_QUALITY_CANVAS_OPTIONS, CHART_QUALITY_CANVAS_OPTIONS } from "./pdfQualitySettings";

export interface CaptureResult {
  canvas: HTMLCanvasElement;
  imageUrl?: string;
}

/**
 * Wait for an element to be fully rendered
 */
const waitForElement = async (elementId: string, timeout = 10000): Promise<HTMLElement> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const element = document.getElementById(elementId);
    if (element) {
      // Additional wait to ensure full rendering
      await new Promise(resolve => setTimeout(resolve, 500));
      return element;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error(`Element with id "${elementId}" not found within ${timeout}ms`);
};

/**
 * Capture a component as a high-quality canvas
 */
export const captureComponent = async (
  elementId: string,
  componentType: 'kpi-cards' | 'distribution-chart' | 'variance-chart' | 'budget-comparison-chart' | 'category-table'
): Promise<HTMLCanvasElement> => {
  const element = await waitForElement(elementId);
  
  // Use chart-specific settings for charts, high-quality for others
  const isChart = componentType.includes('chart');
  const captureOptions = isChart ? CHART_QUALITY_CANVAS_OPTIONS : HIGH_QUALITY_CANVAS_OPTIONS;
  
  return await html2canvas(element, {
    ...captureOptions,
    scale: 2,
    backgroundColor: '#ffffff',
  });
};

/**
 * Upload canvas to Supabase Storage and return public URL
 */
export const uploadComponentImage = async (
  canvas: HTMLCanvasElement,
  componentId: string,
  projectId: string
): Promise<string> => {
  // Convert canvas to blob
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
    }, 'image/png');
  });
  
  // Upload to Supabase Storage
  const fileName = `${projectId}/${componentId}_${Date.now()}.png`;
  const { data, error } = await supabase.storage
    .from('cost-report-pdfs')
    .upload(fileName, blob, {
      contentType: 'image/png',
      upsert: true,
    });
  
  if (error) throw error;
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('cost-report-pdfs')
    .getPublicUrl(fileName);
  
  return publicUrl;
};

/**
 * Capture and upload a component in one operation
 */
export const captureAndUploadComponent = async (
  elementId: string,
  componentType: 'kpi-cards' | 'distribution-chart' | 'variance-chart' | 'budget-comparison-chart' | 'category-table',
  componentId: string,
  projectId: string
): Promise<CaptureResult> => {
  const canvas = await captureComponent(elementId, componentType);
  const imageUrl = await uploadComponentImage(canvas, componentId, projectId);
  
  return { canvas, imageUrl };
};

/**
 * Re-capture all components in a template with fresh data
 */
export const recaptureAllComponents = async (
  capturedComponents: any[],
  projectId: string
): Promise<Map<string, string>> => {
  const updatedUrls = new Map<string, string>();
  
  for (const component of capturedComponents) {
    try {
      const result = await captureAndUploadComponent(
        component.elementId,
        component.componentType,
        component.id,
        projectId
      );
      
      if (result.imageUrl) {
        updatedUrls.set(component.id, result.imageUrl);
      }
    } catch (error) {
      console.error(`Failed to recapture component ${component.id}:`, error);
    }
  }
  
  return updatedUrls;
};
