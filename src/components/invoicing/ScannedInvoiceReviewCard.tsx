import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, RotateCcw, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";

interface ExtractedInvoiceData {
  invoice_number: string;
  invoice_date: string;
  project_name: string;
  client_name: string;
  client_address?: string;
  client_vat_number?: string | null;
  agreed_fee?: number | null;
  interim_claim: number;
  previously_invoiced: number;
  vat_percentage: number;
  vat_amount: number;
  total_amount: number;
}

interface ScannedInvoiceReviewCardProps {
  fileName: string;
  extractedData: ExtractedInvoiceData;
  imageUrl: string;
  onSave: (data: ExtractedInvoiceData) => void;
  onRescan: () => void;
  onClose: () => void;
  isSaving?: boolean;
  isRescanning?: boolean;
}

export function ScannedInvoiceReviewCard({ 
  fileName,
  extractedData, 
  imageUrl,
  onSave, 
  onRescan,
  onClose,
  isSaving,
  isRescanning 
}: ScannedInvoiceReviewCardProps) {
  const [editedData, setEditedData] = useState<ExtractedInvoiceData>(extractedData);
  const [originalData] = useState<ExtractedInvoiceData>(extractedData);

  const handleSave = () => {
    onSave(editedData);
  };

  const handleReset = () => {
    setEditedData(originalData);
    toast.info("Reset to original AI-extracted values");
  };

  const updateField = (field: keyof ExtractedInvoiceData, value: any) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full h-[calc(100vh-120px)] flex flex-col">
      {/* Action Bar */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <h3 className="text-lg font-semibold truncate max-w-md">{fileName}</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRescan}
            disabled={isRescanning || isSaving}
          >
            {isRescanning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Rescanning...
              </>
            ) : (
              "AI Rescan"
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} disabled={isSaving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving || isRescanning}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-2 flex-1 min-h-0">
        {/* Left Column - Document Preview */}
        <div className="border-r bg-muted/30 flex flex-col min-h-0">
          <iframe 
            src={imageUrl} 
            className="w-full h-full border-0"
            title={fileName}
          />
        </div>

        {/* Right Column - Extracted Data Fields */}
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            <Tabs defaultValue="invoice" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="invoice">Invoice</TabsTrigger>
                <TabsTrigger value="client">Client</TabsTrigger>
                <TabsTrigger value="financial">Financial</TabsTrigger>
              </TabsList>

              <TabsContent value="invoice" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice_number">Invoice Number</Label>
                  <Input
                    id="invoice_number"
                    value={editedData.invoice_number || ""}
                    onChange={(e) => updateField('invoice_number', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice_date">Invoice Date</Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    value={editedData.invoice_date || ""}
                    onChange={(e) => updateField('invoice_date', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project_name">Project Name</Label>
                  <Input
                    id="project_name"
                    value={editedData.project_name || ""}
                    onChange={(e) => updateField('project_name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agreed_fee">Agreed Fee</Label>
                  <Input
                    id="agreed_fee"
                    type="number"
                    step="0.01"
                    placeholder="To be confirmed"
                    value={editedData.agreed_fee || ''}
                    onChange={(e) => updateField('agreed_fee', e.target.value ? parseFloat(e.target.value) : null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty if "To be confirmed"
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="client" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="client_name">Client Name</Label>
                  <Input
                    id="client_name"
                    value={editedData.client_name || ""}
                    onChange={(e) => updateField('client_name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_address">Client Address</Label>
                  <Textarea
                    id="client_address"
                    value={editedData.client_address || ""}
                    onChange={(e) => updateField('client_address', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_vat_number">VAT Number</Label>
                  <Input
                    id="client_vat_number"
                    value={editedData.client_vat_number || ""}
                    onChange={(e) => updateField('client_vat_number', e.target.value)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="financial" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="interim_claim">Interim Claim</Label>
                  <Input
                    id="interim_claim"
                    type="number"
                    step="0.01"
                    value={editedData.interim_claim || 0}
                    onChange={(e) => updateField('interim_claim', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="previously_invoiced">Previously Invoiced</Label>
                  <Input
                    id="previously_invoiced"
                    type="number"
                    step="0.01"
                    value={editedData.previously_invoiced || 0}
                    onChange={(e) => updateField('previously_invoiced', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vat_percentage">VAT Percentage</Label>
                  <Input
                    id="vat_percentage"
                    type="number"
                    step="0.01"
                    value={editedData.vat_percentage || 0}
                    onChange={(e) => updateField('vat_percentage', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vat_amount">VAT Amount</Label>
                  <Input
                    id="vat_amount"
                    type="number"
                    step="0.01"
                    value={editedData.vat_amount || 0}
                    onChange={(e) => updateField('vat_amount', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total_amount">Total Amount (incl VAT)</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    value={editedData.total_amount || 0}
                    onChange={(e) => updateField('total_amount', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
}
