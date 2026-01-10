/**
 * PDF Preview Dialog Component
 * Allows previewing PDF documents before downloading
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, RefreshCw, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { generatePDFPreview } from '@/utils/pdfmake/testing';
import { validateDocument, formatValidationResult, getDocumentSummary } from '@/utils/pdfmake/validation';
import { pdfMake } from '@/utils/pdfmake/config';

interface PDFPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docDefinition: TDocumentDefinitions | null;
  filename?: string;
  title?: string;
}

export const PDFPreviewDialog: React.FC<PDFPreviewDialogProps> = ({
  open,
  onOpenChange,
  docDefinition,
  filename = 'document.pdf',
  title = 'PDF Preview',
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ReturnType<typeof validateDocument> | null>(null);

  useEffect(() => {
    if (open && docDefinition) {
      loadPreview();
    } else {
      setPreviewUrl(null);
      setError(null);
      setValidationResult(null);
    }
  }, [open, docDefinition]);

  const loadPreview = async () => {
    if (!docDefinition) return;

    setLoading(true);
    setError(null);

    // Validate first
    const validation = validateDocument(docDefinition);
    setValidationResult(validation);

    if (!validation.valid) {
      setError('Document validation failed. Check the validation results below.');
      setLoading(false);
      return;
    }

    try {
      const url = await generatePDFPreview(docDefinition);
      setPreviewUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!docDefinition) return;
    
    const pdfDoc = pdfMake.createPdf(docDefinition);
    pdfDoc.download(filename);
  };

  const summary = docDefinition ? getDocumentSummary(docDefinition) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Preview and validate your PDF before downloading
          </DialogDescription>
        </DialogHeader>

        {/* Document Summary */}
        {summary && (
          <div className="flex flex-wrap gap-2 py-2">
            <Badge variant="outline">{summary.pageSize}</Badge>
            <Badge variant="outline">{summary.pageOrientation}</Badge>
            {summary.hasHeader && <Badge variant="secondary">Header</Badge>}
            {summary.hasFooter && <Badge variant="secondary">Footer</Badge>}
            <Badge variant="outline">{summary.contentStats.textBlocks} text blocks</Badge>
            {summary.contentStats.tables > 0 && (
              <Badge variant="outline">{summary.contentStats.tables} tables</Badge>
            )}
            {summary.contentStats.images > 0 && (
              <Badge variant="outline">{summary.contentStats.images} images</Badge>
            )}
          </div>
        )}

        {/* Validation Status */}
        {validationResult && (
          <div className="flex items-center gap-2 text-sm">
            {validationResult.valid ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">Document is valid</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-destructive">
                  {validationResult.errors.length} error(s), {validationResult.warnings.length} warning(s)
                </span>
              </>
            )}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Preview Area */}
        <div className="flex-1 min-h-[400px] border rounded-lg bg-muted/30 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generating preview...</p>
            </div>
          ) : previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full h-full"
              title="PDF Preview"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {error ? 'Preview not available' : 'No document to preview'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2">
          <Button variant="outline" onClick={loadPreview} disabled={loading || !docDefinition}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleDownload} disabled={!docDefinition || !validationResult?.valid}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PDFPreviewDialog;
