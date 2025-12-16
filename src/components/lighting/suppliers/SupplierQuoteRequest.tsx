import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  FileText, 
  Send, 
  Download, 
  Plus,
  Minus,
  Building2,
  Package
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Fitting {
  id: string;
  fitting_code: string;
  fitting_name: string;
  manufacturer: string | null;
  wattage: number | null;
}

interface Supplier {
  id: string;
  name: string;
  email: string | null;
  is_preferred: boolean | null;
}

interface QuoteItem {
  fittingId: string;
  fitting: Fitting;
  quantity: number;
}

interface SupplierQuoteRequestProps {
  projectId?: string | null;
}

export const SupplierQuoteRequest = ({ projectId }: SupplierQuoteRequestProps) => {
  const [fittings, setFittings] = useState<Fitting[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedItems, setSelectedItems] = useState<QuoteItem[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load fittings and suppliers
  useEffect(() => {
    const loadData = async () => {
      const [fittingsRes, suppliersRes] = await Promise.all([
        supabase.from('lighting_fittings').select('id, fitting_code, model_name, manufacturer, wattage').order('fitting_code'),
        supabase.from('lighting_suppliers').select('id, name, email, is_preferred').order('is_preferred', { ascending: false }).order('name')
      ]);

      if (fittingsRes.data) {
        const mapped = fittingsRes.data.map(f => ({
          id: f.id,
          fitting_code: f.fitting_code,
          fitting_name: f.model_name,
          manufacturer: f.manufacturer,
          wattage: f.wattage
        }));
        setFittings(mapped);
      }
      if (suppliersRes.data) setSuppliers(suppliersRes.data);
    };

    loadData();
  }, []);

  // Generate reference number
  useEffect(() => {
    const date = new Date();
    const ref = `RFQ-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    setReferenceNumber(ref);
  }, []);

  // Toggle fitting selection
  const handleToggleFitting = (fitting: Fitting, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, { fittingId: fitting.id, fitting, quantity: 1 }]);
    } else {
      setSelectedItems(prev => prev.filter(item => item.fittingId !== fitting.id));
    }
  };

  // Update quantity
  const handleUpdateQuantity = (fittingId: string, quantity: number) => {
    setSelectedItems(prev => prev.map(item =>
      item.fittingId === fittingId ? { ...item, quantity: Math.max(1, quantity) } : item
    ));
  };

  // Save quote request
  const handleSaveQuote = async (status: 'draft' | 'sent') => {
    if (selectedItems.length === 0) {
      toast.error('Please select at least one fitting');
      return;
    }

    if (status === 'sent' && !selectedSupplier) {
      toast.error('Please select a supplier');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const quoteData = {
        project_id: projectId || null,
        supplier_id: selectedSupplier || null,
        items: selectedItems.map(item => ({
          fittingId: item.fittingId,
          fittingCode: item.fitting.fitting_code,
          fittingName: item.fitting.fitting_name,
          manufacturer: item.fitting.manufacturer,
          quantity: item.quantity
        })),
        status,
        reference_number: referenceNumber,
        notes: notes || null,
        created_by: user?.id,
        sent_at: status === 'sent' ? new Date().toISOString() : null
      };

      const { error } = await supabase
        .from('lighting_quote_requests')
        .insert(quoteData);

      if (error) throw error;

      toast.success(status === 'draft' ? 'Quote saved as draft' : 'Quote request sent');

      // Reset form if sent
      if (status === 'sent') {
        setSelectedItems([]);
        setSelectedSupplier('');
        setNotes('');
      }
    } catch (error) {
      console.error('Error saving quote:', error);
      toast.error('Failed to save quote request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate RFQ document content
  const generateRFQDocument = () => {
    const supplier = suppliers.find(s => s.id === selectedSupplier);
    
    let content = `REQUEST FOR QUOTATION\n`;
    content += `========================\n\n`;
    content += `Reference: ${referenceNumber}\n`;
    content += `Date: ${new Date().toLocaleDateString()}\n\n`;
    
    if (supplier) {
      content += `To: ${supplier.name}\n`;
      if (supplier.email) content += `Email: ${supplier.email}\n`;
      content += `\n`;
    }

    content += `ITEMS REQUESTED:\n`;
    content += `-----------------\n`;
    
    selectedItems.forEach((item, index) => {
      content += `${index + 1}. ${item.fitting.fitting_code} - ${item.fitting.fitting_name}\n`;
      if (item.fitting.manufacturer) content += `   Manufacturer: ${item.fitting.manufacturer}\n`;
      if (item.fitting.wattage) content += `   Wattage: ${item.fitting.wattage}W\n`;
      content += `   Quantity: ${item.quantity}\n\n`;
    });

    content += `TOTAL ITEMS: ${selectedItems.length}\n`;
    content += `TOTAL QUANTITY: ${selectedItems.reduce((sum, item) => sum + item.quantity, 0)}\n\n`;

    if (notes) {
      content += `NOTES:\n`;
      content += `------\n`;
      content += `${notes}\n\n`;
    }

    content += `Please provide:\n`;
    content += `- Unit prices (excl. VAT)\n`;
    content += `- Lead times\n`;
    content += `- Validity period\n`;
    content += `- Payment terms\n`;

    return content;
  };

  // Download RFQ
  const handleDownloadRFQ = () => {
    const content = generateRFQDocument();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${referenceNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedSupplierData = suppliers.find(s => s.id === selectedSupplier);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quote Request Generator
          </CardTitle>
          <Badge variant="outline">{referenceNumber}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Fitting Selection */}
          <div className="space-y-4">
            <Label className="font-medium">Select Fittings</Label>
            <ScrollArea className="h-[300px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Fitting</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fittings.map(fitting => {
                    const selectedItem = selectedItems.find(i => i.fittingId === fitting.id);
                    const isSelected = !!selectedItem;

                    return (
                      <TableRow key={fitting.id}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleToggleFitting(fitting, !!checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{fitting.fitting_code}</div>
                            <div className="text-muted-foreground text-xs">{fitting.fitting_name}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {isSelected && (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleUpdateQuantity(fitting.id, selectedItem!.quantity - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                value={selectedItem!.quantity}
                                onChange={(e) => handleUpdateQuantity(fitting.id, parseInt(e.target.value) || 1)}
                                className="w-16 h-6 text-center text-sm"
                                min={1}
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleUpdateQuantity(fitting.id, selectedItem!.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Selection Summary */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4" />
                <span>{selectedItems.length} items selected</span>
                <span className="text-muted-foreground">|</span>
                <span>{selectedItems.reduce((sum, i) => sum + i.quantity, 0)} total quantity</span>
              </div>
            </div>
          </div>

          {/* Quote Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Supplier</Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      <div className="flex items-center gap-2">
                        {supplier.is_preferred && (
                          <Badge variant="secondary" className="text-xs">★</Badge>
                        )}
                        {supplier.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSupplierData && (
              <Card className="bg-muted/30">
                <CardContent className="py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4" />
                    <span className="font-medium">{selectedSupplierData.name}</span>
                  </div>
                  {selectedSupplierData.email && (
                    <p className="text-sm text-muted-foreground">{selectedSupplierData.email}</p>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label>Notes / Special Requirements</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter any special requirements, delivery instructions, etc."
                rows={4}
              />
            </div>

            {/* Selected Items Summary */}
            {selectedItems.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Items Preview</Label>
                <ScrollArea className="h-[150px] border rounded-lg p-3">
                  {selectedItems.map(item => (
                    <div key={item.fittingId} className="flex justify-between text-sm py-1 border-b last:border-0">
                      <span>{item.fitting.fitting_code} - {item.fitting.fitting_name}</span>
                      <Badge variant="secondary">×{item.quantity}</Badge>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleDownloadRFQ}
            disabled={selectedItems.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Download RFQ
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => handleSaveQuote('draft')}
              disabled={isSubmitting || selectedItems.length === 0}
            >
              Save Draft
            </Button>
            <Button
              onClick={() => handleSaveQuote('sent')}
              disabled={isSubmitting || selectedItems.length === 0 || !selectedSupplier}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Quote Request
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SupplierQuoteRequest;
