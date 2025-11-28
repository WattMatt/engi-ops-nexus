import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, FileText, Loader2, Sparkles, Check, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import mammoth from "mammoth";
import { format } from "date-fns";

interface PaymentMilestone {
  date: string | null;
  amount: number;
  description: string | null;
  percentage: number | null;
}

interface ExtractedData {
  project_name: string | null;
  client_name: string | null;
  client_address: string | null;
  client_vat_number: string | null;
  agreed_fee: number | null;
  vat_percentage: number | null;
  payment_terms: string | null;
  start_date: string | null;
  end_date: string | null;
  payment_schedule: PaymentMilestone[];
  notes: string | null;
  document_date: string | null;
  document_reference: string | null;
}

interface AppointmentLetterExtractorProps {
  onDataExtracted: (data: ExtractedData, file: File) => void;
  onClose: () => void;
}

export function AppointmentLetterExtractor({ onDataExtracted, onClose }: AppointmentLetterExtractorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setExtractedData(null);
      setError(null);
    }
  };

  const readFileContent = async (file: File): Promise<{ content: string; type: string }> => {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    // Handle images
    if (fileType.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({ content: reader.result as string, type: 'image' });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // Handle Word documents
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return { content: result.value, type: 'text' };
    }

    // Handle PDFs - extract text
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      // For PDFs, we'll read as base64 and let AI process it as image
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({ content: reader.result as string, type: 'image' });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // Handle plain text
    if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({ content: reader.result as string, type: 'text' });
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    }

    throw new Error('Unsupported file type. Please upload a PDF, Word document, or image.');
  };

  const handleExtract = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setIsExtracting(true);
    setError(null);

    try {
      const { content, type } = await readFileContent(file);
      
      const { data, error: fnError } = await supabase.functions.invoke('extract-payment-schedule', {
        body: {
          fileContent: content,
          fileName: file.name,
          fileType: type
        }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to extract data');
      }

      setExtractedData(data.data);
      toast.success("Data extracted successfully!");
    } catch (err: any) {
      console.error("Extraction error:", err);
      setError(err.message);
      toast.error(err.message || "Failed to extract data from document");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleUseData = () => {
    if (extractedData && file) {
      onDataExtracted(extractedData, file);
    }
  };

  const totalScheduled = extractedData?.payment_schedule?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Document Extraction
          </CardTitle>
          <CardDescription>
            Upload an appointment letter, fee proposal, or payment schedule document to automatically extract project and payment information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png,.webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setExtractedData(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div 
                className="cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, Word, or Image files supported
                </p>
              </div>
            )}
          </div>

          <Button 
            onClick={handleExtract} 
            disabled={!file || isExtracting}
            className="w-full"
          >
            {isExtracting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Extracting Data...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Extract Payment Schedule
              </>
            )}
          </Button>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extracted Data Preview */}
      {extractedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Extracted Data</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Check className="h-3 w-3 mr-1" />
                Ready to Import
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Project Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Project Name</Label>
                <p className="font-medium">{extractedData.project_name || '-'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Client</Label>
                <p className="font-medium">{extractedData.client_name || '-'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Agreed Fee</Label>
                <p className="font-medium text-primary">
                  {extractedData.agreed_fee ? formatCurrency(extractedData.agreed_fee) : '-'}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">VAT</Label>
                <p className="font-medium">
                  {extractedData.vat_percentage ? `${extractedData.vat_percentage}%` : '-'}
                </p>
              </div>
              {extractedData.client_address && (
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs text-muted-foreground">Client Address</Label>
                  <p className="text-sm">{extractedData.client_address}</p>
                </div>
              )}
              {extractedData.client_vat_number && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Client VAT Number</Label>
                  <p className="text-sm">{extractedData.client_vat_number}</p>
                </div>
              )}
              {extractedData.payment_terms && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Payment Terms</Label>
                  <p className="text-sm">{extractedData.payment_terms}</p>
                </div>
              )}
            </div>

            {/* Payment Schedule */}
            {extractedData.payment_schedule && extractedData.payment_schedule.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Payment Schedule ({extractedData.payment_schedule.length} payments)</Label>
                  <Badge variant="outline">Total: {formatCurrency(totalScheduled)}</Badge>
                </div>
                <div className="border rounded-lg max-h-[250px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date/Month</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {extractedData.payment_schedule.map((payment, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            {payment.date 
                              ? (payment.date.length === 7 
                                  ? format(new Date(payment.date + "-01"), "MMMM yyyy")
                                  : format(new Date(payment.date), "dd MMM yyyy"))
                              : `Payment ${idx + 1}`
                            }
                          </TableCell>
                          <TableCell>
                            {payment.description || `Draw ${idx + 1}`}
                            {payment.percentage && (
                              <span className="text-muted-foreground ml-1">
                                ({payment.percentage}%)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Notes */}
            {extractedData.notes && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <p className="text-sm bg-muted p-3 rounded-lg">{extractedData.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleUseData} className="flex-1">
                <Check className="mr-2 h-4 w-4" />
                Use This Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
