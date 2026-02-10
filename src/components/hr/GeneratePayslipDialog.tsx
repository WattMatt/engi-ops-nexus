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
import { FileText, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addRunningFooter } from "@/utils/pdf/jspdfStandards";

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

  const generatePDF = () => {
    const doc = new jsPDF();
    const employee = payrollRecord?.employees;
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(30, 64, 175);
    doc.text("PAYSLIP", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Pay Period: ${new Date(payPeriod.start).toLocaleDateString()} - ${new Date(payPeriod.end).toLocaleDateString()}`, 105, 28, { align: "center" });
    
    // Employee Details
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Employee Details", 14, 45);
    
    doc.setFontSize(10);
    doc.text(`Name: ${employee?.first_name} ${employee?.last_name}`, 14, 55);
    doc.text(`Employee Number: ${employee?.employee_number}`, 14, 62);
    doc.text(`Payment Date: ${new Date(payPeriod.paymentDate).toLocaleDateString()}`, 14, 69);
    doc.text(`Payment Frequency: ${payrollRecord?.payment_frequency}`, 120, 55);
    
    // Earnings Table
    autoTable(doc, {
      startY: 80,
      head: [["Earnings", "Amount"]],
      body: [
        ["Basic Salary", formatCurrency(grossPay)],
      ],
      foot: [["Gross Pay", formatCurrency(grossPay)]],
      headStyles: { fillColor: [30, 64, 175] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
      theme: "striped",
    });
    
    // Deductions Table
    const deductionRows: [string, string][] = [];
    if (deductions.paye > 0) deductionRows.push(["PAYE Tax", formatCurrency(deductions.paye)]);
    if (deductions.uif > 0) deductionRows.push(["UIF", formatCurrency(deductions.uif)]);
    if (deductions.pension > 0) deductionRows.push(["Pension", formatCurrency(deductions.pension)]);
    if (deductions.medical > 0) deductionRows.push(["Medical Aid", formatCurrency(deductions.medical)]);
    if (deductions.other > 0) deductionRows.push(["Other Deductions", formatCurrency(deductions.other)]);
    
    if (deductionRows.length > 0) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [["Deductions", "Amount"]],
        body: deductionRows,
        foot: [["Total Deductions", formatCurrency(totalDeductions)]],
        headStyles: { fillColor: [220, 38, 38] },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
        theme: "striped",
      });
    }
    
    // Net Pay
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFillColor(30, 64, 175);
    doc.rect(14, finalY, 182, 12, "F");
    doc.setTextColor(255);
    doc.setFontSize(14);
    doc.text("NET PAY", 20, finalY + 8);
    doc.text(formatCurrency(netPay), 190, finalY + 8, { align: "right" });
    
    // Footer
    doc.setTextColor(150);
    doc.setFontSize(8);
    doc.text("This is a computer-generated payslip and does not require a signature.", 105, 280, { align: "center" });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 285, { align: "center" });
    
    // Add page numbers
    addRunningFooter(doc, new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), 1);
    
    return doc;
  };

  const handleDownload = () => {
    const doc = generatePDF();
    const employee = payrollRecord?.employees;
    const filename = `payslip_${employee?.employee_number}_${payPeriod.end}.pdf`;
    doc.save(filename);
    
    toast({ title: "Payslip downloaded successfully" });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const doc = generatePDF();
      const pdfBlob = doc.output("blob");
      const employee = payrollRecord?.employees;
      const filename = `payslip_${employee?.employee_number}_${payPeriod.end}.pdf`;
      
      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("payslips")
        .upload(`${payrollRecord.employee_id}/${filename}`, pdfBlob, {
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
          <Button type="button" variant="secondary" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save & Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
