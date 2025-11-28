import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Upload, FileSpreadsheet, ChevronDown, ChevronRight, Check, Loader2, AlertCircle, Save } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface PaymentEntry {
  month: string;
  amount: number;
}

interface ParsedProject {
  id: string;
  name: string;
  agreedFee: number;
  payments: PaymentEntry[];
  totalFromPayments: number;
  selected: boolean;
  saving: boolean;
  saved: boolean;
  error?: string;
}

interface ExcelScheduleImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExcelScheduleImporter({ open, onOpenChange }: ExcelScheduleImporterProps) {
  const [projects, setProjects] = useState<ParsedProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const queryClient = useQueryClient();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  };

  const parseExcelFile = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Get all data as array of arrays
      const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (rawData.length < 2) {
        toast.error("No data found in the spreadsheet");
        return;
      }

      // First row is headers - extract month columns
      const headers = rawData[0] as string[];
      const monthColumns: { index: number; date: string }[] = [];
      
      // Parse month columns (starting from column 2 which is index 2)
      for (let i = 2; i < headers.length; i++) {
        const header = headers[i];
        if (header) {
          const date = parseMonthHeader(String(header));
          if (date) {
            monthColumns.push({ index: i, date });
          }
        }
      }

      // Parse each row as a project
      const parsedProjects: ParsedProject[] = [];
      
      for (let row = 1; row < rawData.length; row++) {
        const rowData = rawData[row];
        if (!rowData || !rowData[0]) continue;
        
        const projectName = String(rowData[0]).trim();
        if (!projectName || projectName === "") continue;
        
        // Parse agreed fee (column 1)
        const agreedFee = parseAmount(rowData[1]);
        
        // Parse payment amounts
        const payments: PaymentEntry[] = [];
        
        for (const { index, date } of monthColumns) {
          const amount = parseAmount(rowData[index]);
          if (amount > 0) {
            payments.push({ month: date, amount });
          }
        }
        
        // Only add projects that have payments
        if (payments.length > 0) {
          const totalFromPayments = payments.reduce((sum, p) => sum + p.amount, 0);
          
          parsedProjects.push({
            id: `project-${row}`,
            name: projectName,
            agreedFee: agreedFee || totalFromPayments,
            payments,
            totalFromPayments,
            selected: true,
            saving: false,
            saved: false,
          });
        }
      }

      if (parsedProjects.length === 0) {
        toast.error("No valid projects with payment schedules found");
        return;
      }

      setProjects(parsedProjects);
      toast.success(`Found ${parsedProjects.length} projects with payment schedules`);
    } catch (error: any) {
      console.error("Parse error:", error);
      toast.error("Failed to parse Excel file: " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const parseMonthHeader = (header: string): string | null => {
    // Handle various date formats
    const normalized = header.trim().toUpperCase();
    
    // Common month name patterns
    const monthPatterns: { [key: string]: string } = {
      'JAN': '01', 'JANUARY': '01',
      'FEB': '02', 'FEBRUARY': '02',
      'MAR': '03', 'MARCH': '03',
      'APR': '04', 'APRIL': '04',
      'MAY': '05', 'MEI': '05',
      'JUN': '06', 'JUNE': '06',
      'JUL': '07', 'JULY': '07',
      'AUG': '08', 'AUGUST': '08',
      'SEP': '09', 'SEPT': '09', 'SEPTEMBER': '09',
      'OCT': '10', 'OCTOBER': '10',
      'NOV': '11', 'NOVEMBER': '11',
      'DEC': '12', 'DECEMBER': '12',
    };

    // Try to extract year and month
    // Pattern 1: "01 February 2023" or "February 2023"
    const datePattern = /(\d{1,2}\s+)?([A-Z]+)\s*(\d{4})/i;
    const match = normalized.match(datePattern);
    
    if (match) {
      const monthName = match[2].toUpperCase();
      const year = match[3];
      const month = monthPatterns[monthName];
      
      if (month && year) {
        return `${year}-${month}`;
      }
    }

    // Pattern 2: Just month + year like "JAN2025"
    const compactPattern = /([A-Z]+)\s*(\d{4})/i;
    const compactMatch = normalized.match(compactPattern);
    
    if (compactMatch) {
      const monthName = compactMatch[1].toUpperCase();
      const year = compactMatch[2];
      const month = monthPatterns[monthName];
      
      if (month && year) {
        return `${year}-${month}`;
      }
    }

    return null;
  };

  const parseAmount = (value: any): number => {
    if (value === undefined || value === null || value === "") return 0;
    
    // If already a number
    if (typeof value === "number") return value;
    
    // Parse string value - remove currency symbols, spaces, and convert
    const str = String(value)
      .replace(/[R$€£,\s]/g, "")
      .replace(/\s/g, "");
    
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      parseExcelFile(file);
    }
  };

  const toggleProject = (projectId: string) => {
    setProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, selected: !p.selected } : p
    ));
  };

  const toggleAll = (selected: boolean) => {
    setProjects(prev => prev.map(p => ({ ...p, selected })));
  };

  const saveProject = async (project: ParsedProject): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Create the project
      const { data: newProject, error: projectError } = await supabase
        .from("invoice_projects")
        .insert({
          project_name: project.name,
          client_name: "Imported from Excel",
          agreed_fee: project.agreedFee,
          outstanding_amount: project.agreedFee,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Insert all payments
      const paymentsToInsert = project.payments.map(p => ({
        project_id: newProject.id,
        payment_month: p.month + "-01",
        amount: p.amount,
      }));

      const { error: paymentsError } = await supabase
        .from("monthly_payments")
        .insert(paymentsToInsert);

      if (paymentsError) throw paymentsError;

      return true;
    } catch (error: any) {
      console.error("Save error:", error);
      throw error;
    }
  };

  const handleSaveIndividual = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    setProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, saving: true, error: undefined } : p
    ));

    try {
      await saveProject(project);
      setProjects(prev => prev.map(p => 
        p.id === projectId ? { ...p, saving: false, saved: true } : p
      ));
      toast.success(`Saved: ${project.name}`);
      queryClient.invalidateQueries({ queryKey: ["invoice-projects"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-payments-with-projects"] });
      queryClient.invalidateQueries({ queryKey: ["finance-projects"] });
    } catch (error: any) {
      setProjects(prev => prev.map(p => 
        p.id === projectId ? { ...p, saving: false, error: error.message } : p
      ));
      toast.error(`Failed to save ${project.name}`);
    }
  };

  const handleSaveAll = async () => {
    const selectedProjects = projects.filter(p => p.selected && !p.saved);
    if (selectedProjects.length === 0) {
      toast.error("No projects selected to save");
      return;
    }

    setSavingAll(true);
    setSaveProgress(0);
    
    let saved = 0;
    let failed = 0;

    for (let i = 0; i < selectedProjects.length; i++) {
      const project = selectedProjects[i];
      
      setProjects(prev => prev.map(p => 
        p.id === project.id ? { ...p, saving: true, error: undefined } : p
      ));

      try {
        await saveProject(project);
        setProjects(prev => prev.map(p => 
          p.id === project.id ? { ...p, saving: false, saved: true } : p
        ));
        saved++;
      } catch (error: any) {
        setProjects(prev => prev.map(p => 
          p.id === project.id ? { ...p, saving: false, error: error.message } : p
        ));
        failed++;
      }

      setSaveProgress(((i + 1) / selectedProjects.length) * 100);
    }

    setSavingAll(false);
    queryClient.invalidateQueries({ queryKey: ["invoice-projects"] });
    queryClient.invalidateQueries({ queryKey: ["monthly-payments-with-projects"] });
    queryClient.invalidateQueries({ queryKey: ["finance-projects"] });

    if (saved > 0) {
      toast.success(`Saved ${saved} projects successfully`);
    }
    if (failed > 0) {
      toast.error(`Failed to save ${failed} projects`);
    }
  };

  const selectedCount = projects.filter(p => p.selected && !p.saved).length;
  const savedCount = projects.filter(p => p.saved).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Payment Schedules from Excel
          </DialogTitle>
          <DialogDescription>
            Upload a cash flow spreadsheet to import multiple project schedules at once
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {projects.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={loading}
                />
                <Card className="border-dashed hover:border-primary transition-colors">
                  <CardContent className="py-12 px-16 text-center">
                    {loading ? (
                      <>
                        <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                        <p className="text-muted-foreground">Parsing spreadsheet...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="font-medium">Click to upload Excel file</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Supports .xlsx, .xls, and .csv files
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </label>
            </div>
          ) : (
            <>
              {/* Summary bar */}
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={projects.every(p => p.selected || p.saved)}
                      onCheckedChange={(checked) => toggleAll(checked as boolean)}
                    />
                    <span className="text-sm font-medium">
                      {projects.length} projects found
                    </span>
                  </div>
                  {savedCount > 0 && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      {savedCount} saved
                    </Badge>
                  )}
                  {selectedCount > 0 && (
                    <Badge variant="outline">
                      {selectedCount} selected
                    </Badge>
                  )}
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={loading}
                  />
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Different File
                    </span>
                  </Button>
                </label>
              </div>

              {/* Save progress */}
              {savingAll && (
                <div className="py-2">
                  <Progress value={saveProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    Saving projects... {Math.round(saveProgress)}%
                  </p>
                </div>
              )}

              {/* Projects list */}
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-2 py-2">
                  {projects.map((project) => (
                    <Collapsible
                      key={project.id}
                      open={expandedProject === project.id}
                      onOpenChange={() => setExpandedProject(
                        expandedProject === project.id ? null : project.id
                      )}
                    >
                      <div className={`border rounded-lg ${project.saved ? 'bg-green-50 border-green-200' : project.error ? 'bg-red-50 border-red-200' : ''}`}>
                        <div className="flex items-center gap-3 p-3">
                          <Checkbox
                            checked={project.selected}
                            onCheckedChange={() => toggleProject(project.id)}
                            disabled={project.saved}
                          />
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="p-0 h-auto">
                              {expandedProject === project.id ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{project.name}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Fee: {formatCurrency(project.agreedFee)}</span>
                              <span>{project.payments.length} payments</span>
                              <span>Total: {formatCurrency(project.totalFromPayments)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {project.saved ? (
                              <Badge className="bg-green-500">
                                <Check className="h-3 w-3 mr-1" />
                                Saved
                              </Badge>
                            ) : project.error ? (
                              <Badge variant="destructive">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Error
                              </Badge>
                            ) : project.saving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveIndividual(project.id);
                                }}
                              >
                                <Save className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                            )}
                          </div>
                        </div>

                        <CollapsibleContent>
                          <div className="px-3 pb-3 pt-0">
                            {project.error && (
                              <p className="text-xs text-red-600 mb-2">{project.error}</p>
                            )}
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="h-8 text-xs">Month</TableHead>
                                  <TableHead className="h-8 text-xs text-right">Amount</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {project.payments.slice(0, 12).map((payment, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="py-1 text-xs">{payment.month}</TableCell>
                                    <TableCell className="py-1 text-xs text-right">
                                      {formatCurrency(payment.amount)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                {project.payments.length > 12 && (
                                  <TableRow>
                                    <TableCell colSpan={2} className="py-1 text-xs text-center text-muted-foreground">
                                      ... and {project.payments.length - 12} more payments
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {projects.length > 0 && selectedCount > 0 && (
            <Button onClick={handleSaveAll} disabled={savingAll}>
              {savingAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save {selectedCount} Selected Projects
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
