/**
 * Hook for extracting BOQ template structure from PDF files
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { pdfjs } from 'react-pdf';

export interface ExtractedItem {
  item_code?: string;
  description: string;
  unit?: string;
  item_type: 'quantity' | 'prime_cost' | 'percentage' | 'sub_header';
}

export interface ExtractedSection {
  section_code: string;
  section_name: string;
  description?: string;
  items: ExtractedItem[];
}

export interface ExtractedBill {
  bill_number: number;
  bill_name: string;
  description?: string;
  sections: ExtractedSection[];
}

export interface ExtractedStructure {
  template_name: string;
  template_description: string;
  building_type?: string;
  bills: ExtractedBill[];
}

export interface ExtractionResult {
  success: boolean;
  data?: {
    template_id: string | null;
    structure: ExtractedStructure;
    stats: {
      total_bills: number;
      total_sections: number;
      total_items: number;
    };
  };
  error?: string;
}

export interface UseExtractBOQTemplateReturn {
  isExtracting: boolean;
  progress: number;
  result: ExtractionResult | null;
  extractFromFile: (
    file: File,
    options?: {
      templateName?: string;
      templateDescription?: string;
      buildingType?: string;
      tags?: string[];
      saveToDatabase?: boolean;
    }
  ) => Promise<ExtractionResult | null>;
  clearResult: () => void;
}

export const useExtractBOQTemplate = (): UseExtractBOQTemplateReturn => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ExtractionResult | null>(null);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument(arrayBuffer);
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    const numPages = pdf.numPages;
    
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
      setProgress(Math.round((i / numPages) * 40)); // 0-40% for PDF extraction
    }
    
    await pdf.destroy();
    return fullText;
  };

  const extractFromFile = async (
    file: File,
    options?: {
      templateName?: string;
      templateDescription?: string;
      buildingType?: string;
      tags?: string[];
      saveToDatabase?: boolean;
    }
  ): Promise<ExtractionResult | null> => {
    setIsExtracting(true);
    setProgress(0);
    setResult(null);

    try {
      // Get current user if saving to database
      let userId: string | null = null;
      if (options?.saveToDatabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Authentication required', { 
            description: 'Please sign in to save templates' 
          });
          return null;
        }
        userId = user.id;
      }

      // Extract text from PDF
      toast.info('Extracting text from PDF...', { duration: 2000 });
      let fileContent: string;
      
      if (file.type === 'application/pdf') {
        fileContent = await extractTextFromPdf(file);
      } else {
        // For other file types, read as text
        fileContent = await file.text();
      }

      if (!fileContent || fileContent.trim().length < 100) {
        throw new Error('Could not extract sufficient text from the file');
      }

      setProgress(50); // 50% - Text extracted

      // Call the edge function
      toast.info('Analyzing BOQ structure with AI...', { duration: 3000 });
      
      const { data, error } = await supabase.functions.invoke('extract-boq-template-structure', {
        body: {
          file_content: fileContent,
          template_name: options?.templateName,
          template_description: options?.templateDescription,
          building_type: options?.buildingType,
          tags: options?.tags || [],
          user_id: userId,
          save_to_database: options?.saveToDatabase || false,
        },
      });

      setProgress(90);

      if (error) {
        console.error('[useExtractBOQTemplate] Error:', error);
        toast.error('Extraction failed', { description: error.message });
        return null;
      }

      if (!data.success) {
        toast.error('Extraction failed', { description: data.error });
        return null;
      }

      setProgress(100);
      setResult(data);
      
      const stats = data.data?.stats;
      if (stats) {
        toast.success('Template extracted successfully', { 
          description: `Found ${stats.total_bills} bills, ${stats.total_sections} sections, ${stats.total_items} items` 
        });
      }
      
      return data as ExtractionResult;
    } catch (err) {
      console.error('[useExtractBOQTemplate] Exception:', err);
      toast.error('Extraction failed', { 
        description: err instanceof Error ? err.message : 'Unknown error' 
      });
      return null;
    } finally {
      setIsExtracting(false);
    }
  };

  const clearResult = () => {
    setResult(null);
    setProgress(0);
  };

  return {
    isExtracting,
    progress,
    result,
    extractFromFile,
    clearResult,
  };
};
