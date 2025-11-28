import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, AlertCircle, Link2 } from "lucide-react";
import * as XLSX from "xlsx";

interface ParsedInvoice {
  invoice_number: string;
  invoice_month: string;
  job_name: string;
  client_details: string;
  vat_number: string;
  amount_excl_vat: number | null;
  amount_incl_vat: number | null;
  selected: boolean;
  project_id: string | null;
  matched_project_name: string | null;
}

interface InvoiceHistoryImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceHistoryImporter({ open, onOpenChange }: InvoiceHistoryImporterProps) {
  const [parsedInvoices, setParsedInvoices] = useState<ParsedInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [defaultProjectId, setDefaultProjectId] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ["invoice-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_projects")
        .select("*")
        .order("project_name");
      if (error) throw error;
      return data;
    },
  });

  const parseAmount = (value: any): number | null => {
    if (!value) return null;
    const str = String(value).replace(/[R,\s]/g, "").trim();
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  };

  const parseMonth = (monthStr: string): string => {
    const cleaned = monthStr.replace(":", "").trim();
    
    const monthMap: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
      january: "01", february: "02", march: "03", april: "04", june: "06",
      july: "07", august: "08", september: "09", october: "10", november: "11", december: "12"
    };
    
    const dashMatch = cleaned.match(/^([a-zA-Z]+)-(\d{2})$/i);
    if (dashMatch) {
      const monthNum = monthMap[dashMatch[1].toLowerCase()];
      if (monthNum) return `20${dashMatch[2]}-${monthNum}`;
    }
    
    const spaceMatch = cleaned.match(/^([a-zA-Z]+)\s*(\d{4})$/i);
    if (spaceMatch) {
      const monthNum = monthMap[spaceMatch[1].toLowerCase()];
      if (monthNum) return `${spaceMatch[2]}-${monthNum}`;
    }
    
    return cleaned;
  };

  // Try to match job name to existing project
  const findMatchingProject = (jobName: string) => {
    const normalizedJob = jobName.toLowerCase().trim();
    for (const project of projects) {
      const normalizedProject = project.project_name.toLowerCase().trim();
      // Check if job contains project name or vice versa
      if (normalizedJob.includes(normalizedProject) || normalizedProject.includes(normalizedJob)) {
        return { id: project.id, name: project.project_name };
      }
      // Check for partial match (first few words)
      const jobWords = normalizedJob.split(/[\s-]+/).slice(0, 3).join(" ");
      const projectWords = normalizedProject.split(/[\s-]+/).slice(0, 3).join(" ");
      if (jobWords === projectWords) {
        return { id: project.id, name: project.project_name };
      }
    }
    return null;
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

      const invoices: ParsedInvoice[] = [];
      let currentMonth = "";

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const firstCell = String(row[0] || "").trim();
        
        if (firstCell && !firstCell.match(/^\d+$/) && (
          firstCell.includes("2025") || 
          firstCell.includes("2024") || 
          firstCell.match(/^[A-Z]{3}-\d{2}/i) ||
          firstCell.match(/^[A-Z]+\s*\d{4}/i)
        )) {
          currentMonth = parseMonth(firstCell);
          continue;
        }

        const invNumber = String(row[0] || "").trim();
        if (invNumber && invNumber.match(/^\d+$/)) {
          const jobName = String(row[2] || "").trim();
          const clientDetails = String(row[3] || "").trim();
          const vatNumber = String(row[4] || "").trim();
          const amountExcl = parseAmount(row[5]);
          const amountIncl = parseAmount(row[6]);

          if (jobName) {
            const match = findMatchingProject(jobName);
            invoices.push({
              invoice_number: invNumber,
              invoice_month: currentMonth,
              job_name: jobName,
              client_details: clientDetails,
              vat_number: vatNumber,
              amount_excl_vat: amountExcl,
              amount_incl_vat: amountIncl,
              selected: true,
              project_id: match?.id || null,
              matched_project_name: match?.name || null,
            });
          }
        }
      }

      setParsedInvoices(invoices);
      toast.success(`Parsed ${invoices.length} invoices from Excel`);
    } catch (error: any) {
      console.error("Parse error:", error);
      toast.error("Failed to parse Excel file");
    } finally {
      setLoading(false);
    }
  }, [projects]);

  const toggleInvoice = (index: number) => {
    setParsedInvoices(prev => prev.map((inv, i) => 
      i === index ? { ...inv, selected: !inv.selected } : inv
    ));
  };

  const toggleAll = (selected: boolean) => {
    setParsedInvoices(prev => prev.map(inv => ({ ...inv, selected })));
  };

  const updateInvoiceProject = (index: number, projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    setParsedInvoices(prev => prev.map((inv, i) => 
      i === index ? { 
        ...inv, 
        project_id: projectId || null,
        matched_project_name: project?.project_name || null
      } : inv
    ));
  };

  const applyDefaultProject = () => {
    if (!defaultProjectId) return;
    const project = projects.find(p => p.id === defaultProjectId);
    setParsedInvoices(prev => prev.map(inv => 
      inv.project_id ? inv : {
        ...inv,
        project_id: defaultProjectId,
        matched_project_name: project?.project_name || null
      }
    ));
    toast.success("Applied default project to unlinked invoices");
  };

  const handleSave = async () => {
    const selectedInvoices = parsedInvoices.filter(inv => inv.selected);
    if (selectedInvoices.length === 0) {
      toast.error("Please select at least one invoice to import");
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const invoicesToInsert = selectedInvoices.map(inv => ({
        invoice_number: inv.invoice_number,
        invoice_month: inv.invoice_month,
        job_name: inv.job_name,
        client_details: inv.client_details || null,
        vat_number: inv.vat_number || null,
        amount_excl_vat: inv.amount_excl_vat,
        amount_incl_vat: inv.amount_incl_vat,
        project_id: inv.project_id,
        created_by: userData.user?.id || null,
      }));

      const { error } = await supabase
        .from("invoice_history")
        .insert(invoicesToInsert);

      if (error) throw error;

      toast.success(`Imported ${selectedInvoices.length} invoices`);
      queryClient.invalidateQueries({ queryKey: ["invoice-history"] });
      setParsedInvoices([]);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.message || "Failed to save invoices");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  };

  const selectedCount = parsedInvoices.filter(inv => inv.selected).length;
  const linkedCount = parsedInvoices.filter(inv => inv.selected && inv.project_id).length;
  const totalAmount = parsedInvoices
    .filter(inv => inv.selected)
    .reduce((sum, inv) => sum + (inv.amount_excl_vat || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import Invoice History from Excel</DialogTitle>
          <DialogDescription>
            Upload your invoice schedule and link invoices to projects
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {parsedInvoices.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <Label htmlFor="history-file" className="cursor-pointer">
                <div className="space-y-2">
                  <p className="font-medium">Click to upload Excel file</p>
                  <p className="text-sm text-muted-foreground">
                    Supports .xlsx and .xls files
                  </p>
                </div>
                <Input
                  id="history-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={loading}
                />
              </Label>
              {loading && <p className="mt-4 text-sm text-muted-foreground">Parsing file...</p>}
            </div>
          ) : (
            <>
              {/* Bulk actions */}
              <div className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedCount === parsedInvoices.length}
                    onCheckedChange={(checked) => toggleAll(!!checked)}
                  />
                  <span className="text-sm">
                    {selectedCount} of {parsedInvoices.length} selected
                    {linkedCount > 0 && (
                      <span className="text-muted-foreground ml-2">
                        ({linkedCount} linked to projects)
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={defaultProjectId} onValueChange={setDefaultProjectId}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Select default project..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.project_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={applyDefaultProject} disabled={!defaultProjectId}>
                    Apply to Unlinked
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[400px] border rounded-md">
                <div className="p-4 space-y-2">
                  {parsedInvoices.map((invoice, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        invoice.selected ? "bg-primary/5 border-primary/20" : "bg-muted/30"
                      }`}
                    >
                      <Checkbox
                        checked={invoice.selected}
                        onCheckedChange={() => toggleInvoice(index)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-medium">#{invoice.invoice_number}</span>
                          <Badge variant="outline" className="text-xs">
                            {invoice.invoice_month}
                          </Badge>
                          {invoice.project_id && (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <Link2 className="h-3 w-3" />
                              Linked
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm truncate">{invoice.job_name}</p>
                      </div>
                      <div className="w-[200px]">
                        <Select 
                          value={invoice.project_id || ""} 
                          onValueChange={(v) => updateInvoiceProject(index, v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Link to project..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No project</SelectItem>
                            {projects.map(project => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.project_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="text-right w-[100px]">
                        {invoice.amount_excl_vat !== null ? (
                          <p className="font-medium text-sm">{formatCurrency(invoice.amount_excl_vat)}</p>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                            <AlertCircle className="h-3 w-3" />
                            No amt
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setParsedInvoices([])}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Different File
                </Button>
                <div className="text-sm text-muted-foreground">
                  Total: {formatCurrency(totalAmount)}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || selectedCount === 0}
          >
            {saving ? "Importing..." : `Import ${selectedCount} Invoices`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
