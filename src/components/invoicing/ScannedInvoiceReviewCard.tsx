import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Edit2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  onSave: (data: ExtractedInvoiceData) => void;
  onDiscard: () => void;
  isSaving?: boolean;
}

export function ScannedInvoiceReviewCard({ 
  fileName, 
  extractedData, 
  onSave, 
  onDiscard,
  isSaving 
}: ScannedInvoiceReviewCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ExtractedInvoiceData>(extractedData);

  const handleSave = () => {
    onSave(formData);
    setIsEditing(false);
  };

  const updateField = (field: keyof ExtractedInvoiceData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{fileName}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              Invoice #{formData.invoice_number}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? <Save className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Invoice Details */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Invoice Details</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Invoice Number</Label>
              {isEditing ? (
                <Input
                  value={formData.invoice_number}
                  onChange={(e) => updateField('invoice_number', e.target.value)}
                  className="h-8 text-sm"
                />
              ) : (
                <p className="text-sm mt-1">{formData.invoice_number}</p>
              )}
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => updateField('invoice_date', e.target.value)}
                  className="h-8 text-sm"
                />
              ) : (
                <p className="text-sm mt-1">
                  {new Date(formData.invoice_date).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Project Information */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Project Information</h4>
          <div>
            <Label className="text-xs">Project Name</Label>
            {isEditing ? (
              <Input
                value={formData.project_name}
                onChange={(e) => updateField('project_name', e.target.value)}
                className="h-8 text-sm"
              />
            ) : (
              <p className="text-sm mt-1">{formData.project_name}</p>
            )}
          </div>
          <div>
            <Label className="text-xs">Agreed Fee</Label>
            {isEditing ? (
              <Input
                type="number"
                value={formData.agreed_fee || ''}
                onChange={(e) => updateField('agreed_fee', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="To be confirmed"
                className="h-8 text-sm"
              />
            ) : (
              <p className="text-sm mt-1">
                {formData.agreed_fee ? `R ${formData.agreed_fee.toLocaleString()}` : 'To be confirmed'}
              </p>
            )}
          </div>
        </div>

        {/* Client Details */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Client Details</h4>
          <div>
            <Label className="text-xs">Client Name</Label>
            {isEditing ? (
              <Input
                value={formData.client_name}
                onChange={(e) => updateField('client_name', e.target.value)}
                className="h-8 text-sm"
              />
            ) : (
              <p className="text-sm mt-1">{formData.client_name}</p>
            )}
          </div>
          {formData.client_address && (
            <div>
              <Label className="text-xs">Address</Label>
              {isEditing ? (
                <Textarea
                  value={formData.client_address}
                  onChange={(e) => updateField('client_address', e.target.value)}
                  className="text-sm min-h-[60px]"
                />
              ) : (
                <p className="text-sm mt-1 whitespace-pre-line">{formData.client_address}</p>
              )}
            </div>
          )}
          {formData.client_vat_number && (
            <div>
              <Label className="text-xs">VAT Number</Label>
              {isEditing ? (
                <Input
                  value={formData.client_vat_number}
                  onChange={(e) => updateField('client_vat_number', e.target.value)}
                  className="h-8 text-sm"
                />
              ) : (
                <p className="text-sm mt-1">{formData.client_vat_number}</p>
              )}
            </div>
          )}
        </div>

        {/* Financial Summary */}
        <div className="space-y-3 border-t pt-3">
          <h4 className="text-sm font-semibold">Financial Summary</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Interim Claim</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={formData.interim_claim}
                  onChange={(e) => updateField('interim_claim', parseFloat(e.target.value))}
                  className="h-8 text-sm"
                />
              ) : (
                <p className="text-sm mt-1 font-medium">R {formData.interim_claim.toLocaleString()}</p>
              )}
            </div>
            <div>
              <Label className="text-xs">Previously Invoiced</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={formData.previously_invoiced}
                  onChange={(e) => updateField('previously_invoiced', parseFloat(e.target.value))}
                  className="h-8 text-sm"
                />
              ) : (
                <p className="text-sm mt-1">R {formData.previously_invoiced.toLocaleString()}</p>
              )}
            </div>
            <div>
              <Label className="text-xs">VAT ({formData.vat_percentage}%)</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={formData.vat_amount}
                  onChange={(e) => updateField('vat_amount', parseFloat(e.target.value))}
                  className="h-8 text-sm"
                />
              ) : (
                <p className="text-sm mt-1">R {formData.vat_amount.toLocaleString()}</p>
              )}
            </div>
            <div>
              <Label className="text-xs">Total Amount</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={formData.total_amount}
                  onChange={(e) => updateField('total_amount', parseFloat(e.target.value))}
                  className="h-8 text-sm"
                />
              ) : (
                <p className="text-sm mt-1 font-semibold text-primary">
                  R {formData.total_amount.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 justify-end border-t pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onDiscard}
          disabled={isSaving}
        >
          <X className="h-4 w-4 mr-1" />
          Discard
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Check className="h-4 w-4 mr-1" />
          {isSaving ? 'Saving...' : 'Save to Database'}
        </Button>
      </CardFooter>
    </Card>
  );
}
