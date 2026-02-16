import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Loader2 } from "lucide-react";
import { generatePDF } from "@/utils/pdfmake/engine";
import type { PayslipData } from "@/utils/pdfmake/engine/registrations/payslip";

interface GeneratePayslipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payrollRecord: any;
  onSuccess?: () => void;
}

export function GeneratePayslipDialog({ 
  open, 
  onOpenChange, 
  payrollRecord,
  onSuccess 
}: GeneratePayslipDialogProps) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  const [deductions, setDeductions] = useState({
    paye: 0,
    uif: 0,
    pension: 0,
    medical: 0,
    other: 0,
  });
  const [payPeriod, setPayPeriod] = useState({
    start: new Date().toISOString().slice(0, 8) + "01",
    end: new Date().toISOString().slice(0, 10),
    paymentDate: new Date().toISOString().slice(0, 10),
  });

  const grossPay = payrollRecord?.salary_amount || 0;
  const totalDeductions = Object.values(deductions).reduce((a, b) => a + b, 0);
  const netPay = grossPay - totalDeductions;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: payrollRecord?.salary_currency || "ZAR",
    }).format(amount);
  };

  const prepareData = (): PayslipData => {
    const employee = payrollRecord?.employees;
    return {
      employee: {
        name: `${employee?.first_name} ${employee?.last_name}`,
        number: employee?.employee_number || '-'
      },
      payPeriod: {
        start: new Date(payPeriod.start).toLocaleDateString(),
        end: new Date(payPeriod.end).toLocaleDateString(),
        paymentDate: new Date(payPeriod.paymentDate).toLocaleDateString(),
        frequency: payrollRecord?.payment_frequency || 'Monthly'
      },
      earnings: {
        basic: grossPay
      },
      deductions: deductions,
      totals: {
        gross: grossPay,
        deductions: totalDeductions,
        net: netPay
      },
      currency: payrollRecord?.salary_currency || "ZAR"
    };
  };

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const data = prepareData();
      const employee = payrollRecord?.employees;
      const filename = `payslip_${employee?.employee_number}_${payPeriod.end}`;

      const result = await generatePDF('payslip', { data }, {
        filename,
        title: 'Payslip'
      });

      if (result.success && result.blob) {
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: "Payslip downloaded successfully" });
      } else {
        throw new Error(result.error || "Generation failed");
      }
    } catch (error) {
      console.error("Download error:", error);
      toast({ title: "Failed to download payslip", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const data = prepareData();
      const employee = payrollRecord?.employees;
      const filename = `payslip_${employee?.employee_number}_${payPeriod.end}.pdf`;
      
      const result = await generatePDF('payslip', { data });
      
      if (!result.success || !result.blob) {
        throw new Error(result.error || "Generation failed");
      }

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("payslips")
        .upload(`${payrollRecord.employee_id}/${filename}`, result.blob, {
          contentType: "application/pdf",
          upsert: true,
        });
      
      if (uploadError) {
        // If bucket doesn't exist, just download the file
        console.warn("Storage upload failed, downloading instead:", uploadError);
        handleDownload();
        return;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from("payslips")
        .getPublicUrl(uploadData.path);
      
      // Save payslip record
      const { error: insertError } = await supabase.from("pay_slips").insert({
        employee_id: payrollRecord.employee_id,
        payroll_record_id: payrollRecord.id,
        pay_period_start: payPeriod.start,
        pay_period_end: payPeriod.end,
        payment_date: payPeriod.paymentDate,
        gross_pay: grossPay,
        deductions: deductions,
        net_pay: netPay,
        file_url: urlData.publicUrl,
      });
      
      if (insertError) throw insertError;
      
      toast({ title: "Payslip generated and saved successfully" });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error saving payslip:", error);
      // Fall back to download
      handleDownload();
    } finally {
      setLoading(false);
    }
  };

  if (!payrollRecord) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Payslip
          </DialogTitle>
          <DialogDescription>
            Generate payslip for {payrollRecord?.employees?.first_name} {payrollRecord?.employees?.last_name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Pay Period */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Period Start</Label>
              <Input
                type="date"
                value={payPeriod.start}
                onChange={(e) => setPayPeriod({ ...payPeriod, start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Period End</Label>
              <Input
                type="date"
                value={payPeriod.end}
                onChange={(e) => setPayPeriod({ ...payPeriod, end: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={payPeriod.paymentDate}
                onChange={(e) => setPayPeriod({ ...payPeriod, paymentDate: e.target.value })}
              />
            </div>
          </div>
          
          {/* Gross Pay Display */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Gross Pay ({payrollRecord?.payment_frequency})</span>
              <span className="text-xl font-bold">{formatCurrency(grossPay)}</span>
            </div>
          </div>
          
          {/* Deductions */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Deductions</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paye">PAYE Tax</Label>
                <Input
                  id="paye"
                  type="number"
                  min="0"
                  step="0.01"
                  value={deductions.paye || ""}
                  onChange={(e) => setDeductions({ ...deductions, paye: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uif">UIF</Label>
                <Input
                  id="uif"
                  type="number"
                  min="0"
                  step="0.01"
                  value={deductions.uif || ""}
                  onChange={(e) => setDeductions({ ...deductions, uif: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pension">Pension</Label>
                <Input
                  id="pension"
                  type="number"
                  min="0"
                  step="0.01"
                  value={deductions.pension || ""}
                  onChange={(e) => setDeductions({ ...deductions, pension: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medical">Medical Aid</Label>
                <Input
                  id="medical"
                  type="number"
                  min="0"
                  step="0.01"
                  value={deductions.medical || ""}
                  onChange={(e) => setDeductions({ ...deductions, medical: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="other">Other Deductions</Label>
                <Input
                  id="other"
                  type="number"
                  min="0"
                  step="0.01"
                  value={deductions.other || ""}
                  onChange={(e) => setDeductions({ ...deductions, other: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          
          {/* Summary */}
          <div className="p-4 bg-primary/10 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>Gross Pay</span>
              <span>{formatCurrency(grossPay)}</span>
            </div>
            <div className="flex justify-between text-destructive">
              <span>Total Deductions</span>
              <span>- {formatCurrency(totalDeductions)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-lg font-bold">
              <span>Net Pay</span>
              <span>{formatCurrency(netPay)}</span>
            </div>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="secondary" onClick={handleDownload} disabled={generating || loading}>
            {generating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
            ) : (
              <><Download className="mr-2 h-4 w-4" /> Download PDF</>
            )}
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading || generating}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
            ) : "Save & Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
