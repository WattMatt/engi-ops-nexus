import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { ScannedInvoiceReviewCard } from "./ScannedInvoiceReviewCard";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UploadedFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  extractedData?: any;
  error?: string;
  uploadId?: string;
}

interface ImportHistoricalInvoicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportHistoricalInvoicesDialog({ open, onOpenChange }: ImportHistoricalInvoicesDialogProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const pdfFiles = selectedFiles.filter(f => f.type === 'application/pdf');
    
    if (pdfFiles.length !== selectedFiles.length) {
      toast({
        title: "Invalid files",
        description: "Only PDF files are allowed",
        variant: "destructive",
      });
    }

    const newFiles: UploadedFile[] = pdfFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      status: 'pending'
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const retryScan = async (fileId: string) => {
    const fileData = files.find(f => f.id === fileId);
    if (!fileData) return;

    // Reset file status to pending
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'pending', error: undefined } : f
    ));

    // Trigger scan for this specific file
    await scanFile(fileData);
  };

  const scanFile = async (fileData: UploadedFile) => {
    try {
      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === fileData.id ? { ...f, status: 'uploading' } : f
      ));

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload to storage
      const fileName = `${user.id}/${new Date().getFullYear()}/${fileData.file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(`historical/${fileName}`, fileData.file, {
          upsert: true // Allow overwriting if retrying
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('invoices')
        .getPublicUrl(`historical/${fileName}`);

      // Create or update invoice_upload record
      const { data: uploadRecord, error: recordError } = await supabase
        .from('invoice_uploads')
        .upsert({
          id: fileData.uploadId, // Use existing ID if retrying
          user_id: user.id,
          file_name: fileData.file.name,
          file_url: publicUrl,
          file_size: fileData.file.size,
          processing_status: 'processing'
        })
        .select()
        .single();

      if (recordError) throw recordError;

      // Update status to processing
      setFiles(prev => prev.map(f => 
        f.id === fileData.id ? { ...f, status: 'processing', uploadId: uploadRecord.id } : f
      ));

      // Read file as text for AI processing
      const fileText = await fileData.file.text();

      // Call edge function to scan invoice
      const { data: scanResult, error: scanError } = await supabase.functions.invoke('scan-invoice', {
        body: { 
          fileContent: fileText,
          fileName: fileData.file.name 
        }
      });

      if (scanError) throw scanError;

      if (!scanResult.success) {
        throw new Error(scanResult.error || 'Failed to scan invoice');
      }

      // Update invoice_upload record with extracted data
      await supabase
        .from('invoice_uploads')
        .update({
          processing_status: 'completed',
          extracted_data: scanResult.data
        })
        .eq('id', uploadRecord.id);

      // Update file status with extracted data
      setFiles(prev => prev.map(f => 
        f.id === fileData.id 
          ? { ...f, status: 'completed', extractedData: scanResult.data } 
          : f
      ));

      toast({
        title: "Invoice scanned",
        description: `Successfully scanned ${fileData.file.name}`,
      });

    } catch (error) {
      console.error('Error processing file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update file status to failed
      setFiles(prev => prev.map(f => 
        f.id === fileData.id 
          ? { ...f, status: 'failed', error: errorMessage } 
          : f
      ));

      // Update database record if it exists
      if (fileData.uploadId) {
        await supabase
          .from('invoice_uploads')
          .update({
            processing_status: 'failed',
            error_message: errorMessage
          })
          .eq('id', fileData.uploadId);
      }

      toast({
        title: "Scan failed",
        description: `Failed to scan ${fileData.file.name}: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const scanAllFiles = async () => {
    setIsProcessing(true);
    
    for (const fileData of files) {
      if (fileData.status !== 'pending') continue;
      await scanFile(fileData);
    }

    setIsProcessing(false);
  };


  const handleSaveInvoice = async (fileId: string, data: any) => {
    try {
      const fileData = files.find(f => f.id === fileId);
      if (!fileData || !fileData.uploadId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if project exists
      let projectId: string;
      const { data: existingProject } = await supabase
        .from('invoice_projects')
        .select('id')
        .ilike('project_name', data.project_name)
        .single();

      if (existingProject) {
        projectId = existingProject.id;
      } else {
        // Create new project
        const { data: newProject, error: projectError } = await supabase
          .from('invoice_projects')
          .insert({
            project_name: data.project_name,
            client_name: data.client_name,
            client_vat_number: data.client_vat_number,
            client_address: data.client_address,
            agreed_fee: data.agreed_fee || 0,
            total_invoiced: 0,
            outstanding_amount: 0,
            status: 'active',
            created_by: user.id
          })
          .select()
          .single();

        if (projectError) throw projectError;
        projectId = newProject.id;
      }

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          project_id: projectId,
          invoice_number: data.invoice_number,
          invoice_date: data.invoice_date,
          claim_number: 1,
          previously_invoiced: data.previously_invoiced,
          current_amount: data.interim_claim,
          vat_amount: data.vat_amount,
          total_amount: data.total_amount,
          payment_status: 'paid', // Assuming historical invoices are paid
          created_by: user.id
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Update invoice_upload record
      await supabase
        .from('invoice_uploads')
        .update({
          project_id: projectId,
          invoice_id: invoice.id
        })
        .eq('id', fileData.uploadId);

      // Remove from UI
      removeFile(fileId);

      toast({
        title: "Invoice saved",
        description: "Historical invoice has been saved to the database",
      });

    } catch (error) {
      console.error('Error saving invoice:', error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : 'Failed to save invoice',
        variant: "destructive",
      });
    }
  };

  const completedCount = files.filter(f => f.status === 'completed').length;
  const failedCount = files.filter(f => f.status === 'failed').length;
  const processingCount = files.filter(f => f.status === 'processing' || f.status === 'uploading').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import Historical Invoices</DialogTitle>
          <DialogDescription>
            Upload PDF invoices to automatically extract and save invoice data
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Panel: Upload */}
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-medium mb-1">Upload PDF Invoices</h3>
                <p className="text-sm text-muted-foreground">
                  Select one or more PDF files (max 20MB each)
                </p>
              </div>
              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="invoice-upload"
                disabled={isProcessing}
              />
              <Button asChild disabled={isProcessing}>
                <label htmlFor="invoice-upload" className="cursor-pointer">
                  Select Files
                </label>
              </Button>
            </div>

            {/* File List */}
            <ScrollArea className="h-[300px] rounded-lg border p-4">
              <div className="space-y-2">
                {files.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No files uploaded yet
                  </p>
                ) : (
                  files.map(file => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      {file.status === 'pending' && <FileText className="h-5 w-5 text-muted-foreground" />}
                      {file.status === 'uploading' && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
                      {file.status === 'processing' && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
                      {file.status === 'completed' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      {file.status === 'failed' && <XCircle className="h-5 w-5 text-destructive" />}
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.file.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{file.status}</p>
                        {file.error && <p className="text-xs text-destructive">{file.error}</p>}
                      </div>

                      {file.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {file.status === 'failed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => retryScan(file.id)}
                          title="Retry scan"
                        >
                          <Loader2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {files.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{completedCount + failedCount} / {files.length}</span>
                </div>
                <Progress 
                  value={((completedCount + failedCount) / files.length) * 100} 
                />
                <div className="flex gap-4 text-xs">
                  <span className="text-green-600">✓ {completedCount} completed</span>
                  <span className="text-destructive">✗ {failedCount} failed</span>
                  {processingCount > 0 && <span className="text-blue-600">⟳ {processingCount} processing</span>}
                </div>
              </div>
            )}

            <Button
              onClick={scanAllFiles}
              disabled={files.length === 0 || isProcessing || files.every(f => f.status !== 'pending')}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>Scan All Invoices</>
              )}
            </Button>
          </div>

          {/* Right Panel: Review Cards */}
          <ScrollArea className="h-[500px]">
            <div className="space-y-4 pr-4">
              {files.filter(f => f.status === 'completed').length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Scanned invoices will appear here for review</p>
                </div>
              ) : (
                files
                  .filter(f => f.status === 'completed')
                  .map(file => (
                    <ScannedInvoiceReviewCard
                      key={file.id}
                      fileName={file.file.name}
                      extractedData={file.extractedData}
                      onSave={(data) => handleSaveInvoice(file.id, data)}
                      onDiscard={() => removeFile(file.id)}
                    />
                  ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
