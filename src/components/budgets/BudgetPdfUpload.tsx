import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/build/pdf.mjs';

// Set PDF.js worker source
if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@5.4.296/build/pdf.worker.mjs`;
}

interface ExtractedData {
  budget_number: string;
  revision: string;
  budget_date: string;
  prepared_for_company: string | null;
  prepared_for_contact: string | null;
  sections: Array<{
    section_code: string;
    section_name: string;
    display_order: number;
    line_items: Array<{
      item_number: string;
      description: string;
      area: number | null;
      area_unit: string;
      base_rate: number | null;
      ti_rate: number | null;
      total: number;
      shop_number: string | null;
      is_tenant_item: boolean;
    }>;
  }>;
  area_schedule: Array<{
    shop_number: string;
    tenant_name: string;
    area: number;
    area_unit: string;
    base_rate: number | null;
    ti_rate: number | null;
    total: number | null;
    category: string;
  }>;
}

interface BudgetPdfUploadProps {
  budgetId: string;
  projectId: string;
  onExtractionComplete: (data: ExtractedData) => void;
}

type UploadStatus = 'idle' | 'reading' | 'extracting' | 'complete' | 'error';

export const BudgetPdfUpload = ({ budgetId, projectId, onExtractionComplete }: BudgetPdfUploadProps) => {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = getDocument(arrayBuffer);
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
      setProgress(Math.round((i / numPages) * 40));
    }
    
    return fullText;
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    setFileName(file.name);
    setStatus('reading');
    setProgress(0);
    setErrorMessage(null);

    try {
      // Step 1: Extract text from PDF
      const pdfText = await extractTextFromPdf(file);
      setProgress(40);
      setStatus('extracting');

      // Step 2: Send to AI for extraction
      const { data, error } = await supabase.functions.invoke('extract-budget', {
        body: {
          file_content: pdfText,
          project_id: projectId,
          budget_id: budgetId,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Extraction failed');

      setProgress(100);
      setStatus('complete');

      toast({
        title: "Extraction complete",
        description: `Found ${data.summary.sections} sections, ${data.summary.line_items} line items, ${data.summary.area_schedule_items} tenants`,
      });

      onExtractionComplete(data.data);
    } catch (error: any) {
      console.error('Upload error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Failed to extract budget');
      toast({
        title: "Extraction failed",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [budgetId, projectId, onExtractionComplete, toast]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      const input = document.createElement('input');
      input.type = 'file';
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      handleFileUpload({ target: input } as any);
    }
  }, [handleFileUpload]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const resetUpload = () => {
    setStatus('idle');
    setProgress(0);
    setErrorMessage(null);
    setFileName(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Import from PDF
        </CardTitle>
        <CardDescription>
          Upload a budget PDF to automatically extract sections and line items
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'idle' && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
          >
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop your budget PDF here, or click to browse
            </p>
            <label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button variant="outline" asChild>
                <span>Select PDF File</span>
              </Button>
            </label>
          </div>
        )}

        {(status === 'reading' || status === 'extracting') && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="font-medium">{fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {status === 'reading' ? 'Reading PDF...' : 'Extracting with AI...'}
                </p>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {status === 'complete' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Extraction Complete</p>
                <p className="text-sm text-muted-foreground">{fileName}</p>
              </div>
            </div>
            <Button variant="outline" onClick={resetUpload}>
              Upload Another PDF
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Extraction Failed</p>
                <p className="text-sm">{errorMessage}</p>
              </div>
            </div>
            <Button variant="outline" onClick={resetUpload}>
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
